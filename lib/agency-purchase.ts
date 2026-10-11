/**
 * Ajans toplu Jeton satın alma (ön ödemeli, havale/Papara bildirimiyle).
 *
 * Kurallar (ürün kararı 2026-10):
 * - Ajans indirimi SATIN ALIRKEN alınır: admin ajans başına % indirim tanımlar.
 *   Örn. normal fiyatı 200.000 TL olan 100.000 Jeton, %10 indirimle 180.000 TL.
 * - Cüzdana satın alınan Jeton miktarının TAMAMI yüklenir (100.000); ayrıca
 *   seviye bonusu eklenmez → aynı işlemde iki avantaj yok.
 * - Platform genel kampanya indirimi ile ajans indirimi toplanmaz: ajans, ikisinden
 *   hangisi daha ucuzsa onu öder.
 * - Ödeme admin tarafından onaylanmadan Jeton cüzdana geçmez / harcanamaz.
 * - Fiyat her zaman sunucuda hesaplanır; istemciden gelen tutar yok sayılır.
 */
import prisma from '@/lib/db'
import { getCachedPlatformSetting } from '@/lib/cache'
import { computeJetonPrice, round2 } from '@/lib/jeton-pricing'

export const AGENCY_PURCHASE_KEYS = {
  /** Global varsayılan indirim yüzdesi (ajansa özel yoksa). */
  defaultDiscountPct: 'agency.purchase.discount_pct',
  /** Ajansa özel indirim: `agency.purchase.discount_pct.<agencyId>` */
  agencyDiscountPrefix: 'agency.purchase.discount_pct.',
  /** Global varsayılan bonus yüzdesi (ajansa özel yoksa). */
  defaultBonusPct: 'agency_purchase_bonus_pct',
  /** Ajansa özel bonus: `agency_purchase_bonus_pct_<agencyId>` */
  agencyBonusPrefix: 'agency_purchase_bonus_pct_',
  /** Tek siparişte en az Jeton. */
  minJeton: 'agency.purchase.min_jeton',
  /** Tek siparişte en fazla Jeton (0 = sınırsız). */
  maxJeton: 'agency.purchase.max_jeton',
  /** Satın alma açık mı. */
  enabled: 'agency.purchase.enabled',
  /** Bir ajansın bir günde sipariş edebileceği toplam Jeton (0 = sınırsız). */
  dailyMaxJeton: 'agency.purchase.daily_max_jeton',
} as const

export const AGENCY_JETON_PRODUCT = 'agency_jeton'

function clampPct(v: number): number {
  if (!isFinite(v) || v < 0) return 0
  return Math.min(90, v)
}

/** Ajansın geçerli satın alma indirimi (%). Ajansa özel ayar > global > 0. */
export async function getAgencyPurchaseDiscount(agencyId: string): Promise<{ percent: number; scope: 'agency' | 'global' }> {
  const own = await prisma.platformSettings.findUnique({
    where: { key: AGENCY_PURCHASE_KEYS.agencyDiscountPrefix + agencyId },
    select: { value: true },
  })
  if (own && own.value !== '') {
    return { percent: clampPct(parseFloat(own.value)), scope: 'agency' }
  }
  const g = await getCachedPlatformSetting(AGENCY_PURCHASE_KEYS.defaultDiscountPct, '0')
  return { percent: clampPct(parseFloat(g)), scope: 'global' }
}

/** Ajansın geçerli satın alma bonusu (%). Ajansa özel ayar > global > 0. */
export async function getAgencyPurchaseBonus(agencyId: string): Promise<{ percent: number; scope: 'agency' | 'global' }> {
  const own = await prisma.platformSettings.findUnique({
    where: { key: AGENCY_PURCHASE_KEYS.agencyBonusPrefix + agencyId },
    select: { value: true },
  })
  if (own && own.value !== '') {
    return { percent: clampPct(parseFloat(own.value)), scope: 'agency' }
  }
  const g = await getCachedPlatformSetting(AGENCY_PURCHASE_KEYS.defaultBonusPct, '0')
  return { percent: clampPct(parseFloat(g)), scope: 'global' }
}

/** Admin: ajansa özel indirimi ayarlar. `null` → ajansa özel ayar kaldırılır (global geçerli). */
export async function setAgencyPurchaseDiscount(agencyId: string, percent: number | null): Promise<void> {
  const key = AGENCY_PURCHASE_KEYS.agencyDiscountPrefix + agencyId
  if (percent === null) {
    await prisma.platformSettings.deleteMany({ where: { key } })
    return
  }
  const value = String(clampPct(percent))
  await prisma.platformSettings.upsert({
    where: { key },
    create: { key, value, description: 'Ajans toplu Jeton satın alma indirimi (%)' },
    update: { value },
  })
}

