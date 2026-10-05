/**
 * CANLIFAL — TEK YETKİLİ JETON FİYAT KAYNAĞI
 * ==========================================
 * Jeton fiyatı YALNIZCA burada hesaplanır. Frontend'den gelen hiçbir
 * tutar / indirim / bonus değerine güvenilmez; sunucu her zaman
 * `jetonAmount x unitPrice` formülüyle yeniden hesaplar.
 *
 * Varsayılan: 1 Jeton = 0,50 TL  →  10.000 Jeton = 5.000 TL
 *
 * Ayarlar (platform_settings):
 *   jeton_unit_price        birim jeton fiyatı (TL)            varsayılan "0.50"
 *   jeton_discount_enabled  otomatik indirim açık mı            varsayılan "false"
 *   jeton_discount_percent  indirim yüzdesi (yalnız açıksa)     varsayılan "0"
 *   jeton_topup_bonus_enabled  yükleme bonusu açık mı           varsayılan "false"
 *   cfc_unit_price          CFC birim fiyatı (TL)               varsayılan "1.00"
 *   withdrawal_tax_percent  para çekim vergi/kesinti yüzdesi    varsayılan "0"
 */
import { getCachedPlatformSetting, invalidateCache } from '@/lib/cache'

export const JETON_PRICING_KEYS = {
  unitPrice: 'jeton_unit_price',
  discountEnabled: 'jeton_discount_enabled',
  discountPercent: 'jeton_discount_percent',
  topupBonusEnabled: 'jeton_topup_bonus_enabled',
  cfcUnitPrice: 'cfc_unit_price',
  withdrawalTaxPercent: 'withdrawal_tax_percent',
} as const

export const DEFAULT_JETON_UNIT_PRICE = 0.5
export const DEFAULT_CFC_UNIT_PRICE = 1

