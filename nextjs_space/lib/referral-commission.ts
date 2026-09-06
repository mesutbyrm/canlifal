import prisma from '@/lib/db'
import { getCachedPlatformSetting, invalidateCache } from '@/lib/cache'
import { createNotificationWithPush } from '@/lib/notify'

/**
 * BÖLÜM 6 — Referans & Ajans komisyon motoru.
 *
 * Bir kullanıcının hesabına jeton/CFC yüklendiğinde:
 *  1) Kullanıcıyı davet eden kişiye (referredById) yüzde pay verilir.
 *  2) Kullanıcı bir ajansa üyeyse, ajans sahibine ayrı bir yüzde pay verilir.
 *
 * Tüm oranlar ve limitler admin panelinden ayarlanır. Motor tamamen eklemeli
 * çalışır: hata durumunda ana yükleme akışını asla bozmaz (fire-and-forget).
 */

export const COMMISSION_SETTING_KEYS = {
  referralEnabled: 'referral_commission_enabled',
  referralRate: 'referral_commission_rate',
  referralMonthlyLimit: 'referral_commission_monthly_limit',
  referralTotalLimit: 'referral_commission_total_limit',
  referralMinTopup: 'referral_commission_min_topup',
  agencyEnabled: 'agency_invite_commission_enabled',
  agencyRate: 'agency_invite_commission_rate',
  agencyMonthlyLimit: 'agency_invite_commission_monthly_limit',
} as const

export const COMMISSION_SETTING_DEFAULTS: Record<string, string> = {
  [COMMISSION_SETTING_KEYS.referralEnabled]: 'true',
  [COMMISSION_SETTING_KEYS.referralRate]: '5',
  [COMMISSION_SETTING_KEYS.referralMonthlyLimit]: '0',
  [COMMISSION_SETTING_KEYS.referralTotalLimit]: '0',
  [COMMISSION_SETTING_KEYS.referralMinTopup]: '0',
  [COMMISSION_SETTING_KEYS.agencyEnabled]: 'true',
  [COMMISSION_SETTING_KEYS.agencyRate]: '5',
  [COMMISSION_SETTING_KEYS.agencyMonthlyLimit]: '0',
}

export const COMMISSION_SETTING_LABELS: Record<string, string> = {
  [COMMISSION_SETTING_KEYS.referralEnabled]: 'Referans komisyonu aktif',
  [COMMISSION_SETTING_KEYS.referralRate]: 'Referans komisyon oranı (%)',
  [COMMISSION_SETTING_KEYS.referralMonthlyLimit]: 'Referans aylık kazanç limiti (0 = sınırsız)',
  [COMMISSION_SETTING_KEYS.referralTotalLimit]: 'Referans toplam kazanç limiti (0 = sınırsız)',
  [COMMISSION_SETTING_KEYS.referralMinTopup]: 'Komisyon için minimum yükleme',
  [COMMISSION_SETTING_KEYS.agencyEnabled]: 'Ajans davet komisyonu aktif',
  [COMMISSION_SETTING_KEYS.agencyRate]: 'Ajans davet komisyon oranı (%)',
  [COMMISSION_SETTING_KEYS.agencyMonthlyLimit]: 'Ajans aylık kazanç limiti (0 = sınırsız)',
}

export interface CommissionConfig {
  referralEnabled: boolean
  referralRate: number
  referralMonthlyLimit: number
  referralTotalLimit: number
  referralMinTopup: number
  agencyEnabled: boolean
  agencyRate: number
  agencyMonthlyLimit: number
}

