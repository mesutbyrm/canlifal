/**
 * Google ID token doğrulaması için kabul edilecek audience (client ID) listesi.
 *
 * Okunan değişkenler (öncelik sırası yok, hepsi birleştirilir):
 *  - GOOGLE_CLIENT_IDS        : virgülle ayrılmış birden fazla client ID
 *  - GOOGLE_CLIENT_ID         : tekil web client ID (mevcut davranış)
 *  - GOOGLE_SERVER_CLIENT_ID  : dokümantasyonda geçen takma ad
 *
 * Hiçbiri tanımlı değilse boş dizi döner; çağıran taraf bunu 500 ile
 * sonlandırmalı, sessizce geçmemelidir.
 */
export function resolveGoogleAudiences(
  env: Record<string, string | undefined> = process.env
): string[] {
  const raw = [
    ...(env.GOOGLE_CLIENT_IDS || '').split(','),
    env.GOOGLE_CLIENT_ID || '',
    env.GOOGLE_SERVER_CLIENT_ID || '',
  ]

  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    const v = item.trim()
    if (!v || seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

/** Loglara yazmak için client ID'yi kısaltır (tam değeri yazmamak için). */
export function maskClientId(id: string): string {
  if (!id) return '(boş)'
  if (id.length <= 12) return `${id.slice(0, 4)}…`
  return `${id.slice(0, 8)}…${id.slice(-12)}`
}

/**
 * Hatanın imza/audience kaynaklı mı yoksa ağ / Google anahtar getirme
 * kaynaklı mı olduğunu ayırt eder. Ağ hatasında 503, diğerinde 401 dönülmeli.
 */
export function isGoogleTransportError(e: any): boolean {
  const code = String(e?.code || '')
  if (['ENOTFOUND', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT'].includes(code)) {
    return true
  }
  const msg = String(e?.message || '').toLowerCase()
  return (
    msg.includes('federated signon certs') ||
    msg.includes('unable to fetch') ||
    msg.includes('failed to fetch') ||
    msg.includes('request to https://www.googleapis.com') ||
    msg.includes('socket hang up') ||
    msg.includes('network') ||
    msg.includes('getaddrinfo')
  )
}
