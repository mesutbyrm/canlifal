/**
 * lib/rate-limit-guard.ts — Request-aware rate limiting guard.
 *
 * Builds on the existing in-memory `lib/rate-limiter.ts` primitive and adds:
 *   - automatic identity resolution (userId when authenticated, else client IP)
 *   - RemoteConfig-driven limits (the `rate_limits` config seeded in Phase 2)
 *   - standard X-RateLimit-* / Retry-After response headers
 *
 * Usage in a route handler:
 *
 *   const limited = await guardRateLimit(req, 'gift_send', { userId })
 *   if (limited) return limited
 *
 * Returns null when the request is allowed, or a 429 NextResponse when it is not.
 * Existing routes that call `heavyLimiter.check(...)` directly keep working —
 * this is an additive convenience layer, not a replacement.
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limiter'
import { getCached } from '@/lib/cache'
import prisma from '@/lib/db'

// ─── Defaults (used when RemoteConfig has no entry for the bucket) ───
// Values are "max requests per minute".
export const DEFAULT_RATE_LIMITS: Record<string, number> = {
  api_default: 60,
  auth: 10, // per 15 min — see WINDOW_OVERRIDES
  gift_send: 10,
  lucky_gift: 10,
  chat_message: 30,
  comment: 20,
  content_create: 10,
  withdrawal: 5,
  payment: 10,
  stream_create: 5,
  room_create: 5,
  pk_create: 10,
  agency_action: 5,
  tip: 10,
  membership: 5,
  report: 5,
  upload: 5,
  rtc_telemetry: 30,
}

// Buckets whose window is not the default 60s.
const WINDOW_OVERRIDES: Record<string, number> = {
  auth: 15 * 60 * 1000, // 15 minutes
}

const DEFAULT_WINDOW_MS = 60 * 1000

// ─── Limit resolution (RemoteConfig `rate_limits`, 60s cache) ───
async function getConfiguredLimits(): Promise<Record<string, number>> {
  try {
    return await getCached('ratelimit:config', 60, async () => {
      const row = await prisma.remoteConfig.findUnique({ where: { key: 'rate_limits' } })
      const value = (row?.value ?? {}) as Record<string, unknown>
      const parsed: Record<string, number> = {}
      for (const [k, v] of Object.entries(value)) {
        const n = Number(v)
        if (Number.isFinite(n) && n > 0) parsed[k] = n
      }
      return parsed
    })
  } catch {
    // Never let a config lookup failure block a request.
    return {}
  }
}

export async function resolveLimit(bucket: string): Promise<number> {
  const configured = await getConfiguredLimits()
  return (
    configured[bucket] ??
    DEFAULT_RATE_LIMITS[bucket] ??
    configured.api_default ??
    DEFAULT_RATE_LIMITS.api_default
  )
}

// ─── Client identity ───
export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || req.ip || 'unknown'
}

/** Prefers the authenticated userId, falls back to client IP. */
export function resolveIdentity(req: NextRequest, userId?: string | null): string {
  return userId ? `u:${userId}` : `ip:${getClientIp(req)}`
}

// ─── Guard ───
export type RateLimitOptions = {
  /** Authenticated user id, when the route already resolved it. */
  userId?: string | null
  /** Override the per-window request cap (skips RemoteConfig lookup). */
  limit?: number
  /** Override the window length in milliseconds. */
  windowMs?: number
  /** Turkish message returned to the client on 429. */
  message?: string
}

/**
 * Checks the rate limit for `bucket`.
 * @returns null when allowed, a 429 NextResponse when the limit is exceeded.
 */
export async function guardRateLimit(
  req: NextRequest,
  bucket: string,
  options: RateLimitOptions = {}
): Promise<NextResponse | null> {
  const limit = options.limit ?? (await resolveLimit(bucket))
  const windowMs = options.windowMs ?? WINDOW_OVERRIDES[bucket] ?? DEFAULT_WINDOW_MS

  const limiter = rateLimit({ interval: windowMs, maxRequests: limit })
  const identity = resolveIdentity(req, options.userId)
  const { success, remaining, resetAt } = limiter.check(`${bucket}:${identity}`)

  if (success) return null

  const retryAfterSec = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: options.message ?? 'Çok fazla istek gönderdiniz, lütfen biraz bekleyin',
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
      },
    }
  )
}
