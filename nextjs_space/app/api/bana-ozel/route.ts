export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

// GET - List all active Bana Özel items + user jeton balance + streak info
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    
    const items = await prisma.banaOzelItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    let jetonBalance = 0
    let cfcBalance = 0
    let streak = { currentStreak: 0, longestStreak: 0, totalFortunes: 0 }
    let todayTasks: string[] = []

    if (authUser?.id) {
      const user = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { jetonBalance: true, credits: true },
      })
      jetonBalance = user?.jetonBalance ?? 0
      cfcBalance = user?.credits ?? 0

      const streakData = await prisma.userFortuneStreak.findUnique({
        where: { userId: authUser.id },
      })
      if (streakData) {
        streak = {
          currentStreak: streakData.currentStreak,
          longestStreak: streakData.longestStreak,
          totalFortunes: streakData.totalFortunes,
        }
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const completedTasks = await prisma.dailyTask.findMany({
        where: { userId: authUser.id, date: today },
        select: { taskType: true },
      })
      todayTasks = completedTasks.map((t: { taskType: string }) => t.taskType)
    }

    return NextResponse.json({
      items,
      jetonBalance,
      cfcBalance,
      streak,
      todayTasks,
    })
  } catch (error) {
    console.error('Bana Özel GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
