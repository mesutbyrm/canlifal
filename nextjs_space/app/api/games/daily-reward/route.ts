import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// Streak reward mapping
const STREAK_REWARDS: Record<number, number> = {
  1: 5,
  2: 10,
  3: 20,
  7: 100,
}

function getStreakReward(streak: number): number {
  if (streak >= 7) return 100
  if (streak >= 3) return 20
  if (streak >= 2) return 10
  return 5
}

// GET: Check daily reward status
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayReward = await prisma.dailyReward.findUnique({
      where: { userId_rewardDate: { userId: authUser.id, rewardDate: today } },
    })

    // Get yesterday's reward for streak info
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayReward = await prisma.dailyReward.findUnique({
      where: { userId_rewardDate: { userId: authUser.id, rewardDate: yesterday } },
    })

    const currentStreak = todayReward?.streak || (yesterdayReward ? yesterdayReward.streak : 0)
    const claimed = !!todayReward
    const nextReward = getStreakReward(currentStreak + (claimed ? 0 : 1))

    return NextResponse.json({
      claimed,
      currentStreak,
      nextReward,
      todayReward: todayReward?.jetonReward || 0,
    })
  } catch (error: any) {
    console.error('Daily reward check error:', error)
    return NextResponse.json({ error: 'Kontrol edilemedi' }, { status: 500 })
  }
}

// POST: Claim daily reward
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if already claimed
    const existing = await prisma.dailyReward.findUnique({
      where: { userId_rewardDate: { userId: authUser.id, rewardDate: today } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Bugünkü ödül zaten alındı' }, { status: 400 })
    }

    // Check yesterday for streak
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayReward = await prisma.dailyReward.findUnique({
      where: { userId_rewardDate: { userId: authUser.id, rewardDate: yesterday } },
    })

    const newStreak = yesterdayReward ? yesterdayReward.streak + 1 : 1
    const reward = getStreakReward(newStreak)

    // Create daily reward
    await prisma.dailyReward.create({
      data: {
        userId: authUser.id,
        rewardDate: today,
        streak: newStreak,
        jetonReward: reward,
      },
    })

    // Add CFC to user
    await prisma.user.update({
      where: { id: authUser.id },
      data: { credits: { increment: reward } },
    })

    // Also create/update daily_login quest
    await prisma.dailyQuest.upsert({
      where: {
        userId_questDate_questType: {
          userId: authUser.id,
          questDate: today,
          questType: 'daily_login',
        },
      },
      create: {
        userId: authUser.id,
        questDate: today,
        questType: 'daily_login',
        progress: 1,
        target: 1,
        reward: 10,
      },
      update: {
        progress: 1,
      },
    })

    const updatedUser = await prisma.user.findUnique({ where: { id: authUser.id }, select: { credits: true } })

    return NextResponse.json({
      success: true,
      reward,
      streak: newStreak,
      newBalance: updatedUser?.credits || 0,
    })
  } catch (error: any) {
    console.error('Daily reward claim error:', error)
    return NextResponse.json({ error: 'Ödül alınamadı' }, { status: 500 })
  }
}
