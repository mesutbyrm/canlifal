import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { buildReferralStats } from '@/lib/referral-summary'

export const dynamic = 'force-dynamic'

/** GET /api/referral/stats — davet özeti (mobil davet ekranı). */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const stats = await buildReferralStats(auth.id)
    if (!stats) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error('[Referral stats] Error:', error)
    return NextResponse.json({ error: 'Davet özeti alınamadı' }, { status: 500 })
  }
}
