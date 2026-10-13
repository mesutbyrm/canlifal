import { syncRoomActivity, ROOM_ACTIVITY_COVERAGE } from '@/lib/room-activity'
import { activityTotals } from '@/lib/room-activity-math'
import { giftPointAmount } from '@/lib/gift-points'
/**
 * GirLive Yayıncı Asistanı — oturum raporu üretimi.
 * Sesli oda sahibi veya canlı yayın sahibi için brüt/net hediye,
 * ziyaret, PK istatistikleri ve ipuçları.
 */
import prisma from '@/lib/db'

type Scope = 'voice_room' | 'live_stream'

interface TopGift {
  giftId: string
  name: string
  count: number
  jetonTotal: number
}

interface TopGifter {
  userId: string
  displayName: string
  giftCount: number
  jetonTotal: number
}

interface ComparePrevious {
  visitsDelta: number | null
  grossJetonDelta: number | null
  pkWinRateDelta: number | null
}

export interface PublisherReport {
  sessionId: string | null
  startedAt: string | null
  endedAt: string | null
  totalVisits: number
  uniqueVisitors: number
  returnVisitors: number
  avgDwellSeconds: number | null
  peakHourLocal: number | null
  giftPointTotal: number
  grossGiftJeton: number
  netOwnerJeton: number
  giftCount: number
  topGifts: TopGift[]
  topGifters: TopGifter[]
  pkCompleted: number
  pkWon: number
  pkLost: number
  pkDraw: number
  pkUnfinished?: number
  activityCoverage?: string
  seatSeconds?: number
  seatDurations?: Record<string, number>
  closureReport?: unknown
  tips: string[]
  comparePrevious: ComparePrevious | null
}

// ────────────────────────────────────────────────────────────────
// Scope
// ────────────────────────────────────────────────────────────────
type TimeRange = { gte: Date; lte: Date }

function scopeRange(scope: string, sessionId?: string | null): { gte: Date; lte: Date } {
  const now = new Date()
  const start = new Date(now)
  switch (scope) {
    case 'day':
      const turkeyDay = new Date(now.getTime() + 10800000).toISOString().slice(0,10)
      start.setTime(new Date(`${turkeyDay}T00:00:00+03:00`).getTime())
      break
    case 'week':
      start.setDate(start.getDate() - 7)
      break
    case 'month':
      start.setMonth(start.getMonth() - 1)
      break
    default:
      // session scope — caller provides sessionId separately
      start.setHours(start.getHours() - 8) // fallback 8 saat
  }
  return { gte: start, lte: now }
}