export interface AgencyPurchaseQuote {
  /** Satın alma modu: 'jeton' = jeton miktarı gir → TL hesapla (indirimli), 'tl' = TL gir → jeton hesapla (bonuslu). */
  mode: 'jeton' | 'tl'
  jetonAmount: number
  /** Bonus olarak eklenen ekstra jeton (yalnızca TL modunda). */
  bonusJeton: number
  /** Toplam yüklenecek jeton = jetonAmount + bonusJeton. */
  totalJeton: number
  /** Normal kullanıcının ödeyeceği tutar (genel kampanya dahil). */
  normalPriceTl: number
  /** Liste fiyatı (adet × birim fiyat, kampanyasız). */
  listPriceTl: number
  unitPriceTl: number
  discountPercent: number
  discountScope: 'agency' | 'global'
  bonusPercent: number
  bonusScope: 'agency' | 'global'
  /** Ajansın ödeyeceği tutar. */
  finalPriceTl: number
  savedTl: number
  currency: 'TRY'
}

/**
 * Mod A — Jeton miktarı gir → TL hesapla (indirimli).
 * İndirim fiyatı düşürür, jeton miktarı değişmez.
 */
export async function quoteAgencyPurchase(agencyId: string, jetonAmount: number): Promise<AgencyPurchaseQuote> {
  const qty = Math.max(0, Math.floor(Number(jetonAmount) || 0))
  const normal = await computeJetonPrice(qty)
  const discount = await getAgencyPurchaseDiscount(agencyId)
  const bonus = await getAgencyPurchaseBonus(agencyId)
  const agencyPrice = round2(normal.baseAmount * (1 - discount.percent / 100))
  // İki avantaj toplanmaz: ajans indirimi veya genel kampanya — hangisi ucuzsa.
  const finalPriceTl = Math.min(agencyPrice, normal.finalAmount)
  return {
    mode: 'jeton',
    jetonAmount: qty,
    bonusJeton: 0,
    totalJeton: qty,
    normalPriceTl: normal.finalAmount,
    listPriceTl: normal.baseAmount,
    unitPriceTl: normal.unitPrice,
    discountPercent: discount.percent,
    discountScope: discount.scope,
    bonusPercent: bonus.percent,
    bonusScope: bonus.scope,
    finalPriceTl,
    savedTl: round2(normal.finalAmount - finalPriceTl),
    currency: 'TRY',
  }
}

/**
 * Mod B — TL tutarı gir → jeton hesapla (bonuslu).
 * Bonus ekstra jeton ekler, ödenen tutar değişmez.
 */
export async function quoteAgencyPurchaseByTL(agencyId: string, tlAmount: number): Promise<AgencyPurchaseQuote> {
  const tl = round2(Math.max(0, Number(tlAmount) || 0))
  const { getJetonUnitPrice } = await import('@/lib/jeton-pricing')
  const unitPrice = await getJetonUnitPrice()
  const baseJeton = Math.floor(tl / unitPrice)
  const bonus = await getAgencyPurchaseBonus(agencyId)
  const discount = await getAgencyPurchaseDiscount(agencyId)
  const bonusJeton = Math.floor(baseJeton * bonus.percent / 100)
  const totalJeton = baseJeton + bonusJeton
  const normal = await computeJetonPrice(baseJeton)
  return {
    mode: 'tl',
    jetonAmount: baseJeton,
    bonusJeton,
    totalJeton,
    normalPriceTl: normal.finalAmount,
    listPriceTl: normal.baseAmount,
    unitPriceTl: unitPrice,
    discountPercent: discount.percent,
    discountScope: discount.scope,
    bonusPercent: bonus.percent,
    bonusScope: bonus.scope,
    finalPriceTl: tl,
    savedTl: 0,
    currency: 'TRY',
  }
}

export async function getAgencyPurchaseLimits(): Promise<{ enabled: boolean; minJeton: number; maxJeton: number; dailyMaxJeton: number }> {
  const [en, mn, mx, dm] = await Promise.all([
    getCachedPlatformSetting(AGENCY_PURCHASE_KEYS.enabled, 'true'),
    getCachedPlatformSetting(AGENCY_PURCHASE_KEYS.minJeton, '1000'),
    getCachedPlatformSetting(AGENCY_PURCHASE_KEYS.maxJeton, '0'),
    getCachedPlatformSetting(AGENCY_PURCHASE_KEYS.dailyMaxJeton, '0'),
  ])
  return {
    enabled: en !== 'false',
    minJeton: Math.max(1, Math.floor(parseFloat(mn) || 1000)),
    maxJeton: Math.max(0, Math.floor(parseFloat(mx) || 0)),
    dailyMaxJeton: Math.max(0, Math.floor(parseFloat(dm) || 0)),
  }
}

/** Siparişin hangi ajansa ait olduğu `notes` başında saklanır: `[agency:<id>]`. */
export function agencyTag(agencyId: string): string {
  return `[agency:${agencyId}]`
}

export function agencyIdFromNotes(notes?: string | null): string | null {
  const m = /^\[agency:([^\]]+)\]/.exec(notes || '')
  return m ? m[1] : null
}
