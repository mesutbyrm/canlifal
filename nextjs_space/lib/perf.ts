/**
 * Performance utilities for API routes.
 * - Response compression hints
 * - Cache-Control headers for Flutter
 * - ETag support for conditional requests
 * - Request timing
 */

import { NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * Add performance headers to API responses.
 * Adds Cache-Control, ETag, and timing headers.
 */
export function withPerfHeaders(
  data: any,
  options: {
    maxAge?: number     // Cache-Control max-age in seconds (0 = no-cache)
    staleWhileRevalidate?: number
    etag?: boolean      // Generate ETag from response body
    status?: number
    requestStart?: number  // Date.now() at request start for timing header
  } = {}
): NextResponse {
  const { maxAge = 0, staleWhileRevalidate = 0, etag = false, status = 200, requestStart } = options
  const body = JSON.stringify(data)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Vary': 'Authorization, Accept-Encoding',
  }

  // Cache-Control
  if (maxAge > 0) {
    let cc = `public, max-age=${maxAge}`
    if (staleWhileRevalidate > 0) {
      cc += `, stale-while-revalidate=${staleWhileRevalidate}`
    }
    headers['Cache-Control'] = cc
  } else {
    headers['Cache-Control'] = 'no-cache, no-store'
  }

  // ETag for conditional requests (304 support)
  if (etag) {
    const hash = crypto.createHash('md5').update(body).digest('hex').slice(0, 16)
    headers['ETag'] = `"${hash}"`
  }

  // Server timing
  if (requestStart) {
    const elapsed = Date.now() - requestStart
    headers['Server-Timing'] = `total;dur=${elapsed}`
    headers['X-Response-Time'] = `${elapsed}ms`
  }

  return new NextResponse(body, { status, headers })
}

/**
 * Check If-None-Match header for 304 response.
 * Returns true if the client's cached version is still valid.
 */
export function checkETag(request: Request, data: any): NextResponse | null {
  const ifNoneMatch = request.headers.get('if-none-match')
  if (!ifNoneMatch) return null

  const body = JSON.stringify(data)
  const hash = crypto.createHash('md5').update(body).digest('hex').slice(0, 16)
  const etag = `"${hash}"`

  if (ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { 'ETag': etag, 'Cache-Control': 'public, max-age=10' }
    })
  }
  return null
}

/**
 * Lightweight auth cache for mobile JWT.
 * Avoids DB lookup on every request for recently verified tokens.
 * TTL: 60 seconds.
 */
const authCache = new Map<string, { user: any; expiresAt: number }>()
const AUTH_CACHE_TTL = 60_000 // 60 seconds

export function getCachedAuth(token: string): any | null {
  const entry = authCache.get(token)
  if (entry && entry.expiresAt > Date.now()) {
    return entry.user
  }
  if (entry) authCache.delete(token)
  return null
}

export function setCachedAuth(token: string, user: any): void {
  authCache.set(token, { user, expiresAt: Date.now() + AUTH_CACHE_TTL })
  // Prevent memory leak: limit cache size
  if (authCache.size > 1000) {
    const now = Date.now()
    for (const [k, v] of authCache) {
      if (v.expiresAt <= now) authCache.delete(k)
    }
    // If still too large, remove oldest 200
    if (authCache.size > 800) {
      const keys = Array.from(authCache.keys())
      for (let i = 0; i < 200; i++) authCache.delete(keys[i])
    }
  }
}

/** Tek bir token'ın auth önbelleğini anında düşürür (logout / revoke). */
export function invalidateCachedAuth(token: string): void {
  authCache.delete(token)
}

/** Bir kullanıcıya ait tüm auth önbellek girdilerini düşürür (logout-all). */
export function clearAuthCacheForUser(userId: string): void {
  for (const [k, v] of authCache) {
    if (v?.user?.id === userId) authCache.delete(k)
  }
}

// Cleanup expired auth cache entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of authCache) {
    if (v.expiresAt <= now) authCache.delete(k)
  }
}, 5 * 60 * 1000)

