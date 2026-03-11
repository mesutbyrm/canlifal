export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

// GET - List all active Bana Özel items + user jeton balance + streak info
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    const items = await prisma.banaOzelItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    let jetonBalance = 0
    let streak = { currentStreak: 0, longestStreak: 0, totalFortunes: 0 }
    let todayTasks: string[] = []

    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { jetonBalance: true },
      })
      jetonBalance = user?.jetonBalance ?? 0

      const streakData = await prisma.userFortuneStreak.findUnique({
        where: { userId: session.user.id },
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
        where: { userId: session.user.id, date: today },
        select: { taskType: true },
      })
      todayTasks = completedTasks.map((t: { taskType: string }) => t.taskType)
    }

    return NextResponse.json({
      items,
      jetonBalance,
      streak,
      todayTasks,
    })
  } catch (error) {
    console.error('Bana Özel GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
