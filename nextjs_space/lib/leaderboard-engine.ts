/**
 * F4: Saatlik / Günlük Top-100 Leaderboard Motor
 *
 * - Periyot yönetimi (oluştur / getir / finalize)
 * - Skor artırma (atomik upsert)
 * - Otomatik sıralama hesaplama
 * - İdempotent ödül dağıtımı
 * - Admin yapılandırması ile çalışır (LeaderboardConfig)
 */

import prisma from '@/lib/db'
import { getCached, invalidateCache } from '@/lib/cache'

// ─── Tipler ──────────────────────────────────────────────
export type LeaderboardScope = 'voice_room' | 'live_stream'
export type PeriodType = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'event'

export interface RewardConfigEntry {
  rank: number
  rewardType: string   // gold | cfc | jeton | badge | entrance_effect | custom
  rewardValue: string  // "30" (gün), "500" (CFC miktarı), vs.
  label?: string       // "1 Aylık Gold"
}

export interface ScoringRules {
  gift_received?: boolean
  gift_sent?: boolean
  pk_score?: boolean
  viewer_count?: boolean
  [key: string]: boolean | undefined
}

// ─── Periyot Anahtar Üretimi ────────────────────────────
function periodKeyFor(type: PeriodType, date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  const h = String(date.getUTCHours()).padStart(2, '0')

  switch (type) {
    case 'hourly':  return `${y}-${m}-${d}T${h}`
    case 'daily':   return `${y}-${m}-${d}`
    case 'weekly': {
      // ISO hafta numarası
      const jan4 = new Date(Date.UTC(y, 0, 4))
      const oneDay = 86400000
      const weekNo = Math.ceil(((date.getTime() - jan4.getTime()) / oneDay + jan4.getUTCDay() + 1) / 7)
      return `${y}-W${String(weekNo).padStart(2, '0')}`
    }
    case 'monthly': return `${y}-${m}`
    default:        return `${y}-${m}-${d}T${h}` // event fallback
  }
}

function periodBounds(type: PeriodType, date: Date): { start: Date; end: Date } {
  const y = date.getUTCFullYear(), mo = date.getUTCMonth(), d = date.getUTCDate(), h = date.getUTCHours()
  switch (type) {
    case 'hourly':
      return { start: new Date(Date.UTC(y, mo, d, h, 0, 0, 0)), end: new Date(Date.UTC(y, mo, d, h + 1, 0, 0, 0)) }
    case 'daily':
      return { start: new Date(Date.UTC(y, mo, d, 0, 0, 0, 0)), end: new Date(Date.UTC(y, mo, d + 1, 0, 0, 0, 0)) }
    case 'weekly': {
      const dayOfWeek = date.getUTCDay() || 7 // Pazartesi=1
      const monday = new Date(Date.UTC(y, mo, d - dayOfWeek + 1, 0, 0, 0, 0))
      const nextMonday = new Date(monday.getTime() + 7 * 86400000)
      return { start: monday, end: nextMonday }
    }
    case 'monthly':
      return { start: new Date(Date.UTC(y, mo, 1, 0, 0, 0, 0)), end: new Date(Date.UTC(y, mo + 1, 1, 0, 0, 0, 0)) }
    default:
      return { start: new Date(Date.UTC(y, mo, d, h, 0, 0, 0)), end: new Date(Date.UTC(y, mo, d, h + 1, 0, 0, 0)) }
  }
}

// ─── Config Yardımcıları ─────────────────────────────────

/** Tüm aktif konfigürasyonları önbellekli getir (60sn TTL). */
export async function getActiveConfigs(): Promise<Array<{
  id: string; scope: string; periodType: string; topN: number;
  rewardConfig: RewardConfigEntry[] | null; scoringRules: ScoringRules | null;
}>> {
  return getCached('lb:active_configs', 60, async () => {
    const rows = await prisma.leaderboardConfig.findMany({ where: { isEnabled: true } })
    return rows.map(r => ({
      id: r.id,
      scope: r.scope,
      periodType: r.periodType,
      topN: r.topN,
      rewardConfig: r.rewardConfig as unknown as RewardConfigEntry[] | null,
      scoringRules: r.scoringRules as unknown as ScoringRules | null,
    }))
  })
}

