import prisma from '@/lib/db'
import { atomicDebitJeton, isInsufficientBalanceError, type JetonSource } from '@/lib/balance-guard'
import { parseJetonSource, resolveJetonSpend } from '@/lib/jeton-source'
import { getRoomMusicSettings } from '@/lib/chat-music-settings'
import { calculateMusicDistribution, logRoomRevenue } from '@/lib/voice-room-revenue'

/**
 * DJ isteği (!istek şarkıcı şarkı):
 * - İstekte ücret BLOKE edilir (kullanıcıdan düşülür, henüz dağıtılmaz).
 * - Oda sahibi odadaysa ona, değilse odadaki aktif DJ'lere açılır pencere gider.
 * - DJ «Çal» derse (kendi telefonundaki müziği yayına karıştırır) ücret kesinleşir
 *   ve oda gelir dağılımına göre paylaştırılır.
 * - DJ reddederse, istek sahibi iptal ederse ya da süre dolarsa ücret iade edilir.
 *
 * Şema değişikliği yok: kayıtlar `ChatMessage` içinde `[DJ_REQ] {json}` olarak durur.
 */

export const DJ_REQ_PREFIX = '[DJ_REQ] '
/** Bekleyen istek bu süre içinde kabul edilmezse iade edilir. */
export const DJ_REQ_PENDING_TTL_MS = 5 * 60 * 1000
/** Çalınan istek bu süre sonra kart üzerinden kalkar. */
export const DJ_REQ_PLAYING_TTL_MS = 10 * 60 * 1000

export type DjRequestStatus = 'pending' | 'playing' | 'done' | 'rejected' | 'expired' | 'cancelled'

export interface DjRequestData {
  v: 1
  status: DjRequestStatus
  query: string
  cost: number
  /** Bloke edilen havuz; null = ücretsiz (personel). */
  source: JetonSource | null
  countsAsFinance: boolean
  requesterName: string
  handlerId?: string
  handlerName?: string
  /** İsteyenin mesajı (bantta 2. satırda kayar). */
  message?: string
  /** Şarkının armağan edildiği kişi. */
  giftToId?: string
  giftToName?: string
  /** Öne geç (çift ücret) — sırada en üstte. */
  priority?: boolean
  claps?: number
  clapperIds?: string[]
  createdAtMs: number
  updatedAtMs: number
}

export interface DjRequestView {
  id: string
  status: DjRequestStatus
  query: string
  cost: number
  userId: string
  userName: string
  handlerId: string | null
  handlerName: string | null
  message: string | null
  giftToId: string | null
  giftToName: string | null
  priority: boolean
  claps: number
  createdAtMs: number
  updatedAtMs: number
}

export class DjRequestError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

function parse(content: string): DjRequestData | null {
  if (!content.startsWith(DJ_REQ_PREFIX)) return null
  try {
    const d = JSON.parse(content.slice(DJ_REQ_PREFIX.length))
    return d && d.v === 1 ? (d as DjRequestData) : null
  } catch {
    return null
  }
}

function serialize(d: DjRequestData) {
  return DJ_REQ_PREFIX + JSON.stringify(d)
}

function toView(msg: { id: string; userId: string }, d: DjRequestData): DjRequestView {
  return {
    id: msg.id,
    status: d.status,
    query: d.query,
    cost: d.cost,
    userId: msg.userId,
    userName: d.requesterName,
    handlerId: d.handlerId ?? null,
    handlerName: d.handlerName ?? null,
    message: d.message ?? null,
    giftToId: d.giftToId ?? null,
    giftToName: d.giftToName ?? null,
    priority: d.priority === true,
    claps: d.claps ?? 0,
    createdAtMs: d.createdAtMs,
    updatedAtMs: d.updatedAtMs,
  }
}

/**
 * İsteği yalnızca içerik hâlâ beklenen haldeyse günceller (iyimser kilit):
 * iki DJ aynı anda kabul ederse ya da süre dolumu ile kabul çakışırsa
 * yalnız biri kazanır — çift iade / çift kesinti olmaz.
 */
async function transition(
  msgId: string,
  oldContent: string,
  next: DjRequestData,
): Promise<boolean> {
  const res = await prisma.chatMessage.updateMany({
    where: { id: msgId, content: oldContent },
    data: { content: serialize(next) },
  })
  return res.count === 1
}

async function refund(userId: string, d: DjRequestData, reason: string) {
  if (!d.source || d.cost <= 0) return
  const field = d.source === 'fake' ? 'fakeJetonBalance' : 'jetonBalance'
  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { jetonBalance: true },
  })
  await prisma.user.update({
    where: { id: userId },
    data: { [field]: { increment: d.cost } },
  })
  if (d.countsAsFinance) {
    const b = before?.jetonBalance ?? 0
    await prisma.jetonTransaction.create({
      data: {
        userId,
        amount: d.cost,
        type: 'refund',
        description: `Şarkı isteği iadesi (${reason}): ${d.query}`,
        balanceBefore: b,
        balanceAfter: b + d.cost,
      },
    })
  }
}

