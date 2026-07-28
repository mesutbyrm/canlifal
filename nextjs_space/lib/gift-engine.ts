/**
 * ===========================================================================
 * CanlıFal Gift Engine — professional, cross-platform gift engine.
 * ---------------------------------------------------------------------------
 * A single backend engine shared by Web, Flutter and any future platform.
 *
 * Responsibilities (backend is the single source of truth):
 *   - Priority   : SMALL | MEDIUM | LARGE | ULTRA (admin editable per gift)
 *   - Animation  : PNG | SVG | LOTTIE | MP4 | WEBM | PARTICLE
 *   - Display    : FULL_SCREEN | CENTER | SEAT | BOTTOM | TOP
 *   - Seat effect: GLOW | SHAKE | PARTICLE | BORDER | PULSE | NONE (toggleable)
 *   - Duration   : animation display duration (ms)
 *   - Combo      : consecutive same-gift sends by same user (x2/x5/x10/x50/x100)
 *   - Queue      : per-context independent FIFO so animations never overlap and
 *                  a single user can never block a room
 *   - Events     : gift_received / gift_queue_updated / gift_finished
 *
 * Everything here is ADDITIVE. It never touches the existing money flow or the
 * existing ChatRoomGift / StreamGift records. All emissions are wrapped in
 * try/catch so the engine can never break a paid transaction.
 * ===========================================================================
 */

import { prisma } from '@/lib/db'
import { emitChatEvent } from '@/lib/chat-events'
import { emitStreamEvent } from '@/lib/stream-events'
import { buildGiftRenderMeta } from '@/lib/gift-render'

// ── Enumerations (kept as plain string unions for cross-platform clarity) ──
export const PRIORITIES = ['SMALL', 'MEDIUM', 'LARGE', 'ULTRA'] as const
export const DISPLAY_AREAS = ['FULL_SCREEN', 'CENTER', 'SEAT', 'BOTTOM', 'TOP'] as const
export const ANIMATION_TYPES = ['PNG', 'SVG', 'LOTTIE', 'MP4', 'WEBM', 'PARTICLE'] as const
export const SEAT_EFFECTS = ['GLOW', 'SHAKE', 'PARTICLE', 'BORDER', 'PULSE', 'NONE'] as const

export type GiftContext = 'voice_room' | 'live_stream' | 'pk'

// Milestones used to award a combo badge (highest reached <= count).
const COMBO_MILESTONES = [2, 5, 10, 50, 100] as const

// How long finished queue rows are kept before cleanup (avoid table growth).
const QUEUE_RETENTION_MS = 10 * 60 * 1000 // 10 minutes

// ── Resolvers: explicit engine field first, else derive from legacy fields ──

/** SMALL | MEDIUM | LARGE | ULTRA */
export function resolvePriority(g: any): string {
  const explicit = (g?.priority || '').toUpperCase()
  if (PRIORITIES.includes(explicit as any)) return explicit
  const tier = (g?.tier || '').toLowerCase()
  if (tier === 'huge') return 'ULTRA'
  if (tier === 'big') return 'LARGE'
  if (tier === 'small') return 'SMALL'
  return 'MEDIUM'
}

/** PNG | SVG | LOTTIE | MP4 | WEBM | PARTICLE */
export function resolveAnimationType(g: any, renderMeta?: any): string {
  const explicit = (g?.animationType || '').toUpperCase()
  if (ANIMATION_TYPES.includes(explicit as any)) return explicit
  const fmt = (renderMeta?.assetFormat || '').toLowerCase()
  switch (fmt) {
    case 'mp4': return 'MP4'
    case 'webm': return 'WEBM'
    case 'lottie': return 'LOTTIE'
    case 'svga': return 'LOTTIE' // svga is an animation sequence; closest client bucket
    case 'svg': return 'SVG'
    case 'png':
    case 'jpeg':
    case 'webp':
    case 'avif':
    case 'gif':
    case 'image': return 'PNG'
  }
  if (g?.particleEffect) return 'PARTICLE'
  return 'PNG'
}

