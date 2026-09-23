import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { resolveAdPlacement, normalizePlacementKey } from '@/lib/ad-placements'

export const dynamic = 'force-dynamic'

/**
 * GET /api/ads/placement?key=home_banner&platform=web
 * Belirli bir yerlesim icin gosterilecek reklam verisini dondurur.
 * Oturum zorunlu degildir; oturum varsa uyelik hedeflemesi uygulanir.
 */
export async function GET(request: NextRequest) {
  try {
    const key = normalizePlacementKey(request.nextUrl.searchParams.get('key') || '')
    if (!key) return NextResponse.json({ error: 'key parametresi zorunlu' }, { status: 400 })

    const platform = request.nextUrl.searchParams.get('platform') || 'all'

    let membership: string | null = null
    try {
      const mobileUser = await authenticateRequest(request)
      const webSession = mobileUser ? null : await getServerSession(authOptions)
      const userId = mobileUser?.id || (webSession?.user as any)?.id
      if (userId) {
        const u = await prisma.user.findUnique({ where: { id: userId }, select: { membership: true } })
        membership = u?.membership ?? null
      }
    } catch {
      membership = null
    }

    const placement = await resolveAdPlacement(key, { membership, platform })
    if (!placement) return NextResponse.json({ hasAd: false, placement: null })

    return NextResponse.json({ hasAd: true, placement })
  } catch (error) {
    console.error('Ad placement resolve error:', error)
    return NextResponse.json({ hasAd: false, placement: null })
  }
}

/**
 * POST /api/ads/placement
 * body: { key: string, event: 'impression' | 'click' }
 * Sayaclari artirir (fire-and-forget, hatada sessizce basarili doner).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const key = normalizePlacementKey(body?.key || '')
    const event = body?.event === 'click' ? 'click' : 'impression'
    if (!key) return NextResponse.json({ success: false }, { status: 400 })

    await prisma.adPlacement.updateMany({
      where: { placementKey: key },
      data: event === 'click' ? { clicks: { increment: 1 } } : { impressions: { increment: 1 } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ad placement track error:', error)
    return NextResponse.json({ success: false })
  }
}