/** Belirli (scope, periodType) için config getir. */
export async function getConfig(scope: string, periodType: string) {
  const configs = await getActiveConfigs()
  return configs.find(c => c.scope === scope && c.periodType === periodType) ?? null
}

// ─── Periyot Yönetimi ────────────────────────────────────

/**
 * Mevcut periyot kaydını getir veya oluştur (lazy init).
 * Her çağrı aktif periyodu döner; endTime geçmişse yeni periyot başlatır.
 */
export async function getOrCreateCurrentPeriod(
  configId: string,
  scope: string,
  periodType: PeriodType,
): Promise<{ id: string; periodKey: string; startTime: Date; endTime: Date }> {
  const now = new Date()
  const key = periodKeyFor(periodType, now)
  const { start, end } = periodBounds(periodType, now)

  // Upsert — aynı anda iki istek gelirse unique constraint idempotent.
  const period = await prisma.leaderboardPeriod.upsert({
    where: { configId_periodKey: { configId, periodKey: key } },
    create: {
      configId, scope, periodType, periodKey: key,
      startTime: start, endTime: end, status: 'active',
    },
    update: {},  // zaten varsa dokunma
    select: { id: true, periodKey: true, startTime: true, endTime: true },
  })
  return period
}

// ─── Skor Artırma ────────────────────────────────────────

/**
 * Tek atomik upsert ile kullanıcının skorunu artır.
 * İlgili tüm aktif konfigürasyonlar için ilgili periyotlara yazar.
 *
 * @param scope      'voice_room' | 'live_stream'
 * @param userId     Skoru artırılacak kullanıcı
 * @param points     Eklenecek puan
 * @param source     Skor kaynağı (gift_received, gift_sent, pk_score, vs.)
 * @param contextId  Opsiyonel roomId / streamId
 */
export async function incrementLeaderboardScore(
  scope: LeaderboardScope,
  userId: string,
  points: number,
  source: string,
  contextId?: string,
): Promise<void> {
  if (points <= 0) return

  const configs = await getActiveConfigs()
  const matching = configs.filter(c => c.scope === scope)
  if (matching.length === 0) return

  // Her config için: scoringRules kontrolü, periyot getir/oluştur, upsert entry
  const ops = matching.map(async (cfg) => {
    // Skor kaynağı bu config'de aktif mi?
    if (cfg.scoringRules && !(cfg.scoringRules as any)[source]) return

    const period = await getOrCreateCurrentPeriod(cfg.id, cfg.scope, cfg.periodType as PeriodType)
    // Periyot bitmişse yazma (finalizeExpired sonraki çağrıda halleder)
    if (new Date() >= period.endTime) return

    await prisma.leaderboardEntry.upsert({
      where: { periodId_userId: { periodId: period.id, userId } },
      create: { periodId: period.id, userId, score: points, contextId },
      update: { score: { increment: points } },
    })
  })

  await Promise.allSettled(ops)

  // Önbelleği invalidate et (realtime için)
  invalidateCache(`lb:top100:${scope}`)
}

// ─── Finalize (Periyot Bitiş) ────────────────────────────

/**
 * endTime geçmiş tüm aktif periyotları finalleştir:
 * 1. Sıralama hesapla (rank yaz)
 * 2. Status → finalized
 */
export async function finalizeExpiredPeriods(): Promise<number> {
  const expired = await prisma.leaderboardPeriod.findMany({
    where: { status: 'active', endTime: { lte: new Date() } },
    select: { id: true, configId: true },
    take: 20, // batch limit
  })
  if (expired.length === 0) return 0

  let finalized = 0
  for (const period of expired) {
    try {
      // Sıralamayı hesapla
      await snapshotRanks(period.id)
      // Status güncelle (iyimser kilit)
      const updated = await prisma.leaderboardPeriod.updateMany({
        where: { id: period.id, status: 'active' },
        data: { status: 'finalized', finalizedAt: new Date() },
      })
      if (updated.count > 0) finalized++
    } catch (e) {
      console.error(`[Leaderboard] finalize error period=${period.id}`, e)
    }
  }
  return finalized
}

/** Bir periyodun girişlerini skora göre sırala ve rank yaz. */
async function snapshotRanks(periodId: string): Promise<void> {
  // Raw SQL ile tek sorguda rank güncelle — performanslı
  await prisma.$executeRawUnsafe(`
    UPDATE leaderboard_entries AS le
    SET rank = sub.rn
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC, "updatedAt" ASC) AS rn
      FROM leaderboard_entries
      WHERE "periodId" = $1
    ) AS sub
    WHERE le.id = sub.id
  `, periodId)
}