/** Kuruş hassasiyetinde yuvarlama (kayan nokta hatalarını önler). */
export function round2(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

function toPositiveNumber(raw: string | null | undefined, fallback: number): number {
  const v = parseFloat(String(raw ?? ''))
  if (!isFinite(v) || v <= 0) return fallback
  return v
}

function toBool(raw: string | null | undefined): boolean {
  const v = String(raw ?? '').trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes' || v === 'on'
}

/** Birim jeton fiyatı (TL). Tek yetkili okuma noktası. */
export async function getJetonUnitPrice(): Promise<number> {
  const raw = await getCachedPlatformSetting(JETON_PRICING_KEYS.unitPrice, String(DEFAULT_JETON_UNIT_PRICE))
  return toPositiveNumber(raw, DEFAULT_JETON_UNIT_PRICE)
}

/** CFC birim fiyatı (TL). Jetondan tamamen ayrıdır. */
export async function getCfcUnitPrice(): Promise<number> {
  const raw = await getCachedPlatformSetting(JETON_PRICING_KEYS.cfcUnitPrice, String(DEFAULT_CFC_UNIT_PRICE))
  return toPositiveNumber(raw, DEFAULT_CFC_UNIT_PRICE)
}

export interface DiscountSettings {
  /** Otomatik indirim tamamen kapalıysa false (VARSAYILAN). */
  enabled: boolean
  /** Yalnızca enabled=true iken uygulanır. Aksi hâlde 0. */
  percent: number
  /** Yükleme bonusu (topup bonus) açık mı. Varsayılan kapalı. */
  topupBonusEnabled: boolean
}

export async function getDiscountSettings(): Promise<DiscountSettings> {
  const [enabledRaw, percentRaw, bonusRaw] = await Promise.all([
    getCachedPlatformSetting(JETON_PRICING_KEYS.discountEnabled, 'false'),
    getCachedPlatformSetting(JETON_PRICING_KEYS.discountPercent, '0'),
    getCachedPlatformSetting(JETON_PRICING_KEYS.topupBonusEnabled, 'false'),
  ])
  const enabled = toBool(enabledRaw)
  const rawPercent = parseFloat(String(percentRaw ?? '0'))
  const percent = enabled && isFinite(rawPercent) && rawPercent > 0 ? Math.min(90, rawPercent) : 0
  return { enabled, percent, topupBonusEnabled: toBool(bonusRaw) }
}

/** Para çekiminde uygulanacak vergi/kesinti yüzdesi (0-100). */
export async function getWithdrawalTaxPercent(): Promise<number> {
  const raw = await getCachedPlatformSetting(JETON_PRICING_KEYS.withdrawalTaxPercent, '0')
  const v = parseFloat(String(raw ?? '0'))
  if (!isFinite(v) || v <= 0) return 0
  return Math.min(100, v)
}

export interface JetonPriceQuote {
  jetonAmount: number
  unitPrice: number
  /** jetonAmount * unitPrice */
  baseAmount: number
  discountEnabled: boolean
  discountPercent: number
  discountAmount: number
  /** Ödenecek nihai tutar (TL). İndirim kapalıyken baseAmount'a eşittir. */
  finalAmount: number
  currency: 'TRY'
}

/**
 * Sunucu tarafı tek doğru fiyat hesabı.
 * İndirim KAPALIYKEN finalAmount === baseAmount === jetonAmount * unitPrice.
 * Üyelik seviyesi (gold/premium/diamond/svip) fiyatı ASLA değiştirmez.
 */
export async function computeJetonPrice(jetonAmount: number): Promise<JetonPriceQuote> {
  const qty = Math.max(0, Math.floor(Number(jetonAmount) || 0))
  const unitPrice = await getJetonUnitPrice()
  const discount = await getDiscountSettings()
  const baseAmount = round2(qty * unitPrice)
  const discountAmount = discount.percent > 0 ? round2((baseAmount * discount.percent) / 100) : 0
  const finalAmount = round2(baseAmount - discountAmount)
  return {
    jetonAmount: qty,
    unitPrice,
    baseAmount,
    discountEnabled: discount.enabled,
    discountPercent: discount.percent,
    discountAmount,
    finalAmount,
    currency: 'TRY',
  }
}

/** CFC için fiyat hesabı — jetondan bağımsız. */
export async function computeCfcPrice(cfcAmount: number): Promise<JetonPriceQuote> {
  const qty = Math.max(0, Math.floor(Number(cfcAmount) || 0))
  const unitPrice = await getCfcUnitPrice()
  const baseAmount = round2(qty * unitPrice)
  return {
    jetonAmount: qty,
    unitPrice,
    baseAmount,
    discountEnabled: false,
    discountPercent: 0,
    discountAmount: 0,
    finalAmount: baseAmount,
    currency: 'TRY',
  }
}

export interface AmountValidation {
  ok: boolean
  code?: 'PRICE_MISMATCH'
  message?: string
  quote: JetonPriceQuote
  clientAmount: number | null
}

/** Kuruş toleransı — kayan nokta / yuvarlama farkları için. */
export const PRICE_TOLERANCE = 0.01

/**
 * İstemciden gelen tutarı sunucu hesabıyla karşılaştırır.
 * Uyuşmazlık varsa PRICE_MISMATCH döner; çağıran taraf ya reddeder
 * ya da sunucu tutarını (quote.finalAmount) kullanarak düzeltir.
 */
export function validateClientAmount(quote: JetonPriceQuote, clientAmount: unknown): AmountValidation {
  const parsed = clientAmount == null || clientAmount === '' ? null : Number(clientAmount)
  const client = parsed != null && isFinite(parsed) ? round2(parsed) : null
  if (client == null) {
    return { ok: true, quote, clientAmount: null }
  }
  if (Math.abs(client - quote.finalAmount) <= PRICE_TOLERANCE) {
    return { ok: true, quote, clientAmount: client }
  }
  return {
    ok: false,
    code: 'PRICE_MISMATCH',
    message: `Tutar uyuşmuyor: ${quote.jetonAmount} Jeton için doğru tutar ${quote.finalAmount.toFixed(2)} TL (birim fiyat ${quote.unitPrice.toFixed(2)} TL). Gönderilen: ${client.toFixed(2)} TL.`,
    quote,
    clientAmount: client,
  }
}

/** Fiyat ayarı güncellendikten sonra önbelleği temizler. */
export function invalidateJetonPricingCache(): void {
  Object.values(JETON_PRICING_KEYS).forEach((k) => invalidateCache(`platform:${k}`))
  invalidateCache('platform:__all__')
}

/** Kullanıcıya gösterilecek biçimli tutar. */
export function formatTRY(n: number): string {
  return `${round2(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
}
