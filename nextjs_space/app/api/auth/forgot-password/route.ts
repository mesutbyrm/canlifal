import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { randomBytes } from 'crypto';
import { sendNotificationEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Generate reset token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate existing tokens
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true }
    });

    // Create new token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    });

    // Send reset email
    const resetLink = `${process.env.NEXTAUTH_URL || 'https://falci.kulaktan.com'}/tr/reset-password?token=${token}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 100%); color: #fff; border-radius: 12px;">
        <h1 style="color: #d4af37; text-align: center; font-size: 28px; margin-bottom: 20px;">🔮 FALCI</h1>
        <h2 style="color: #d4af37; text-align: center;">Şifre Sıfırlama</h2>
        <p style="color: #e0d6eb; text-align: center; font-size: 16px;">Merhaba ${user.name},</p>
        <p style="color: #e0d6eb; text-align: center; font-size: 16px;">Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #d4af37, #ffd700); color: #1a0b2e; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Şifremi Sıfırla</a>
        </div>
        <p style="color: #9f8bb8; text-align: center; font-size: 14px;">Bu link 1 saat içinde geçerliliğini yitirecektir.</p>
        <p style="color: #9f8bb8; text-align: center; font-size: 14px;">Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
        <hr style="border: none; border-top: 1px solid #3d2b5e; margin: 30px 0;" />
        <p style="color: #9f8bb8; text-align: center; font-size: 12px;">© 2024 FALCI - Tüm hakları saklıdır.</p>
      </div>
    `;

    try {
      await sendNotificationEmail({
        notificationId: process.env.NOTIF_ID_PASSWORD_RESET || '',
        recipientEmail: user.email,
        subject: 'FALCI - Şifre Sıfırlama',
        htmlBody: emailHtml
      });
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