// ─── Ödül Dağıtımı ───────────────────────────────────────

/**
 * Finalize edilmiş bir periyodun ödüllerini dağıt.
 * İdempotent: her (periodId, rank) çifti için tek LeaderboardReward.
 * Periyodun config'indeki rewardConfig kullanılır.
 */
export async function distributeRewards(periodId: string): Promise<{ distributed: number; skipped: number }> {
  const period = await prisma.leaderboardPeriod.findUnique({
    where: { id: periodId },
    include: { config: true },
  })
  if (!period) throw new Error('Period not found')
  if (period.status !== 'finalized') {
    // Zaten rewarded ise skip
    if (period.status === 'rewarded') return { distributed: 0, skipped: 0 }
    throw new Error(`Period status must be finalized, got: ${period.status}`)
  }

  const rewardConfig = (period.config.rewardConfig as unknown as RewardConfigEntry[] | null) ?? []
  if (rewardConfig.length === 0) {
    // Ödül yok, direkt rewarded
    await prisma.leaderboardPeriod.update({ where: { id: periodId }, data: { status: 'rewarded', rewardedAt: new Date() } })
    return { distributed: 0, skipped: 0 }
  }

  let distributed = 0, skipped = 0

  for (const rc of rewardConfig) {
    // Bu rank'teki kullanıcıyı bul
    const entry = await prisma.leaderboardEntry.findFirst({
      where: { periodId, rank: rc.rank },
      select: { userId: true },
    })
    if (!entry) { skipped++; continue }

    // İdempotency: zaten dağıtıldı mı?
    const existing = await prisma.leaderboardReward.findUnique({
      where: { periodId_rank: { periodId, rank: rc.rank } },
    })
    if (existing) { skipped++; continue }

    try {
      await applyReward(periodId, entry.userId, rc)
      distributed++
    } catch (e) {
      console.error(`[Leaderboard] reward error period=${periodId} rank=${rc.rank}`, e)
      // Hata kaydı oluştur
      await prisma.leaderboardReward.create({
        data: {
          periodId, userId: entry.userId, rank: rc.rank,
          rewardType: rc.rewardType, rewardValue: rc.rewardValue,
          rewardLabel: rc.label, status: 'failed',
        },
      }).catch(() => {})
    }
  }

  // Tüm ödüller dağıtıldıysa period → rewarded
  await prisma.leaderboardPeriod.update({
    where: { id: periodId },
    data: { status: 'rewarded', rewardedAt: new Date() },
  })

  return { distributed, skipped }
}

/** Tek ödül uygula (CFC / Jeton / Gold). */
async function applyReward(periodId: string, userId: string, rc: RewardConfigEntry): Promise<void> {
  const rewardAmount = parseInt(rc.rewardValue, 10) || 0

  if (rc.rewardType === 'cfc' && rewardAmount > 0) {
    // CFC ödülü
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: rewardAmount } },
        select: { credits: true },
      })
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: rewardAmount,
          type: 'leaderboard_reward',
          description: `Leaderboard ödülü: ${rc.label || `${rc.rank}. sıra`}`,
          balance: user.credits,
          relatedId: periodId,
        },
      })
      await tx.leaderboardReward.create({
        data: {
          periodId, userId, rank: rc.rank,
          rewardType: 'cfc', rewardValue: rc.rewardValue,
          rewardLabel: rc.label, status: 'distributed', distributedAt: new Date(),
        },
      })
    })
  } else if (rc.rewardType === 'jeton' && rewardAmount > 0) {
    // Jeton ödülü
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { jetonBalance: { increment: rewardAmount } },
        select: { jetonBalance: true },
      })
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: rewardAmount,
          type: 'leaderboard_reward_jeton',
          description: `Leaderboard jeton ödülü: ${rc.label || `${rc.rank}. sıra`}`,
          balance: user.jetonBalance,
          relatedId: periodId,
        },
      })
      await tx.leaderboardReward.create({
        data: {
          periodId, userId, rank: rc.rank,
          rewardType: 'jeton', rewardValue: rc.rewardValue,
          rewardLabel: rc.label, status: 'distributed', distributedAt: new Date(),
        },
      })
    })
  } else if (rc.rewardType === 'gold' && rewardAmount > 0) {
    // Gold üyelik ödülü (gün bazında uzatma) — membership alanını 'gold' yap
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { membership: 'gold' },
      })
      await tx.leaderboardReward.create({
        data: {
          periodId, userId, rank: rc.rank,
          rewardType: 'gold', rewardValue: rc.rewardValue,
          rewardLabel: rc.label, status: 'distributed', distributedAt: new Date(),
        },
      })
    })
  } else {
    // Genel/custom ödül — sadece kayıt oluştur
    await prisma.leaderboardReward.create({
      data: {
        periodId, userId, rank: rc.rank,
        rewardType: rc.rewardType, rewardValue: rc.rewardValue,
        rewardLabel: rc.label, status: 'distributed', distributedAt: new Date(),
      },
    })
  }
}

