/**
 * lib/crypto-vault.ts — Entegrasyon secret'ları için AES-256-GCM şifreleme.
 *
 * KURALLAR:
 *  - Şifreleme anahtarı veritabanında DEĞİL, ortam değişkenindedir (SECRETS_ENCRYPTION_KEY).
 *  - Düz metin secret hiçbir zaman veritabanına yazılmaz.
 *  - Çözme işlemi yalnızca sunucu tarafında yapılır; API yanıtlarına asla konmaz.
 *  - SECRETS_ENCRYPTION_KEY yoksa NEXTAUTH_SECRET'ten scrypt ile türetilir
 *    (sistem kilitlenmesin diye); bu durum rapora "zayıf mod" olarak yansıtılır.
 */

import crypto from 'crypto'

const ALGO = 'aes-256-gcm'

export type CipherBundle = { ciphertext: string; iv: string; authTag: string; keyVersion: number }

let cachedKey: Buffer | null = null
let derivedFallback = false

function resolveKey(): Buffer {
  if (cachedKey) return cachedKey
  const raw = (process.env.SECRETS_ENCRYPTION_KEY || '').trim()
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    cachedKey = Buffer.from(raw, 'hex')
    derivedFallback = false
    return cachedKey
  }
  if (raw.length >= 32) {
    cachedKey = crypto.createHash('sha256').update(raw).digest()
    derivedFallback = false
    return cachedKey
  }
  const seed = process.env.NEXTAUTH_SECRET || ''
  if (!seed) {
    throw new Error('SECRETS_ENCRYPTION_KEY tanımlı değil')
  }
  cachedKey = crypto.scryptSync(seed, 'canlifal-integration-vault', 32)
  derivedFallback = true
  return cachedKey
}

/** Anahtar durumu (rapor / admin paneli için). Anahtarın kendisini ASLA döndürmez. */
export function vaultKeyStatus(): { configured: boolean; mode: 'dedicated' | 'derived' | 'missing' } {
  try {
    resolveKey()
    return { configured: true, mode: derivedFallback ? 'derived' : 'dedicated' }
  } catch {
    return { configured: false, mode: 'missing' }
  }
}

export function encryptSecret(plain: string): CipherBundle {
  const key = resolveKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return {
    ciphertext: enc.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    keyVersion: 1,
  }
}

export function decryptSecret(bundle: { ciphertext: string; iv: string; authTag: string }): string | null {
  try {
    const key = resolveKey()
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(bundle.iv, 'base64'))
    decipher.setAuthTag(Buffer.from(bundle.authTag, 'base64'))
    const dec = Buffer.concat([decipher.update(Buffer.from(bundle.ciphertext, 'base64')), decipher.final()])
    return dec.toString('utf8')
  } catch {
    return null
  }
}

/** Admin panelinde gösterilecek maske. Gerçek değerden hiçbir parça sızdırmaz. */
export const SECRET_MASK = '**************'

/** OTP kodları için HMAC (düz metin kod saklanmaz). */
export function hmacCode(code: string, salt: string): string {
  let key: Buffer
  try {
    key = resolveKey()
  } catch {
    key = crypto.createHash('sha256').update(process.env.NEXTAUTH_SECRET || 'fallback').digest()
  }
  return crypto.createHmac('sha256', key).update(`${salt}:${code}`).digest('hex')
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}
