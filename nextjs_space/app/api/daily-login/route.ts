export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

const STREAK_REWARDS = [
  { day: 1, xp: 10, jeton: 0 },
  { day: 2, xp: 15, jeton: 0 },
  { day: 3, xp: 20, jeton: 1 },
  { day: 4, xp: 25, jeton: 0 },
  { day: 5, xp: 30, jeton: 2 },
  { day: 6, xp: 40, jeton: 0 },
  { day: 7, xp: 50, jeton: 5 },
]

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Giri\u015f yap\u0131n' }, { status: 401 })
    const userId = (session.user as any).id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loginStreak: true, lastLoginRewardDate: true, xp: true, level: true, jetonBalance: true },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const alreadyClaimed = user?.lastLoginRewardDate && new Date(user.lastLoginRewardDate).getTime() === today.getTime()

    return NextResponse.json({
      streak: user?.loginStreak || 0,
      alreadyClaimed: !!alreadyClaimed,
      xp: user?.xp || 0,
      level: user?.level || 1,
      jetonBalance: user?.jetonBalance || 0,
      streakRewards: STREAK_REWARDS,
    })
  } catch (error) {
    console.error('Daily login GET error:', error)
    return NextResponse.json({ error: 'Hata olu\u015ftu' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Giri\u015f yap\u0131n' }, { status: 401 })
    const userId = (session.user as any).id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loginStreak: true, lastLoginRewardDate: true, xp: true, level: true, jetonBalance: true },
    })
    if (!user) return NextResponse.json({ error: 'Kullan\u0131c\u0131 bulunamad\u0131' }, { status: 404 })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (user.lastLoginRewardDate && new Date(user.lastLoginRewardDate).getTime() === today.getTime()) {
      return NextResponse.json({ error: 'Bug\u00fcn\u00fc zaten ald\u0131n\u0131z' }, { status: 400 })
    }

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const wasYesterday = user.lastLoginRewardDate && new Date(user.lastLoginRewardDate).getTime() === yesterday.getTime()

    const newStreak = wasYesterday ? (user.loginStreak || 0) + 1 : 1
    const rewardIndex = ((newStreak - 1) % 7)
    const reward = STREAK_REWARDS[rewardIndex]

    await prisma.dailyLoginReward.create({
      data: {
        userId,
        rewardDate: today,
        streak: newStreak,
        xpEarned: reward.xp,
        jetonEarned: reward.jeton,
      },
    })

    const newXp = (user.xp || 0) + reward.xp
    const newLevel = Math.floor(newXp / 100) + 1

    await prisma.user.update({
      where: { id: userId },
      data: {
        loginStreak: newStreak,
        lastLoginRewardDate: today,
        xp: newXp,
        level: newLevel,
        jetonBalance: { increment: reward.jeton },
      },
    })

    return NextResponse.json({
      success: true,
      streak: newStreak,
      xpEarned: reward.xp,
      jetonEarned: reward.jeton,
      totalXp: newXp,
      level: newLevel,
    })
  } catch (error) {
    console.error('Daily login POST error:', error)
    return NextResponse.json({ error: 'Hata olu\u015ftu' }, { status: 500 })
  }
}