/**
 * ---------------------------------------------------------------------------
 * Response-time monitoring (in-memory, per running instance)
 * ---------------------------------------------------------------------------
 * Lightweight timing tracker. Records per-route aggregate stats and keeps a
 * small ring buffer of the slowest recent requests. Exposed (admin-gated) via
 * /api/monitoring so slow endpoints (>500ms) can be inspected in production
 * without any external APM service.
 *
 * Zero external dependencies, bounded memory (aggregates capped, ring buffer
 * fixed at SLOW_BUFFER_MAX). Safe to call on hot paths.
 */
export const SLOW_THRESHOLD_MS = 500
const SLOW_BUFFER_MAX = 100
const ROUTE_STATS_MAX = 300

type RouteStat = {
  route: string
  count: number
  totalMs: number
  maxMs: number
  slowCount: number      // requests over SLOW_THRESHOLD_MS
  lastMs: number
  lastAt: number
}

type SlowSample = {
  route: string
  ms: number
  at: number
  method?: string
}

const routeStats = new Map<string, RouteStat>()
const slowBuffer: SlowSample[] = []

/**
 * Record a single request timing for a route. Call once per request with the
 * elapsed milliseconds. Keeps aggregates + a ring buffer of slow samples and
 * logs a warning line for anything over the threshold.
 */
export function recordTiming(route: string, ms: number, method?: string): void {
  try {
    let stat = routeStats.get(route)
    if (!stat) {
      // Bound the number of tracked routes to avoid unbounded growth.
      if (routeStats.size >= ROUTE_STATS_MAX) {
        const oldestKey = routeStats.keys().next().value
        if (oldestKey) routeStats.delete(oldestKey)
      }
      stat = { route, count: 0, totalMs: 0, maxMs: 0, slowCount: 0, lastMs: 0, lastAt: 0 }
      routeStats.set(route, stat)
    }
    stat.count += 1
    stat.totalMs += ms
    stat.maxMs = Math.max(stat.maxMs, ms)
    stat.lastMs = ms
    stat.lastAt = Date.now()

    if (ms > SLOW_THRESHOLD_MS) {
      stat.slowCount += 1
      slowBuffer.push({ route, ms, at: Date.now(), method })
      if (slowBuffer.length > SLOW_BUFFER_MAX) slowBuffer.shift()
      // eslint-disable-next-line no-console
      console.warn(`[PERF] SLOW ${method || ''} ${route} ${ms}ms (>${SLOW_THRESHOLD_MS}ms)`)
    }
  } catch {
    // never let monitoring break a request
  }
}

/**
 * Wrap an async route handler so its total duration is recorded automatically.
 * Usage:  export const GET = withTiming('/api/foo', async (req) => {...})
 */
export function withTiming<T extends (...args: any[]) => Promise<any>>(
  route: string,
  handler: T
): T {
  return (async (...args: any[]) => {
    const start = Date.now()
    const method = (args[0] && typeof args[0].method === 'string') ? args[0].method : undefined
    try {
      return await handler(...args)
    } finally {
      recordTiming(route, Date.now() - start, method)
    }
  }) as T
}

/** Snapshot of monitoring data for the admin endpoint. */
export function getMonitoringSnapshot() {
  const routes = Array.from(routeStats.values())
    .map((s) => ({
      route: s.route,
      count: s.count,
      avgMs: s.count ? Math.round(s.totalMs / s.count) : 0,
      maxMs: s.maxMs,
      slowCount: s.slowCount,
      lastMs: s.lastMs,
      lastAt: s.lastAt,
    }))
    .sort((a, b) => b.avgMs - a.avgMs)

  const slowRoutes = routes.filter((r) => r.avgMs > SLOW_THRESHOLD_MS || r.slowCount > 0)

  const mem = process.memoryUsage()
  return {
    thresholdMs: SLOW_THRESHOLD_MS,
    trackedRoutes: routes.length,
    routes,
    slowRoutes,
    recentSlow: [...slowBuffer].reverse(),
    memory: {
      rssMB: Math.round(mem.rss / 1048576),
      heapUsedMB: Math.round(mem.heapUsed / 1048576),
      heapTotalMB: Math.round(mem.heapTotal / 1048576),
      externalMB: Math.round((mem.external || 0) / 1048576),
    },
    uptimeSec: Math.round(process.uptime()),
    at: Date.now(),
  }
}
