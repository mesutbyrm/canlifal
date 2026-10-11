import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import { buildSupporterBadge } from '@/lib/gift-insights'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gifts/insights/me/badge
 * The authenticated user's own supporter badge. Dual-auth (mobile JWT / web session).
 */
export async function GET(request: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(request)
    const webSession = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || (webSession?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    return NextResponse.json(await buildSupporterBadge(userId))
  } catch (error) {
    console.error('[gifts/insights/me/badge]', error)
    return NextResponse.json({ error: 'Rozet bilgisi alınamadı' }, { status: 500 })
  }
}
