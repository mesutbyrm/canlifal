/**
 * BÖLÜM 20 §16 — Premium+ geçici mesaj sabitleme.
 *
 * - Yetki tamamen sunucuda doğrulanır (`vip.message_pin`).
 * - Spam koruması: kullanıcı başına oda içinde cooldown + saatlik üst sınır
 *   (yetenek matrisindeki `dailyLimit`/`limit` değerleri yöneticiden ayarlanır).
 * - Şema değişikliği yok: sabitleme SSE olayı olarak yayınlanır ve TTL sonunda düşer.
 */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { emitChatEvent } from '@/lib/chat-events'
import { requireCapability } from '@/lib/vip-guard'
import { apiError, apiSuccess, ErrorCodes } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

const DEFAULT_TTL_SECONDS = 60
const MAX_TTL_SECONDS = 600
const COOLDOWN_MS = 30_000
const DEFAULT_HOURLY_LIMIT = 10

// userId -> { last: epochMs, hourStart: epochMs, count: number }
const pinUsage = new Map<string, { last: number; hourStart: number; count: number }>()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const guard = await requireCapability(request, 'vip.message_pin')
    if (!guard.ok) return (guard as { response: NextResponse }).response

    const userId = (guard as { userId: string }).userId
    const ent = (guard as { entitlements: any }).entitlements
    const grant = ent?.features?.['vip.message_pin'] || {}

    const body = await request.json().catch(() => ({}))
    const messageId: string | undefined = body?.messageId
    const rawText: string = typeof body?.text === 'string' ? body.text.trim() : ''

    if (!messageId && !rawText) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Sabitlenecek mesaj veya metin gerekli', 400)
    }

    // Oda erişim doğrulaması
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { id: true, isActive: true },
    })
    if (!room || !room.isActive) {
      return apiError(ErrorCodes.NOT_FOUND, 'Oda bulunamadı', 404)
    }

    // Spam koruması
    const now = Date.now()
    const hourlyLimit =
      typeof grant.dailyLimit === 'number' && grant.dailyLimit > 0
        ? grant.dailyLimit
        : typeof grant.limit === 'number' && grant.limit > 0
          ? grant.limit
          : DEFAULT_HOURLY_LIMIT
    const usage = pinUsage.get(userId) || { last: 0, hourStart: now, count: 0 }
    if (now - usage.hourStart > 3_600_000) {
      usage.hourStart = now
      usage.count = 0
    }
    if (now - usage.last < COOLDOWN_MS) {
      return apiError(
        'PIN_COOLDOWN',
        `Çok sık sabitliyorsunuz. ${Math.ceil((COOLDOWN_MS - (now - usage.last)) / 1000)} sn bekleyin.`,
        429
      )
    }
    if (usage.count >= hourlyLimit) {
      return apiError('PIN_LIMIT_REACHED', 'Saatlik sabitleme hakkınız doldu', 429)
    }

    let text = rawText
    if (messageId) {
      const msg = await prisma.chatMessage.findFirst({
        where: { id: messageId, roomId },
        select: { id: true, content: true, userId: true },
      })
      if (!msg) return apiError(ErrorCodes.NOT_FOUND, 'Mesaj bulunamadı', 404)
      text = msg.content
    }
    if (!text) return apiError(ErrorCodes.VALIDATION_ERROR, 'Boş mesaj sabitlenemez', 400)
    if (text.length > 300) text = text.slice(0, 300)

    const ttl = Math.min(
      MAX_TTL_SECONDS,
      Math.max(10, Number(body?.ttl) > 0 ? Number(body.ttl) : DEFAULT_TTL_SECONDS)
    )

    usage.last = now
    usage.count += 1
    pinUsage.set(userId, usage)

    emitChatEvent(roomId, 'system', {
      event: 'VIP_PIN',
      messageId: messageId || null,
      text,
      ttl,
      tier: ent?.tier || 'basic',
      userId,
      timestamp: now,
    })

    return apiSuccess({ pinned: true, ttl, remaining: Math.max(0, hourlyLimit - usage.count) })
  } catch (error) {
    console.error('VIP pin-message error:', error)
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Mesaj sabitlenemedi', 500)
  }
}
