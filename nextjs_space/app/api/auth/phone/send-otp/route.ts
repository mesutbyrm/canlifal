import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/mobile-auth';
import { normalizePhone } from '@/lib/sms';
import { isSmsConfiguredAsync, sendOtpSms } from '@/lib/sms/service';
import { hmacCode } from '@/lib/crypto-vault';
import { maskPhone, safeError } from '@/lib/log-redact';
import { authLimiter } from '@/lib/rate-limiter';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const RESEND_COOLDOWN_SEC = 60;
const MAX_PER_PHONE_PER_HOUR = 5;
const MAX_PER_IP_PER_HOUR = 10;
const OTP_TTL_MS = 5 * 60 * 1000;

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// Telefon doğrulama OTP kodu gönderir. Web (NextAuth) ve mobil (Bearer JWT) destekler.
// Güvenlik: kod ASLA düz metin saklanmaz (HMAC), ASLA loglanmaz, sağlayıcı
// hata ayrıntısı istemciye dönmez.
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const { success: rateLimitOk } = authLimiter.check(`otp-send:${authUser.id}`);
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, { status: 429 });
    }

    if (!(await isSmsConfiguredAsync())) {
      return NextResponse.json(
        { error: 'SMS servisi yapılandırılmamış', code: 'SERVICE_UNAVAILABLE' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const phone = normalizePhone((body?.phone || '').toString());
    if (!phone || phone.length < 8) {
      return NextResponse.json({ error: 'Geçerli bir telefon numarası girin' }, { status: 400 });
    }
    const deviceId = (body?.deviceId || '').toString().slice(0, 128) || null;
    const ip = clientIp(request);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Numara bazlı saatlik limit
    const perPhone = await prisma.phoneOtp.count({ where: { phone, createdAt: { gte: hourAgo } } });
    if (perPhone >= MAX_PER_PHONE_PER_HOUR) {
      return NextResponse.json({ error: 'Bu numara için çok fazla kod istendi. Lütfen daha sonra deneyin.' }, { status: 429 });
    }
    // IP bazlı saatlik limit
    if (ip !== 'unknown') {
      const perIp = await prisma.phoneOtp.count({ where: { ip, createdAt: { gte: hourAgo } } });
      if (perIp >= MAX_PER_IP_PER_HOUR) {
        return NextResponse.json({ error: 'Çok fazla kod isteği. Lütfen daha sonra deneyin.' }, { status: 429 });
      }
    }

    // Tekrar gönderim bekleme süresi
    const last = await prisma.phoneOtp.findFirst({
      where: { userId: authUser.id, phone },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (last) {
      const elapsed = (Date.now() - new Date(last.createdAt).getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_SEC) {
        return NextResponse.json(
          { error: 'Yeni kod istemek için biraz bekleyin.', retryAfter: Math.ceil(RESEND_COOLDOWN_SEC - elapsed) },
          { status: 429 }
        );
      }
    }

    const code = String(crypto.randomInt(100000, 1000000)); // 6 haneli, kriptografik
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    // Aynı istek penceresinde çift SMS'i önleyen anahtar (sağlayıcı zaman
    // aşımında yanıtı kaybolsa bile ikinci kez gönderilmez).
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${authUser.id}|${phone}|${Math.floor(Date.now() / (RESEND_COOLDOWN_SEC * 1000))}`)
      .digest('hex');

    // Önceki kullanılmamış kodları geçersiz kıl (tek aktif kod)
    await prisma.phoneOtp.updateMany({
      where: { userId: authUser.id, used: false },
      data: { used: true },
    });

    const record = await prisma.phoneOtp.create({
      data: {
        userId: authUser.id,
        phone,
        codeHash: hmacCode(code, phone),
        expiresAt,
        ip: ip === 'unknown' ? null : ip,
        deviceId,
        idempotencyKey,
      },
    });

    const result = await sendOtpSms(phone, code, { idempotencyKey });
    if (!result.ok) {
      // Gönderilemeyen kodu hemen geçersiz kıl
      await prisma.phoneOtp.update({ where: { id: record.id }, data: { used: true } }).catch(() => null);
      safeError('send-otp', `SMS gönderilemedi (${maskPhone(phone)}) kod=${result.errorCode}`);
      return NextResponse.json(
        { error: 'Doğrulama kodu şu anda gönderilemedi. Lütfen daha sonra tekrar deneyin.', code: 'SMS_SEND_FAILED' },
        { status: 502 }
      );
    }
    if (result.providerKey) {
      await prisma.phoneOtp.update({ where: { id: record.id }, data: { providerKey: result.providerKey } }).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      message: 'Doğrulama kodu gönderildi.',
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      resendAfterSeconds: RESEND_COOLDOWN_SEC,
    });
  } catch (error) {
    safeError('send-otp', 'beklenmeyen hata', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
