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
  /** Tek siparişte en az Jeton. */
  minJeton: 'agency.purchase.min_jeton',
  /** Tek siparişte en fazla Jeton (0 = sınırsız). */
  maxJeton: 'agency.purchase.max_jeton',
  /** Satın alma açık mı. */
  enabled: 'agency.purchase.enabled',
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
  jetonAmount: number
  /** Normal kullanıcının ödeyeceği tutar (genel kampanya dahil). */
  normalPriceTl: number
  /** Liste fiyatı (adet × birim fiyat, kampanyasız). */
  listPriceTl: number
  unitPriceTl: number
  discountPercent: number
  discountScope: 'agency' | 'global'
  /** Ajansın ödeyeceği tutar. */
  finalPriceTl: number
  savedTl: number
  currency: 'TRY'
}

export async function quoteAgencyPurchase(agencyId: string, jetonAmount: number): Promise<AgencyPurchaseQuote> {
  const qty = Math.max(0, Math.floor(Number(jetonAmount) || 0))
  const normal = await computeJetonPrice(qty)
  const { percent, scope } = await getAgencyPurchaseDiscount(agencyId)
  const agencyPrice = round2(normal.baseAmount * (1 - percent / 100))
  // İki avantaj toplanmaz: ajans indirimi veya genel kampanya — hangisi ucuzsa.
  const finalPriceTl = Math.min(agencyPrice, normal.finalAmount)
  return {
    jetonAmount: qty,
    normalPriceTl: normal.finalAmount,
    listPriceTl: normal.baseAmount,
    unitPriceTl: normal.unitPrice,
    discountPercent: percent,
    discountScope: scope,
    finalPriceTl,
    savedTl: round2(normal.finalAmount - finalPriceTl),
    currency: 'TRY',
  }
}

export async function getAgencyPurchaseLimits(): Promise<{ enabled: boolean; minJeton: number; maxJeton: number }> {
  const [en, mn, mx] = await Promise.all([
    getCachedPlatformSetting(AGENCY_PURCHASE_KEYS.enabled, 'true'),
    getCachedPlatformSetting(AGENCY_PURCHASE_KEYS.minJeton, '1000'),
    getCachedPlatformSetting(AGENCY_PURCHASE_KEYS.maxJeton, '0'),
  ])
  return {
    enabled: en !== 'false',
    minJeton: Math.max(1, Math.floor(parseFloat(mn) || 1000)),
    maxJeton: Math.max(0, Math.floor(parseFloat(mx) || 0)),
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
