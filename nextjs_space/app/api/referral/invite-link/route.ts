import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { buildInviteLink, ensureReferralCode } from '@/lib/referral-summary'

export const dynamic = 'force-dynamic'

/** GET /api/referral/invite-link — paylaşılabilir davet bağlantısı. */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const code = await ensureReferralCode(auth.id)
    if (!code) {
      return NextResponse.json({ error: 'Davet kodu bulunamadı' }, { status: 404 })
    }
    const link = buildInviteLink(code)
    return NextResponse.json({
      success: true,
      data: {
        referralCode: code,
        code,
        shareUrl: link,
        inviteLink: link,
        referralLink: link,
        shareText: `CanlıFal'a katıl, ilk falını benim davetimle aç! ${link}`,
      },
    })
  } catch (error) {
    console.error('[Referral invite-link] Error:', error)
    return NextResponse.json({ error: 'Davet bağlantısı alınamadı' }, { status: 500 })
  }
}
