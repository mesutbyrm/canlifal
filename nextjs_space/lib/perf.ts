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

// Cleanup expired auth cache entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of authCache) {
    if (v.expiresAt <= now) authCache.delete(k)
  }
}, 5 * 60 * 1000)
