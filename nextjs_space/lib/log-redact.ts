/**
 * lib/log-redact.ts — Log/hata maskeleme yardımcıları.
 * API key, parola, secret, private key, token, OTP kodu ve service account JSON
 * hiçbir log satırına düz metin olarak yazılmaz.
 */

const SENSITIVE_KEYS = [
  'password', 'passwd', 'pwd', 'secret', 'apikey', 'api_key', 'api-key', 'apisecret', 'api_secret',
  'token', 'access_token', 'refresh_token', 'accesstoken', 'refreshtoken', 'authorization',
  'auth_token', 'authtoken', 'private_key', 'privatekey', 'service_account_json', 'serviceaccountjson',
  'shared_secret', 'sharedsecret', 'code', 'otp', 'otpcode', 'receipt', 'receipt-data', 'receiptdata',
  'purchasetoken', 'purchase_token', 'client_secret', 'clientsecret', 'auth_id', 'authtoken',
]

export const REDACTED = '********'

function isSensitive(key: string): boolean {
  const k = key.toLowerCase().replace(/[^a-z_]/g, '')
  return SENSITIVE_KEYS.some((s) => k === s.replace(/[^a-z_]/g, '') || k.includes(s.replace(/[^a-z_]/g, '')))
}

/** Nesne içindeki hassas alanları maskeler (derin). */
export function redact(input: any, depth = 0): any {
  if (depth > 6) return '[depth]'
  if (input == null) return input
  if (typeof input === 'string') return redactString(input)
  if (typeof input !== 'object') return input
  if (Array.isArray(input)) return input.map((v) => redact(v, depth + 1))
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(input)) {
    out[k] = isSensitive(k) ? REDACTED : redact(v, depth + 1)
  }
  return out
}

/** Serbest metinde bilinen secret desenlerini maskeler. */
export function redactString(s: string): string {
  if (!s) return s
  return s
    .replace(/(Bearer)\s+[A-Za-z0-9._\-]+/gi, `$1 ${REDACTED}`)
    .replace(/(Basic)\s+[A-Za-z0-9+/=]+/gi, `$1 ${REDACTED}`)
    .replace(/(AccessKey)\s+[A-Za-z0-9._\-]+/gi, `$1 ${REDACTED}`)
    .replace(/(App)\s+[A-Za-z0-9._\-]{16,}/g, `$1 ${REDACTED}`)
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, REDACTED)
    .replace(/("private_key"\s*:\s*)"[^"]*"/g, `$1"${REDACTED}"`)
    .replace(/([?&](password|pwd|apikey|api_key|token|secret)=)[^&\s]+/gi, `$1${REDACTED}`)
}

/** HTTP header'larını maskeler. */
export function redactHeaders(h: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(h || {})) {
    out[k] = isSensitive(k) ? REDACTED : typeof v === 'string' ? redactString(v) : v
  }
  return out
}

/** Telefon numarasını loglama için maskeler: +90555****678 */
export function maskPhone(phone: string): string {
  const p = (phone || '').trim()
  if (p.length < 7) return '***'
  return p.slice(0, Math.min(6, p.length - 4)) + '****' + p.slice(-3)
}

/** Güvenli konsol logu. */
export function safeLog(scope: string, message: string, meta?: any) {
  if (meta === undefined) {
    console.log(`[${scope}] ${redactString(message)}`)
  } else {
    console.log(`[${scope}] ${redactString(message)}`, redact(meta))
  }
}

export function safeError(scope: string, message: string, err?: unknown) {
  const detail = err instanceof Error ? redactString(err.message) : err ? redactString(String(err)) : ''
  console.error(`[${scope}] ${redactString(message)}${detail ? ' :: ' + detail : ''}`)
}
