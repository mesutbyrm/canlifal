import prisma from '@/lib/db'
import { getCachedPlatformSetting, invalidateCache } from '@/lib/cache'

/**
 * BÖLÜM 6b — Para birimi kuralları, markalama ve yükleme bonusu.
 *
 * TEMEL KURALLAR (değiştirilemez iş kuralı):
 *  1) JETON  → paraya çevrilebilir. Yalnızca satın alma ve hediye/yayın
 *     kazançları ile elde edilir. ASLA ödül olarak dağıtılmaz.
 *  2) CFC    → paraya ÇEVRİLEMEZ. Fal/Tarot, "Bana Özel" fal çekimleri ve
 *     oyunlarda harcanır. Tüm ödüller, komisyonlar ve bonuslar CFC ödenir.
 *
 * İsimler ve ikonlar admin panelinden değiştirilebilir; kod içinde asla
 * sabit "Jeton"/"CFC" metni kullanmak zorunda kalmamak için bu modül
 * merkezi bir kaynak sağlar.
 */

// ─── Dönüştürülebilirlik ───────────────────────────────

/** Paraya çevrilebilen (çekim yapılabilen) para birimleri */
export const CONVERTIBLE_CURRENCIES = ['jeton'] as const
/** Paraya çevrilemeyen para birimleri */
export const NON_CONVERTIBLE_CURRENCIES = ['cfc', 'credits'] as const

/** Ödül/komisyon/bonus ödemelerinin yapıldığı para birimi (her zaman CFC) */
export const REWARD_CURRENCY = 'cfc'
/** CFC bakiyesinin tutulduğu User alanı */
export const REWARD_BALANCE_FIELD = 'credits'

export function isConvertibleCurrency(currency: string | null | undefined): boolean {
  return (CONVERTIBLE_CURRENCIES as readonly string[]).includes(String(currency || '').toLowerCase())
}

// ─── Markalama ayarları ────────────────────────────────

export const CURRENCY_SETTING_KEYS = {
  jetonName: 'currency_jeton_name',
  jetonNameEn: 'currency_jeton_name_en',
  jetonIcon: 'currency_jeton_icon',
  jetonColor: 'currency_jeton_color',
  cfcName: 'currency_cfc_name',
  cfcNameEn: 'currency_cfc_name_en',
  cfcIcon: 'currency_cfc_icon',
  cfcColor: 'currency_cfc_color',
} as const

export const CURRENCY_SETTING_DEFAULTS: Record<string, string> = {
  [CURRENCY_SETTING_KEYS.jetonName]: 'Jeton',
  [CURRENCY_SETTING_KEYS.jetonNameEn]: 'Jeton',
  [CURRENCY_SETTING_KEYS.jetonIcon]: '/currency/jeton.svg',
  [CURRENCY_SETTING_KEYS.jetonColor]: '#F5C542',
  [CURRENCY_SETTING_KEYS.cfcName]: 'CFC',
  [CURRENCY_SETTING_KEYS.cfcNameEn]: 'CFC',
  [CURRENCY_SETTING_KEYS.cfcIcon]: '/currency/cfc.svg',
  [CURRENCY_SETTING_KEYS.cfcColor]: '#A78BFA',
}

export const CURRENCY_SETTING_LABELS: Record<string, string> = {
  [CURRENCY_SETTING_KEYS.jetonName]: 'Jeton adı (TR)',
  [CURRENCY_SETTING_KEYS.jetonNameEn]: 'Jeton adı (EN)',
  [CURRENCY_SETTING_KEYS.jetonIcon]: 'Jeton ikon adresi',
  [CURRENCY_SETTING_KEYS.jetonColor]: 'Jeton rengi',
  [CURRENCY_SETTING_KEYS.cfcName]: 'CFC adı (TR)',
  [CURRENCY_SETTING_KEYS.cfcNameEn]: 'CFC adı (EN)',
  [CURRENCY_SETTING_KEYS.cfcIcon]: 'CFC ikon adresi',
  [CURRENCY_SETTING_KEYS.cfcColor]: 'CFC rengi',
}

export interface CurrencyBrand {
  key: 'jeton' | 'cfc'
  name: string
  nameEn: string
  icon: string
  color: string
  convertible: boolean
}

export interface CurrencyBranding {
  jeton: CurrencyBrand
  cfc: CurrencyBrand
}

export const DEFAULT_CURRENCY_BRANDING: CurrencyBranding = {
  jeton: {
    key: 'jeton',
    name: 'Jeton',
    nameEn: 'Jeton',
    icon: '/currency/jeton.svg',
    color: '#F5C542',
    convertible: true,
  },
  cfc: {
    key: 'cfc',
    name: 'CFC',
    nameEn: 'CFC',
    icon: '/currency/cfc.svg',
    color: '#A78BFA',
    convertible: false,
  },
}

