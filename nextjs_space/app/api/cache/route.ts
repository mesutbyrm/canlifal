export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { redisCache, getCacheStats } from '@/lib/cache'

/**
 * Redis-compatible Cache API for Flutter
 * 
 * GET  /api/cache?op=get&key=user:123
 * GET  /api/cache?op=hgetall&key=user:123
 * GET  /api/cache?op=smembers&key=room:active
 * GET  /api/cache?op=keys&pattern=user:*
 * GET  /api/cache?op=stats
 * GET  /api/cache?op=ttl&key=user:123
 * 
 * POST /api/cache  { op: 'set', key: 'x', value: 'y', ttl: 60 }
 * POST /api/cache  { op: 'hset', key: 'x', field: 'f', value: 'v' }
 * POST /api/cache  { op: 'hmset', key: 'x', data: { f1: 'v1', f2: 'v2' } }
 * POST /api/cache  { op: 'del', key: 'x' }
 * POST /api/cache  { op: 'sadd', key: 'x', members: ['a','b'] }
 * POST /api/cache  { op: 'srem', key: 'x', members: ['a'] }
 * POST /api/cache  { op: 'zadd', key: 'x', score: 100, member: 'userId' }
 * POST /api/cache  { op: 'incr', key: 'x' }
 * POST /api/cache  { op: 'decr', key: 'x' }
 * POST /api/cache  { op: 'expire', key: 'x', ttl: 60 }
 * POST /api/cache  { op: 'lpush', key: 'x', values: ['a','b'] }
 * POST /api/cache  { op: 'rpush', key: 'x', values: ['a','b'] }
 * POST /api/cache  { op: 'publish', channel: 'ch', message: {} }
 * POST /api/cache  { op: 'flush', prefix: 'user:' }  (admin only)
 */