/** FULL_SCREEN | CENTER | SEAT | BOTTOM | TOP */
export function resolveDisplayArea(g: any): string {
  const explicit = (g?.displayArea || '').toUpperCase()
  if (DISPLAY_AREAS.includes(explicit as any)) return explicit
  if (g?.isFullscreen || g?.visibleAsFullscreen) return 'FULL_SCREEN'
  const pos = (g?.screenPosition || '').toLowerCase()
  if (pos === 'fullscreen') return 'FULL_SCREEN'
  if (pos === 'above_seat' || pos === 'user_avatar' || pos === 'seat') return 'SEAT'
  if (pos === 'bottom' || pos === 'message_area') return 'BOTTOM'
  if (pos === 'top') return 'TOP'
  return 'CENTER'
}

/** Display duration in ms. */
export function resolveDurationMs(g: any): number {
  const d = g?.animationDurationMs ?? g?.displayDurationMs
  if (typeof d === 'number' && d > 0) return d
  return 3000
}

/** Seat effect name, or null when disabled by admin. */
export function resolveSeatEffect(g: any): string | null {
  if (g?.seatEffectEnabled === false) return null
  const e = (g?.seatEffect || '').toUpperCase()
  if (e === 'NONE') return null
  if (SEAT_EFFECTS.includes(e as any)) return e
  return null
}

/** Sound url, or null when the admin disabled the sound effect. */
export function resolveSoundEffect(g: any): string | null {
  if (g?.soundEffectEnabled === false) return null
  return g?.soundUrl ?? null
}

/** Highest combo milestone reached (0 if none). */
export function comboMilestone(count: number): number {
  let m = 0
  for (const t of COMBO_MILESTONES) if (count >= t) m = t
  return m
}

// ── Combo ──

/**
 * Increments (or starts) a combo for the same sender + gift + context.
 * DB-backed so it works across serverless instances and all platforms.
 * Returns the current comboCount (>= 1).
 */
export async function computeCombo(params: {
  context: string
  contextId: string
  senderId: string
  giftTypeId: string
  receiverId?: string | null
  windowMs: number
}): Promise<number> {
  const { context, contextId, senderId, giftTypeId, receiverId, windowMs } = params
  const now = new Date()
  const expiresAt = new Date(now.getTime() + Math.max(1000, windowMs || 4000))
  try {
    const existing = await prisma.giftCombo.findUnique({
      where: { contextId_senderId_giftTypeId: { contextId, senderId, giftTypeId } },
    })
    if (existing && existing.expiresAt.getTime() > now.getTime()) {
      const updated = await prisma.giftCombo.update({
        where: { id: existing.id },
        data: {
          comboCount: existing.comboCount + 1,
          lastSentAt: now,
          expiresAt,
          receiverId: receiverId ?? existing.receiverId,
        },
      })
      return updated.comboCount
    }
    await prisma.giftCombo.upsert({
      where: { contextId_senderId_giftTypeId: { contextId, senderId, giftTypeId } },
      create: { context, contextId, senderId, giftTypeId, receiverId: receiverId ?? null, comboCount: 1, lastSentAt: now, expiresAt },
      update: { comboCount: 1, lastSentAt: now, expiresAt, receiverId: receiverId ?? null, context },
    })
    return 1
  } catch (e) {
    console.error('[gift-engine] computeCombo failed:', e)
    return 1
  }
}

// ── Queue ──

/**
 * Appends a gift to its context's FIFO queue. queueIndex is the number of
 * entries still pending/playing, so clients play them in order.
 */
export async function enqueueGift(params: {
  context: string
  contextId: string
  giftTypeId: string
  senderId: string
  receiverId: string
  quantity: number
  combo: number
  priority: string
  durationMs: number
  displayArea: string
  payload: any
}): Promise<{ id: string; queueIndex: number } | null> {
  try {
    const active = await prisma.giftQueue.count({
      where: { contextId: params.contextId, status: { in: ['pending', 'playing'] } },
    })
    const entry = await prisma.giftQueue.create({
      data: {
        context: params.context,
        contextId: params.contextId,
        giftTypeId: params.giftTypeId,
        senderId: params.senderId,
        receiverId: params.receiverId,
        quantity: params.quantity,
        combo: params.combo,
        priority: params.priority,
        durationMs: params.durationMs,
        displayArea: params.displayArea,
        status: 'pending',
        queueIndex: active,
        payload: JSON.stringify(params.payload ?? {}),
      },
    })
    return { id: entry.id, queueIndex: active }
  } catch (e) {
    console.error('[gift-engine] enqueueGift failed:', e)
    return null
  }
}

