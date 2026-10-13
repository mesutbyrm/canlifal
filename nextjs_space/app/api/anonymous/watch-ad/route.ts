import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const DEFAULT_DAILY_LIMIT = 10
const DEFAULT_CREDITS_PER_AD = 5

async function getAnonymousAdSettings() {
  try {
    const [limitSetting, creditsSetting] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: 'ad_daily_limit_unregistered' } }),
      prisma.siteSetting.findUnique({ where: { key: 'ad_credits_per_watch' } }),
    ])
    return {
      dailyLimit: limitSetting ? parseInt(limitSetting.value) || DEFAULT_DAILY_LIMIT : DEFAULT_DAILY_LIMIT,
      creditsPerAd: creditsSetting ? parseInt(creditsSetting.value) || DEFAULT_CREDITS_PER_AD : DEFAULT_CREDITS_PER_AD,
    }
  } catch {
    return { dailyLimit: DEFAULT_DAILY_LIMIT, creditsPerAd: DEFAULT_CREDITS_PER_AD }
  }
}

// Watch ad to earn credits for anonymous user
export async function POST(request: NextRequest) {
  try {
    const { deviceId } = await request.json()

    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 })
    }

    const anonymousUser = await prisma.anonymousUser.findUnique({
      where: { deviceId }
    })

    if (!anonymousUser) {
      return NextResponse.json({ error: 'Anonymous user not found' }, { status: 404 })
    }

    const { dailyLimit, creditsPerAd } = await getAnonymousAdSettings()

    // Check daily limit
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const lastAdDate = anonymousUser.lastAdDate ? new Date(anonymousUser.lastAdDate) : null
    const isNewDay = !lastAdDate || lastAdDate < today

    let adsWatchedToday = isNewDay ? 0 : anonymousUser.adsWatchedToday

    if (adsWatchedToday >= dailyLimit) {
      return NextResponse.json({ 
        error: 'Daily ad limit reached',
        message: `Günlük reklam izleme limitine ulaştınız (${dailyLimit} reklam)`
      }, { status: 429 })
    }

    // Give credits for watching ad
    const updatedUser = await prisma.anonymousUser.update({
      where: { id: anonymousUser.id },
      data: {
        credits: anonymousUser.credits + creditsPerAd,
        adsWatched: anonymousUser.adsWatched + 1,
        adsWatchedToday: adsWatchedToday + 1,
        lastAdDate: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      creditsEarned: creditsPerAd,
      totalCredits: updatedUser.credits,
      adsWatchedToday: updatedUser.adsWatchedToday,
      remainingAds: dailyLimit - updatedUser.adsWatchedToday
    })
  } catch (error) {
    console.error('Watch ad error:', error)
    return NextResponse.json({ error: 'Reklam izleme işlemi başarısız' }, { status: 500 })
  }
}