export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const op = searchParams.get('op') || 'get'
    const key = searchParams.get('key') || ''

    switch (op) {
      case 'get': {
        const value = redisCache.get(key)
        return NextResponse.json({ success: true, data: { key, value } })
      }
      case 'hget': {
        const field = searchParams.get('field') || ''
        const value = redisCache.hget(key, field)
        return NextResponse.json({ success: true, data: { key, field, value } })
      }
      case 'hgetall': {
        const value = redisCache.hgetall(key)
        return NextResponse.json({ success: true, data: { key, value: value || {} } })
      }
      case 'smembers': {
        const members = redisCache.smembers(key)
        return NextResponse.json({ success: true, data: { key, members } })
      }
      case 'sismember': {
        const member = searchParams.get('member') || ''
        const isMember = redisCache.sismember(key, member)
        return NextResponse.json({ success: true, data: { key, member, isMember } })
      }
      case 'zrange': {
        const start = parseInt(searchParams.get('start') || '0')
        const stop = parseInt(searchParams.get('stop') || '-1')
        const members = redisCache.zrange(key, start, stop)
        return NextResponse.json({ success: true, data: { key, members } })
      }
      case 'zscore': {
        const member = searchParams.get('member') || ''
        const score = redisCache.zscore(key, member)
        return NextResponse.json({ success: true, data: { key, member, score } })
      }
      case 'lrange': {
        const start = parseInt(searchParams.get('start') || '0')
        const stop = parseInt(searchParams.get('stop') || '-1')
        const items = redisCache.lrange(key, start, stop)
        return NextResponse.json({ success: true, data: { key, items } })
      }
      case 'llen': {
        const length = redisCache.llen(key)
        return NextResponse.json({ success: true, data: { key, length } })
      }
      case 'exists': {
        const exists = redisCache.exists(key)
        return NextResponse.json({ success: true, data: { key, exists } })
      }
      case 'ttl': {
        const ttl = redisCache.ttl(key)
        return NextResponse.json({ success: true, data: { key, ttl } })
      }
      case 'keys': {
        const pattern = searchParams.get('pattern') || '*'
        const keys = redisCache.keys(pattern)
        return NextResponse.json({ success: true, data: { pattern, keys, count: keys.length } })
      }
      case 'dbsize': {
        const size = redisCache.dbsize()
        return NextResponse.json({ success: true, data: { size } })
      }
      case 'stats': {
        const stats = getCacheStats()
        return NextResponse.json({ success: true, data: stats })
      }
      case 'scard': {
        const count = redisCache.scard(key)
        return NextResponse.json({ success: true, data: { key, count } })
      }
      case 'zcard': {
        const count = redisCache.zcard(key)
        return NextResponse.json({ success: true, data: { key, count } })
      }
      default:
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_OP', message: `Bilinmeyen operasyon: ${op}` } },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[Cache API] GET error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Cache okuma hatası' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { op, key } = body

    if (!op) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_OP', message: 'op alanı gereklidir' } },
        { status: 400 }
      )
    }

    switch (op) {
      case 'set': {
        if (!key) return missingKey()
        redisCache.set(key, body.value, body.ttl)
        return NextResponse.json({ success: true, data: { key, ok: true } })
      }
      case 'del': {
        if (!key) return missingKey()
        const deleted = redisCache.del(key)
        return NextResponse.json({ success: true, data: { key, deleted } })
      }
      case 'incr': {
        if (!key) return missingKey()
        const value = redisCache.incr(key)
        return NextResponse.json({ success: true, data: { key, value } })
      }
      case 'decr': {
        if (!key) return missingKey()
        const value = redisCache.decr(key)
        return NextResponse.json({ success: true, data: { key, value } })
      }
      case 'expire': {
        if (!key) return missingKey()
        const ok = redisCache.expire(key, body.ttl || 60)
        return NextResponse.json({ success: true, data: { key, ok } })
      }
      case 'hset': {
        if (!key) return missingKey()
        redisCache.hset(key, body.field, body.value)
        return NextResponse.json({ success: true, data: { key, field: body.field, ok: true } })
      }
      case 'hmset': {
        if (!key) return missingKey()
        redisCache.hmset(key, body.data || {})
        return NextResponse.json({ success: true, data: { key, ok: true } })
      }
      case 'hdel': {
        if (!key) return missingKey()
        const deleted = redisCache.hdel(key, body.field)
        return NextResponse.json({ success: true, data: { key, field: body.field, deleted } })
      }
      case 'sadd': {
        if (!key) return missingKey()
        const added = redisCache.sadd(key, ...(body.members || []))
        return NextResponse.json({ success: true, data: { key, added } })
      }
      case 'srem': {
        if (!key) return missingKey()
        const removed = redisCache.srem(key, ...(body.members || []))
        return NextResponse.json({ success: true, data: { key, removed } })
      }
      case 'zadd': {
        if (!key) return missingKey()
        const added = redisCache.zadd(key, body.score || 0, body.member || '')
        return NextResponse.json({ success: true, data: { key, added } })
      }
      case 'zrem': {
        if (!key) return missingKey()
        const removed = redisCache.zrem(key, body.member || '')
        return NextResponse.json({ success: true, data: { key, removed } })
      }
      case 'lpush': {
        if (!key) return missingKey()
        const length = redisCache.lpush(key, ...(body.values || []))
        return NextResponse.json({ success: true, data: { key, length } })
      }
      case 'rpush': {
        if (!key) return missingKey()
        const length = redisCache.rpush(key, ...(body.values || []))
        return NextResponse.json({ success: true, data: { key, length } })
      }
      case 'lpop': {
        if (!key) return missingKey()
        const value = redisCache.lpop(key)
        return NextResponse.json({ success: true, data: { key, value } })
      }
      case 'rpop': {
        if (!key) return missingKey()
        const value = redisCache.rpop(key)
        return NextResponse.json({ success: true, data: { key, value } })
      }
      case 'publish': {
        const channel = body.channel || ''
        if (!channel) {
          return NextResponse.json(
            { success: false, error: { code: 'MISSING_CHANNEL', message: 'channel alanı gereklidir' } },
            { status: 400 }
          )
        }
        const count = redisCache.publish(channel, body.message)
        return NextResponse.json({ success: true, data: { channel, listeners: count } })
      }
      case 'flush': {
        // Only admin can flush
        if ((authUser as any).role !== 'admin' && (authUser as any).role !== 'yonetici') {
          return NextResponse.json(
            { success: false, error: { code: 'FORBIDDEN', message: 'Yönetici yetkisi gerekli' } },
            { status: 403 }
          )
        }
        if (body.prefix) {
          const keys = redisCache.keys(body.prefix + '*')
          keys.forEach(k => redisCache.del(k))
          return NextResponse.json({ success: true, data: { cleared: keys.length, prefix: body.prefix } })
        } else {
          redisCache.flushall()
          return NextResponse.json({ success: true, data: { cleared: 'all' } })
        }
      }
      default:
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_OP', message: `Bilinmeyen operasyon: ${op}` } },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[Cache API] POST error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Cache yazma hatası' } },
      { status: 500 }
    )
  }
}

function missingKey() {
  return NextResponse.json(
    { success: false, error: { code: 'MISSING_KEY', message: 'key alanı gereklidir' } },
    { status: 400 }
  )
}
