import prisma from '@/lib/db'

/**
 * Ödüllü reklam ödül kuralları — TEK kaynak.
 * Hem /api/user/watch-ad (istemci bildirimi) hem de
 * /api/ads/ssv/admob (Google sunucu taraflı doğrulama) buradan okur.
 *
 * Ödül miktarı HER ZAMAN sunucudaki ayarlardan gelir; istemcinin ya da
 * AdMob'un gönderdiği reward_amount değerine güvenilmez.
 */

export const DEFAULT_CREDITS_PER_AD = 5
export const DEFAULT_ADS_PER_DAY_LIMIT = 10

/** İstemci bildirimi yerine Google SSV ile ödül yazılsın mı? ('0' → yalnızca denetim kaydı) */
const SSV_GRANT_SETTING_KEY = 'admob_ssv_grant_credits'

export async function getAdSettings() {
  try {
    const [limitSetting, creditsSetting] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: 'ad_daily_limit_registered' } }),
      prisma.siteSetting.findUnique({ where: { key: 'ad_credits_per_watch' } }),
    ])
    return {
      dailyLimit: limitSetting
        ? parseInt(limitSetting.value) || DEFAULT_ADS_PER_DAY_LIMIT
        : DEFAULT_ADS_PER_DAY_LIMIT,
      creditsPerAd: creditsSetting
        ? parseInt(creditsSetting.value) || DEFAULT_CREDITS_PER_AD
        : DEFAULT_CREDITS_PER_AD,
    }
  } catch {
    return { dailyLimit: DEFAULT_ADS_PER_DAY_LIMIT, creditsPerAd: DEFAULT_CREDITS_PER_AD }
  }
}

/** SSV ucunun ödül yazıp yazmayacağı. Ayar yoksa varsayılan: yazar. */
export async function isSsvGrantEnabled(): Promise<boolean> {
  try {
    const s = await prisma.siteSetting.findUnique({ where: { key: SSV_GRANT_SETTING_KEY } })
    if (!s) return true
    return s.value !== '0' && s.value.toLowerCase() !== 'false'
  } catch {
    return true
  }
}

export function adWatchLimitKey(userId: string, date = new Date()) {
  return `ad_watch_${userId}_${date.toISOString().split('T')[0]}`
}

export type AdRewardOutcome =
  | { status: 'granted'; creditsEarned: number; totalCredits: number; remainingAds: number }
  | { status: 'limit_reached'; dailyLimit: number }

/**
 * Günlük limiti kontrol eder, sayacı artırır ve krediyi yükler.
 * Mevcut /api/user/watch-ad davranışının birebir aynısıdır.
 */
export async function grantAdWatchCredits(userId: string): Promise<AdRewardOutcome> {
  const { dailyLimit, creditsPerAd } = await getAdSettings()
  const limitKey = adWatchLimitKey(userId)

  const existingLimit = await prisma.siteSetting.findUnique({ where: { key: limitKey } })
  const currentCount = existingLimit ? parseInt(existingLimit.value) || 0 : 0

  if (currentCount >= dailyLimit) {
    return { status: 'limit_reached', dailyLimit }
  }

  await prisma.siteSetting.upsert({
    where: { key: limitKey },
    update: { value: String(currentCount + 1) },
    create: { key: limitKey, value: '1' },
  })

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: creditsPerAd } },
    select: { credits: true },
  })

  return {
    status: 'granted',
    creditsEarned: creditsPerAd,
    totalCredits: updatedUser.credits,
    remainingAds: dailyLimit - (currentCount + 1),
  }
}
