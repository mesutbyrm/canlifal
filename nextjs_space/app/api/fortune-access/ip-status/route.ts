import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getClientIp } from '@/lib/fortune-access'

export const dynamic = 'force-dynamic'

/**
 * Get IP-based fortune usage status (for unregistered users)
 */
export async function GET(request: Request) {
  try {
    const ip = getClientIp(request)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const usage = await prisma.ipFortuneUsage.findUnique({
      where: { ipAddress_date: { ipAddress: ip, date: today } },
    })

    return NextResponse.json({
      used: usage?.count || 0,
      maxFree: 2,
      adWatched: usage?.adWatched || false,
      canUseFree: !usage || usage.count === 0,
      canWatchAd: usage?.count === 1 && !usage?.adWatched,
      needsLogin: (usage?.count || 0) >= 2,
    })
  } catch (error) {
    console.error('IP status error:', error)
    return NextResponse.json({ used: 0, maxFree: 2, adWatched: false, canUseFree: true, canWatchAd: false, needsLogin: false })
  }
}
