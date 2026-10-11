/**
 * Gift Insights & Missions — shared helpers.
 *
 * TEK BACKEND MIGRATION / Faz 1: the `/api/gifts/insights/*` and
 * `/api/gifts/missions/*` endpoints used to live on the secondary games
 * backend. They are now served by the main backend directly, reading the very
 * same `gift_events` ledger (single database, single source of truth).
 *
 * No Redis, no proxying, no second base URL. Read-only aggregation over
 * GiftEvent + GiftType + User, plus GiftMission / UserMissionProgress for the
 * daily-mission flow.
 */
import prisma from '@/lib/db'

// ─────────────────────────────────────────────────────────────────────────────
// Period / scope / context
// ─────────────────────────────────────────────────────────────────────────────

export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all'

export const PERIODS: Period[] = ['daily', 'weekly', 'monthly', 'yearly', 'all']

export function normalizePeriod(value?: string | null): Period {
  const v = (value || 'weekly').toLowerCase()
  return (PERIODS as string[]).includes(v) ? (v as Period) : 'weekly'
}

/** Start date for a period, or null for "all time". */
export function periodStart(period: Period): Date | null {
  const days: Record<Period, number> = {
    daily: 1,
    weekly: 7,
    monthly: 30,
    yearly: 365,
    all: 0,
  }
  const d = days[period]
  if (!d) return null
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000)
}

export type Scope = 'tr' | 'world'

export function normalizeScope(value?: string | null): Scope {
  return (value || 'tr').toLowerCase() === 'world' ? 'world' : 'tr'
}

export const GIFT_CONTEXTS = [
  'live_stream',
  'voice_room',
  'video',
  'short_video',
  'fortune',
] as const

/** `all` (or anything unknown) means "no context filter". */
export function normalizeContext(value?: string | null): string | null {
  const v = (value || 'all').toLowerCase()
  if (v === 'all' || !v) return null
  return (GIFT_CONTEXTS as readonly string[]).includes(v) ? v : null
}

export function clampLimit(value: string | null, fallback = 50, max = 200): number {
  const n = parseInt(value || '', 10)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(max, n)
}

/** Base `where` shared by every ledger aggregation. */
export function ledgerWhere(opts: {
  period?: Period
  context?: string | null
  scope?: Scope
  scopeField?: 'sender' | 'none'
}): Record<string, any> {
  const where: Record<string, any> = { status: 'completed' }
  const start = opts.period ? periodStart(opts.period) : null
  if (start) where.createdAt = { gte: start }
  if (opts.context) where.context = opts.context
  if (opts.scope === 'tr' && opts.scopeField === 'sender') where.senderCountry = 'TR'
  return where
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────────────────────────────────────

/** 1500 → "1.5K", 2_400_000 → "2.4M". Mirrors the legacy display labels. */
export function displayAmount(value: number): string {
  const n = Math.max(0, Math.round(value || 0))
  if (n >= 1_000_000_000) return `${trimZero(n / 1_000_000_000)}B`
  if (n >= 1_000_000) return `${trimZero(n / 1_000_000)}M`
  if (n >= 1_000) return `${trimZero(n / 1_000)}K`
  return String(n)
}

function trimZero(n: number): string {
  const s = n.toFixed(1)
  return s.endsWith('.0') ? s.slice(0, -2) : s
}

// ─────────────────────────────────────────────────────────────────────────────
// Serializers
// ─────────────────────────────────────────────────────────────────────────────

export const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  image: true,
  city: true,
  country: true,
} as const

export type PublicUser = {
  id: string
  name: string | null
  username: string | null
  image: string | null
  city: string | null
  country: string | null
}

export function serializeUser(u: PublicUser | undefined | null, id: string) {
  return {
    id: u?.id || id,
    name: u?.name ?? null,
    username: u?.username ?? null,
    image: u?.image ?? null,
    city: u?.city ?? null,
    country: u?.country ?? null,
  }
}

export const GIFT_SELECT = {
  id: true,
  name: true,
  nameEn: true,
  icon: true,
  iconImageUrl: true,
  thumbnailUrl: true,
  price: true,
  tier: true,
  category: true,
  isHidden: true,
} as const

export type PublicGift = {
  id: string
  name: string
  nameEn: string | null
  icon: string | null
  iconImageUrl: string | null
  thumbnailUrl: string | null
  price: number
  tier: string | null
  category: string | null
  isHidden: boolean
}

export function serializeGift(g: PublicGift | undefined | null, id: string) {
  return {
    id: g?.id || id,
    name: g?.name ?? '',
    nameEn: g?.nameEn ?? null,
    icon: g?.icon ?? null,
    iconImageUrl: g?.iconImageUrl ?? null,
    thumbnailUrl: g?.thumbnailUrl ?? null,
    price: g?.price ?? 0,
    tier: g?.tier ?? 'small',
    category: g?.category ?? null,
    isHidden: g?.isHidden ?? false,
  }
}

/** Best-effort display name for flat aliases consumed by the mobile client. */
export function displayNameOf(u: PublicUser | undefined | null): string {
  return (u?.name || u?.username || 'Anonim') as string
}

// ─────────────────────────────────────────────────────────────────────────────
// Supporter badge tiers (jetons sent, all time)
// ─────────────────────────────────────────────────────────────────────────────

export interface SupporterTier {
  code: string
  label: string
  min: number
}

