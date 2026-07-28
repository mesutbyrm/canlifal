/**
 * In-memory TTL cache with Redis-compatible API.
 * Thread-safe for Node.js single-threaded event loop.
 * 
 * Features:
 *   - GET/SET/DEL with TTL support
 *   - Hash maps (HSET/HGET/HGETALL/HDEL)
 *   - Lists (LPUSH/RPUSH/LRANGE/LLEN)
 *   - Sets (SADD/SREM/SMEMBERS/SISMEMBER)
 *   - Sorted sets (ZADD/ZRANGE/ZRANGEBYSCORE/ZREM/ZSCORE)
 *   - Pub/Sub via EventEmitter
 *   - Key expiry, pattern matching, thundering herd protection
 *   - Automatic eviction of expired entries
 * 
 * Usage:
 *   import { getCached, invalidateCache, redisCache } from '@/lib/cache'
 *   const value = await getCached('platform:commission_rate', 300, () => fetchFromDB())
 *   invalidateCache('platform:commission_rate')  // manual invalidation
 *   redisCache.set('user:123:online', 'true', 60)
 *   redisCache.hset('user:123', 'name', 'Ali')
 */

import { EventEmitter } from 'events'

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<any>>()

// Pending promises to prevent thundering herd (multiple concurrent fetches for same key)
const pending = new Map<string, Promise<any>>()

// Pub/Sub event emitter
const pubSubEmitter = new EventEmitter()
pubSubEmitter.setMaxListeners(100)

// ── Eviction: run every 60s to purge expired keys ──
let evictionTimer: NodeJS.Timeout | null = null
function startEviction() {
  if (evictionTimer) return
  evictionTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt > 0 && entry.expiresAt <= now) {
        cache.delete(key)
      }
    }
  }, 60_000)
  if (evictionTimer.unref) evictionTimer.unref()
}
startEviction()

// ══════════════════════════════════════════════════════
// Redis-compatible cache class
// ══════════════════════════════════════════════════════

class RedisCacheStore {
  // ── String operations ──────────────────────────────
  set(key: string, value: any, ttlSeconds?: number): void {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0 // 0 = no expiry
    cache.set(key, { value, expiresAt })
  }

  get(key: string): any | null {
    const entry = cache.get(key)
    if (!entry) return null
    if (entry.expiresAt > 0 && entry.expiresAt <= Date.now()) {
      cache.delete(key)
      return null
    }
    return entry.value
  }

  del(key: string): boolean {
    return cache.delete(key)
  }

  exists(key: string): boolean {
    return this.get(key) !== null
  }

  expire(key: string, ttlSeconds: number): boolean {
    const entry = cache.get(key)
    if (!entry) return false
    entry.expiresAt = Date.now() + ttlSeconds * 1000
    return true
  }

