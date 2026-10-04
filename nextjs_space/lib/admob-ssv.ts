import crypto from 'crypto'

/**
 * Google AdMob Server-Side Verification (SSV) imza doğrulaması.
 *
 * Google ödüllü reklam bitince sunucuya imzalı bir GET isteği gönderir.
 * İmzalanan içerik, HAM sorgu dizesinin `signature=` parametresinden
 * ÖNCEKİ kısmıdır. Parametre sırası ve yüzde kodlaması aynen korunmalıdır;
 * sorgu yeniden serileştirilirse imza tutmaz.
 *
 * Doğrulama: ECDSA (P-256) + SHA-256, imza base64url kodlu DER.
 * Anahtarlar: https://www.gstatic.com/admob/reward/verifier-keys.json
 */

export const VERIFIER_KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json'
// AdMob konsolundaki "URL'yi doğrula" testi bu ayrı (test) anahtarlarla imzalanır.
export const TEST_VERIFIER_KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys-test.json'

const KEY_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 saat
const REFRESH_COOLDOWN_MS = 60 * 1000 // bilinmeyen key_id için en fazla dakikada bir yenile

type VerifierKey = { keyId: number | string; pem: string; base64?: string }

type KeyCache = { fetchedAt: number; keys: Map<string, string> }

let keyCache: KeyCache | null = null
let lastRefreshAttemptAt = 0

async function fetchVerifierKeys(url: string = VERIFIER_KEYS_URL): Promise<KeyCache | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const json = (await res.json()) as { keys?: VerifierKey[] }
    const keys = new Map<string, string>()
    for (const k of json.keys || []) {
      if (k?.keyId !== undefined && k?.pem) keys.set(String(k.keyId), k.pem)
    }
    if (keys.size === 0) return null
    return { fetchedAt: Date.now(), keys }
  } catch {
    return null
  }
}

/**
 * Test/geliştirme amaçlı anahtar enjeksiyonu. Üretim akışında kullanılmaz.
 */
export function __setVerifierKeyForTest(keyId: string, pem: string) {
  if (!keyCache) keyCache = { fetchedAt: Date.now(), keys: new Map() }
  keyCache.keys.set(String(keyId), pem)
}

/**
 * key_id'ye karşılık gelen açık anahtarı döndürür.
 * Önbellek bayatsa veya key_id bilinmiyorsa listeyi (en fazla dakikada bir) yeniler.
 */
export async function getVerifierKeyPem(keyId: string): Promise<string | null> {
  const now = Date.now()
  const stale = !keyCache || now - keyCache.fetchedAt > KEY_CACHE_TTL_MS
  const unknown = !keyCache?.keys.has(keyId)

  if (stale || unknown) {
    if (now - lastRefreshAttemptAt > REFRESH_COOLDOWN_MS || stale) {
      lastRefreshAttemptAt = now
      const fresh = await fetchVerifierKeys()
      if (fresh) {
        // Test anahtarları varsa korunur.
        if (keyCache) {
          for (const [k, v] of Array.from(keyCache.keys.entries())) {
            if (!fresh.keys.has(k)) fresh.keys.set(k, v)
          }
        }
        keyCache = fresh
      }
    }
  }

  return keyCache?.keys.get(keyId) ?? null
}

let testKeyCache: KeyCache | null = null

/** Test anahtarı (yalnız konsol doğrulama testi için); 24 saat önbelleklenir. */
async function getTestVerifierKeyPem(keyId: string): Promise<string | null> {
  if (!testKeyCache || Date.now() - testKeyCache.fetchedAt > KEY_CACHE_TTL_MS) {
    const fresh = await fetchVerifierKeys(TEST_VERIFIER_KEYS_URL)
    if (fresh) testKeyCache = fresh
  }
  return testKeyCache?.keys.get(keyId) ?? null
}

function base64UrlToBuffer(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(padded, 'base64')
}

/**
 * Ham sorgu dizesinden imzalanan içeriği ayırır.
 * Girdi: `request.url` içindeki `?` sonrası ham dize (yeniden serileştirilmemiş).
 */
export function extractSignedContent(rawQuery: string): {
  signedData: string
  signature: string
  keyId: string
} | null {
  const q = rawQuery.startsWith('?') ? rawQuery.slice(1) : rawQuery
  if (!q) return null

  let idx = q.indexOf('&signature=')
  let cut = idx >= 0 ? idx : q.startsWith('signature=') ? 0 : -1
  if (cut < 0) return null

  const signedData = q.substring(0, cut)
  const tail = q.substring(idx >= 0 ? idx + 1 : 0)
  const tailParams = new URLSearchParams(tail)
  const signature = tailParams.get('signature')
  const keyId = tailParams.get('key_id')

  if (!signature || !keyId) return null
  return { signedData, signature, keyId }
}

export type SsvFailureReason = 'missing_signature' | 'unknown_key' | 'bad_signature'

export type SsvVerifyResult = {
  ok: boolean
  reason?: SsvFailureReason
  signedData?: string
  keyId?: string
  /** Konsol doğrulama testi (test anahtarıyla imzalı): 200 dön, ASLA ödül verme. */
  isTest?: boolean
}

/**
 * Ham sorgu dizesini doğrular. Hiçbir koşulda exception fırlatmaz.
 */
export async function verifyAdMobSsvQuery(rawQuery: string): Promise<SsvVerifyResult> {
  const parts = extractSignedContent(rawQuery)
  if (!parts) return { ok: false, reason: 'missing_signature' }

  let pem = await getVerifierKeyPem(parts.keyId)
  let isTest = false
  if (!pem) {
    pem = await getTestVerifierKeyPem(parts.keyId)
    isTest = !!pem
  }
  if (!pem) return { ok: false, reason: 'unknown_key' }

  try {
    const verified = crypto
      .createVerify('SHA256')
      .update(parts.signedData, 'utf8')
      .verify(pem, base64UrlToBuffer(parts.signature))

    if (!verified) return { ok: false, reason: 'bad_signature' }
    return { ok: true, signedData: parts.signedData, keyId: parts.keyId, isTest }
  } catch {
    return { ok: false, reason: 'bad_signature' }
  }
}
