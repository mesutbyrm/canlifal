// Email Notification Service

interface SendEmailParams {
  notificationId: string;
  recipientEmail: string;
  subject: string;
  htmlBody: string;
}

export async function sendNotificationEmail(params: SendEmailParams): Promise<{ success: boolean; message?: string }> {
  try {
    const appUrl = process.env.NEXTAUTH_URL || 'https://canlifal.com';
    const appName = 'Canlifal - Fortune Platform';
    const hostname = new URL(appUrl).hostname;

    const response = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: params.notificationId,
        subject: params.subject,
        body: params.htmlBody,
        is_html: true,
        recipient_email: params.recipientEmail,
        sender_email: `noreply@${hostname}`,
        sender_alias: appName,
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      if (result.notification_disabled) {
        console.log('Notification disabled by user, skipping email');
        return { success: true, message: 'Notification disabled' };
      }
      throw new Error(result.message || 'Failed to send notification');
    }

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Email Templates

export function getWelcomeEmailHtml(name: string, language: string): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 100%); padding: 40px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d4af37; font-size: 32px; margin: 0;">✨ Hoş Geldiniz! ✨</h1>
      </div>
      <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 12px; border: 1px solid rgba(212,175,55,0.3);">
        <p style="color: #e8e0f0; font-size: 18px; margin: 0 0 20px;">
          Sevgili <strong style="color: #d4af37;">${name}</strong>,
        </p>
        <p style="color: #c9b8e0; font-size: 16px; line-height: 1.8; margin: 0 0 20px;">
          Falcı platformuna hoş geldiniz! Geleceğinizi keşfetmeye hazır mısınız? Size <strong style="color: #ffd700;">10 ücretsiz CFC</strong> hediye ettik.
        </p>
        <p style="color: #c9b8e0; font-size: 16px; line-height: 1.8; margin: 0 0 20px;">
          Sunduğumuz fallar:
        </p>
        <ul style="color: #c9b8e0; font-size: 15px; line-height: 2; padding-left: 20px;">
          <li>☕ Kahve Falı</li>
          <li>🔮 Tarot Falı</li>
          <li>🌙 Rüya Yorumu</li>
          <li>⭐ Günlük Burç</li>
          <li>🔢 Numeroloji</li>
          <li>💕 Aşk Uyumu</li>
          <li>🎱 Evet/Hayır Kâhini</li>
        </ul>
      </div>
      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXTAUTH_URL}/fortunes" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #ffd700 100%); color: #1a0b2e; padding: 15px 40px; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 16px;">
          Falınıza Bakın
        </a>
      </div>
      <p style="color: #8b7aa8; font-size: 12px; text-align: center; margin-top: 30px;">
        © 2026 Canlifal
      </p>
    </div>
  `;
}

export function getNewUserSignupEmailHtml(name: string, email: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d4af37; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">🎉 Yeni Kullanıcı Kaydı</h2>
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 10px 0;"><strong>İsim:</strong> ${name}</p>
        <p style="margin: 10px 0;"><strong>E-posta:</strong> <a href="mailto:${email}">${email}</a></p>
        <p style="margin: 10px 0;"><strong>Kayıt Tarihi:</strong> ${new Date().toLocaleString('tr-TR')}</p>
      </div>
      <p style="color: #666; font-size: 14px;">Platformunuza yeni bir kullanıcı katıldı!</p>
    </div>
  `;
}

export function getContactFormEmailHtml(name: string, email: string, message: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d4af37; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">📬 Yeni İletişim Formu Mesajı</h2>
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 10px 0;"><strong>İsim:</strong> ${name}</p>
        <p style="margin: 10px 0;"><strong>E-posta:</strong> <a href="mailto:${email}">${email}</a></p>
        <p style="margin: 10px 0;"><strong>Mesaj:</strong></p>
        <div style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #d4af37;">
          ${message.replace(/\n/g, '<br>')}
        </div>
      </div>
      <p style="color: #666; font-size: 12px;">Gönderim tarihi: ${new Date().toLocaleString('tr-TR')}</p>
    </div>
  `;
}

export function getLowCreditsEmailHtml(name: string, credits: number, language: string): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 100%); padding: 40px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #ff9500; font-size: 28px; margin: 0;">⚠️ Düşük CFC Uyarısı</h1>
      </div>
      <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 12px; border: 1px solid rgba(255,149,0,0.3);">
        <p style="color: #e8e0f0; font-size: 18px; margin: 0 0 20px;">
          Sevgili <strong style="color: #d4af37;">${name}</strong>,
        </p>
        <p style="color: #c9b8e0; font-size: 16px; line-height: 1.8; margin: 0 0 20px;">
          Kalan CFC: <strong style="color: #ff9500;">${credits}</strong>. Fal bakmaya devam etmek için CFC satın almayı düşünün.
        </p>
      </div>
      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #ffd700 100%); color: #1a0b2e; padding: 15px 40px; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 16px;">
          CFC Al
        </a>
      </div>
    </div>
  `;
}

export function getFortuneReadingSummaryHtml(
  name: string, 
  fortuneType: string, 
  summary: string, 
  language: string
): string {
  const fortuneNames: Record<string, { name: string; emoji: string }> = {
    coffee: { name: 'Kahve Falı', emoji: '☕' },
    tarot: { name: 'Tarot Falı', emoji: '🔮' },
    dream: { name: 'Rüya Yorumu', emoji: '🌙' },
    horoscope: { name: 'Günlük Burç', emoji: '⭐' },
    numerology: { name: 'Numeroloji', emoji: '🔢' },
    love: { name: 'Aşk Uyumu', emoji: '💕' },
    yesno: { name: 'Evet/Hayır Kâhini', emoji: '🎱' },
  };
  
  const fortune = fortuneNames[fortuneType] || { name: fortuneType, emoji: '✨' };
  
  const truncatedSummary = summary.length > 500 ? summary.substring(0, 500) + '...' : summary;
  
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 100%); padding: 40px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d4af37; font-size: 28px; margin: 0;">${fortune.emoji} ${fortune.name}</h1>
      </div>
      <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 12px; border: 1px solid rgba(212,175,55,0.3);">
        <p style="color: #e8e0f0; font-size: 18px; margin: 0 0 20px;">
          Sevgili <strong style="color: #d4af37;">${name}</strong>,
        </p>
        <p style="color: #c9b8e0; font-size: 14px; margin: 0 0 15px;">
          İşte falınızın özeti:
        </p>
        <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 8px; border-left: 4px solid #d4af37;">
          <p style="color: #e8e0f0; font-size: 15px; line-height: 1.8; margin: 0; white-space: pre-wrap;">${truncatedSummary}</p>
        </div>
      </div>
      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #ffd700 100%); color: #1a0b2e; padding: 15px 40px; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 16px;">
          Geçmiş Fallarım
        </a>
      </div>
      <p style="color: #8b7aa8; font-size: 12px; text-align: center; margin-top: 30px;">
        ${new Date().toLocaleString('tr-TR')}
      </p>
    </div>
  `;
}
