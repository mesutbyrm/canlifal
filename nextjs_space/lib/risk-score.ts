/**
 * Faz 9 — Anti-Fraud / Risk Skorlama
 *
 * Salt gözlem amaçlı bir katman: hiçbir para akışını engellemez, hiçbir mevcut
 * uç davranışını değiştirmez. Sadece sinyalleri toplar, 0-100 arası bir skor
 * üretir ve `RiskEvent` tablosuna yazar. Admin panelinden incelenir.
 *
 * Kullanım (daima fire-and-forget):
 *   recordRiskEvent({ userId, category: 'withdrawal', amount, ... })
 *     .catch(e => console.error('[Risk]', e))
 *
 * ASLA throw etmez.
 */

import { prisma } from '@/lib/db'
import { getCached } from '@/lib/cache'

export type RiskCategory =
  | 'withdrawal'
  | 'payment_request'
  | 'gift_send'
  | 'membership'
  | 'login'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface RiskSignal {
  key: string
  weight: number
  detail: string
}

export interface RiskResult {
  score: number
  level: RiskLevel
  signals: RiskSignal[]
}

/** Varsayılan kural ağırlıkları. `risk_rules` RemoteConfig kaydı ile ezilebilir. */
export const DEFAULT_RISK_RULES = {
  // Hesap yaşı
  new_account_hours: 24,
  new_account_weight: 25,
  young_account_days: 7,
  young_account_weight: 12,

  // Hız (velocity): son X dakikada üretilen risk olayı sayısı
  velocity_window_minutes: 60,
  velocity_threshold: 3,
  velocity_weight: 20,

  // Tutar sıçraması: kullanıcının 30 günlük ortalamasının N katı
  amount_spike_multiplier: 5,
  amount_spike_weight: 20,

  // İlk çekim ve büyük tutar
  first_withdrawal_amount: 1000,
  first_withdrawal_weight: 15,

  // Yükleme → hemen çekim
  rapid_topup_window_minutes: 60,
  rapid_topup_weight: 20,

  // Mutlak büyük tutar
  large_amount_threshold: 5000,
  large_amount_weight: 15,

  // Seviye eşikleri
  level_medium: 30,
  level_high: 55,
  level_critical: 80,
}

export type RiskRules = typeof DEFAULT_RISK_RULES

async function getRiskRules(): Promise<RiskRules> {
  try {
    return await getCached('risk_rules', 60, async () => {
      const cfg = await prisma.remoteConfig.findUnique({ where: { key: 'risk_rules' } })
      if (!cfg || !cfg.value || typeof cfg.value !== 'object') return DEFAULT_RISK_RULES
      return { ...DEFAULT_RISK_RULES, ...(cfg.value as Record<string, number>) } as RiskRules
    })
  } catch {
    return DEFAULT_RISK_RULES
  }
}

function toLevel(score: number, rules: RiskRules): RiskLevel {
  if (score >= rules.level_critical) return 'critical'
  if (score >= rules.level_high) return 'high'
  if (score >= rules.level_medium) return 'medium'
  return 'low'
}

export interface RiskInput {
  userId: string
  category: RiskCategory
  amount?: number
  currency?: string
  referenceType?: string
  referenceId?: string
  ip?: string
  metadata?: Record<string, any>
}

/**
 * Sinyalleri toplayıp skoru hesaplar. Veritabanı hatalarında kısmi skor döner.
 */
