/**
 * Simple in-memory rate limiter.
 * Token bucket algorithm - lightweight, no external dependencies.
 */

interface RateLimitEntry {
  tokens: number
  lastRefill: number
}

const buckets = new Map<string, RateLimitEntry>()

/**
 * Check rate limit for a given key.
 * @param key - Unique identifier (e.g., IP or userId)
 * @param maxTokens - Maximum requests in the window
 * @param refillRate - Tokens added per second
 * @returns { allowed: boolean, remaining: number, retryAfter?: number }
 */
export function checkRateLimit(
  key: string,
  maxTokens: number = 60,
  refillRate: number = 1
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now()
  let entry = buckets.get(key)

  if (!entry) {
    entry = { tokens: maxTokens - 1, lastRefill: now }
    buckets.set(key, entry)
    return { allowed: true, remaining: entry.tokens }
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - entry.lastRefill) / 1000
  entry.tokens = Math.min(maxTokens, entry.tokens + elapsed * refillRate)
  entry.lastRefill = now

  if (entry.tokens < 1) {
    const retryAfter = Math.ceil((1 - entry.tokens) / refillRate)
    return { allowed: false, remaining: 0, retryAfter }
  }

  entry.tokens -= 1
  return { allowed: true, remaining: Math.floor(entry.tokens) }
}

/**
 * Get rate limit key from request.
 * Uses userId if authenticated, otherwise IP.
 */
export function getRateLimitKey(req: Request, userId?: string): string {
  if (userId) return `user:${userId}`
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  return `ip:${ip}`
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  const maxAge = 10 * 60 * 1000 // 10 minutes
  for (const [key, entry] of buckets) {
    if (now - entry.lastRefill > maxAge) {
      buckets.delete(key)
    }
  }
}, 5 * 60 * 1000)
