import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { randomBytes } from 'crypto';
import { sendNotificationEmail } from '@/lib/email-service';
import { authenticateRequest } from '@/lib/mobile-auth';
import { authLimiter } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

// E-posta doğrulama bağlantısı gönderir. Web (NextAuth) ve mobil (Bearer JWT) destekler.
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const { success: rateLimitOk } = authLimiter.check(`email-verify:${authUser.id}`);
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, email: true, name: true, emailVerified: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }
    if (user.emailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true, message: 'E-posta zaten doğrulanmış.' });
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat

    // Önceki kullanılmamış tokenları geçersiz kıl
    await prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    await prisma.emailVerificationToken.create({
      data: { userId: user.id, email: user.email, token, expiresAt },
    });

    const verifyLink = `${process.env.NEXTAUTH_URL || 'https://canlifal.com'}/e-posta-dogrula?token=${token}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 100%); color: #fff; border-radius: 12px;">
        <h1 style="color: #d4af37; text-align: center; font-size: 28px; margin-bottom: 20px;">🔮 Canlifal</h1>
        <h2 style="color: #d4af37; text-align: center;">E-posta Doğrulama</h2>
        <p style="color: #e0d6eb; text-align: center; font-size: 16px;">Merhaba ${user.name},</p>
        <p style="color: #e0d6eb; text-align: center; font-size: 16px;">E-posta adresinizi doğrulamak için aşağıdaki butona tıklayın:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyLink}" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #d4af37, #ffd700); color: #1a0b2e; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">E-postamı Doğrula</a>
        </div>
        <p style="color: #9f8bb8; text-align: center; font-size: 14px;">Bu bağlantı 24 saat içinde geçerliliğini yitirecektir.</p>
        <p style="color: #9f8bb8; text-align: center; font-size: 14px;">Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
        <hr style="border: none; border-top: 1px solid #3d2b5e; margin: 30px 0;" />
        <p style="color: #9f8bb8; text-align: center; font-size: 12px;">© 2026 Canlifal - Tüm hakları saklıdır.</p>
      </div>
    `;

    try {
      await sendNotificationEmail({
        notificationId: process.env.NOTIF_ID_EPOSTA_DORULAMA || '',
        recipientEmail: user.email,
        subject: 'Canlifal - E-posta Doğrulama',
        htmlBody: emailHtml,
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }

    return NextResponse.json({ success: true, message: 'Doğrulama e-postası gönderildi.' });
  } catch (error) {
    console.error('send-verification error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
