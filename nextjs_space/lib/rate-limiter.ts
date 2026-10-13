/**
 * Simple in-memory rate limiter for API routes
 * 
 * Usage:
 *   import { rateLimit } from '@/lib/rate-limiter'
 *   const limiter = rateLimit({ interval: 60000, maxRequests: 30 })
 *   
 *   // In API route:
 *   const { success } = limiter.check(identifier)
 *   if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 */

interface RateLimitConfig {
  interval: number  // Time window in milliseconds
  maxRequests: number  // Max requests per window
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

const limiters = new Map<string, Map<string, RateLimitEntry>>()

export function rateLimit(config: RateLimitConfig) {
  const key = `${config.interval}-${config.maxRequests}`
  
  if (!limiters.has(key)) {
    limiters.set(key, new Map())
  }
  
  const store = limiters.get(key)!
  
  // Cleanup old entries periodically
  const cleanup = () => {
    const now = Date.now()
    for (const [id, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(id)
    }
  }
  
  // Run cleanup every 5 minutes
  if (typeof globalThis !== 'undefined') {
    const cleanupKey = `_rateLimitCleanup_${key}`
    if (!(globalThis as any)[cleanupKey]) {
      ;(globalThis as any)[cleanupKey] = setInterval(cleanup, 5 * 60 * 1000)
    }
  }
  
  return {
    check(identifier: string): { success: boolean; remaining: number; resetAt: number } {
      const now = Date.now()
      const entry = store.get(identifier)
      
      if (!entry || entry.resetAt < now) {
        // New window
        store.set(identifier, { count: 1, resetAt: now + config.interval })
        return { success: true, remaining: config.maxRequests - 1, resetAt: now + config.interval }
      }
      
      if (entry.count >= config.maxRequests) {
        return { success: false, remaining: 0, resetAt: entry.resetAt }
      }
      
      entry.count++
      return { success: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt }
    }
  }
}

// Preset rate limiters for common use cases
export const apiLimiter = rateLimit({ interval: 60 * 1000, maxRequests: 60 }) // 60 req/min
export const authLimiter = rateLimit({ interval: 15 * 60 * 1000, maxRequests: 10 }) // 10 req/15min
export const heavyLimiter = rateLimit({ interval: 60 * 1000, maxRequests: 10 }) // 10 req/min