/** Oda sahibi odadaysa yalnız o; değilse odadaki DJ'ler. Global admin her zaman. */
export async function resolveDjHandlers(roomId: string): Promise<string[]> {
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { ownerId: true, djUserIds: true },
  })
  if (!room) return []
  const presences = await prisma.chatPresence.findMany({
    where: { roomId },
    select: { userId: true },
  })
  const present = new Set(presences.map((p) => p.userId))
  if (room.ownerId && present.has(room.ownerId)) return [room.ownerId]
  let djs: string[] = []
  try {
    djs = room.djUserIds ? JSON.parse(room.djUserIds) : []
  } catch {}
  if (!Array.isArray(djs)) djs = []
  djs = djs.filter((id) => typeof id === 'string' && id.length > 0)
  const presentDjs = djs.filter((id) => present.has(id))
  if (presentDjs.length > 0) return presentDjs
  // Varlık kaydı gecikmiş / boş olabilir: oda sahibi + tüm DJ'ler hedeflenir.
  return Array.from(new Set([...(room.ownerId ? [room.ownerId] : []), ...djs]))
}

async function canHandle(roomId: string, userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (u?.role === 'admin' || u?.role === 'yonetici') return true
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { ownerId: true, djUserIds: true },
  })
  if (!room) return false
  if (room.ownerId === userId) return true
  try {
    const djs = room.djUserIds ? JSON.parse(room.djUserIds) : []
    return Array.isArray(djs) && djs.includes(userId)
  } catch {
    return false
  }
}

/**
 * Odanın açık DJ isteklerini döner; süresi dolan bekleyenleri iade eder,
 * uzun süredir çalan istekleri kapatır.
 */
export async function listRoomDjRequests(roomId: string): Promise<{
  pending: DjRequestView[]
  playing: DjRequestView | null
}> {
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000)
  const rows = await prisma.chatMessage.findMany({
    where: { roomId, content: { startsWith: DJ_REQ_PREFIX }, createdAt: { gte: since } },
    orderBy: { createdAt: 'asc' },
    take: 50,
    select: { id: true, userId: true, content: true },
  })
  const now = Date.now()
  const pending: DjRequestView[] = []
  let playing: DjRequestView | null = null
  for (const row of rows) {
    const d = parse(row.content)
    if (!d) continue
    if (d.status === 'pending') {
      if (now - d.createdAtMs > DJ_REQ_PENDING_TTL_MS) {
        const next = { ...d, status: 'expired' as const, updatedAtMs: now }
        if (await transition(row.id, row.content, next)) {
          await refund(row.userId, d, 'süre doldu').catch((e) =>
            console.error('dj-request refund (expired) error:', e),
          )
        }
        continue
      }
      pending.push(toView(row, d))
    } else if (d.status === 'playing') {
      if (now - d.updatedAtMs > DJ_REQ_PLAYING_TTL_MS) {
        await transition(row.id, row.content, { ...d, status: 'done', updatedAtMs: now })
        continue
      }
      // En son başlayan çalıyor kabul edilir.
      if (!playing || d.updatedAtMs >= playing.updatedAtMs) playing = toView(row, d)
    }
  }
  // Öne geçenler önce, sonra geliş sırası.
  pending.sort((a, b) =>
    a.priority !== b.priority ? (a.priority ? -1 : 1) : a.createdAtMs - b.createdAtMs,
  )
  return { pending, playing }
}