export const SUPPORTER_TIERS: SupporterTier[] = [
  { code: 'yeni', label: 'Yeni Destekçi', min: 0 },
  { code: 'bronz', label: 'Bronz', min: 1000 },
  { code: 'gumus', label: 'Gümüş', min: 10000 },
  { code: 'altin', label: 'Altın', min: 50000 },
  { code: 'platin', label: 'Platin', min: 250000 },
  { code: 'elmas', label: 'Elmas', min: 1000000 },
  { code: 'galaksi', label: 'Galaksi', min: 5000000 },
  { code: 'efsane', label: 'Efsane', min: 25000000 },
]

/** Computes the supporter-badge payload for one user (all-time sent jetons). */
export async function buildSupporterBadge(userId: string) {
  const agg = await prisma.giftEvent.aggregate({
    where: { senderId: userId, status: 'completed' },
    _sum: { grossAmount: true },
    _count: { _all: true },
  })
  const totalSent = agg._sum.grossAmount || 0
  const totalGifts = agg._count._all || 0

  let current = SUPPORTER_TIERS[0]
  for (const t of SUPPORTER_TIERS) if (totalSent >= t.min) current = t
  const next = SUPPORTER_TIERS.find(t => t.min > current.min) || null

  return {
    userId,
    totalSent,
    totalSentDisplay: displayAmount(totalSent),
    totalGifts,
    badge: { code: current.code, label: current.label, min: current.min },
    nextBadge: next
      ? {
          code: next.code,
          label: next.label,
          min: next.min,
          remaining: Math.max(0, next.min - totalSent),
        }
      : null,
    allTiers: SUPPORTER_TIERS,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily missions
// ─────────────────────────────────────────────────────────────────────────────

/** UTC day bucket used by UserMissionProgress.dayKey. */
export function todayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10)
}

export function dayStartUtc(d: Date = new Date()): Date {
  return new Date(`${todayKey(d)}T00:00:00.000Z`)
}

export interface MissionDefinition {
  id: string
  code: string
  title: string
  description: string | null
  type: string
  target: number
  context: string | null
  rewardJetons: number
  rewardCredits: number
  sortOrder: number
}

export async function activeMissions(): Promise<MissionDefinition[]> {
  const rows = await prisma.giftMission.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return rows.map(m => ({
    id: m.id,
    code: m.code,
    title: m.title,
    description: m.description,
    type: m.type,
    target: m.target,
    context: m.context,
    rewardJetons: m.rewardJetons,
    rewardCredits: m.rewardCredits,
    sortOrder: m.sortOrder,
  }))
}

export function rewardOf(m: MissionDefinition): { reward: number; rewardLabel: string } {
  if (m.rewardJetons > 0) return { reward: m.rewardJetons, rewardLabel: `${m.rewardJetons} jeton` }
  if (m.rewardCredits > 0) return { reward: m.rewardCredits, rewardLabel: `${m.rewardCredits} kredi` }
  return { reward: 0, rewardLabel: '—' }
}

export function serializeMissionDefinition(m: MissionDefinition) {
  const { reward, rewardLabel } = rewardOf(m)
  return {
    id: m.id,
    code: m.code,
    title: m.title,
    description: m.description,
    type: m.type,
    target: m.target,
    context: m.context,
    reward,
    rewardLabel,
    rewardJetons: m.rewardJetons,
    rewardCredits: m.rewardCredits,
    sortOrder: m.sortOrder,
  }
}

/**
 * Today's progress for every active mission, derived directly from the
 * GiftEvent ledger (so no extra writer is required anywhere in the app).
 * `claimed` comes from UserMissionProgress, which is the only piece of state
 * that cannot be derived.
 */
export async function missionProgressForUser(userId: string) {
  const missions = await activeMissions()
  if (missions.length === 0) return []

  const dayKey = todayKey()
  const since = dayStartUtc()

  const [events, claims] = await Promise.all([
    prisma.giftEvent.findMany({
      where: { senderId: userId, status: 'completed', createdAt: { gte: since } },
      select: { receiverId: true, quantity: true, grossAmount: true, context: true },
    }),
    prisma.userMissionProgress.findMany({ where: { userId, dayKey } }),
  ])

  const claimMap = new Map(claims.map(c => [c.missionId, c]))

  return missions.map(m => {
    const scoped = m.context ? events.filter(e => e.context === m.context) : events
    let progress = 0
    switch (m.type) {
      case 'distinct_receivers':
        progress = new Set(scoped.map(e => e.receiverId)).size
        break
      case 'total_jetons':
        progress = scoped.reduce((s, e) => s + (e.grossAmount || 0), 0)
        break
      case 'context_gift':
      case 'count_gifts':
      default:
        progress = scoped.reduce((s, e) => s + (e.quantity || 1), 0)
        break
    }
    const completed = m.target > 0 ? progress >= m.target : progress > 0
    const claimed = claimMap.get(m.id)?.claimed === true
    const { reward, rewardLabel } = rewardOf(m)
    return {
      id: m.id,
      code: m.code,
      title: m.title,
      description: m.description,
      type: m.type,
      target: m.target,
      context: m.context,
      progress,
      completed,
      claimed,
      reward,
      rewardLabel,
      rewardJetons: m.rewardJetons,
      rewardCredits: m.rewardCredits,
      dayKey,
    }
  })
}