// ────────────────────────────────────────────────────────────────
// Sesli oda raporu
// ────────────────────────────────────────────────────────────────
export async function buildVoiceRoomReport(
  roomId: string,
  ownerId: string,
  scope: string,
  sessionId?: string | null,
): Promise<PublisherReport> {
  await syncRoomActivity(roomId)
  const activitySession = scope === 'session' ? await prisma.roomActivitySession.findFirst({
    where: { roomId, ...(sessionId ? { id: sessionId } : {}) }, orderBy: { startedAt: 'desc' },
  }) : null
  if (scope === 'session' && sessionId && !activitySession) throw new Error('Faaliyet oturumu bulunamadı')
  const range = scopeRange(scope, sessionId)
  if (scope === 'session') {
    range.gte = activitySession?.startedAt || range.lte
    range.lte = activitySession?.endedAt || range.lte
  }

  // Hediyeler
  const gifts = await prisma.chatRoomGift.findMany({
    where: { roomId, createdAt: { gte: range.gte, lte: range.lte } },
    include: { giftType: { select: { id: true, name: true } }, sender: { select: { id: true, name: true, username: true } } },
  })
  const grossGiftJeton = gifts.reduce((s: number, g: any) => s + (g.totalPrice || 0), 0)
  const netOwnerJeton = gifts.reduce((s: number, g: any) => s + (g.ownerAmount ?? (g.recipientId === ownerId ? Math.max(0, g.totalPrice - g.commissionAmount) : 0)) + (g.recipientId === ownerId ? (g.receiverAmount || 0) : 0), 0)

  // Top hediyeler
  const giftMap = new Map<string, TopGift>()
  for (const g of gifts) {
    const key = g.giftTypeId
    const existing = giftMap.get(key)
    if (existing) {
      existing.count += g.quantity
      existing.jetonTotal += giftPointAmount(g)
    } else {
      giftMap.set(key, { giftId: key, name: (g as any).giftType?.name || '?', count: g.quantity, jetonTotal: giftPointAmount(g) })
    }
  }
  const topGifts = [...giftMap.values()].sort((a, b) => b.jetonTotal - a.jetonTotal).slice(0, 5)

  // Top gifters
  const gifterMap = new Map<string, TopGifter>()
  for (const g of gifts) {
    const sid = g.senderId
    const existing = gifterMap.get(sid)
    if (existing) {
      existing.giftCount += g.quantity
      existing.jetonTotal += giftPointAmount(g)
    } else {
      const sender = g.sender as any
      gifterMap.set(sid, {
        userId: sid,
        displayName: sender?.name || sender?.username || '?',
        giftCount: g.quantity,
        jetonTotal: giftPointAmount(g),
      })
    }
  }
  const topGifters = [...gifterMap.values()].sort((a, b) => b.jetonTotal - a.jetonTotal).slice(0, 5)

  const activitySpans = await prisma.roomActivitySpan.findMany({
    where: { roomId, ...(activitySession ? { sessionId: activitySession.id } : {}), startedAt: { lte: range.lte }, OR: [{ endedAt: null }, { endedAt: { gte: range.gte } }] },
  })
  const totals = activityTotals(activitySpans, range.gte, range.lte)
  const { uniqueVisitors, totalVisits } = totals
  const returnVisitors = totals.returnVisits

  // PK (oda sahibinin yayın ID'si yok — hostUserId veya guestUserId ile bul)
  const pkMatches = await prisma.pKBattle.findMany({
    where: {
      status: 'completed',
      createdAt: { gte: range.gte, lte: range.lte },
      OR: [{ stream1Id: roomId }, { stream2Id: roomId }],
    },
    select: { id: true, winnerId: true, isDraw: true, user1Id: true, user2Id: true },
  })
  const pkCompleted = pkMatches.length
  const pkWon = pkMatches.filter((m: any) => m.winnerId === ownerId).length
  const pkDraw = pkMatches.filter((m: any) => m.isDraw === true).length
  const pkLost = pkMatches.filter((m: any) => m.winnerId && m.winnerId !== ownerId).length
  const pkUnfinished = pkCompleted - pkWon - pkLost - pkDraw

  // İpuçları
  const tips: string[] = []
  if (grossGiftJeton > 0 && topGifters.length > 0) {
    tips.push(`En çok hediye gönderen: ${topGifters[0].displayName} (${topGifters[0].jetonTotal} hediye puanı)`)
  }
  if (pkCompleted > 0 && pkWon > pkLost) {
    tips.push(`PK performansınız güçlü! ${pkWon}/${pkCompleted} galibiyet.`)
  } else if (pkCompleted > 0 && pkLost > pkWon) {
    tips.push(`PK'da daha iyi olabilirsiniz — izleyicilerinizi motive edin!`)
  }
  if (uniqueVisitors < 5) {
    tips.push('Odanızı sosyal medyada paylaşarak daha fazla ziyaretçi çekebilirsiniz.')
  }

  return {
    sessionId: activitySession?.id || null,
    startedAt: range.gte.toISOString(),
    endedAt: activitySession?.endedAt?.toISOString() || null,
    activityCoverage: ROOM_ACTIVITY_COVERAGE,
    seatSeconds: totals.seatSeconds,
    seatDurations: totals.seats,
    closureReport: activitySession?.closureReport || null,
    totalVisits,
    uniqueVisitors,
    returnVisitors,
    avgDwellSeconds: totals.avgDwellSeconds,
    peakHourLocal: null,
    giftPointTotal: gifts.reduce((sum: number, gift: any) => sum + giftPointAmount(gift), 0),
    grossGiftJeton,
    netOwnerJeton,
    giftCount: gifts.length,
    topGifts,
    topGifters,
    pkCompleted,
    pkWon,
    pkLost,
    pkDraw,
    pkUnfinished,
    tips,
    comparePrevious: null,
  }
}

