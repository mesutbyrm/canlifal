/**
 * Vaat sürümleme — kurallar:
 * - Ajans yalnız taslak sürüm önerir; sürüm admin onayıyla yayımlanır.
 * - Onaylanmış sürüm değiştirilemez/silinmez; yeni şart = yeni sürüm.
 * - Yeni sürüm onaylanınca eski sürüm "superseded" olur; eski kabul kayıtları
 *   saklanır. requiresReaccept ise üyeler yeni sürümü ayrıca kabul eder.
 */
import prisma from '@/lib/db'
import { promiseRules } from '@/lib/agency-settings'

export type PromiseInput = {
  title?: string
  body?: string
  measurement?: string
  targetPeriod?: string | null
  targetMinutes?: number | null
  minDays?: number | null
  bonusJeton?: number | null
  periodStart?: string | null
  periodEnd?: string | null
  requiresReaccept?: boolean
}

export const DEFAULT_MEASUREMENT =
  'Yalnız canlı VİDEO yayını sayılır. Süre, yayının başladığı andan bittiği ana kadar ölçülür; ' +
  'görüntü/ses sinyali kesilirse sayım son sinyalde durur. Aynı anda açık birden fazla yayın tek sayılır. ' +
  'Gün sınırları Türkiye saatine göredir. Yalnız ajans üyeliği süresindeki yayınlar sayılır.'

/** Admin kurallarına göre doğrular; hata mesajı (Türkçe) ya da temiz veri döner. */
export async function validatePromiseInput(input: PromiseInput, requireTitle: boolean) {
  const rules = await promiseRules()
  if (!rules.enabled) return { error: 'Vaat sistemi yönetici tarafından kapatılmış' as const }
  const title = (input.title || '').trim()
  const body = (input.body || '').trim()
  if (requireTitle && (title.length < 3 || title.length > 120)) return { error: 'Başlık 3–120 karakter olmalı' as const }
  if (body.length < 20 || body.length > 5000) return { error: 'Vaat metni 20–5000 karakter olmalı' as const }
  const measurement = (input.measurement || '').trim() || DEFAULT_MEASUREMENT
  let targetPeriod: string | null = null
  let targetMinutes: number | null = null
  let minDays: number | null = null
  const bonusJeton = Math.max(0, Math.floor(Number(input.bonusJeton || 0)))
  if (input.targetMinutes != null && Number(input.targetMinutes) > 0) {
    targetPeriod = String(input.targetPeriod || '')
    if (!rules.allowedPeriods.includes(targetPeriod)) {
      return { error: `Hedef dönemi şunlardan biri olmalı: ${rules.allowedPeriods.join(', ')}` as const }
    }
    targetMinutes = Math.floor(Number(input.targetMinutes))
    if (rules.maxTargetMinutes > 0 && targetMinutes > rules.maxTargetMinutes) {
      return { error: `Hedef en fazla ${rules.maxTargetMinutes} dakika olabilir` as const }
    }
    if (input.minDays != null && Number(input.minDays) > 0) {
      minDays = Math.floor(Number(input.minDays))
      const maxDays = targetPeriod === 'daily' ? 1 : targetPeriod === 'weekly' ? 7 : 31
      if (minDays > maxDays) return { error: `Bu dönem için en fazla ${maxDays} gün seçilebilir` as const }
    }
  } else if (bonusJeton > 0) {
    return { error: 'Bonus için yayın hedefi tanımlanmalı' as const }
  }
  if (rules.maxBonusJeton > 0 && bonusJeton > rules.maxBonusJeton) {
    return { error: `Bonus en fazla ${rules.maxBonusJeton} Jeton olabilir` as const }
  }
  const periodStart = input.periodStart ? new Date(input.periodStart) : new Date()
  const periodEnd = input.periodEnd ? new Date(input.periodEnd) : null
  if (isNaN(periodStart.getTime()) || (periodEnd && isNaN(periodEnd.getTime()))) return { error: 'Geçersiz tarih' as const }
  if (periodEnd && periodEnd <= periodStart) return { error: 'Bitiş tarihi başlangıçtan sonra olmalı' as const }
  return {
    data: {
      title,
      body,
      measurement,
      targetPeriod,
      targetMinutes,
      minDays,
      bonusJeton,
      periodStart,
      periodEnd,
      requiresReaccept: input.requiresReaccept !== false,
    },
  }
}

/** Ajansın yayımlanmış (onaylı, güncel) vaat sürümleri. */
export async function publishedPromises(agencyId: string) {
  try {
    const promises = await prisma.agencyPromise.findMany({
      where: { agencyId, status: 'active', currentVersionId: { not: null } },
      orderBy: { updatedAt: 'desc' },
    })
    const versionIds = promises.map((p) => p.currentVersionId!).filter(Boolean)
    const versions = await prisma.agencyPromiseVersion.findMany({ where: { id: { in: versionIds }, status: 'approved' } })
    const byId = new Map(versions.map((v) => [v.id, v]))
    return promises
      .filter((p) => byId.has(p.currentVersionId!))
      .map((p) => ({ promiseId: p.id, title: p.title, version: byId.get(p.currentVersionId!)! }))
  } catch {
    return []
  }
}

export function versionView(v: any) {
  return {
    id: v.id,
    promiseId: v.promiseId,
    version: v.version,
    body: v.body,
    measurement: v.measurement,
    targetPeriod: v.targetPeriod,
    targetMinutes: v.targetMinutes,
    minDays: v.minDays,
    bonusJeton: v.bonusJeton,
    periodStart: v.periodStart,
    periodEnd: v.periodEnd,
    requiresReaccept: v.requiresReaccept,
    status: v.status,
    reviewNote: v.reviewNote ?? null,
    reviewedAt: v.reviewedAt ?? null,
    createdAt: v.createdAt,
  }
}
