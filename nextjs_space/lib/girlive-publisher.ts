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
  grossGiftJeton: number
  netOwnerJeton: number
  giftCount: number
  topGifts: TopGift[]
  topGifters: TopGifter[]
  pkCompleted: number
  pkWon: number
  pkLost: number
  pkDraw: number
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
      start.setHours(0, 0, 0, 0)
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
  const range = scopeRange(scope, sessionId)

  // Hediyeler
  const gifts = await prisma.chatRoomGift.findMany({
    where: { roomId, recipientId: ownerId, createdAt: { gte: range.gte, lte: range.lte } },
    include: { giftType: { select: { id: true, name: true } }, sender: { select: { id: true, name: true, username: true } } },
  })
  const grossGiftJeton = gifts.reduce((s: number, g: any) => s + (g.totalPrice || 0), 0)
  const totalCommission = gifts.reduce((s: number, g: any) => s + (g.commissionAmount || 0), 0)
  const netOwnerJeton = grossGiftJeton - totalCommission

  // Top hediyeler
  const giftMap = new Map<string, TopGift>()
  for (const g of gifts) {
    const key = g.giftTypeId
    const existing = giftMap.get(key)
    if (existing) {
      existing.count += g.quantity
      existing.jetonTotal += g.totalPrice
    } else {
      giftMap.set(key, { giftId: key, name: (g as any).giftType?.name || '?', count: g.quantity, jetonTotal: g.totalPrice })
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
      existing.jetonTotal += g.totalPrice
    } else {
      const sender = g.sender as any
      gifterMap.set(sid, {
        userId: sid,
        displayName: sender?.name || sender?.username || '?',
        giftCount: g.quantity,
        jetonTotal: g.totalPrice,
      })
    }
  }
  const topGifters = [...gifterMap.values()].sort((a, b) => b.jetonTotal - a.jetonTotal).slice(0, 5)

  // Ziyaretçiler (ChatPresence verisi — şu an aktif olanlar + geçmiş log yoksa 0)
  const presences = await prisma.chatPresence.findMany({
    where: { roomId },
    select: { userId: true },
  })
  const uniqueVisitors = presences.length
  const totalVisits = uniqueVisitors // gerçek giriş logu yoksa eşit
  const returnVisitors = 0 // return bilgisi log olmadan hesaplanamaz

  // PK (oda sahibinin yayın ID'si yok — hostUserId veya guestUserId ile bul)
  const pkMatches = await prisma.pkMatch.findMany({
    where: {
      status: 'finished',
      createdAt: { gte: range.gte, lte: range.lte },
      OR: [{ hostUserId: ownerId }, { guestUserId: ownerId }],
    },
    select: { id: true, winnerUserId: true, result: true, hostUserId: true, guestUserId: true },
  })
  const pkCompleted = pkMatches.length
  const pkWon = pkMatches.filter((m: any) => m.winnerUserId === ownerId).length
  const pkDraw = pkMatches.filter((m: any) => m.result === 'draw').length
  const pkLost = pkCompleted - pkWon - pkDraw

  // İpuçları
  const tips: string[] = []
  if (grossGiftJeton > 0 && topGifters.length > 0) {
    tips.push(`En çok hediye gönderen: ${topGifters[0].displayName} (${topGifters[0].jetonTotal} jeton)`)
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
    sessionId: sessionId || null,
    startedAt: range.gte.toISOString(),
    endedAt: null,
    totalVisits,
    uniqueVisitors,
    returnVisitors,
    avgDwellSeconds: null,
    peakHourLocal: null,
    grossGiftJeton,
    netOwnerJeton,
    giftCount: gifts.length,
    topGifts,
    topGifters,
    pkCompleted,
    pkWon,
    pkLost,
    pkDraw,
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

  // Hediyeler
  const gifts = await prisma.streamGift.findMany({
    where: { streamId, createdAt: { gte: range.gte, lte: range.lte } },
    include: { giftType: { select: { id: true, name: true } }, sender: { select: { id: true, name: true, username: true } } },
  })
  const grossGiftJeton = gifts.reduce((s: number, g: any) => s + (g.totalPrice || 0), 0)
  const netOwnerJeton = gifts.reduce((s: number, g: any) => s + (g.receiverAmount || 0), 0)

  // Top hediyeler
  const giftMap = new Map<string, TopGift>()
  for (const g of gifts) {
    const key = g.giftTypeId
    const existing = giftMap.get(key)
    if (existing) {
      existing.count += g.quantity
      existing.jetonTotal += g.totalPrice
    } else {
      giftMap.set(key, { giftId: key, name: (g as any).giftType?.name || '?', count: g.quantity, jetonTotal: g.totalPrice })
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
      existing.jetonTotal += g.totalPrice
    } else {
      const sender = g.sender as any
      gifterMap.set(sid, {
        userId: sid,
        displayName: sender?.name || sender?.username || '?',
        giftCount: g.quantity,
        jetonTotal: g.totalPrice,
      })
    }
  }
  const topGifters = [...gifterMap.values()].sort((a, b) => b.jetonTotal - a.jetonTotal).slice(0, 5)

  // İzleyiciler
  const viewers = await prisma.videoStreamViewer.findMany({
    where: { streamId },
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
      const end = v.leftAt ? new Date(v.leftAt).getTime() : Date.now()
      totalDwell += (end - new Date(v.joinedAt).getTime()) / 1000
      dwellCount++
    }
  }
  const avgDwellSeconds = dwellCount > 0 ? Math.round(totalDwell / dwellCount) : null

  // PK
  const pkMatches = await prisma.pkMatch.findMany({
    where: {
      status: 'finished',
      createdAt: { gte: range.gte, lte: range.lte },
      OR: [{ hostUserId: ownerId }, { guestUserId: ownerId }],
    },
    select: { id: true, winnerUserId: true, result: true },
  })
  const pkCompleted = pkMatches.length
  const pkWon = pkMatches.filter((m: any) => m.winnerUserId === ownerId).length
  const pkDraw = pkMatches.filter((m: any) => m.result === 'draw').length
  const pkLost = pkCompleted - pkWon - pkDraw

  // İpuçları
  const tips: string[] = []
  if (grossGiftJeton > 0 && topGifters.length > 0) {
    tips.push(`En çok hediye gönderen: ${topGifters[0].displayName} (${topGifters[0].jetonTotal} jeton)`)
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
    grossGiftJeton,
    netOwnerJeton,
    giftCount: gifts.length,
    topGifts,
    topGifters,
    pkCompleted,
    pkWon,
    pkLost,
    pkDraw,
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
