import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { getCachedPlatformSetting } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true, jetonBalance: true, withdrawalLimit: true, membership: true, membershipExpiresAt: true },
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

    return NextResponse.json({ 
      credits: user.credits, 
      jetonBalance: user.jetonBalance ?? 0,
      jetonTlRate,
      withdrawalLimit: user.withdrawalLimit ?? 0,
      membership: user.membership ?? 'basic',
      membershipExpiresAt: user.membershipExpiresAt?.toISOString() ?? null,
    })
  } catch (error) {
    console.error('Fetch credits error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    )
  }
}