// ────────────────────────────────────────────────────────────────
// Canlı yayın raporu
// ────────────────────────────────────────────────────────────────
export async function buildStreamReport(
  streamId: string,
  ownerId: string,
  scope: string,
): Promise<PublisherReport> {
  const range = scopeRange(scope)

  // Yayın bilgisi
  const stream = await prisma.videoStream.findUnique({
    where: { id: streamId },
    select: { id: true, createdAt: true, endedAt: true },
  })

  if (scope === 'session' && stream) {
    range.gte = stream.createdAt
    range.lte = stream.endedAt || range.lte
  }

  // Hediyeler
  const gifts = await prisma.streamGift.findMany({
    where: { streamId, createdAt: { gte: range.gte, lte: range.lte } },
    include: { giftType: { select: { id: true, name: true } }, sender: { select: { id: true, name: true, username: true } } },
  })
  const grossGiftJeton = gifts.reduce((s: number, g: any) => s + (g.totalPrice || 0), 0)
  const netOwnerJeton = gifts.reduce((s: number, g: any) => s + (g.ownerAmount || 0) + ((!g.recipientId || g.recipientId === ownerId) ? (g.receiverAmount || 0) : 0), 0)

  // Top hediyeler
  const giftMap = new Map<string, TopGift>()
  for (const g of gifts) {
    const key = g.giftTypeId
    const existing = giftMap.get(key)
    if (existing) {
      existing.count += g.quantity
      existing.jetonTotal += giftPointAmount(g)
    } else {
      giftMap.set(key, { giftId: key, name: (g as any).giftType?.name || '?', count: g.quantity, jetonTotal: giftPointAmount(g) })
    }
  }
  const topGifts = [...giftMap.values()].sort((a, b) => b.jetonTotal - a.jetonTotal).slice(0, 5)

  // Top gifters
  const gifterMap = new Map<string, TopGifter>()
  for (const g of gifts) {
    const sid = g.senderId
    const existing = gifterMap.get(sid)
    if (existing) {
      existing.giftCount += g.quantity
      existing.jetonTotal += giftPointAmount(g)
    } else {
      const sender = g.sender as any
      gifterMap.set(sid, {
        userId: sid,
        displayName: sender?.name || sender?.username || '?',
        giftCount: g.quantity,
        jetonTotal: giftPointAmount(g),
      })
    }
  }
  const topGifters = [...gifterMap.values()].sort((a, b) => b.jetonTotal - a.jetonTotal).slice(0, 5)

  // İzleyiciler
  const viewers = await prisma.videoStreamViewer.findMany({
    where: { streamId, joinedAt: { lte: range.lte }, OR: [{ leftAt: null }, { leftAt: { gte: range.gte } }] },
    select: { viewerId: true, joinedAt: true, leftAt: true },
  })
  const uniqueIds = new Set(viewers.map((v: any) => v.viewerId).filter(Boolean))
  const uniqueVisitors = uniqueIds.size
  const totalVisits = viewers.length

  // Ortalama kalma süresi
  let totalDwell = 0
  let dwellCount = 0
  for (const v of viewers as any[]) {
    if (v.joinedAt) {
      const end = Math.min(v.leftAt ? new Date(v.leftAt).getTime() : range.lte.getTime(), range.lte.getTime(), stream?.endedAt?.getTime() ?? range.lte.getTime())
      totalDwell += Math.max(0, end - Math.max(new Date(v.joinedAt).getTime(), range.gte.getTime())) / 1000
      dwellCount++
    }
  }
  const avgDwellSeconds = dwellCount > 0 ? Math.round(totalDwell / dwellCount) : null

  // PK
  const pkMatches = await prisma.pKBattle.findMany({
    where: {
      status: 'completed',
      createdAt: { gte: range.gte, lte: range.lte },
      OR: [{ stream1Id: streamId }, { stream2Id: streamId }],
    },
    select: { id: true, winnerId: true, isDraw: true },
  })
  const pkCompleted = pkMatches.length
  const pkWon = pkMatches.filter((m: any) => m.winnerId === ownerId).length
  const pkDraw = pkMatches.filter((m: any) => m.isDraw === true).length
  const pkLost = pkMatches.filter((m: any) => m.winnerId && m.winnerId !== ownerId).length
  const pkUnfinished = pkCompleted - pkWon - pkLost - pkDraw

  // İpuçları
  const tips: string[] = []
  if (grossGiftJeton > 0 && topGifters.length > 0) {
    tips.push(`En çok hediye gönderen: ${topGifters[0].displayName} (${topGifters[0].jetonTotal} hediye puanı)`)
  }
  if (avgDwellSeconds && avgDwellSeconds < 120) {
    tips.push('İzleyicileriniz ortalama 2 dakikadan az kalıyor — içeriği çeşitlendirmeyi deneyin.')
  }
  if (pkCompleted > 0 && pkWon >= pkLost) {
    tips.push(`PK performansınız güçlü! ${pkWon}/${pkCompleted} galibiyet.`)
  }

  return {
    sessionId: streamId,
    startedAt: stream?.createdAt?.toISOString() || null,
    endedAt: (stream as any)?.endedAt?.toISOString() || null,
    totalVisits,
    uniqueVisitors,
    returnVisitors: Math.max(0, totalVisits - uniqueVisitors),
    avgDwellSeconds,
    peakHourLocal: null,
    giftPointTotal: gifts.reduce((sum: number, gift: any) => sum + giftPointAmount(gift), 0),
    grossGiftJeton,
    netOwnerJeton,
    giftCount: gifts.length,
    topGifts,
    topGifters,
    pkCompleted,
    pkWon,
    pkLost,
    pkDraw,
    pkUnfinished,
    tips,
    comparePrevious: null,
  }
}

// ────────────────────────────────────────────────────────────────
// Patron hitabı
// ────────────────────────────────────────────────────────────────
const PATRON_ROLES = ['admin', 'yonetici']

export async function resolveGreetingName(userId: string): Promise<{ displayName: string; isPatron: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, username: true, role: true, isFounder: true },
  })
  if (!user) return { displayName: 'kullanıcı', isPatron: false }
  const isPatron = PATRON_ROLES.includes(user.role || '') || (user as any).isFounder === true
  const displayName = isPatron
    ? `Patron${user.username ? ` @${user.username}` : (user.name ? ` ${user.name}` : '')}`
    : user.name || (user.username ? `@${user.username}` : 'kullanıcı')
  return { displayName, isPatron }
}