export async function createDjRequest(params: {
  roomId: string
  userId: string
  query: string
  jetonSource?: unknown
  message?: string
  giftToUserId?: string
  priority?: boolean
}) {
  const query = params.query.replace(/\s+/g, ' ').trim().slice(0, 120)
  const message = (params.message ?? '').replace(/\s+/g, ' ').trim().slice(0, 100)
  const priority = params.priority === true
  if (query.length < 2) throw new DjRequestError('Şarkı ve şarkıcı adını yazın (ör. !istek Tarkan Kuzu Kuzu)')

  const settings = await getRoomMusicSettings(params.roomId)
  if (!settings.musicEnabled) throw new DjRequestError('Bu odada müzik isteği kapalı', 403)

  // Odada kimse görünmese de istek alınır (oda sahibi + DJ'lere gider);
  // 5 dk içinde çalınmazsa jeton otomatik iade edilir.
  const handlers = await resolveDjHandlers(params.roomId)

  // Kullanıcı başına tek bekleyen istek (spam ve yanlışlıkla çift kesinti önlemi).
  const open = await listRoomDjRequests(params.roomId)
  if (open.pending.some((p) => p.userId === params.userId)) {
    throw new DjRequestError('Zaten bekleyen bir isteğin var; DJ yanıtlayınca yenisini gönderebilirsin', 409)
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { name: true, username: true, jetonBalance: true },
  })
  if (!user) throw new DjRequestError('Kullanıcı bulunamadı', 404)

  const baseCost = Math.max(0, Math.floor(settings.musicRequestCost))
  // Öne geç: ücretin iki katı (varsayılan 10 → 20 jeton).
  const cost = priority ? baseCost * 2 : baseCost

  let giftToId: string | undefined
  let giftToName: string | undefined
  const giftRaw = (params.giftToUserId ?? '').trim()
  if (giftRaw && giftRaw !== params.userId) {
    const g = await prisma.user.findUnique({
      where: { id: giftRaw },
      select: { id: true, name: true, username: true },
    })
    if (g) {
      giftToId = g.id
      giftToName = g.username || g.name || undefined
    }
  }
  const plan = await resolveJetonSpend(params.userId, cost, parseJetonSource(params.jetonSource))
  const charge = !plan.skipDeduction && cost > 0

  if (charge) {
    try {
      await atomicDebitJeton(prisma, params.userId, cost, plan.source)
    } catch (e) {
      if (isInsufficientBalanceError(e)) {
        throw new DjRequestError(`Yetersiz jeton. ${cost} jeton gerekiyor.`, 400)
      }
      throw e
    }
    if (plan.countsAsFinance) {
      const b = user.jetonBalance ?? 0
      await prisma.jetonTransaction.create({
        data: {
          userId: params.userId,
          amount: -cost,
          type: 'spend',
          description: `Şarkı isteği (DJ onayı bekleniyor, onaylanmazsa iade): ${query}`,
          balanceBefore: b,
          balanceAfter: b - cost,
        },
      })
    }
  }

  const now = Date.now()
  const requesterName = user.name || user.username || 'Biri'
  const data: DjRequestData = {
    v: 1,
    status: 'pending',
    query,
    cost: charge ? cost : 0,
    source: charge ? plan.source : null,
    countsAsFinance: charge && plan.countsAsFinance,
    requesterName,
    ...(message ? { message } : {}),
    ...(giftToId ? { giftToId, giftToName } : {}),
    ...(priority ? { priority: true } : {}),
    createdAtMs: now,
    updatedAtMs: now,
  }
  const msg = await prisma.chatMessage.create({
    data: { roomId: params.roomId, userId: params.userId, content: serialize(data) },
  })
  await prisma.chatMessage.create({
    data: {
      roomId: params.roomId,
      userId: params.userId,
      content:
        `🎵 ${requesterName} şarkı isteği gönderdi: ${query}` +
        (giftToName ? ` → 🎁 @${giftToName}` : '') +
        (priority ? ' ⚡ öne geçti' : '') +
        (message ? ` — «${message}»` : '') +
        (charge ? ` [${cost} 💎 — DJ çalarsa kesilir]` : ''),
    },
  })
  return { request: toView(msg, data), handlers }
}

