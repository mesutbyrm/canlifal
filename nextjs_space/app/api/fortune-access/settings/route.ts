export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { FORTUNE_COSTS } from '@/lib/credit-checker'
import { getCachedPlatformSetting } from '@/lib/cache'

/**
 * GET /api/fortune-access/settings
 * Auth: opsiyonel
 * AI fal erişim ayarlarını döndürür (salt okunur — admin panelinden güncellenir).
 * Flutter bu yolu mobil için salt okunur kullanıyor.
 */
export async function GET() {
  try {
    const maxFreePerDay = parseInt(await getCachedPlatformSetting('fortune_free_per_day', '2'))
    const adRewardEnabled = (await getCachedPlatformSetting('fortune_ad_reward_enabled', 'true')) !== 'false'

    return NextResponse.json({
      success: true,
      data: {
        costs: FORTUNE_COSTS,
        maxFreePerDay,
        adRewardEnabled,
      },
    })
  } catch (error: any) {
    console.error('[fortune-access] settings error:', error)
    return NextResponse.json({
      success: true,
      data: {
        costs: FORTUNE_COSTS,
        maxFreePerDay: 2,
        adRewardEnabled: true,
      },
    })
  }
}
