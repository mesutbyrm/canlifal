/**
 * BÖLÜM 20 §18 — VIP sezon / XP motoru.
 *
 * KRİTİK KURAL: VIP XP tamamen ayrı bir ilerleme puanıdır.
 * - Jeton (çekilebilir para birimi) ile HİÇBİR ilişkisi yoktur.
 * - CFC (User.credits) ile HİÇBİR ilişkisi yoktur.
 * - Jeton ödülü veya jeton indirimi üretmez, tüketmez, tetiklemez.
 * Yalnızca `vip_xp_ledger` tablosuna ve `User.vipXp` sayacına yazar.
 */
import prisma from '@/lib/db'
import { capabilityLimit } from '@/lib/vip-entitlements'

export type VipXpSource =
  | 'login'
  | 'voice_room'
  | 'event'
  | 'social'
  | 'stream'
  | 'achievement'
  | 'admin'

export interface VipXpSourceDef {
  source: VipXpSource
  label: string
  /** Varsayılan kazanç (çarpan uygulanmadan önce). */
  baseAmount: number
  /** Aynı kaynaktan günde kazanılabilecek azami ham puan (çarpan hariç). 0 = sınırsız. */
  dailyCap: number
  /** Çarpan (vip.xp_multiplier) uygulanır mı? admin girişleri hariç. */
  multiplied: boolean
}

/** Kaynak kataloğu — admin panelinden ileride override edilebilir, kodda sabit oran YOK. */
export const VIP_XP_SOURCES: Record<VipXpSource, VipXpSourceDef> = {
  login: { source: 'login', label: 'Günlük giriş', baseAmount: 10, dailyCap: 10, multiplied: true },
  voice_room: { source: 'voice_room', label: 'Sesli odaya katılım', baseAmount: 5, dailyCap: 50, multiplied: true },
  event: { source: 'event', label: 'Etkinlik katılımı', baseAmount: 25, dailyCap: 200, multiplied: true },
  social: { source: 'social', label: 'Sosyal etkileşim', baseAmount: 2, dailyCap: 40, multiplied: true },
  stream: { source: 'stream', label: 'Yayın etkileşimi', baseAmount: 5, dailyCap: 60, multiplied: true },
  achievement: { source: 'achievement', label: 'Başarım', baseAmount: 50, dailyCap: 0, multiplied: true },
  admin: { source: 'admin', label: 'Yönetici düzenlemesi', baseAmount: 0, dailyCap: 0, multiplied: false },
}

/** Sezon seviyesi eşikleri — kümülatif XP. */
export const VIP_LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 900, 1500, 2400, 3600, 5200, 7200,
  9800, 13000, 17000, 22000, 28000, 35000, 44000, 55000, 70000, 90000,
]

export function vipLevelFor(xp: number): { level: number; currentFloor: number; nextAt: number | null; progress: number } {
  const safe = Math.max(0, Math.floor(xp || 0))
  let level = 1
  for (let i = 0; i < VIP_LEVEL_THRESHOLDS.length; i++) {
    if (safe >= VIP_LEVEL_THRESHOLDS[i]) level = i + 1
  }
  const currentFloor = VIP_LEVEL_THRESHOLDS[level - 1] ?? 0
  const nextAt = level < VIP_LEVEL_THRESHOLDS.length ? VIP_LEVEL_THRESHOLDS[level] : null
  const progress = nextAt == null ? 1 : Math.min(1, (safe - currentFloor) / Math.max(1, nextAt - currentFloor))
  return { level, currentFloor, nextAt, progress }
}

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export interface AwardVipXpInput {
  userId: string
  source: VipXpSource
  /** Ham puan. Verilmezse kaynağın baseAmount değeri kullanılır. */
  amount?: number
  /** Tekillik anahtarı — aynı (userId, source, refId) ikinci kez puan kazandırmaz. */
  refId?: string | null
  note?: string | null
}

export interface AwardVipXpResult {
  awarded: boolean
  amount: number
  reason?: 'duplicate' | 'daily_cap' | 'invalid' | 'error'
  balanceAfter?: number
  multiplier?: number
}

/**
 * VIP XP ekler. ASLA hata fırlatmaz — çağıran akışı (oda girişi, giriş vb.) bozamaz.
 */
