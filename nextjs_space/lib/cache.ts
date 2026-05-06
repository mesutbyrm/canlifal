/**
 * In-memory TTL cache for reducing database queries.
 * Thread-safe for Node.js single-threaded event loop.
 * 
 * Usage:
 *   import { getCached, invalidateCache, invalidateCachePrefix } from '@/lib/cache'
 *   const value = await getCached('platform:commission_rate', 300, () => fetchFromDB())
 *   invalidateCache('platform:commission_rate')  // manual invalidation
 *   invalidateCachePrefix('platform:')  // invalidate all platform settings
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<any>>()

// Pending promises to prevent thundering herd (multiple concurrent fetches for same key)
const pending = new Map<string, Promise<any>>()

/**
 * Get a cached value or fetch it if expired/missing.
 * @param key - Unique cache key
 * @param ttlSeconds - Time-to-live in seconds
 * @param fetcher - Async function to fetch the value if not cached
 */
export async function getCached<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const entry = cache.get(key)
  
  if (entry && entry.expiresAt > now) {
    return entry.value as T
  }

  // Check if there's already a pending fetch for this key (thundering herd protection)
  const existingPromise = pending.get(key)
  if (existingPromise) {
    return existingPromise as Promise<T>
  }

  // Fetch and cache
  const promise = fetcher().then(value => {
    cache.set(key, { value, expiresAt: now + ttlSeconds * 1000 })
    pending.delete(key)
    return value
  }).catch(err => {
    pending.delete(key)
    // If we have a stale entry, return it on error
    if (entry) {
      return entry.value as T
    }
    throw err
  })

  pending.set(key, promise)
  return promise
}

/**
 * Invalidate a specific cache key
 */
export function invalidateCache(key: string): void {
  cache.delete(key)
}

/**
 * Invalidate all cache keys starting with a prefix
 */
export function invalidateCachePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
}

/**
 * Get cache stats for debugging
 */
export function getCacheStats(): { size: number; keys: string[] } {
  // Clean expired entries
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key)
    }
  }
  return { size: cache.size, keys: Array.from(cache.keys()) }
}

// ============================================
// Pre-built cache helpers for common patterns
// ============================================

import prisma from '@/lib/db'

// Cache TTL constants (seconds)
export const CACHE_TTL = {
  PLATFORM_SETTING: 300,    // 5 minutes - settings rarely change
  GIFT_TYPES: 600,          // 10 minutes - gift catalog rarely changes
  PUBLIC_SETTINGS: 300,     // 5 minutes
  PAYMENT_METHODS: 600,     // 10 minutes
  CREDIT_PACKAGES: 600,     // 10 minutes
  ANNOUNCEMENT_SETTINGS: 300, // 5 minutes
  HOMEPAGE_CARDS: 600,      // 10 minutes
  THEMES: 600,              // 10 minutes
} as const

/**
 * Cached getPlatformSetting - replaces direct DB queries.
 * 5-minute TTL. Use invalidateCache('platform:KEY') after admin updates.
 */
export async function getCachedPlatformSetting(key: string, fallback: string): Promise<string> {
  return getCached(`platform:${key}`, CACHE_TTL.PLATFORM_SETTING, async () => {
    try {
      const setting = await prisma.platformSettings.findUnique({ where: { key } })
      return setting?.value ?? fallback
    } catch {
      return fallback
    }
  })
}

/**
 * Cached getAllPlatformSettings - fetches all settings at once.
 * Returns a Map<key, value>. 5-minute TTL.
 */
export async function getCachedAllPlatformSettings(): Promise<Map<string, string>> {
  return getCached('platform:__all__', CACHE_TTL.PLATFORM_SETTING, async () => {
    const settings = await prisma.platformSettings.findMany()
    const map = new Map<string, string>()
    settings.forEach((s: { key: string; value: string }) => map.set(s.key, s.value))
    return map
  })
}

/**
 * Cached active gift types. 10-minute TTL.
 */
export async function getCachedGiftTypes() {
  return getCached('gifts:active', CACHE_TTL.GIFT_TYPES, async () => {
    return prisma.giftType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    })
  })
}

/**
 * Cached active payment methods. 10-minute TTL.
 */
export async function getCachedPaymentMethods() {
  return getCached('payments:methods', CACHE_TTL.PAYMENT_METHODS, async () => {
    return prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    })
  })
}

/**
 * Cached active credit packages. 10-minute TTL.
 */
export async function getCachedCreditPackages() {
  return getCached('payments:packages', CACHE_TTL.CREDIT_PACKAGES, async () => {
    return prisma.creditPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    })
  })
}
