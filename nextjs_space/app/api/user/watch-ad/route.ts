import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { getAdSettings, adWatchLimitKey, grantAdWatchCredits } from '@/lib/ad-reward'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)

    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const outcome = await grantAdWatchCredits(auth.id)

    if (outcome.status === 'limit_reached') {
      return NextResponse.json(
        { error: 'Günlük reklam izleme limitine ulaştınız. Yarın tekrar deneyin.', error_en: 'Daily ad watch limit reached. Try again tomorrow.' },
        { status: 429 }
      )
    }

    return NextResponse.json({
      success: true,
      creditsEarned: outcome.creditsEarned,
      totalCredits: outcome.totalCredits,
      remainingAds: outcome.remainingAds
    })
  } catch (error) {
    console.error('Watch ad error:', error)
    return NextResponse.json(
      { error: 'Failed to process ad reward' },
      { status: 500 }
    )
  }
}

// Get user's remaining ads for today
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const userId = auth.id
    const { dailyLimit, creditsPerAd } = await getAdSettings()
    const limitKey = adWatchLimitKey(userId)

    const existingLimit = await prisma.siteSetting.findUnique({
      where: { key: limitKey }
    })

    const currentCount = existingLimit ? parseInt(existingLimit.value) : 0

    return NextResponse.json({
      watchedToday: currentCount,
      remainingAds: Math.max(0, dailyLimit - currentCount),
      creditsPerAd: creditsPerAd
    })
  } catch (error) {
    console.error('Get ad status error:', error)
    return NextResponse.json(
      { error: 'Failed to get ad status' },
      { status: 500 }
    )
  }
}