function toNumber(value: string, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export async function getCommissionConfig(): Promise<CommissionConfig> {
  const [
    referralEnabled,
    referralRate,
    referralMonthlyLimit,
    referralTotalLimit,
    referralMinTopup,
    agencyEnabled,
    agencyRate,
    agencyMonthlyLimit,
  ] = await Promise.all(
    Object.values(COMMISSION_SETTING_KEYS).map((k) =>
      getCachedPlatformSetting(k, COMMISSION_SETTING_DEFAULTS[k])
    )
  )

  return {
    referralEnabled: referralEnabled === 'true',
    referralRate: Math.min(100, toNumber(referralRate, 5)),
    referralMonthlyLimit: Math.floor(toNumber(referralMonthlyLimit, 0)),
    referralTotalLimit: Math.floor(toNumber(referralTotalLimit, 0)),
    referralMinTopup: Math.floor(toNumber(referralMinTopup, 0)),
    agencyEnabled: agencyEnabled === 'true',
    agencyRate: Math.min(100, toNumber(agencyRate, 5)),
    agencyMonthlyLimit: Math.floor(toNumber(agencyMonthlyLimit, 0)),
  }
}

export function invalidateCommissionConfigCache(): void {
  for (const key of Object.values(COMMISSION_SETTING_KEYS)) {
    invalidateCache(`platform:${key}`)
  }
}

function startOfMonth(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

async function earnedSince(earnerId: string, commissionType: string, since?: Date): Promise<number> {
  const agg = await prisma.referralCommission.aggregate({
    where: {
      earnerId,
      commissionType,
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    _sum: { amount: true },
  })
  return agg._sum.amount || 0
}

/**
 * Limitleri uygulayarak ödenecek nihai tutarı hesaplar.
 * 0 döndürürse komisyon yazılmaz.
 */
async function applyLimits(
  earnerId: string,
  commissionType: string,
  desired: number,
  monthlyLimit: number,
  totalLimit: number
): Promise<number> {
  let allowed = desired

  if (monthlyLimit > 0) {
    const thisMonth = await earnedSince(earnerId, commissionType, startOfMonth())
    allowed = Math.min(allowed, Math.max(0, monthlyLimit - thisMonth))
  }
  if (allowed > 0 && totalLimit > 0) {
    const allTime = await earnedSince(earnerId, commissionType)
    allowed = Math.min(allowed, Math.max(0, totalLimit - allTime))
  }
  return Math.floor(allowed)
}

export interface TopupCommissionInput {
  /** Jeton yükleyen kullanıcı */
  userId: string
  /** Yüklenen miktar */
  amount: number
  /** credits | jeton | cfc */
  currency?: string
  /** admin_credit | cfc_payment */
  sourceType?: string
  sourceId?: string | null
}

/**
 * Komisyon ödemesi HER ZAMAN CFC olarak yapılır.
 * CFC paraya çevrilemez; jeton çevrilebilir olduğu için ödül/komisyon olarak verilmez.
 */
export const COMMISSION_PAYOUT_CURRENCY = 'cfc'
export const COMMISSION_PAYOUT_BALANCE_FIELD = 'credits'

export interface TopupCommissionResult {
  referral: { earnerId: string; amount: number } | null
  agency: { earnerId: string; agencyId: string; amount: number } | null
}

/**
 * Yükleme sonrası komisyonları dağıtır. Asla hata fırlatmaz.
 */
export async function awardTopupCommissions(
  input: TopupCommissionInput
): Promise<TopupCommissionResult> {
  const result: TopupCommissionResult = { referral: null, agency: null }

  try {
    const amount = Math.floor(Number(input.amount) || 0)
    if (amount <= 0) return result

    const config = await getCommissionConfig()
    if (!config.referralEnabled && !config.agencyEnabled) return result
    if (amount < config.referralMinTopup) return result

    const currency = input.currency || 'credits'
    const sourceType = input.sourceType || 'admin_credit'

    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, name: true, username: true, referredById: true },
    })
    if (!user) return result

    // ⚠️ KURAL: Komisyon HER ZAMAN CFC olarak ödenir (jeton asla ödül olarak verilmez).
    // Yükleme hangi para biriminde olursa olsun kazanç CFC'ye yazılır.
    const balanceField = COMMISSION_PAYOUT_BALANCE_FIELD
    const sourceName = user.name || user.username || 'Bir kullanıcı'

    // ── 1) Referans komisyonu ──
    if (config.referralEnabled && user.referredById && user.referredById !== user.id) {
      const desired = Math.floor((amount * config.referralRate) / 100)
      if (desired > 0) {
        const payout = await applyLimits(
          user.referredById,
          'referral',
          desired,
          config.referralMonthlyLimit,
          config.referralTotalLimit
        )
        if (payout > 0) {
          await prisma.$transaction([
            prisma.referralCommission.create({
              data: {
                earnerId: user.referredById,
                sourceUserId: user.id,
                commissionType: 'referral',
                topupAmount: amount,
                topupCurrency: currency,
                rate: config.referralRate,
                amount: payout,
                currency: COMMISSION_PAYOUT_CURRENCY,
                sourceType,
                sourceId: input.sourceId || null,
                note: `${sourceName} yüklemesinden referans payı`,
              },
            }),
            prisma.user.update({
              where: { id: user.referredById },
              data: {
                [balanceField]: { increment: payout },
                referralCreditsEarned: { increment: payout },
              } as any,
            }),
          ])
          result.referral = { earnerId: user.referredById, amount: payout }

          createNotificationWithPush({
            userId: user.referredById,
            type: 'referral_commission',
            title: '🎉 Referans kazancı',
            message: `${sourceName} yükleme yaptı, ${payout} CFC kazandın!`,
            data: JSON.stringify({ amount: payout, rate: config.referralRate, currency: COMMISSION_PAYOUT_CURRENCY }),
            targetPath: '/kazanc',
          }).catch((e) => console.error('[Commission] referral notify error:', e))
        }
      }
    }

    // ── 2) Ajans davet komisyonu ──
    if (config.agencyEnabled) {
      const membership = await prisma.agencyUser.findUnique({
        where: { userId: user.id },
        select: {
          agencyId: true,
          isActive: true,
          agency: { select: { id: true, ownerId: true, status: true, name: true } },
        },
      })

      const agency = membership?.agency
      if (
        membership?.isActive &&
        agency &&
        agency.status === 'approved' &&
        agency.ownerId &&
        agency.ownerId !== user.id
      ) {
        const desired = Math.floor((amount * config.agencyRate) / 100)
        if (desired > 0) {
          const payout = await applyLimits(
            agency.ownerId,
            'agency_invite',
            desired,
            config.agencyMonthlyLimit,
            0
          )
          if (payout > 0) {
            await prisma.$transaction([
              prisma.referralCommission.create({
                data: {
                  earnerId: agency.ownerId,
                  sourceUserId: user.id,
                  agencyId: agency.id,
                  commissionType: 'agency_invite',
                  topupAmount: amount,
                  topupCurrency: currency,
                  rate: config.agencyRate,
                  amount: payout,
                  currency: COMMISSION_PAYOUT_CURRENCY,
                  sourceType,
                  sourceId: input.sourceId || null,
                  note: `${sourceName} yüklemesinden ajans payı`,
                },
              }),
              prisma.user.update({
                where: { id: agency.ownerId },
                data: { [balanceField]: { increment: payout } } as any,
              }),
              prisma.agency.update({
                where: { id: agency.id },
                data: { totalEarnings: { increment: payout } },
              }),
            ])
            result.agency = { earnerId: agency.ownerId, agencyId: agency.id, amount: payout }

            createNotificationWithPush({
              userId: agency.ownerId,
              type: 'agency_commission',
              title: '🏢 Ajans kazancı',
              message: `${sourceName} yükleme yaptı, ajansın ${payout} CFC kazandı!`,
              data: JSON.stringify({ amount: payout, rate: config.agencyRate, currency: COMMISSION_PAYOUT_CURRENCY }),
              targetPath: '/ajans-paneli',
            }).catch((e) => console.error('[Commission] agency notify error:', e))
          }
        }
      }
    }
  } catch (error) {
    console.error('[Commission] awardTopupCommissions error:', error)
  }

  return result
}

/** Bir kullanıcının komisyon kazanç özeti */
export async function getCommissionSummary(userId: string) {
  const monthStart = startOfMonth()
  const [total, monthly, referralTotal, agencyTotal, count, invitedCount] = await Promise.all([
    prisma.referralCommission.aggregate({ where: { earnerId: userId }, _sum: { amount: true } }),
    prisma.referralCommission.aggregate({
      where: { earnerId: userId, createdAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.referralCommission.aggregate({
      where: { earnerId: userId, commissionType: 'referral' },
      _sum: { amount: true },
    }),
    prisma.referralCommission.aggregate({
      where: { earnerId: userId, commissionType: 'agency_invite' },
      _sum: { amount: true },
    }),
    prisma.referralCommission.count({ where: { earnerId: userId } }),
    prisma.user.count({ where: { referredById: userId } }),
  ])

  return {
    totalEarned: total._sum.amount || 0,
    monthlyEarned: monthly._sum.amount || 0,
    referralEarned: referralTotal._sum.amount || 0,
    agencyEarned: agencyTotal._sum.amount || 0,
    transactionCount: count,
    invitedCount,
  }
}