  ttl(key: string): number {
    const entry = cache.get(key)
    if (!entry) return -2 // key doesn't exist
    if (entry.expiresAt === 0) return -1 // no expiry
    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000)
    return remaining > 0 ? remaining : -2
  }

  incr(key: string): number {
    const val = this.get(key)
    const num = (typeof val === 'number' ? val : parseInt(val || '0')) + 1
    const entry = cache.get(key)
    const expiresAt = entry?.expiresAt || 0
    cache.set(key, { value: num, expiresAt })
    return num
  }

  decr(key: string): number {
    const val = this.get(key)
    const num = (typeof val === 'number' ? val : parseInt(val || '0')) - 1
    const entry = cache.get(key)
    const expiresAt = entry?.expiresAt || 0
    cache.set(key, { value: num, expiresAt })
    return num
  }

  // ── Hash operations ────────────────────────────────
  hset(key: string, field: string, value: any): void {
    let hash = this.get(key)
    if (!hash || typeof hash !== 'object' || Array.isArray(hash)) hash = {}
    hash[field] = value
    const entry = cache.get(key)
    cache.set(key, { value: hash, expiresAt: entry?.expiresAt || 0 })
  }

  hmset(key: string, data: Record<string, any>): void {
    let hash = this.get(key)
    if (!hash || typeof hash !== 'object' || Array.isArray(hash)) hash = {}
    Object.assign(hash, data)
    const entry = cache.get(key)
    cache.set(key, { value: hash, expiresAt: entry?.expiresAt || 0 })
  }

  hget(key: string, field: string): any | null {
    const hash = this.get(key)
    if (!hash || typeof hash !== 'object') return null
    return hash[field] ?? null
  }

  hgetall(key: string): Record<string, any> | null {
    const hash = this.get(key)
    if (!hash || typeof hash !== 'object') return null
    return { ...hash }
  }

  hdel(key: string, field: string): boolean {
    const hash = this.get(key)
    if (!hash || typeof hash !== 'object') return false
    const existed = field in hash
    delete hash[field]
    return existed
  }

  hlen(key: string): number {
    const hash = this.get(key)
    if (!hash || typeof hash !== 'object') return 0
    return Object.keys(hash).length
  }

  // ── List operations ────────────────────────────────
  lpush(key: string, ...values: any[]): number {
    let list = this.get(key)
    if (!Array.isArray(list)) list = []
    list.unshift(...values)
    const entry = cache.get(key)
    cache.set(key, { value: list, expiresAt: entry?.expiresAt || 0 })
    return list.length
  }

  rpush(key: string, ...values: any[]): number {
    let list = this.get(key)
    if (!Array.isArray(list)) list = []
    list.push(...values)
    const entry = cache.get(key)
    cache.set(key, { value: list, expiresAt: entry?.expiresAt || 0 })
    return list.length
  }

  lrange(key: string, start: number, stop: number): any[] {
    const list = this.get(key)
    if (!Array.isArray(list)) return []
    const end = stop === -1 ? undefined : stop + 1
    return list.slice(start, end)
  }

  llen(key: string): number {
    const list = this.get(key)
    return Array.isArray(list) ? list.length : 0
  }

  lpop(key: string): any | null {
    const list = this.get(key)
    if (!Array.isArray(list) || list.length === 0) return null
    return list.shift()
  }

  rpop(key: string): any | null {
    const list = this.get(key)
    if (!Array.isArray(list) || list.length === 0) return null
    return list.pop()
  }

  // ── Set operations ─────────────────────────────────
  sadd(key: string, ...members: any[]): number {
    let set = this.get(key)
    if (!(set instanceof Set)) set = new Set()
    let added = 0
    for (const m of members) {
      if (!set.has(m)) { set.add(m); added++ }
    }
    const entry = cache.get(key)
    cache.set(key, { value: set, expiresAt: entry?.expiresAt || 0 })
    return added
  }

  srem(key: string, ...members: any[]): number {
    const set = this.get(key)
    if (!(set instanceof Set)) return 0
    let removed = 0
    for (const m of members) {
      if (set.delete(m)) removed++
    }
    return removed
  }

  smembers(key: string): any[] {
    const set = this.get(key)
    if (!(set instanceof Set)) return []
    return Array.from(set)
  }

  sismember(key: string, member: any): boolean {
    const set = this.get(key)
    if (!(set instanceof Set)) return false
    return set.has(member)
  }

  scard(key: string): number {
    const set = this.get(key)
    if (!(set instanceof Set)) return 0
    return set.size
  }

  // ── Sorted Set operations ──────────────────────────
  zadd(key: string, score: number, member: string): number {
    let zset = this.get(key)
    if (!zset || !Array.isArray(zset?._items)) zset = { _items: [] }
    const existing = zset._items.find((i: any) => i.member === member)
    if (existing) {
      existing.score = score
      zset._items.sort((a: any, b: any) => a.score - b.score)
      return 0 // updated, not added
    }
    zset._items.push({ member, score })
    zset._items.sort((a: any, b: any) => a.score - b.score)
    const entry = cache.get(key)
    cache.set(key, { value: zset, expiresAt: entry?.expiresAt || 0 })
    return 1
  }

  zrange(key: string, start: number, stop: number): string[] {
    const zset = this.get(key)
    if (!zset?._items) return []
    const end = stop === -1 ? undefined : stop + 1
    return zset._items.slice(start, end).map((i: any) => i.member)
  }

  zrangebyscore(key: string, min: number, max: number): string[] {
    const zset = this.get(key)
    if (!zset?._items) return []
    return zset._items
      .filter((i: any) => i.score >= min && i.score <= max)
      .map((i: any) => i.member)
  }

  zscore(key: string, member: string): number | null {
    const zset = this.get(key)
    if (!zset?._items) return null
    const item = zset._items.find((i: any) => i.member === member)
    return item ? item.score : null
  }

  zrem(key: string, member: string): number {
    const zset = this.get(key)
    if (!zset?._items) return 0
    const idx = zset._items.findIndex((i: any) => i.member === member)
    if (idx === -1) return 0
    zset._items.splice(idx, 1)
    return 1
  }

  zcard(key: string): number {
    const zset = this.get(key)
    return zset?._items?.length || 0
  }

  // ── Pub/Sub ────────────────────────────────────────
  publish(channel: string, message: any): number {
    const count = pubSubEmitter.listenerCount(channel)
    pubSubEmitter.emit(channel, message)
    return count
  }

  subscribe(channel: string, handler: (message: any) => void): () => void {
    pubSubEmitter.on(channel, handler)
    return () => pubSubEmitter.off(channel, handler)
  }

  // ── Key pattern matching ───────────────────────────
  keys(pattern: string): string[] {
    const now = Date.now()
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
    const result: string[] = []
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt > 0 && entry.expiresAt <= now) {
        cache.delete(key)
        continue
      }
      if (regex.test(key)) result.push(key)
    }
    return result
  }

  // ── Multi/Pipeline (batch operations) ──────────────
  multi(): RedisPipeline {
    return new RedisPipeline(this)
  }

  // ── Flush all ──────────────────────────────────────
  flushall(): void {
    cache.clear()
    pending.clear()
  }

  // ── Info / Stats ───────────────────────────────────
  dbsize(): number {
    // Clean expired first
    const now = Date.now()
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt > 0 && entry.expiresAt <= now) cache.delete(key)
    }
    return cache.size
  }
}

