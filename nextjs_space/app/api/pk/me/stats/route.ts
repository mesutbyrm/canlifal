import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { computePkStatsForUser } from '@/lib/pk-user-stats'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    let userId: string | null = null
    const mobile = await authenticateRequest(req).catch(() => null)
    if (mobile?.id) userId = mobile.id
    else {
      const session = await getServerSession(authOptions).catch(() => null)
      userId = (session?.user as any)?.id || null
    }
    if (!userId) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    const stats = await computePkStatsForUser(userId)
    return NextResponse.json({ success: true, stats, data: stats })
  } catch (error) {
    console.error('[pk/me/stats]', error)
    return NextResponse.json({ error: 'PK istatistikleri alınamadı' }, { status: 500 })
  }
}