export async function awardVipXp(input: AwardVipXpInput): Promise<AwardVipXpResult> {
  try {
    const def = VIP_XP_SOURCES[input.source]
    if (!input.userId || !def) return { awarded: false, amount: 0, reason: 'invalid' }

    const raw = Math.floor(input.amount ?? def.baseAmount)
    if (!isFinite(raw) || raw <= 0) return { awarded: false, amount: 0, reason: 'invalid' }

    // Tekillik
    if (input.refId) {
      const existing = await prisma.vipXpLedger.findFirst({
        where: { userId: input.userId, source: input.source, refId: input.refId },
        select: { id: true },
      })
      if (existing) return { awarded: false, amount: 0, reason: 'duplicate' }
    }

    // Günlük tavan (ham puan üzerinden)
    let grantRaw = raw
    if (def.dailyCap > 0) {
      const since = startOfUtcDay()
      const agg = await prisma.vipXpLedger.aggregate({
        where: { userId: input.userId, source: input.source, createdAt: { gte: since } },
        _sum: { amount: true },
      })
      const usedToday = agg._sum.amount ?? 0
      // Tavan çarpanlı puana göre değil, kaynak tanımına göre uygulanır.
      const capRemaining = def.dailyCap - usedToday
      if (capRemaining <= 0) return { awarded: false, amount: 0, reason: 'daily_cap' }
      if (grantRaw > capRemaining) grantRaw = capRemaining
    }

    let multiplier = 1
    if (def.multiplied) {
      const m = await capabilityLimit(input.userId, 'vip.xp_multiplier')
      if (m && isFinite(m) && m > 0) multiplier = Math.min(5, Math.max(0.5, m / 100))
    }

    const finalAmount = Math.max(1, Math.round(grantRaw * multiplier))

    const updated = await prisma.user.update({
      where: { id: input.userId },
      data: { vipXp: { increment: finalAmount } },
      select: { vipXp: true },
    })

    await prisma.vipXpLedger.create({
      data: {
        userId: input.userId,
        amount: finalAmount,
        source: input.source,
        refId: input.refId || null,
        note: input.note || null,
        balanceAfter: updated.vipXp,
      },
    })

    return { awarded: true, amount: finalAmount, balanceAfter: updated.vipXp, multiplier }
  } catch (e) {
    console.error('[vip-xp] awardVipXp hatası:', e)
    return { awarded: false, amount: 0, reason: 'error' }
  }
}

/** Akış bozmayan çağrı — oda girişi / mesaj gibi sıcak yollarda kullanılır. */
export function awardVipXpSafe(input: AwardVipXpInput): void {
  awardVipXp(input).catch(() => {})
}

export async function getVipXpSummary(userId: string, ledgerLimit = 20) {
  const [user, ledger, todayAgg] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { vipXp: true, membership: true } }),
    prisma.vipXpLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(100, Math.max(1, ledgerLimit)),
      select: { id: true, amount: true, source: true, refId: true, note: true, balanceAfter: true, createdAt: true },
    }),
    prisma.vipXpLedger.groupBy({
      by: ['source'],
      where: { userId, createdAt: { gte: startOfUtcDay() } },
      _sum: { amount: true },
    }),
  ])

  const xp = user?.vipXp ?? 0
  const level = vipLevelFor(xp)
  const todayBySource: Record<string, number> = {}
  for (const row of todayAgg) todayBySource[row.source] = row._sum.amount ?? 0

  return {
    xp,
    level: level.level,
    level_floor: level.currentFloor,
    next_level_at: level.nextAt,
    progress: Number(level.progress.toFixed(4)),
    today_by_source: todayBySource,
    sources: Object.values(VIP_XP_SOURCES).map((s) => ({
      source: s.source,
      label: s.label,
      base_amount: s.baseAmount,
      daily_cap: s.dailyCap || null,
      earned_today: todayBySource[s.source] ?? 0,
    })),
    ledger,
  }
}

/** Günlük giriş puanı — UTC gün başına tek sefer. */
export async function claimDailyLoginXp(userId: string): Promise<AwardVipXpResult> {
  const day = startOfUtcDay().toISOString().slice(0, 10)
  return awardVipXp({ userId, source: 'login', refId: `login:${day}`, note: `Günlük giriş ${day}` })
}

export interface VipLeaderboardRow {
  rank: number
  userId: string | null
  name: string
  image: string | null
  tier: string
  xp: number
  level: number
  hidden: boolean
  isSelf: boolean
}

/**
 * §19 VIP kullanıcı sıralaması.
 * `hideVipStatus` tercihi açık olan kullanıcılar listede anonimleştirilir (kendisi hariç).
 */
export async function getVipLeaderboard(opts: { limit?: number; viewerId?: string | null } = {}) {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50))
  const users = await prisma.user.findMany({
    where: { vipXp: { gt: 0 } },
    orderBy: [{ vipXp: 'desc' }, { createdAt: 'asc' }],
    take: limit,
    select: {
      id: true, name: true, image: true, membership: true, membershipExpiresAt: true, vipXp: true,
      vipPreference: { select: { hideVipStatus: true } },
    },
  })

  const now = Date.now()
  const rows: VipLeaderboardRow[] = users.map((u, i) => {
    const active = !u.membershipExpiresAt || new Date(u.membershipExpiresAt).getTime() > now
    const tier = active ? (u.membership || 'basic') : 'basic'
    const hidden = !!u.vipPreference?.hideVipStatus && u.id !== opts.viewerId
    return {
      rank: i + 1,
      userId: hidden ? null : u.id,
      name: hidden ? 'Gizli üye' : (u.name || 'Kullanıcı'),
      image: hidden ? null : (u.image || null),
      tier: hidden ? 'basic' : tier,
      xp: u.vipXp || 0,
      level: vipLevelFor(u.vipXp || 0).level,
      hidden,
      isSelf: !!opts.viewerId && u.id === opts.viewerId,
    }
  })

  let self: { rank: number; xp: number; level: number } | null = null
  if (opts.viewerId) {
    const me = await prisma.user.findUnique({ where: { id: opts.viewerId }, select: { vipXp: true } })
    if (me) {
      const ahead = await prisma.user.count({ where: { vipXp: { gt: me.vipXp || 0 } } })
      self = { rank: ahead + 1, xp: me.vipXp || 0, level: vipLevelFor(me.vipXp || 0).level }
    }
  }

  return { rows, self, limit }
}
