/**
 * BÖLÜM 21 §1–§7, §49, §52 — Kullanıcı Yönetim Merkezi veri ucu.
 *
 * TEK uç, sekme başına tembel yükleme:
 *   GET /api/admin/users/<id>/360?section=general
 *   GET /api/admin/users/<id>/360?section=activity&page=1&limit=25
 *
 * İlk açılışta yalnız `general` çağrılır (§49). Diğer sekmeler tıklanınca gelir.
 * Her bölüm kendi try/catch'i içinde çalışır: bir sorgu patlarsa modal çökmez.
 */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requirePermission } from '@/lib/rbac'
import { hasPermission } from '@/lib/permissions'
import { apiSuccess, apiError, apiNotFound, ErrorCodes } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

type Ctx = { params: { userId: string } }

const SECTIONS = [
  'general', 'activity', 'rooms', 'live', 'fortune', 'jeton', 'cfc',
  'gifts', 'earnings', 'spending', 'agency', 'vip', 'moderation',
  'permissions', 'timeline', 'media', 'reports',
] as const
type Section = (typeof SECTIONS)[number]

/** Finansal sekmeler ayrı yetki ister (§9). */
const FINANCE_SECTIONS: Section[] = ['jeton', 'cfc', 'earnings', 'spending']

function rangeStart(range: string | null): Date | null {
  const now = Date.now()
  switch (range) {
    case 'today': { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
    case '7d': return new Date(now - 7 * 864e5)
    case '30d': return new Date(now - 30 * 864e5)
    case '90d': return new Date(now - 90 * 864e5)
    default: return null // all
  }
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn() } catch (e) { console.error('[user360] section query failed:', e); return fallback }
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const auth = await requirePermission(req, 'user360.view')
  if (auth instanceof NextResponse) return auth
  const admin = (auth as any).user

  const url = new URL(req.url)
  const section = (url.searchParams.get('section') || 'general') as Section
  if (!SECTIONS.includes(section)) {
    return apiError(ErrorCodes.VALIDATION_ERROR, 'Geçersiz bölüm', 400, { section })
  }

  if (FINANCE_SECTIONS.includes(section)) {
    const ok = await hasPermission(admin.role, 'user360.finance.view', admin.id)
    if (!ok) return apiError(ErrorCodes.FORBIDDEN, 'Finansal veriler için yetkiniz yok', 403)
  }

  const userId = params.userId
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '25', 10) || 25))
  const skip = (page - 1) * limit
  const from = rangeStart(url.searchParams.get('range'))

  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!exists) return apiNotFound('Kullanıcı bulunamadı')

  switch (section) {
    // ── §2 GENEL ───────────────────────────────────────────
    case 'general': {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, name: true, username: true, email: true, image: true, bio: true,
          role: true, membership: true, membershipExpiresAt: true, createdAt: true,
          lastActiveAt: true, isBanned: true, banReason: true, bannedUntil: true,
          isFrozen: true, frozenAt: true, frozenReason: true, hiddenFromDiscovery: true,
          warningCount: true, isVerifiedUser: true, canBroadcast: true, canCreateRoom: true,
          canChat: true, canSendGift: true, canPK: true, isBot: true, level: true, xp: true,
          vipXp: true, vipTitle: true, customUserId: true, city: true, country: true,
          totalTimeSpentMinutes: true, loginStreak: true,
          agencyMembership: {
            select: { id: true, role: true, isActive: true, agency: { select: { id: true, name: true } } },
          },
          fortuneTellerProfile: {
            select: { id: true, displayName: true, isActive: true, isBanned: true, isFrozen: true, applicationStatus: true, approvedAt: true },
          },
        },
      })

      const counts = await safe(async () => {
        const [followers, following, ownedRooms, streams, warnings] = await Promise.all([
          prisma.follow.count({ where: { followingId: userId } }),
          prisma.follow.count({ where: { followerId: userId } }),
          prisma.chatRoom.count({ where: { ownerId: userId } }),
          prisma.videoStream.count({ where: { userId } }),
          prisma.userWarning.count({ where: { userId } }),
        ])
        return { followers, following, owned_rooms: ownedRooms, streams, warnings }
      }, { followers: 0, following: 0, owned_rooms: 0, streams: 0, warnings: 0 })

      const lastLogin = await safe(
        () => prisma.userLoginSession.findFirst({ where: { userId }, orderBy: { loginAt: 'desc' }, select: { loginAt: true, deviceType: true, browser: true } }),
        null as any
      )

      const accountAgeDays = user?.createdAt
        ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 864e5)
        : 0

      return apiSuccess({ user, counts, last_login: lastLogin, account_age_days: accountAgeDays })
    }

    // ── §3 AKTİVİTE ────────────────────────────────────────
    case 'activity': {
      const where: any = { userId }
      if (from) where.loginAt = { gte: from }
      const [sessions, total, activities, daily] = await Promise.all([
        safe(() => prisma.userLoginSession.findMany({ where, orderBy: { loginAt: 'desc' }, skip, take: limit }), [] as any[]),
        safe(() => prisma.userLoginSession.count({ where }), 0),
        safe(() => prisma.liveActivity.findMany({ where: { userId, ...(from ? { createdAt: { gte: from } } : {}) }, orderBy: { createdAt: 'desc' }, take: 50 }), [] as any[]),
        safe(() => prisma.userDailyActivity.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 30 }), [] as any[]),
      ])
      const totalMinutes = (sessions as any[]).reduce((a, s) => a + (s.duration || 0), 0)
      return apiSuccess({ sessions, total, page, limit, recent_activities: activities, daily, page_total_minutes: totalMinutes })
    }

    // ── §4 ODA GEÇMİŞİ ─────────────────────────────────────
    case 'rooms': {
      const [owned, visits, total] = await Promise.all([
        safe(() => prisma.chatRoom.findMany({ where: { ownerId: userId }, select: { id: true, slug: true, nameTr: true, roomType: true, isActive: true, createdAt: true } }), [] as any[]),
        safe(() => prisma.voiceSession.findMany({ where: { userId }, orderBy: { joinedAt: 'desc' }, skip, take: limit }), [] as any[]),
        safe(() => prisma.voiceSession.count({ where: { userId } }), 0),
      ])
      const roomIds = Array.from(new Set((visits as any[]).map((v) => v.roomId)))
      const rooms = await safe(
        () => prisma.chatRoom.findMany({ where: { id: { in: roomIds } }, select: { id: true, slug: true, nameTr: true } }),
        [] as any[]
      )
      const roomMap = new Map((rooms as any[]).map((r) => [r.id, r]))
      const history = (visits as any[]).map((v) => ({
        ...v,
        room: roomMap.get(v.roomId) || null,
        minutes: Math.max(0, Math.round((new Date(v.lastPing).getTime() - new Date(v.joinedAt).getTime()) / 60000)),
      }))
      return apiSuccess({ owned_rooms: owned, history, total, page, limit })
    }

    // ── §5 CANLI YAYIN ─────────────────────────────────────
    case 'live': {
      const where: any = { userId }
      if (from) where.startedAt = { gte: from }
      const [streams, total, agg] = await Promise.all([
        safe(() => prisma.videoStream.findMany({ where, orderBy: { startedAt: 'desc' }, skip, take: limit, select: { id: true, title: true, status: true, viewerCount: true, likeCount: true, startedAt: true, endedAt: true, category: true } }), [] as any[]),
        safe(() => prisma.videoStream.count({ where }), 0),
        safe(() => prisma.videoStream.aggregate({ where: { userId }, _sum: { viewerCount: true, likeCount: true }, _count: true }), null as any),
      ])
      const withDur = (streams as any[]).map((s) => ({
        ...s,
        duration_minutes: s.endedAt ? Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000) : null,
      }))
      const giftIncome = await safe(
        () => prisma.streamGift.aggregate({ where: { stream: { userId } }, _sum: { receiverAmount: true, totalPrice: true }, _count: true }),
        null as any
      )
      return apiSuccess({
        streams: withDur, total, page, limit,
        summary: {
          total_streams: agg?._count ?? 0,
          total_viewers: agg?._sum?.viewerCount ?? 0,
          total_likes: agg?._sum?.likeCount ?? 0,
          gift_income_jeton: giftIncome?._sum?.receiverAmount ?? 0,
          gift_gross_jeton: giftIncome?._sum?.totalPrice ?? 0,
          gift_count: giftIncome?._count ?? 0,
        },
      })
    }

    // ── §6 FALCI ───────────────────────────────────────────
    case 'fortune': {
      const profile = await safe(
        () => prisma.liveFortuneTeller.findUnique({ where: { userId } }),
        null as any
      )
      if (!profile) return apiSuccess({ is_teller: false, profile: null, sessions: [], total: 0, summary: null })
      const [sessions, total, agg, cancelled] = await Promise.all([
        safe(() => prisma.liveSession.findMany({ where: { tellerId: profile.id }, orderBy: { createdAt: 'desc' }, skip, take: limit, select: { id: true, fortuneType: true, status: true, creditsCharged: true, minutesUsed: true, startedAt: true, endedAt: true, createdAt: true } }), [] as any[]),
        safe(() => prisma.liveSession.count({ where: { tellerId: profile.id } }), 0),
        safe(() => prisma.liveSession.aggregate({ where: { tellerId: profile.id, status: 'completed' }, _sum: { creditsCharged: true, minutesUsed: true }, _count: true }), null as any),
        safe(() => prisma.liveSession.count({ where: { tellerId: profile.id, status: { in: ['cancelled', 'rejected'] } } }), 0),
      ])
      const completed = agg?._count ?? 0
      return apiSuccess({
        is_teller: true, profile, sessions, total, page, limit,
        summary: {
          completed_sessions: completed,
          total_minutes: agg?._sum?.minutesUsed ?? 0,
          total_credits: agg?._sum?.creditsCharged ?? 0,
          avg_minutes: completed ? Math.round((agg?._sum?.minutesUsed ?? 0) / completed) : 0,
          cancelled: cancelled,
          cancel_rate: total ? Math.round((cancelled / total) * 100) : 0,
          rating: profile.rating,
          total_reviews: profile.totalReviews,
        },
      })
    }

    // ── JETON ──────────────────────────────────────────────
    case 'jeton': {
      const where: any = { userId }
      if (from) where.createdAt = { gte: from }
      const [balance, tx, total, inSum, outSum] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { jetonBalance: true, credits: true } }),
        safe(() => prisma.jetonTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }), [] as any[]),
        safe(() => prisma.jetonTransaction.count({ where }), 0),
        safe(() => prisma.jetonTransaction.aggregate({ where: { ...where, amount: { gt: 0 } }, _sum: { amount: true } }), null as any),
        safe(() => prisma.jetonTransaction.aggregate({ where: { ...where, amount: { lt: 0 } }, _sum: { amount: true } }), null as any),
      ])
      return apiSuccess({
        balance: balance?.jetonBalance ?? 0, credits: balance?.credits ?? 0,
        transactions: tx, total, page, limit,
        earned: inSum?._sum?.amount ?? 0, spent: Math.abs(outSum?._sum?.amount ?? 0),
      })
    }

    // ── CFC ────────────────────────────────────────────────
    case 'cfc': {
      const where: any = { userId }
      if (from) where.createdAt = { gte: from }
      const [balance, requests, total] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { cfcBalance: true } }),
        safe(() => prisma.cfcPaymentRequest.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }), [] as any[]),
        safe(() => prisma.cfcPaymentRequest.count({ where }), 0),
      ])
      return apiSuccess({ balance: balance?.cfcBalance ?? 0, payment_requests: requests, total, page, limit })
    }

    // ── HEDİYELER ──────────────────────────────────────────
    case 'gifts': {
      const dateF = from ? { createdAt: { gte: from } } : {}
      const [sent, received, sentAgg, recvAgg] = await Promise.all([
        safe(() => prisma.giftHistory.findMany({ where: { senderId: userId, ...dateF }, orderBy: { createdAt: 'desc' }, take: limit }), [] as any[]),
        safe(() => prisma.giftHistory.findMany({ where: { receiverId: userId, ...dateF }, orderBy: { createdAt: 'desc' }, take: limit }), [] as any[]),
        safe(() => prisma.giftHistory.aggregate({ where: { senderId: userId, ...dateF }, _sum: { coinAmount: true }, _count: true }), null as any),
        safe(() => prisma.giftHistory.aggregate({ where: { receiverId: userId, ...dateF }, _sum: { coinAmount: true }, _count: true }), null as any),
      ])
      return apiSuccess({
        sent, received,
        summary: {
          sent_count: sentAgg?._count ?? 0, sent_jeton: sentAgg?._sum?.coinAmount ?? 0,
          received_count: recvAgg?._count ?? 0, received_jeton: recvAgg?._sum?.coinAmount ?? 0,
        },
      })
    }

    // ── §7 KAZANÇ ──────────────────────────────────────────
    case 'earnings': {
      const dateF = from ? { createdAt: { gte: from } } : {}
      const [giftIn, tellerEarn, agencyEarn, jetonIn] = await Promise.all([
        safe(() => prisma.giftHistory.aggregate({ where: { receiverId: userId, ...dateF }, _sum: { coinAmount: true }, _count: true }), null as any),
        safe(() => prisma.liveFortuneTeller.findUnique({ where: { userId }, select: { totalEarnings: true } }), null as any),
        safe(() => prisma.agencyEarning.aggregate({ where: { userId, ...dateF } as any, _sum: { amount: true } as any, _count: true }), null as any),
        safe(() => prisma.jetonTransaction.aggregate({ where: { userId, amount: { gt: 0 }, ...dateF }, _sum: { amount: true } }), null as any),
      ])
      const byType = await safe(
        () => prisma.jetonTransaction.groupBy({ by: ['type'], where: { userId, amount: { gt: 0 }, ...dateF }, _sum: { amount: true }, _count: true }),
        [] as any[]
      )
      return apiSuccess({
        gift_income_jeton: giftIn?._sum?.coinAmount ?? 0,
        gift_income_count: giftIn?._count ?? 0,
        teller_total_earnings: tellerEarn?.totalEarnings ?? 0,
        agency_earnings: agencyEarn?._sum?.amount ?? 0,
        jeton_earned_total: jetonIn?._sum?.amount ?? 0,
        by_type: byType,
      })
    }

    // ── §7 HARCAMA ─────────────────────────────────────────
    case 'spending': {
      const dateF = from ? { createdAt: { gte: from } } : {}
      const [giftOut, jetonOut, byType, credits] = await Promise.all([
        safe(() => prisma.giftHistory.aggregate({ where: { senderId: userId, ...dateF }, _sum: { coinAmount: true }, _count: true }), null as any),
        safe(() => prisma.jetonTransaction.aggregate({ where: { userId, amount: { lt: 0 }, ...dateF }, _sum: { amount: true } }), null as any),
        safe(() => prisma.jetonTransaction.groupBy({ by: ['type'], where: { userId, amount: { lt: 0 }, ...dateF }, _sum: { amount: true }, _count: true }), [] as any[]),
        safe(() => prisma.creditTransaction.findMany({ where: { userId, ...dateF }, orderBy: { createdAt: 'desc' }, take: limit }), [] as any[]),
      ])
      return apiSuccess({
        gift_spent_jeton: giftOut?._sum?.coinAmount ?? 0,
        gift_spent_count: giftOut?._count ?? 0,
        jeton_spent_total: Math.abs(jetonOut?._sum?.amount ?? 0),
        by_type: byType,
        credit_transactions: credits,
      })
    }

    // ── AJANS ──────────────────────────────────────────────
    case 'agency': {
      const membership = await safe(
        () => prisma.agencyUser.findUnique({
          where: { userId },
          include: { agency: { select: { id: true, name: true, status: true, commissionRate: true, performanceScore: true } } },
        }),
        null as any
      )
      const earnings = await safe(
        () => prisma.agencyEarning.findMany({ where: { userId } as any, orderBy: { createdAt: 'desc' }, take: limit }),
        [] as any[]
      )
      return apiSuccess({ membership, earnings })
    }

    // ── VIP ────────────────────────────────────────────────
    case 'vip': {
      const [user, grants, xp, pref] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { membership: true, membershipExpiresAt: true, vipXp: true, vipTitle: true, customUserId: true } }),
        safe(() => prisma.membershipGrant.findMany({ where: { receiverId: userId }, orderBy: { createdAt: 'desc' }, take: limit }), [] as any[]),
        safe(() => prisma.vipXpLedger.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit }), [] as any[]),
        safe(() => prisma.userVipPreference.findUnique({ where: { userId } }), null as any),
      ])
      return apiSuccess({ ...user, grants, xp_ledger: xp, preferences: pref })
    }

    // ── MODERASYON ─────────────────────────────────────────
    case 'moderation': {
      const [user, warnings, actions, total] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { isBanned: true, banReason: true, bannedAt: true, bannedUntil: true, bannedBy: true, isFrozen: true, frozenAt: true, frozenReason: true, warningCount: true, canChat: true, canBroadcast: true, canCreateRoom: true, canSendGift: true, canPK: true, hiddenFromDiscovery: true } }),
        safe(() => prisma.userWarning.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit }), [] as any[]),
        safe(() => prisma.adminUserAction.findMany({ where: { targetUserId: userId }, orderBy: { createdAt: 'desc' }, skip, take: limit }), [] as any[]),
        safe(() => prisma.adminUserAction.count({ where: { targetUserId: userId } }), 0),
      ])
      return apiSuccess({ status: user, warnings, admin_actions: actions, total, page, limit })
    }

    // ── YETKİLER ───────────────────────────────────────────
    case 'permissions': {
      const [user, overrides] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
        safe(() => prisma.userPermissionOverride.findMany({ where: { userId } }), [] as any[]),
      ])
      return apiSuccess({ role: user?.role, overrides })
    }

    // ── §52 ZAMAN ÇİZELGESİ ────────────────────────────────
    case 'timeline': {
      const [events, total] = await Promise.all([
        safe(() => prisma.userTimelineEvent.findMany({ where: { userId }, orderBy: { occurredAt: 'desc' }, skip, take: limit }), [] as any[]),
        safe(() => prisma.userTimelineEvent.count({ where: { userId } }), 0),
      ])
      return apiSuccess({ events, total, page, limit })
    }

    // ── MEDYA ──────────────────────────────────────────────
    case 'media': {
      const [user, frames] = await Promise.all([
        safe(() => prisma.user.findUnique({
          where: { id: userId },
          select: { image: true, profileFrameId: true, adminAssignedFrameId: true, micFrameId: true, avatarAccessoryIds: true },
        }), null as any),
        safe(() => prisma.profileFrame.findMany({
          where: { id: { in: [] as string[] } }, select: { id: true, name: true, imageUrl: true },
        }), [] as any[]),
      ])
      const frameIds = [user?.profileFrameId, user?.adminAssignedFrameId].filter(Boolean) as string[]
      const frameRows = frameIds.length
        ? await safe(() => prisma.profileFrame.findMany({ where: { id: { in: frameIds } } }), [] as any[])
        : frames
      return apiSuccess({ profile: user, frames: frameRows })
    }

    // ── RAPORLAR ───────────────────────────────────────────
    case 'reports': {
      const [against, made, total] = await Promise.all([
        safe(() => prisma.userReport.findMany({ where: { reportedId: userId }, orderBy: { createdAt: 'desc' }, skip, take: limit, include: { reporter: { select: { id: true, name: true, username: true } } } }), [] as any[]),
        safe(() => prisma.userReport.findMany({ where: { reporterId: userId }, orderBy: { createdAt: 'desc' }, take: limit, include: { reported: { select: { id: true, name: true, username: true } } } }), [] as any[]),
        safe(() => prisma.userReport.count({ where: { reportedId: userId } }), 0),
      ])
      return apiSuccess({ reports_against: against, reports_made: made, total, page, limit })
    }

    default:
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Geçersiz bölüm', 400)
  }
}
