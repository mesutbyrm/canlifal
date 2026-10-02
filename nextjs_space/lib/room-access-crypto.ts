/**
 * VIP oda şifresi — saf (veritabanı/önbellek bağımsız) yardımcılar:
 * bcrypt hash, zaman-sabit karşılaştırma ve imzalı erişim jetonu.
 */
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret'

export const MAX_PASSWORD_ATTEMPTS = 3
/** Doğru şifreden sonra verilen jeton 2 saat geçerlidir (yeniden bağlanma için). */
export const ACCESS_TOKEN_TTL_MS = 2 * 60 * 60 * 1000
/** Oda sahibinin verdiği giriş izni 24 saat geçerlidir. */
export const APPROVAL_TTL_MS = 24 * 60 * 60 * 1000

/** Şifre kapısı: yalnızca VIP + şifresi tanımlı oda. */
export function isPasswordGatedRoom(room: { roomType?: string | null; password?: string | null }): boolean {
  return room.roomType === 'VIP' && !!room.password
}

export function isHashedPassword(stored: string): boolean {
  return /^\$2[aby]\$/.test(stored)
}

export async function hashRoomPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

/** Saklı değeri (hash veya eski düz metin) girilen şifreyle karşılaştırır. */
export async function matchesRoomPassword(stored: string, provided: string): Promise<boolean> {
  if (!provided) return false
  if (isHashedPassword(stored)) return bcrypt.compare(provided, stored)
  return safeEqual(stored, provided)
}

// ── İmzalı erişim jetonu ──────────────────────────────────────────────────
function sign(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
}

/** Saklı şifre değerinin kısa parmak izi: şifre değişince jetonlar düşer. */
function passwordFingerprint(stored: string | null | undefined): string {
  return crypto.createHash('sha256').update(stored || '').digest('hex').slice(0, 10)
}

export function issueRoomAccessToken(
  roomId: string,
  userId: string,
  storedPassword: string | null | undefined
): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + ACCESS_TOKEN_TTL_MS
  const payload = `${roomId}.${userId}.${expiresAt}.${passwordFingerprint(storedPassword)}`
  return { token: `${payload}.${sign(payload)}`, expiresAt }
}

export function verifyRoomAccessToken(
  token: unknown,
  roomId: string,
  userId: string,
  storedPassword: string | null | undefined
): boolean {
  if (typeof token !== 'string') return false
  const parts = token.split('.')
  if (parts.length !== 5) return false
  const [tRoom, tUser, tExp, tFp, tSig] = parts
  if (tRoom !== roomId || tUser !== userId) return false
  if (!(Number(tExp) > Date.now())) return false
  if (tFp !== passwordFingerprint(storedPassword)) return false
  return safeEqual(sign(`${tRoom}.${tUser}.${tExp}.${tFp}`), tSig)
}