// ─── Public Leaderboard Sorgusu ──────────────────────────

/**
 * Belirli scope+periodType için güncel (veya geçmiş) Top-N listesi.
 */
export async function getTop100(
  scope: LeaderboardScope,
  periodType: PeriodType,
  periodKey?: string,  // geçmiş için; yoksa güncel
  limit: number = 100,
): Promise<{
  period: { id: string; periodKey: string; startTime: Date; endTime: Date; status: string } | null
  entries: Array<{ rank: number; userId: string; name: string | null; username: string | null; image: string | null; score: number; contextId: string | null }>
  currentUserId?: string
  currentUserRank?: number | null
}> {
  let period: any = null

  if (periodKey) {
    // Geçmiş periyot
    period = await prisma.leaderboardPeriod.findFirst({
      where: { scope, periodType, periodKey },
    })
  } else {
    // Güncel aktif periyot
    const now = new Date()
    const currentKey = periodKeyFor(periodType, now)
    period = await prisma.leaderboardPeriod.findFirst({
      where: { scope, periodType, periodKey: currentKey },
    })
  }

  if (!period) return { period: null, entries: [] }

  // Aktif periyotlar için skor sırasına göre, finalized/rewarded için rank'a göre
  const entries = await prisma.leaderboardEntry.findMany({
    where: { periodId: period.id },
    orderBy: period.status === 'active' ? { score: 'desc' } : { rank: 'asc' },
    take: limit,
    include: {
      user: { select: { id: true, name: true, username: true, image: true } },
    },
  })

  return {
    period: {
      id: period.id,
      periodKey: period.periodKey,
      startTime: period.startTime,
      endTime: period.endTime,
      status: period.status,
    },
    entries: entries.map((e, i) => ({
      rank: period.status === 'active' ? i + 1 : (e.rank ?? i + 1),
      userId: e.userId,
      name: e.user.name,
      username: e.user.username,
      image: e.user.image,
      score: e.score,
      contextId: e.contextId,
    })),
  }
}

// ─── Seed varsayılan konfigürasyonlar ────────────────────

/** İlk kullanımda varsayılan 4 config oluştur (voice_room+live_stream × hourly+daily). */
export async function ensureDefaultConfigs(): Promise<void> {
  const defaults: Array<{ scope: LeaderboardScope; periodType: PeriodType }> = [
    { scope: 'voice_room', periodType: 'hourly' },
    { scope: 'voice_room', periodType: 'daily' },
    { scope: 'live_stream', periodType: 'hourly' },
    { scope: 'live_stream', periodType: 'daily' },
  ]

  const defaultScoring: ScoringRules = { gift_received: true, gift_sent: false, pk_score: true }
  const defaultRewards: RewardConfigEntry[] = [
    { rank: 1, rewardType: 'cfc', rewardValue: '500', label: '1. sıra: 500 CFC' },
    { rank: 2, rewardType: 'cfc', rewardValue: '300', label: '2. sıra: 300 CFC' },
    { rank: 3, rewardType: 'cfc', rewardValue: '100', label: '3. sıra: 100 CFC' },
  ]

  for (const d of defaults) {
    await prisma.leaderboardConfig.upsert({
      where: { scope_periodType: { scope: d.scope, periodType: d.periodType } },
      create: {
        scope: d.scope, periodType: d.periodType, isEnabled: true, topN: 100,
        rewardConfig: defaultRewards as any, scoringRules: defaultScoring as any,
      },
      update: {},  // zaten varsa dokunma
    })
  }
}
