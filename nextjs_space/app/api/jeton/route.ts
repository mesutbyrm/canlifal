export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

// GET - Get jeton balance, streak, daily tasks
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const userId = authUser.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { jetonBalance: true },
    })

    const streak = await prisma.userFortuneStreak.findUnique({
      where: { userId },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const completedTasks = await prisma.dailyTask.findMany({
      where: { userId, date: today },
    })

    const recentHistory = await prisma.banaOzelHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Daily login bonus
    const loginTask = completedTasks.find((t: { taskType: string }) => t.taskType === 'login')
    let loginBonusAvailable = !loginTask

    return NextResponse.json({
      jetonBalance: user?.jetonBalance ?? 0,
      streak: streak ? {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        totalFortunes: streak.totalFortunes,
      } : { currentStreak: 0, longestStreak: 0, totalFortunes: 0 },
      todayTasks: completedTasks.map((t: { taskType: string }) => t.taskType),
      recentHistory,
      loginBonusAvailable,
    })
  } catch (error) {
    console.error('Jeton GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - Claim daily bonuses
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const userId = authUser.id

    const { action } = await req.json()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { jetonBalance: true },
    })
    if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })

    if (action === 'daily_login') {
      // Check if already claimed
      const existing = await prisma.dailyTask.findUnique({
        where: { userId_taskType_date: { userId: userId, taskType: 'login', date: today } },
      })
      if (existing) {
        return NextResponse.json({ error: 'Günlük bonus zaten alındı', alreadyClaimed: true }, { status: 400 })
      }

      // Daily login bonus goes to CREDITS (not jetons)
      // Jetons are only obtained through real money purchases
      const bonusAmount = 5
      const userFull = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      })
      const currentCredits = userFull?.credits ?? 0
      const newCreditsBalance = currentCredits + bonusAmount
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { credits: { increment: bonusAmount } },
        }),
        prisma.creditTransaction.create({
          data: {
            userId: userId,
            amount: bonusAmount,
            type: 'daily_bonus',
            description: 'Günlük giriş bonusu',
            balance: newCreditsBalance,
          },
        }),
        prisma.dailyTask.create({
          data: {
            userId: userId,
            taskType: 'login',
            jetonEarned: bonusAmount,
            date: today,
          },
        }),
      ])

      return NextResponse.json({ success: true, creditsEarned: bonusAmount, newCreditsBalance })
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
  } catch (error) {
    console.error('Jeton POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
