import { NextResponse } from 'next/server'
import {
  getCurrencyBranding,
  CONVERTIBLE_CURRENCIES,
  REWARD_CURRENCY,
} from '@/lib/currency-branding'

export const dynamic = 'force-dynamic'

/** Herkese açık: para birimi isimleri, ikonları ve çevrilebilirlik kuralları */
export async function GET() {
  try {
    const branding = await getCurrencyBranding()
    return NextResponse.json({
      ...branding,
      rules: {
        convertible: CONVERTIBLE_CURRENCIES,
        rewardCurrency: REWARD_CURRENCY,
      },
    })
  } catch (error) {
    console.error('[CurrencyBranding] GET error:', error)
    return NextResponse.json({ error: 'Para birimi bilgisi alınamadı' }, { status: 500 })
  }
}