/** Pending + playing entries for a context, ordered for playback. */
export async function getQueueSnapshot(contextId: string) {
  try {
    const rows = await prisma.giftQueue.findMany({
      where: { contextId, status: { in: ['pending', 'playing'] } },
      orderBy: [{ queueIndex: 'asc' }, { createdAt: 'asc' }],
      take: 100,
    })
    return rows.map((r) => ({
      id: r.id,
      context: r.context,
      contextId: r.contextId,
      giftTypeId: r.giftTypeId,
      senderId: r.senderId,
      receiverId: r.receiverId,
      quantity: r.quantity,
      combo: r.combo,
      priority: r.priority,
      durationMs: r.durationMs,
      displayArea: r.displayArea,
      status: r.status,
      queueIndex: r.queueIndex,
      createdAt: r.createdAt,
      payload: safeParse(r.payload),
    }))
  } catch (e) {
    console.error('[gift-engine] getQueueSnapshot failed:', e)
    return []
  }
}

/**
 * Marks a queue entry finished (called by the client when the animation ends,
 * or by a server timeout). Emits gift_finished + a fresh gift_queue_updated.
 */
export async function finishQueueEntry(queueId: string) {
  try {
    const entry = await prisma.giftQueue.findUnique({ where: { id: queueId } })
    if (!entry || entry.status === 'finished') return null
    const now = new Date()
    await prisma.giftQueue.update({
      where: { id: queueId },
      data: { status: 'finished', finishedAt: now, playedAt: entry.playedAt ?? now },
    })
    await emitGiftEngineEvent(entry.context as GiftContext, entry.contextId, 'gift_finished', {
      queueId: entry.id,
      giftTypeId: entry.giftTypeId,
      queueIndex: entry.queueIndex,
    })
    const queue = await getQueueSnapshot(entry.contextId)
    await emitGiftEngineEvent(entry.context as GiftContext, entry.contextId, 'gift_queue_updated', {
      queueLength: queue.length,
      queue,
    })
    // opportunistic cleanup of old finished/expired rows
    void cleanupQueue(entry.contextId)
    return entry
  } catch (e) {
    console.error('[gift-engine] finishQueueEntry failed:', e)
    return null
  }
}

/** Removes old finished queue rows so the table cannot grow unbounded. */
export async function cleanupQueue(contextId?: string) {
  try {
    const cutoff = new Date(Date.now() - QUEUE_RETENTION_MS)
    await prisma.giftQueue.deleteMany({
      where: {
        ...(contextId ? { contextId } : {}),
        status: 'finished',
        finishedAt: { lt: cutoff },
      },
    })
    // Also clear long-expired combos.
    await prisma.giftCombo.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
    })
  } catch (e) {
    // non-fatal
  }
}

// ── Payload ──

/**
 * Builds the single unified `gift_received` payload every client consumes.
 * Combines the shared render metadata with the engine's queue/combo/priority.
 */
export function buildGiftReceivedPayload(params: {
  context: string
  contextId: string
  giftType: any
  sender: { id: string; name?: string | null; image?: string | null }
  receiver: { id: string; name?: string | null }
  quantity: number
  combo: number
  coinAmount: number
  queueId?: string | null
  queueIndex?: number
}) {
  const g = params.giftType || {}
  const renderMeta = buildGiftRenderMeta(g)
  const priority = resolvePriority(g)
  const animationType = resolveAnimationType(g, renderMeta)
  const displayArea = resolveDisplayArea(g)
  const durationMs = resolveDurationMs(g)
  const seatEffect = resolveSeatEffect(g)
  const soundEffect = resolveSoundEffect(g)
  const combo = Math.max(1, params.combo || 1)
  return {
    context: params.context,
    contextId: params.contextId,
    sender: {
      id: params.sender.id,
      name: params.sender.name ?? null,
      image: params.sender.image ?? null,
    },
    receiver: {
      id: params.receiver.id,
      name: params.receiver.name ?? null,
    },
    gift: {
      id: g.id,
      name: g.name ?? null,
      icon: g.icon ?? renderMeta.giftIcon,
      ...renderMeta,
    },
    quantity: params.quantity,
    coin: params.coinAmount,
    combo,
    comboMilestone: comboMilestone(combo),
    priority,
    animationType,
    animationUrl: renderMeta.assetUrl,
    thumbnail: renderMeta.thumbnailUrl ?? renderMeta.imageUrl,
    duration: durationMs,
    displayArea,
    seatEffect,
    soundEffect,
    queueId: params.queueId ?? null,
    queueIndex: params.queueIndex ?? 0,
    timestamp: Date.now(),
  }
}

