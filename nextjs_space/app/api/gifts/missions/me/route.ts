import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import { missionProgressForUser } from '@/lib/gift-insights'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gifts/missions/me
 * The authenticated user's daily mission progress. Dual-auth (mobile JWT / web session).
 */
export async function GET(request: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(request)
    const webSession = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || (webSession?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    return NextResponse.json(await missionProgressForUser(userId))
  } catch (error) {
    console.error('[gifts/missions/me]', error)
    return NextResponse.json({ error: 'Görev ilerlemesi alınamadı' }, { status: 500 })
  }
}