export async function computeRiskScore(input: RiskInput): Promise<RiskResult> {
  const rules = await getRiskRules()
  const signals: RiskSignal[] = []
  const now = Date.now()

  try {
    const velocitySince = new Date(now - rules.velocity_window_minutes * 60_000)
    const avgSince = new Date(now - 30 * 24 * 60 * 60_000)
    const topupSince = new Date(now - rules.rapid_topup_window_minutes * 60_000)

    const [user, recentEvents, history, recentTopups] = await Promise.all([
      prisma.user
        .findUnique({ where: { id: input.userId }, select: { createdAt: true, role: true } })
        .catch(() => null),
      prisma.riskEvent
        .count({ where: { userId: input.userId, createdAt: { gte: velocitySince } } })
        .catch(() => 0),
      prisma.riskEvent
        .aggregate({
          where: {
            userId: input.userId,
            category: input.category,
            createdAt: { gte: avgSince },
            amount: { not: null },
          },
          _avg: { amount: true },
          _count: { _all: true },
        })
        .catch(() => null),
      input.category === 'withdrawal'
        ? prisma.cfcPaymentRequest
            .count({
              where: {
                userId: input.userId,
                createdAt: { gte: topupSince },
              },
            })
            .catch(() => 0)
        : Promise.resolve(0),
    ])

    // 1) Hesap yaşı
    if (user?.createdAt) {
      const ageMs = now - new Date(user.createdAt).getTime()
      const ageHours = ageMs / 3_600_000
      if (ageHours < rules.new_account_hours) {
        signals.push({
          key: 'new_account',
          weight: rules.new_account_weight,
          detail: `Hesap ${Math.max(1, Math.round(ageHours))} saatlik`,
        })
      } else if (ageMs / 86_400_000 < rules.young_account_days) {
        signals.push({
          key: 'young_account',
          weight: rules.young_account_weight,
          detail: `Hesap ${Math.round(ageMs / 86_400_000)} günlük`,
        })
      }
    }

    // 2) Hız
    if (recentEvents >= rules.velocity_threshold) {
      signals.push({
        key: 'velocity',
        weight: rules.velocity_weight,
        detail: `Son ${rules.velocity_window_minutes} dk içinde ${recentEvents} riskli işlem`,
      })
    }

    // 3) Tutar sıçraması
    const avgAmount = history?._avg?.amount ?? null
    if (
      input.amount &&
      avgAmount &&
      avgAmount > 0 &&
      input.amount > avgAmount * rules.amount_spike_multiplier
    ) {
      signals.push({
        key: 'amount_spike',
        weight: rules.amount_spike_weight,
        detail: `Tutar ortalamanın (${Math.round(avgAmount)}) ${Math.round(
          input.amount / avgAmount
        )} katı`,
      })
    }

    // 4) İlk çekim + büyük tutar
    if (
      input.category === 'withdrawal' &&
      (history?._count?._all ?? 0) === 0 &&
      input.amount &&
      input.amount >= rules.first_withdrawal_amount
    ) {
      signals.push({
        key: 'first_large_withdrawal',
        weight: rules.first_withdrawal_weight,
        detail: `İlk çekim talebi ve tutar ${input.amount}`,
      })
    }

    // 5) Yükleme → hemen çekim
    if (input.category === 'withdrawal' && recentTopups > 0) {
      signals.push({
        key: 'rapid_topup_withdraw',
        weight: rules.rapid_topup_weight,
        detail: `Son ${rules.rapid_topup_window_minutes} dk içinde ${recentTopups} yükleme talebi`,
      })
    }

    // 6) Mutlak büyük tutar
    if (input.amount && input.amount >= rules.large_amount_threshold) {
      signals.push({
        key: 'large_amount',
        weight: rules.large_amount_weight,
        detail: `Tutar eşiğin (${rules.large_amount_threshold}) üzerinde`,
      })
    }
  } catch (e) {
    console.error('[Risk] compute error:', e)
  }

  const score = Math.min(100, signals.reduce((s, x) => s + x.weight, 0))
  return { score, level: toLevel(score, rules), signals }
}

/**
 * Skoru hesaplar ve `RiskEvent` kaydı oluşturur. Hata durumunda null döner,
 * asla throw etmez — çağıran akış hiçbir zaman kesilmez.
 */
export async function recordRiskEvent(input: RiskInput): Promise<string | null> {
  try {
    const result = await computeRiskScore(input)
    const event = await prisma.riskEvent.create({
      data: {
        userId: input.userId,
        category: input.category,
        score: result.score,
        level: result.level,
        signals: result.signals as any,
        amount: input.amount ?? null,
        currency: input.currency ?? null,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        ip: input.ip ?? null,
        metadata: (input.metadata as any) ?? undefined,
      },
      select: { id: true },
    })
    return event.id
  } catch (e) {
    console.error('[Risk] record error:', e)
    return null
  }
}

export async function getRiskEvents(opts?: {
  userId?: string
  category?: string
  level?: string
  reviewed?: boolean
  page?: number
  limit?: number
}) {
  const page = Math.max(1, opts?.page ?? 1)
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 50))
  const where: Record<string, any> = {}
  if (opts?.userId) where.userId = opts.userId
  if (opts?.category) where.category = opts.category
  if (opts?.level) where.level = opts.level
  if (typeof opts?.reviewed === 'boolean') where.reviewed = opts.reviewed

  const [items, total] = await Promise.all([
    prisma.riskEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.riskEvent.count({ where }),
  ])
  return { items, total, page, limit }
}
