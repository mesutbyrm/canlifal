import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const CREDITS_PER_AD = 5
const ADS_PER_DAY_LIMIT = 10

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const userId = session.user.id

    // Check daily limit - using a simple approach with settings
    const today = new Date().toISOString().split('T')[0]
    const limitKey = `ad_watch_${userId}_${today}`
    
    const existingLimit = await prisma.siteSetting.findUnique({
      where: { key: limitKey }
    })

    const currentCount = existingLimit ? parseInt(existingLimit.value) : 0

    if (currentCount >= ADS_PER_DAY_LIMIT) {
      return NextResponse.json(
        { error: 'Günlük reklam izleme limitine ulaştınız. Yarın tekrar deneyin.', error_en: 'Daily ad watch limit reached. Try again tomorrow.' },
        { status: 429 }
      )
    }

    // Update watch count
    await prisma.siteSetting.upsert({
      where: { key: limitKey },
      update: { value: String(currentCount + 1) },
      create: { key: limitKey, value: '1' }
    })

    // Add credits to user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: { increment: CREDITS_PER_AD }
      },
      select: { credits: true }
    })

    return NextResponse.json({
      success: true,
      creditsEarned: CREDITS_PER_AD,
      totalCredits: updatedUser.credits,
      remainingAds: ADS_PER_DAY_LIMIT - (currentCount + 1)
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
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const userId = session.user.id
    const today = new Date().toISOString().split('T')[0]
    const limitKey = `ad_watch_${userId}_${today}`
    
    const existingLimit = await prisma.siteSetting.findUnique({
      where: { key: limitKey }
    })

    const currentCount = existingLimit ? parseInt(existingLimit.value) : 0

    return NextResponse.json({
      watchedToday: currentCount,
      remainingAds: Math.max(0, ADS_PER_DAY_LIMIT - currentCount),
      creditsPerAd: CREDITS_PER_AD
    })
  } catch (error) {
    console.error('Get ad status error:', error)
    return NextResponse.json(
      { error: 'Failed to get ad status' },
      { status: 500 }
    )
  }
}
