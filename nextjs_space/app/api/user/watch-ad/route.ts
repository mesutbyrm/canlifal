import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const DEFAULT_CREDITS_PER_AD = 5
const DEFAULT_ADS_PER_DAY_LIMIT = 10

async function getAdSettings() {
  try {
    const [limitSetting, creditsSetting] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: 'ad_daily_limit_registered' } }),
      prisma.siteSetting.findUnique({ where: { key: 'ad_credits_per_watch' } }),
    ])
    return {
      dailyLimit: limitSetting ? parseInt(limitSetting.value) || DEFAULT_ADS_PER_DAY_LIMIT : DEFAULT_ADS_PER_DAY_LIMIT,
      creditsPerAd: creditsSetting ? parseInt(creditsSetting.value) || DEFAULT_CREDITS_PER_AD : DEFAULT_CREDITS_PER_AD,
    }
  } catch {
    return { dailyLimit: DEFAULT_ADS_PER_DAY_LIMIT, creditsPerAd: DEFAULT_CREDITS_PER_AD }
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const userId = session.user.id
    const { dailyLimit, creditsPerAd } = await getAdSettings()

    // Check daily limit - using a simple approach with settings
    const today = new Date().toISOString().split('T')[0]
    const limitKey = `ad_watch_${userId}_${today}`
    
    const existingLimit = await prisma.siteSetting.findUnique({
      where: { key: limitKey }
    })

    const currentCount = existingLimit ? parseInt(existingLimit.value) : 0

    if (currentCount >= dailyLimit) {
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
        credits: { increment: creditsPerAd }
      },
      select: { credits: true }
    })

    return NextResponse.json({
      success: true,
      creditsEarned: creditsPerAd,
      totalCredits: updatedUser.credits,
      remainingAds: dailyLimit - (currentCount + 1)
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
    const { dailyLimit, creditsPerAd } = await getAdSettings()
    const today = new Date().toISOString().split('T')[0]
    const limitKey = `ad_watch_${userId}_${today}`
    
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
