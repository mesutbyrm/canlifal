/**
 * Durable Event Outbox — kritik olayları (SSE yayını, push bildirimi)
 * transaction içinde kayıt altına alır; arka plan işlemci bunları tüketir.
 *
 * KULLANIM:
 *   await tx.eventOutbox.create({ data: enqueueSSE('stream', streamId, 'gift', payload) })
 *   — gift-settlement transaction bloku içinde.
 *
 * TÜKETME:
 *   drainOutbox() periyodik olarak çağrılır (setInterval veya cron).
 *   Her olay en fazla 5 kez denenir; başarısız olanlar status='failed' olur.
 */

import { prisma } from './db'
import { emitStreamEvent } from './stream-events'
import { emitRoomEvent } from './room-events'
import { emitChatEvent } from './chat-events'
import { createNotificationWithPush } from './notify'

// ─── Enqueue Helpers (transaction içinde kullanılır) ─────────────────

export interface OutboxEntry {
  channel: string
  scope: string
  eventType: string
  payload: string
  status?: string
  maxAttempts?: number
}

/** SSE olayı için outbox kaydı hazırlar. tx.eventOutbox.create({ data: ... }) ile kullanılır. */
export function enqueueSSE(
  target: 'stream' | 'room' | 'chat',
  scopeId: string,
  eventType: string,
  data: any,
): OutboxEntry {
  return {
    channel: `sse_${target}`,
    scope: scopeId,
    eventType,
    payload: JSON.stringify(data),
  }
}

/** Push bildirimi için outbox kaydı hazırlar. */
export function enqueuePush(
  userId: string,
  notifyParams: Record<string, any>,
): OutboxEntry {
  return {
    channel: 'push',
    scope: userId,
    eventType: notifyParams.type || 'notification',
    payload: JSON.stringify(notifyParams),
  }
}

/** Bildirim (DB + push) için outbox kaydı hazırlar. */
export function enqueueNotification(
  userId: string,
  notifyParams: Record<string, any>,
): OutboxEntry {
  return {
    channel: 'notification',
    scope: userId,
    eventType: notifyParams.type || 'notification',
    payload: JSON.stringify(notifyParams),
  }
}

// ─── Durable Emit (hemen teslim + outbox yedek) ─────────────────────

/**
 * SSE olayını outbox'a yazar VE hemen teslim etmeye çalışır.
 * Teslim başarısızsa arka plan işlemci tekrar dener.
 */
export async function durableEmitSSE(
  target: 'stream' | 'room' | 'chat',
  scopeId: string,
  eventType: string,
  data: any,
): Promise<void> {
  const entry = await prisma.eventOutbox.create({ data: enqueueSSE(target, scopeId, eventType, data) })
  try {
    await deliverEvent(entry.channel, entry.scope, entry.eventType, data)
    await prisma.eventOutbox.update({ where: { id: entry.id }, data: { status: 'delivered', processedAt: new Date(), attempts: 1 } })
  } catch (err) {
    console.error('[event-outbox] immediate SSE delivery failed, will retry:', err)
  }
}

/**
 * Bildirim+push'u outbox'a yazar VE hemen teslim etmeye çalışır.
 */
export async function durableNotify(
  userId: string,
  params: Record<string, any>,
): Promise<void> {
  const entry = await prisma.eventOutbox.create({ data: enqueueNotification(userId, params) })
  try {
    await deliverEvent(entry.channel, entry.scope, entry.eventType, params)
    await prisma.eventOutbox.update({ where: { id: entry.id }, data: { status: 'delivered', processedAt: new Date(), attempts: 1 } })
  } catch (err) {
    console.error('[event-outbox] immediate notification delivery failed, will retry:', err)
  }
}

// ─── Drain (arka plan işlemci) ───────────────────────────────────────

const BATCH_SIZE = 50
const RETRY_DELAYS = [0, 2, 5, 15, 60] // saniye — deneme başına bekleme

