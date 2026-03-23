export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

// GET - Get jeton balance, streak, daily tasks
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { jetonBalance: true },
    })

    const streak = await prisma.userFortuneStreak.findUnique({
      where: { userId: session.user.id },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const completedTasks = await prisma.dailyTask.findMany({
      where: { userId: session.user.id, date: today },
    })

    const recentHistory = await prisma.banaOzelHistory.findMany({
      where: { userId: session.user.id },
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { action } = await req.json()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { jetonBalance: true },
    })
    if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })

    if (action === 'daily_login') {
      // Check if already claimed
      const existing = await prisma.dailyTask.findUnique({
        where: { userId_taskType_date: { userId: session.user.id, taskType: 'login', date: today } },
      })
      if (existing) {
        return NextResponse.json({ error: 'Günlük bonus zaten alındı', alreadyClaimed: true }, { status: 400 })
      }

      // Daily login bonus goes to CREDITS (not jetons)
      // Jetons are only obtained through real money purchases
      const bonusAmount = 5
      const userFull = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { credits: true },
      })
      const currentCredits = userFull?.credits ?? 0
      const newCreditsBalance = currentCredits + bonusAmount
      await prisma.$transaction([
        prisma.user.update({
          where: { id: session.user.id },
          data: { credits: { increment: bonusAmount } },
        }),
        prisma.creditTransaction.create({
          data: {
            userId: session.user.id,
            amount: bonusAmount,
            type: 'daily_bonus',
            description: 'Günlük giriş bonusu',
            balance: newCreditsBalance,
          },
        }),
        prisma.dailyTask.create({
          data: {
            userId: session.user.id,
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