export async function actOnDjRequest(params: {
  roomId: string
  userId: string
  requestId: string
  action: 'play' | 'reject' | 'cancel' | 'done' | 'clap'
}) {
  const row = await prisma.chatMessage.findUnique({
    where: { id: params.requestId },
    select: { id: true, roomId: true, userId: true, content: true },
  })
  const d = row ? parse(row.content) : null
  if (!row || !d || row.roomId !== params.roomId) throw new DjRequestError('İstek bulunamadı', 404)

  const now = Date.now()
  const isRequester = row.userId === params.userId

  if (params.action === 'clap') {
    // Alkış: çalan şarkıya kişi başı bir kez; kilit çakışırsa birkaç kez dene.
    for (let attempt = 0; attempt < 4; attempt++) {
      const cur = attempt === 0
        ? row
        : await prisma.chatMessage.findUnique({
            where: { id: row.id },
            select: { id: true, roomId: true, userId: true, content: true },
          })
      const cd = cur ? parse(cur.content) : null
      if (!cur || !cd || cd.status !== 'playing') {
        throw new DjRequestError('Bu şarkı artık çalmıyor', 409)
      }
      const ids = cd.clapperIds ?? []
      if (ids.includes(params.userId)) return { status: cd.status, claps: cd.claps ?? ids.length }
      const next = {
        ...cd,
        clapperIds: [...ids, params.userId].slice(-200),
        claps: (cd.claps ?? 0) + 1,
      }
      if (await transition(cur.id, cur.content, next)) {
        const u = await prisma.user.findUnique({
          where: { id: params.userId },
          select: { name: true, username: true },
        })
        await prisma.chatMessage.create({
          data: {
            roomId: params.roomId,
            userId: params.userId,
            content: `👏 ${u?.name || u?.username || 'Biri'} alkışladı: ${cd.query}`,
          },
        })
        return { status: cd.status, claps: next.claps }
      }
    }
    throw new DjRequestError('Alkış kaydedilemedi, tekrar dene', 409)
  }

  if (params.action === 'cancel') {
    if (!isRequester) throw new DjRequestError('Yalnız istek sahibi iptal edebilir', 403)
    if (d.status !== 'pending') throw new DjRequestError('İstek artık iptal edilemez', 409)
    const ok = await transition(row.id, row.content, { ...d, status: 'cancelled', updatedAtMs: now })
    if (!ok) throw new DjRequestError('İstek zaten yanıtlandı', 409)
    await refund(row.userId, d, 'iptal')
    return { status: 'cancelled' as const }
  }

  if (!(await canHandle(params.roomId, params.userId))) {
    throw new DjRequestError('Bu işlem için oda sahibi veya DJ olmalısın', 403)
  }
  const handler = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { name: true, username: true },
  })
  const handlerName = handler?.name || handler?.username || 'DJ'

  if (params.action === 'done') {
    if (d.status !== 'playing') return { status: d.status }
    await transition(row.id, row.content, { ...d, status: 'done', updatedAtMs: now })
    return { status: 'done' as const }
  }

  if (d.status !== 'pending') throw new DjRequestError('İstek zaten yanıtlandı', 409)

  if (params.action === 'reject') {
    const ok = await transition(row.id, row.content, {
      ...d,
      status: 'rejected',
      handlerId: params.userId,
      handlerName,
      updatedAtMs: now,
    })
    if (!ok) throw new DjRequestError('İstek zaten yanıtlandı', 409)
    await refund(row.userId, d, 'DJ reddetti')
    await prisma.chatMessage.create({
      data: {
        roomId: params.roomId,
        userId: params.userId,
        content: `🎧 ${handlerName} «${d.query}» isteğini çalamadı — ${d.cost > 0 ? `${d.cost} jeton iade edildi` : 'istek kapandı'}`,
      },
    })
    return { status: 'rejected' as const }
  }

  // play: önceki çalan istek kapanır; bu istek kesinleşir ve gelir dağıtılır.
  const ok = await transition(row.id, row.content, {
    ...d,
    status: 'playing',
    handlerId: params.userId,
    handlerName,
    updatedAtMs: now,
  })
  if (!ok) throw new DjRequestError('İstek zaten yanıtlandı', 409)

  const others = await prisma.chatMessage.findMany({
    where: {
      roomId: params.roomId,
      content: { startsWith: DJ_REQ_PREFIX },
      id: { not: row.id },
      createdAt: { gte: new Date(now - 2 * 60 * 60 * 1000) },
    },
    select: { id: true, content: true },
  })
  for (const o of others) {
    const od = parse(o.content)
    if (od?.status === 'playing') {
      await transition(o.id, o.content, { ...od, status: 'done', updatedAtMs: now })
    }
  }

  if (d.cost > 0 && d.countsAsFinance) {
    const room = await prisma.chatRoom.findUnique({
      where: { id: params.roomId },
      select: { roomType: true, ownerId: true, nameTr: true },
    })
    const roomType = room?.roomType || 'FREE'
    const dist = await calculateMusicDistribution(roomType, d.cost)
    if (dist.ownerAmount > 0 && room?.ownerId) {
      const owner = await prisma.user.findUnique({
        where: { id: room.ownerId },
        select: { jetonBalance: true },
      })
      if (owner) {
        const ob = owner.jetonBalance ?? 0
        await prisma.user.update({
          where: { id: room.ownerId },
          data: { jetonBalance: { increment: dist.ownerAmount } },
        })
        await prisma.jetonTransaction.create({
          data: {
            userId: room.ownerId,
            amount: dist.ownerAmount,
            type: 'music_income',
            description: `Müzik isteği geliri: ${d.query} (${room.nameTr})`,
            balanceBefore: ob,
            balanceAfter: ob + dist.ownerAmount,
          },
        })
      }
    }
    logRoomRevenue({
      roomId: params.roomId,
      eventType: 'music_request',
      totalAmount: d.cost,
      receiverAmount: 0,
      ownerAmount: dist.ownerAmount,
      siteAmount: dist.siteAmount,
      senderId: row.userId,
      ownerId: room?.ownerId || undefined,
      metadata: { title: d.query, roomType, djRequest: true, handlerId: params.userId },
    }).catch(() => {})
  }

  await prisma.chatMessage.create({
    data: {
      roomId: params.roomId,
      userId: params.userId,
      content: `🎶 ${handlerName} çalıyor: ${d.query} — isteyen ${d.requesterName}`,
    },
  })
  return { status: 'playing' as const }
}