let draining = false

/**
 * Bekleyen outbox kayıtlarını tüketir. Her kayıt için uygun SSE/push
 * fonksiyonunu çağırır. Başarılı olanlar 'delivered', başarısız olanlar
 * tekrar kuyruğa alınır veya 'failed' yapılır.
 *
 * Eşzamanlı çağrılması güvenlidir (kendi kendini kilitleyen).
 */
export async function drainOutbox(): Promise<{ delivered: number; failed: number; skipped: number }> {
  if (draining) return { delivered: 0, failed: 0, skipped: 0 }
  draining = true
  let delivered = 0
  let failed = 0
  let skipped = 0

  try {
    const pending = await prisma.eventOutbox.findMany({
      where: {
        status: 'pending',
        nextRetryAt: { lte: new Date() },
      },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    })

    for (const entry of pending) {
      try {
        const data = JSON.parse(entry.payload)
        await deliverEvent(entry.channel, entry.scope, entry.eventType, data)

        await prisma.eventOutbox.update({
          where: { id: entry.id },
          data: {
            status: 'delivered',
            processedAt: new Date(),
            attempts: entry.attempts + 1,
          },
        })
        delivered++
      } catch (err: any) {
        const newAttempts = entry.attempts + 1
        const errorMsg = String(err?.message || err).slice(0, 500)

        if (newAttempts >= entry.maxAttempts) {
          await prisma.eventOutbox.update({
            where: { id: entry.id },
            data: {
              status: 'failed',
              attempts: newAttempts,
              lastError: errorMsg,
              processedAt: new Date(),
            },
          }).catch(() => {})
          failed++
        } else {
          const delaySec = RETRY_DELAYS[Math.min(newAttempts, RETRY_DELAYS.length - 1)]
          await prisma.eventOutbox.update({
            where: { id: entry.id },
            data: {
              attempts: newAttempts,
              lastError: errorMsg,
              nextRetryAt: new Date(Date.now() + delaySec * 1000),
            },
          }).catch(() => {})
          skipped++
        }
      }
    }

    // Eski teslim edilmiş kayıtları temizle (24 saatten eski)
    if (Math.random() < 0.1) {
      await prisma.eventOutbox.deleteMany({
        where: {
          status: { in: ['delivered', 'failed'] },
          createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }).catch(() => {})
    }
  } catch (err) {
    console.error('[event-outbox] drain error:', err)
  } finally {
    draining = false
  }

  return { delivered, failed, skipped }
}

/** Tek bir olayı uygun kanala teslim eder. */
export async function deliverEvent(channel: string, scope: string, eventType: string, data: any): Promise<void> {
  switch (channel) {
    case 'sse_stream':
      emitStreamEvent(scope, eventType as any, data)
      break
    case 'sse_room':
      emitRoomEvent(scope, eventType as any, data)
      break
    case 'sse_chat':
      emitChatEvent(scope, eventType as any, data)
      break
    case 'notification':
      await createNotificationWithPush({
        userId: scope,
        ...data,
      })
      break
    case 'push':
      // Push-only (bildirim kaydı olmadan)
      const { sendPush } = await import('./push')
      await sendPush(scope, data)
      break
    default:
      console.warn(`[event-outbox] bilinmeyen kanal: ${channel}`)
  }
}

// ─── Otomatik arka plan işlemci ──────────────────────────────────────
let processorStarted = false

/** Outbox işlemcisini başlatır (uygulama ömrüne bir kez). */
export function startOutboxProcessor(intervalMs = 2000) {
  if (processorStarted) return
  if (typeof setInterval !== 'function') return
  processorStarted = true
  const timer = setInterval(() => {
    void drainOutbox()
  }, intervalMs)
  if (typeof (timer as any)?.unref === 'function') (timer as any).unref()
}

// Modül yüklendiğinde otomatik başlat
startOutboxProcessor()
