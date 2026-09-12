import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { authenticateRequest } from '@/lib/mobile-auth';
import { isSmsConfigured, normalizePhone, sendSms } from '@/lib/sms';
import { authLimiter } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

// Telefon doğrulama OTP kodu gönderir. Web (NextAuth) ve mobil (Bearer JWT) destekler.
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    if (!isSmsConfigured()) {
      return NextResponse.json(
        { error: 'SMS servisi yapılandırılmamış', code: 'SERVICE_UNAVAILABLE' },
        { status: 503 }
      );
    }

    const { success: rateLimitOk } = authLimiter.check(`otp-send:${authUser.id}`);
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const phone = normalizePhone((body?.phone || '').toString());
    if (!phone || phone.length < 8) {
      return NextResponse.json({ error: 'Geçerli bir telefon numarası girin' }, { status: 400 });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 haneli
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 dakika

    // Önceki kullanılmamış kodları geçersiz kıl
    await prisma.phoneOtp.updateMany({
      where: { userId: authUser.id, used: false },
      data: { used: true },
    });

    await prisma.phoneOtp.create({
      data: { userId: authUser.id, phone, code, expiresAt },
    });

    const result = await sendSms(phone, `Canlifal doğrulama kodunuz: ${code}. 5 dakika geçerlidir.`);
    if (!result.ok) {
      return NextResponse.json({ error: 'SMS gönderilemedi', reason: result.reason }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: 'Doğrulama kodu gönderildi.' });
  } catch (error) {
    console.error('send-otp error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
