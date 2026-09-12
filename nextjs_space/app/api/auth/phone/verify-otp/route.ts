import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/mobile-auth';
import { normalizePhone } from '@/lib/sms';
import { authLimiter } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS = 5;

// Telefon OTP kodunu doğrular; başarılıysa phoneVerified=true ve user.phone ayarlanır.
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const { success: rateLimitOk } = authLimiter.check(`otp-verify:${authUser.id}`);
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const phone = normalizePhone((body?.phone || '').toString());
    const code = (body?.code || '').toString().trim();
    if (!phone || !code) {
      return NextResponse.json({ error: 'Telefon ve kod gerekli' }, { status: 400 });
    }

    const otp = await prisma.phoneOtp.findFirst({
      where: { userId: authUser.id, phone, used: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) {
      return NextResponse.json({ error: 'Aktif doğrulama kodu bulunamadı' }, { status: 400 });
    }
    if (otp.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Kodun süresi dolmuş' }, { status: 400 });
    }
    if (otp.attempts >= MAX_ATTEMPTS) {
      await prisma.phoneOtp.update({ where: { id: otp.id }, data: { used: true } });
      return NextResponse.json({ error: 'Çok fazla hatalı deneme. Yeni kod isteyin.' }, { status: 400 });
    }

    if (otp.code !== code) {
      await prisma.phoneOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      return NextResponse.json({ error: 'Kod hatalı', remainingAttempts: MAX_ATTEMPTS - otp.attempts - 1 }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.phoneOtp.update({ where: { id: otp.id }, data: { used: true } }),
      prisma.user.update({ where: { id: authUser.id }, data: { phone, phoneVerified: true } }),
    ]);

    return NextResponse.json({ success: true, message: 'Telefon numaranız doğrulandı.' });
  } catch (error) {
    console.error('verify-otp error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
