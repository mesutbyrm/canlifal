import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

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

    // Check daily limit
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const lastAdDate = anonymousUser.lastAdDate ? new Date(anonymousUser.lastAdDate) : null
    const isNewDay = !lastAdDate || lastAdDate < today

    let adsWatchedToday = isNewDay ? 0 : anonymousUser.adsWatchedToday

    if (adsWatchedToday >= 10) {
      return NextResponse.json({ 
        error: 'Daily ad limit reached',
        message: 'Günlük reklam izleme limitine ulaştınız (10 reklam)'
      }, { status: 429 })
    }

    // Give 5 credits for watching ad
    const updatedUser = await prisma.anonymousUser.update({
      where: { id: anonymousUser.id },
      data: {
        credits: anonymousUser.credits + 5,
        adsWatched: anonymousUser.adsWatched + 1,
        adsWatchedToday: adsWatchedToday + 1,
        lastAdDate: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      creditsEarned: 5,
      totalCredits: updatedUser.credits,
      adsWatchedToday: updatedUser.adsWatchedToday,
      remainingAds: 10 - updatedUser.adsWatchedToday
    })
  } catch (error) {
    console.error('Watch ad error:', error)
    return NextResponse.json({ error: 'Reklam izleme işlemi başarısız' }, { status: 500 })
  }
}
