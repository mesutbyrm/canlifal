import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST: Use daily free spin
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let profile = await prisma.userGameProfile.findUnique({ where: { userId: session.user.id } })
    if (!profile) {
      profile = await prisma.userGameProfile.create({
        data: { userId: session.user.id },
      })
    }

    // Check if already used daily spin
    const lastSpin = profile.lastSpinDate ? new Date(profile.lastSpinDate) : null
    if (lastSpin) {
      lastSpin.setHours(0, 0, 0, 0)
      if (lastSpin.getTime() === today.getTime() && profile.dailySpinsUsed >= 1) {
        return NextResponse.json({ error: 'Günlük ücretsiz çark hakkınız doldu', canSpin: false }, { status: 400 })
      }
    }

    // Spin rewards (weighted)
    const rewards = [5, 10, 15, 20, 25, 30, 50, 100]
    const weights = [30, 25, 15, 10, 8, 6, 4, 2]
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    let rand = Math.random() * totalWeight
    let reward = rewards[0]
    for (let i = 0; i < weights.length; i++) {
      rand -= weights[i]
      if (rand <= 0) { reward = rewards[i]; break }
    }

    // Update spin usage
    await prisma.userGameProfile.update({
      where: { userId: session.user.id },
      data: {
        dailySpinsUsed: lastSpin && lastSpin.getTime() === today.getTime() ? { increment: 1 } : 1,
        lastSpinDate: today,
      },
    })

    // Add jetons
    await prisma.user.update({
      where: { id: session.user.id },
      data: { jetonBalance: { increment: reward } },
    })

    // Update game profile
    await prisma.userGameProfile.update({
      where: { userId: session.user.id },
      data: { totalJetons: { increment: reward } },
    })

    const updatedUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { jetonBalance: true } })

    return NextResponse.json({
      success: true,
      reward,
      newBalance: updatedUser?.jetonBalance || 0,
    })
  } catch (error: any) {
    console.error('Daily spin error:', error)
    return NextResponse.json({ error: 'Çark çevirilemedi' }, { status: 500 })
  }
}
