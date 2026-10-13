export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { recordLedger } from '@/lib/ledger'

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
      // Faz 20 — §78 Race Condition: kontrol + kredi artışı + dailyTask tek interactive
      // transaction içinde; iki eş zamanlı istek çift bonus veremez.
      const bonusAmount = 5
      let currentCredits = 0
      let newCreditsBalance = 0
      try {
        const txResult = await prisma.$transaction(async (tx: any) => {
          const existing = await tx.dailyTask.findUnique({
            where: { userId_taskType_date: { userId, taskType: 'login', date: today } },
          })
          if (existing) return { alreadyClaimed: true } as const
          const userFull = await tx.user.findUnique({ where: { id: userId }, select: { credits: true } })
          currentCredits = userFull?.credits ?? 0
          newCreditsBalance = currentCredits + bonusAmount
          await tx.user.update({ where: { id: userId }, data: { credits: { increment: bonusAmount } } })
          await tx.creditTransaction.create({
            data: { userId, amount: bonusAmount, type: 'daily_bonus', description: 'Günlük giriş bonusu', balance: newCreditsBalance },
          })
          await tx.dailyTask.create({ data: { userId, taskType: 'login', jetonEarned: bonusAmount, date: today } })
          return { ok: true } as const
        })
        if ('alreadyClaimed' in txResult) {
          return NextResponse.json({ error: 'Günlük bonus zaten alındı', alreadyClaimed: true }, { status: 400 })
        }
      } catch (txErr: any) {
        if (txErr?.code === 'P2002') return NextResponse.json({ error: 'Günlük bonus zaten alındı', alreadyClaimed: true }, { status: 400 })
        throw txErr
      }

      // ── Immutable ledger (fire-and-forget) ──
      recordLedger({
        debit: { accountType: 'platform_cfc', accountId: 'platform' },
        credit: {
          accountType: 'user_cfc',
          accountId: userId,
          balanceBefore: currentCredits,
          balanceAfter: newCreditsBalance,
        },
        amount: bonusAmount,
        category: 'daily_bonus',
        currency: 'cfc',
        description: 'Günlük giriş bonusu',
        referenceType: 'DailyTask',
        referenceId: userId,
        actorId: userId,
      }).catch((e) => console.error('[Ledger][daily-bonus]', e))

      return NextResponse.json({ success: true, creditsEarned: bonusAmount, newCreditsBalance })
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
  } catch (error) {
    console.error('Jeton POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