// ── Event emission ──

/**
 * Routes an engine event through the existing in-memory SSE buses. Engine
 * events are wrapped as { engine:true, event, ...payload } and pushed using
 * the existing 'gift' channel so no existing consumer breaks. Web clients that
 * don't understand the engine simply ignore it; Flutter switches on `event`.
 */
export async function emitGiftEngineEvent(
  context: GiftContext,
  contextId: string,
  event: 'gift_received' | 'gift_queue_updated' | 'gift_finished',
  payload: any,
) {
  const wrapped = { engine: true, event, context, contextId, ...payload }
  try {
    if (context === 'live_stream') {
      emitStreamEvent(contextId, 'gift', wrapped)
    } else {
      // voice_room and pk both flow through the chat-events bus
      emitChatEvent(contextId, 'gift', wrapped)
    }
  } catch (e) {
    console.error('[gift-engine] emitGiftEngineEvent failed:', e)
  }
}

// ── High-level orchestration used by send endpoints ──

/**
 * Runs the full engine step for an ALREADY-CHARGED gift send: computes combo,
 * enqueues, writes GiftHistory, and emits gift_received + gift_queue_updated.
 * Returns the unified payload (also useful in the HTTP response). Never throws.
 */
export async function processGiftSend(params: {
  context: GiftContext
  contextId: string
  giftType: any
  sender: { id: string; name?: string | null; image?: string | null }
  receiver: { id: string; name?: string | null }
  quantity: number
  coinAmount: number
}) {
  try {
    const g = params.giftType || {}
    const windowMs = typeof g.comboWindowMs === 'number' ? g.comboWindowMs : 4000
    const combo = g.comboEnabled === false
      ? 1
      : await computeCombo({
          context: params.context,
          contextId: params.contextId,
          senderId: params.sender.id,
          giftTypeId: g.id,
          receiverId: params.receiver.id,
          windowMs,
        })

    const priority = resolvePriority(g)
    const displayArea = resolveDisplayArea(g)
    const durationMs = resolveDurationMs(g)
    const animationType = resolveAnimationType(g, buildGiftRenderMeta(g))

    // Build payload first (needs queueIndex; fill after enqueue).
    const basePayload = buildGiftReceivedPayload({
      context: params.context,
      contextId: params.contextId,
      giftType: g,
      sender: params.sender,
      receiver: params.receiver,
      quantity: params.quantity,
      combo,
      coinAmount: params.coinAmount,
    })

    const enq = await enqueueGift({
      context: params.context,
      contextId: params.contextId,
      giftTypeId: g.id,
      senderId: params.sender.id,
      receiverId: params.receiver.id,
      quantity: params.quantity,
      combo,
      priority,
      durationMs,
      displayArea,
      payload: basePayload,
    })

    const payload = { ...basePayload, queueId: enq?.id ?? null, queueIndex: enq?.queueIndex ?? 0 }

    // Persist the queued payload with correct queue info.
    if (enq?.id) {
      try {
        await prisma.giftQueue.update({ where: { id: enq.id }, data: { payload: JSON.stringify(payload) } })
      } catch {}
    }

    // Analytics / replay log (independent of the financial records).
    try {
      await prisma.giftHistory.create({
        data: {
          context: params.context,
          contextId: params.contextId,
          senderId: params.sender.id,
          receiverId: params.receiver.id,
          giftTypeId: g.id,
          quantity: params.quantity,
          combo,
          priority,
          coinAmount: params.coinAmount,
          animationType,
          displayArea,
        },
      })
    } catch (e) {
      console.error('[gift-engine] giftHistory.create failed:', e)
    }

    // Emit the unified events.
    await emitGiftEngineEvent(params.context, params.contextId, 'gift_received', payload)
    const queue = await getQueueSnapshot(params.contextId)
    await emitGiftEngineEvent(params.context, params.contextId, 'gift_queue_updated', {
      queueLength: queue.length,
      queue,
    })

    return payload
  } catch (e) {
    console.error('[gift-engine] processGiftSend failed (money flow unaffected):', e)
    return null
  }
}

function safeParse(s: any) {
  try { return typeof s === 'string' ? JSON.parse(s) : s } catch { return null }
}
