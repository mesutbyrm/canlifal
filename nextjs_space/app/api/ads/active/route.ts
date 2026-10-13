import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Get active ad network configuration for displaying ads
 */
export async function GET() {
  try {
    const activeAd = await prisma.adNetwork.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        provider: true,
        adCode: true,
        adUnitId: true,
        appId: true,
      },
    })

    if (!activeAd) {
      return NextResponse.json({ hasAds: false, adNetwork: null })
    }

    return NextResponse.json({ hasAds: true, adNetwork: activeAd })
  } catch (error) {
    console.error('Active ads error:', error)
    return NextResponse.json({ hasAds: false, adNetwork: null })
  }
}
