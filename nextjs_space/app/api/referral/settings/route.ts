import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getCommissionConfig } from '@/lib/referral-commission'

export const dynamic = 'force-dynamic'

/** GET /api/referral/settings — davet/komisyon kuralları (salt okunur). */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const config = await getCommissionConfig()
    return NextResponse.json({
      success: true,
      data: {
        enabled: config.referralEnabled,
        rate: config.referralRate,
        minTopup: config.referralMinTopup,
        monthlyLimit: config.referralMonthlyLimit,
        lifetimeLimit: config.referralTotalLimit,
        agencyEnabled: config.agencyEnabled,
        agencyRate: config.agencyRate,
        agencyMonthlyLimit: config.agencyMonthlyLimit,
        currency: 'cfc',
      },
    })
  } catch (error) {
    console.error('[Referral settings] Error:', error)
    return NextResponse.json({ error: 'Davet ayarları alınamadı' }, { status: 500 })
  }
}
