import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { getCachedPlatformSetting } from '@/lib/cache'
import { withCachePolicy } from '@/lib/perf'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { credits: true, jetonBalance: true, cfcBalance: true, withdrawalLimit: true, membership: true, membershipExpiresAt: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    // Get jeton to TL rate from platform settings (cached)
    const rateStr = await getCachedPlatformSetting('jeton_tl_rate', '0.5')
    const jetonTlRate = parseFloat(rateStr) // default 1 jeton = 0.5 TL

    // Bakiye verisi — asla önbelleklenmez (satın alım sonrası bayat bakiye riski).
    return withCachePolicy(NextResponse.json({ 
      credits: user.credits, 
      jetonBalance: user.jetonBalance ?? 0,
      cfcBalance: user.cfcBalance ?? 0,
      jetonTlRate,
      withdrawalLimit: user.withdrawalLimit ?? 0,
      membership: user.membership ?? 'basic',
      membershipExpiresAt: user.membershipExpiresAt?.toISOString() ?? null,
    }), 'no-store')
  } catch (error) {
    console.error('Fetch credits error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    )
  }
}
