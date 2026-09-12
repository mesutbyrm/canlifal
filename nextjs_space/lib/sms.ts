// Sağlayıcı-bağımsız SMS gönderim yardımcısı (OTP için).
// Güvenli-kapalı (safe-closed): ilgili ortam değişkenleri ayarlı değilse
// yapılandırılmamış sayılır ve çağrı rotası 503 döner.
// Desteklenen sağlayıcılar: netgsm, twilio.

type SmsResult = { ok: boolean; reason?: string; providerId?: string };

export function getSmsProvider(): string {
  return (process.env.SMS_PROVIDER || '').toLowerCase().trim();
}

export function isSmsConfigured(): boolean {
  const provider = getSmsProvider();
  if (provider === 'netgsm') {
    return !!(process.env.NETGSM_USERNAME && process.env.NETGSM_PASSWORD && process.env.NETGSM_HEADER);
  }
  if (provider === 'twilio') {
    return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
  }
  return false;
}

// E.164 / yerel format normalizasyonu (Türkiye varsayılanı).
export function normalizePhone(raw: string): string {
  let p = (raw || '').replace(/[^0-9+]/g, '');
  if (!p) return '';
  if (p.startsWith('+')) return p;
  if (p.startsWith('00')) return '+' + p.slice(2);
  if (p.startsWith('0')) return '+90' + p.slice(1);
  if (p.startsWith('90')) return '+' + p;
  if (p.length === 10) return '+90' + p; // 10 haneli çıplak numara -> TR
  return p;
}

async function sendViaNetgsm(phone: string, message: string): Promise<SmsResult> {
  try {
    const usercode = process.env.NETGSM_USERNAME as string;
    const password = process.env.NETGSM_PASSWORD as string;
    const header = process.env.NETGSM_HEADER as string;
    const gsmno = phone.replace('+', '');
    const params = new URLSearchParams({ usercode, password, gsmno, message, msgheader: header });
    const res = await fetch('https://api.netgsm.com.tr/sms/send/get?' + params.toString(), { method: 'GET' });
    const text = (await res.text()).trim();
    const code = text.split(' ')[0]; // '00'/'01'/'02' = kabul edildi
    if (code === '00' || code === '01' || code === '02') {
      return { ok: true, providerId: text };
    }
    return { ok: false, reason: 'netgsm_error_' + text };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'netgsm_exception' };
  }
}

async function sendViaTwilio(phone: string, message: string): Promise<SmsResult> {
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID as string;
    const token = process.env.TWILIO_AUTH_TOKEN as string;
    const from = process.env.TWILIO_FROM_NUMBER as string;
    const url = 'https://api.twilio.com/2010-04-01/Accounts/' + sid + '/Messages.json';
    const body = new URLSearchParams({ To: phone, From: from, Body: message });
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(sid + ':' + token).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    const json: any = await res.json().catch(() => ({}));
    if (res.ok && json?.sid) {
      return { ok: true, providerId: json.sid };
    }
    return { ok: false, reason: 'twilio_error_' + (json?.message || res.status) };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'twilio_exception' };
  }
}

export async function sendSms(phone: string, message: string): Promise<SmsResult> {
  if (!isSmsConfigured()) {
    return { ok: false, reason: 'sms_not_configured' };
  }
  const provider = getSmsProvider();
  const normalized = normalizePhone(phone);
  if (!normalized) return { ok: false, reason: 'invalid_phone' };
  if (provider === 'netgsm') return sendViaNetgsm(normalized, message);
  if (provider === 'twilio') return sendViaTwilio(normalized, message);
  return { ok: false, reason: 'unknown_provider' };
}
