import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/db'

/**
 * ---------------------------------------------------------------------------
 * Mobil JWT iptali (revocation)
 * ---------------------------------------------------------------------------
 * Mevcut sistem stateless JWT kullanıyordu; çıkış yapmak token'ı geçersiz
 * kılmıyordu. Bu modül GERİYE DÖNÜK UYUMLU bir iptal katmanı ekler:
 *
 *  - Hiçbir iptal kaydı yoksa davranış eskisiyle birebir aynıdır.
 *  - Tek token iptali  -> `revoked_tokens` tablosunda sha256(token) kaydı.
 *  - Tüm cihazlar      -> `user_token_revocations.revokedAt` damgası; bu
 *                        tarihten ÖNCE üretilmiş (iat) token'lar reddedilir.
 *
 * Performans: her istekte DB'ye gitmemek için 30 sn TTL'li süreç içi önbellek
 * kullanılır. Bu nedenle iptal en geç ~30 sn (+ lib/perf auth cache 60 sn)
 * içinde tüm örneklerde etkili olur.
 */

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

const REVOKE_CACHE_TTL = 30_000

const singleCache = new Map<string, { revoked: boolean; expiresAt: number }>()
const userCache = new Map<string, { revokedAtMs: number; expiresAt: number }>()

function cacheCleanup() {
  const now = Date.now()
  if (singleCache.size > 5000) {
    for (const [k, v] of singleCache) if (v.expiresAt <= now) singleCache.delete(k)
  }
  if (userCache.size > 5000) {
    for (const [k, v] of userCache) if (v.expiresAt <= now) userCache.delete(k)
  }
}

/** Token tek tek iptal edilmiş mi? */
export async function isTokenRevoked(token: string): Promise<boolean> {
  const h = hashToken(token)
  const now = Date.now()
  const cached = singleCache.get(h)
  if (cached && cached.expiresAt > now) return cached.revoked

  let revoked = false
  try {
    const row = await prisma.revokedToken.findUnique({
      where: { tokenHash: h },
      select: { id: true },
    })
    revoked = !!row
  } catch {
    revoked = false
  }
  singleCache.set(h, { revoked, expiresAt: now + REVOKE_CACHE_TTL })
  cacheCleanup()
  return revoked
}

/** Kullanıcının "tüm cihazlardan çıkış" damgası (ms) — yoksa 0. */
export async function getUserRevokedAt(userId: string): Promise<number> {
  const now = Date.now()
  const cached = userCache.get(userId)
  if (cached && cached.expiresAt > now) return cached.revokedAtMs

  let ms = 0
  try {
    const row = await prisma.userTokenRevocation.findUnique({
      where: { userId },
      select: { revokedAt: true },
    })
    ms = row ? row.revokedAt.getTime() : 0
  } catch {
    ms = 0
  }
  userCache.set(userId, { revokedAtMs: ms, expiresAt: now + REVOKE_CACHE_TTL })
  cacheCleanup()
  return ms
}

/**
 * Bir token hâlâ geçerli mi? (imza doğrulandıktan SONRA çağrılır)
 * `iat` saniye cinsindendir.
 */
export async function isTokenStillValid(
  token: string,
  payload: { userId: string; iat?: number }
): Promise<boolean> {
  if (await isTokenRevoked(token)) return false
  const revokedAtMs = await getUserRevokedAt(payload.userId)
  if (revokedAtMs > 0 && payload.iat && payload.iat * 1000 < revokedAtMs) return false
  return true
}

/** Tek bir token'ı iptal eder. */
export async function revokeToken(
  token: string,
  opts: { userId: string; tokenType?: 'access' | 'refresh'; reason?: string }
): Promise<boolean> {
  let exp: number | undefined
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null
    exp = decoded?.exp
  } catch {
    exp = undefined
  }
  const expiresAt = exp ? new Date(exp * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const h = hashToken(token)
  try {
    await prisma.revokedToken.upsert({
      where: { tokenHash: h },
      update: { reason: opts.reason ?? undefined },
      create: {
        tokenHash: h,
        userId: opts.userId,
        tokenType: opts.tokenType ?? 'access',
        reason: opts.reason ?? null,
        expiresAt,
      },
    })
  } catch {
    return false
  }
  singleCache.set(h, { revoked: true, expiresAt: Date.now() + REVOKE_CACHE_TTL })
  const { invalidateCachedAuth } = await import('@/lib/perf')
  invalidateCachedAuth(token)
  return true
}

/** Kullanıcının TÜM token'larını iptal eder (tüm cihazlardan çıkış). */
export async function revokeAllUserTokens(userId: string, reason?: string): Promise<void> {
  const now = new Date()
  await prisma.userTokenRevocation.upsert({
    where: { userId },
    update: { revokedAt: now, reason: reason ?? null },
    create: { userId, revokedAt: now, reason: reason ?? null },
  })
  userCache.set(userId, { revokedAtMs: now.getTime(), expiresAt: Date.now() + REVOKE_CACHE_TTL })
  const { clearAuthCacheForUser } = await import('@/lib/perf')
  clearAuthCacheForUser(userId)
}