// Simple pipeline for batch operations
class RedisPipeline {
  private ops: Array<() => any> = []
  constructor(private store: RedisCacheStore) {}

  set(key: string, value: any, ttl?: number) { this.ops.push(() => this.store.set(key, value, ttl)); return this }
  get(key: string) { this.ops.push(() => this.store.get(key)); return this }
  del(key: string) { this.ops.push(() => this.store.del(key)); return this }
  hset(key: string, field: string, value: any) { this.ops.push(() => this.store.hset(key, field, value)); return this }
  hget(key: string, field: string) { this.ops.push(() => this.store.hget(key, field)); return this }
  sadd(key: string, ...members: any[]) { this.ops.push(() => this.store.sadd(key, ...members)); return this }
  srem(key: string, ...members: any[]) { this.ops.push(() => this.store.srem(key, ...members)); return this }
  zadd(key: string, score: number, member: string) { this.ops.push(() => this.store.zadd(key, score, member)); return this }
  incr(key: string) { this.ops.push(() => this.store.incr(key)); return this }

  exec(): any[] {
    return this.ops.map(op => op())
  }
}

// Singleton export
export const redisCache = new RedisCacheStore()

/**
 * Get a cached value or fetch it if expired/missing.
 * @param key - Unique cache key
 * @param ttlSeconds - Time-to-live in seconds
 * @param fetcher - Async function to fetch the value if not cached
 */
export async function getCached<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const entry = cache.get(key)
  
  if (entry && (entry.expiresAt === 0 || entry.expiresAt > now)) {
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
export function getCacheStats(): { size: number; keys: string[]; hitRate?: string } {
  // Clean expired entries
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt > 0 && entry.expiresAt <= now) {
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
  HOMEPAGE_BUTTONS: 600,    // 10 minutes
  FORTUNE_REQUEST_TYPES: 600, // 10 minutes  
  BADGES: 600,              // 10 minutes
  MEMBERSHIPS: 600,         // 10 minutes
  TELLER_LIST: 15,          // 15 seconds - moderate refresh
  CHAT_ROOMS: 10,           // 10 seconds - homepage polls
  LIVE_STREAMS: 10,         // 10 seconds - homepage polls
  USER_PROFILE: 30,         // 30 seconds
  ACHIEVEMENTS: 600,        // 10 minutes
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

/**
 * Cached homepage buttons. 10-minute TTL.
 */
export async function getCachedHomepageButtons() {
  return getCached('homepage:buttons', CACHE_TTL.HOMEPAGE_BUTTONS, async () => {
    return prisma.homepageButton.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, key: true, label: true, icon: true, href: true, sortOrder: true, isVisible: true, specialBehavior: true }
    })
  })
}

/**
 * Cached homepage fortune cards. 10-minute TTL.
 */
export async function getCachedHomepageFortuneCards() {
  return getCached('homepage:fortune-cards', CACHE_TTL.HOMEPAGE_CARDS, async () => {
    return prisma.homepageFortuneCard.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    })
  })
}

/**
 * Cached fortune request types. 10-minute TTL.
 */
export async function getCachedFortuneRequestTypes() {
  return getCached('fortune:request-types', CACHE_TTL.FORTUNE_REQUEST_TYPES, async () => {
    return prisma.fortuneRequestType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    })
  })
}

/**
 * Cached achievements list. 10-minute TTL.
 */
export async function getCachedAchievements() {
  return getCached('achievements:all', CACHE_TTL.ACHIEVEMENTS, async () => {
    return prisma.achievement.findMany({
      orderBy: { sortOrder: 'asc' }
    })
  })
}

/**
 * Cached chat-room metadata lookup (by id OR slug). Short 15s TTL so voice-room
 * joins don't re-read the mostly-static room row (name, background, type,
 * password, owner) on every join/heartbeat while still reflecting admin edits
 * quickly. Invalidate with invalidateCache(`chatroom:<idOrSlug>`) after edits.
 *
 * NOTE: returns the full room row incl. owner — safe because the room password
 * is only compared server-side inside join-room, never sent to clients.
 */
export async function getCachedChatRoom(idOrSlug: string) {
  return getCached(`chatroom:${idOrSlug}`, 15, async () => {
    return prisma.chatRoom.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: {
        owner: { select: { id: true, name: true, image: true } },
      },
    })
  })
}