export async function getCurrencyBranding(): Promise<CurrencyBranding> {
  try {
    const keys = Object.values(CURRENCY_SETTING_KEYS)
    const values = await Promise.all(
      keys.map((k) => getCachedPlatformSetting(k, CURRENCY_SETTING_DEFAULTS[k]))
    )
    const map: Record<string, string> = {}
    keys.forEach((k, i) => {
      map[k] = String(values[i] ?? CURRENCY_SETTING_DEFAULTS[k] ?? '')
    })
    const pick = (k: string) => map[k]?.trim() || CURRENCY_SETTING_DEFAULTS[k]

    return {
      jeton: {
        key: 'jeton',
        name: pick(CURRENCY_SETTING_KEYS.jetonName),
        nameEn: pick(CURRENCY_SETTING_KEYS.jetonNameEn),
        icon: pick(CURRENCY_SETTING_KEYS.jetonIcon),
        color: pick(CURRENCY_SETTING_KEYS.jetonColor),
        convertible: true,
      },
      cfc: {
        key: 'cfc',
        name: pick(CURRENCY_SETTING_KEYS.cfcName),
        nameEn: pick(CURRENCY_SETTING_KEYS.cfcNameEn),
        icon: pick(CURRENCY_SETTING_KEYS.cfcIcon),
        color: pick(CURRENCY_SETTING_KEYS.cfcColor),
        convertible: false,
      },
    }
  } catch (e) {
    console.error('[CurrencyBranding] load error:', e)
    return DEFAULT_CURRENCY_BRANDING
  }
}

export function invalidateCurrencyBrandingCache() {
  Object.values(CURRENCY_SETTING_KEYS).forEach((k) => {
    try {
      invalidateCache(`platform:${k}`)
    } catch {}
  })
}

// ─── Kademeli yükleme bonusu ───────────────────────────

export interface BonusTier {
  id: string
  label: string | null
  minAmount: number
  bonusPercent: number
  currency: string
  sourceType: string
  maxBonus: number
  isActive: boolean
  sortOrder: number
}

export const DEFAULT_BONUS_TIERS = [
  { label: '10.000 ve üzeri', minAmount: 10000, bonusPercent: 5, sortOrder: 1 },
  { label: '25.000 ve üzeri', minAmount: 25000, bonusPercent: 7, sortOrder: 2 },
  { label: '50.000 ve üzeri', minAmount: 50000, bonusPercent: 10, sortOrder: 3 },
]

/**
 * Bir yükleme tutarı için geçerli bonus kademesini bulur.
 * En yüksek `minAmount` eşiğini geçen aktif kademe kazanır.
 */
export async function resolveTopupBonus(params: {
  amount: number
  currency?: string
  sourceType?: string
}): Promise<{ tier: BonusTier | null; bonusAmount: number }> {
  try {
    const amount = Math.floor(Number(params.amount) || 0)
    if (amount <= 0) return { tier: null, bonusAmount: 0 }

    const currency = String(params.currency || 'credits').toLowerCase()
    const normalized = currency === 'credits' ? 'cfc' : currency
    const sourceType = String(params.sourceType || 'all')

    const tiers = await prisma.topupBonusTier.findMany({
      where: { isActive: true, minAmount: { lte: amount } },
      orderBy: [{ minAmount: 'desc' }, { bonusPercent: 'desc' }],
    })

    const tier = tiers.find(
      (t) =>
        (t.currency === 'all' || t.currency === normalized) &&
        (t.sourceType === 'all' || t.sourceType === sourceType)
    )
    if (!tier || tier.bonusPercent <= 0) return { tier: null, bonusAmount: 0 }

    let bonusAmount = Math.floor((amount * tier.bonusPercent) / 100)
    if (tier.maxBonus > 0) bonusAmount = Math.min(bonusAmount, tier.maxBonus)
    if (bonusAmount <= 0) return { tier: null, bonusAmount: 0 }

    return { tier: tier as BonusTier, bonusAmount }
  } catch (e) {
    console.error('[TopupBonus] resolve error:', e)
    return { tier: null, bonusAmount: 0 }
  }
}

/**
 * Yükleme bonusunu uygular. Bonus, yüklemenin yapıldığı para biriminde
 * verilir (yükleme bir ödül değil, satın almanın parçasıdır).
 * Asla hata fırlatmaz.
 */
export async function applyTopupBonus(params: {
  userId: string
  amount: number
  currency?: string
  sourceType?: string
  sourceId?: string | null
}): Promise<{ bonusAmount: number; bonusPercent: number; label: string | null }> {
  const empty = { bonusAmount: 0, bonusPercent: 0, label: null as string | null }
  try {
    const { tier, bonusAmount } = await resolveTopupBonus(params)
    if (!tier || bonusAmount <= 0) return empty

    const currency = String(params.currency || 'credits').toLowerCase()
    const balanceField =
      currency === 'jeton' ? 'jetonBalance' : currency === 'cfc' ? 'cfcBalance' : 'credits'

    await prisma.user.update({
      where: { id: params.userId },
      data: { [balanceField]: { increment: bonusAmount } } as any,
    })

    return { bonusAmount, bonusPercent: tier.bonusPercent, label: tier.label }
  } catch (e) {
    console.error('[TopupBonus] apply error:', e)
    return empty
  }
}
