import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { listPkHistoryForUser } from '@/lib/pk-user-stats'

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
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '30', 10) || 30))
    const history = await listPkHistoryForUser(userId, page, limit)
    return NextResponse.json({ success: true, history, items: history, data: history })
  } catch (error) {
    console.error('[pk/me/history]', error)
    return NextResponse.json({ error: 'PK geçmişi alınamadı' }, { status: 500 })
  }
}
