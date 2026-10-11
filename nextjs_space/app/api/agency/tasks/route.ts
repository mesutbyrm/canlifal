import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// Get current week's task for agency
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const membership = await prisma.agencyUser.findUnique({
      where: { userId: authUser.id },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Üye değilsiniz' }, { status: 403 })
    }

    // Get current week boundaries (Monday to Sunday)
    const now = new Date()
    const dayOfWeek = now.getUTCDay() // 0=Sun, 1=Mon...
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Days since Monday
    const weekStart = new Date(now)
    weekStart.setUTCDate(now.getUTCDate() - diff)
    weekStart.setUTCHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6)
    weekEnd.setUTCHours(23, 59, 59, 999)

    // Find or create task for this week
    let task = await prisma.agencyTask.findUnique({
      where: {
        agencyId_weekStart: {
          agencyId: membership.agencyId,
          weekStart,
        }
      }
    })

    if (!task) {
      // Generate dynamic targets based on agency size
      const agency = await prisma.agency.findUnique({
        where: { id: membership.agencyId },
        select: { totalMembers: true, totalEarnings: true }
      })

      const memberCount = agency?.totalMembers || 1
      // Dynamic targets scale with agency size
      const earningsTarget = Math.max(100, memberCount * 50)
      const newUsersTarget = Math.max(1, Math.floor(memberCount * 0.3))
      const activeUsersTarget = Math.max(1, Math.floor(memberCount * 0.6))

      task = await prisma.agencyTask.create({
        data: {
          agencyId: membership.agencyId,
          weekStart,
          weekEnd,
          earningsTarget,
          newUsersTarget,
          activeUsersTarget,
        }
      })
    }

    // Calculate actual values
    const [weekEarnings, newMembers, activeMembers] = await Promise.all([
      prisma.agencyEarning.aggregate({
        where: {
          agencyId: membership.agencyId,
          createdAt: { gte: weekStart, lte: weekEnd }
        },
        _sum: { amount: true }
      }),
      prisma.agencyUser.count({
        where: {
          agencyId: membership.agencyId,
          joinedAt: { gte: weekStart, lte: weekEnd }
        }
      }),
      prisma.agencyUser.count({
        where: {
          agencyId: membership.agencyId,
          isActive: true,
        }
      }),
    ])

    const earningsActual = weekEarnings._sum.amount || 0
    const newUsersActual = newMembers
    const activeUsersActual = activeMembers

    // Calculate completion %
    const earningsPct = task.earningsTarget > 0 ? Math.min(100, (earningsActual / task.earningsTarget) * 100) : 100
    const newUsersPct = task.newUsersTarget > 0 ? Math.min(100, (newUsersActual / task.newUsersTarget) * 100) : 100
    const activeUsersPct = task.activeUsersTarget > 0 ? Math.min(100, (activeUsersActual / task.activeUsersTarget) * 100) : 100
    // APS: earnings 50%, active users 30%, new users 20%
    const completionPercent = earningsPct * 0.5 + activeUsersPct * 0.3 + newUsersPct * 0.2

    // Update task with actual values
    await prisma.agencyTask.update({
      where: { id: task.id },
      data: { earningsActual, newUsersActual, activeUsersActual, completionPercent }
    })

    // Update agency performance score
    await prisma.agency.update({
      where: { id: membership.agencyId },
      data: { performanceScore: completionPercent }
    })

    // Get past tasks
    const pastTasks = await prisma.agencyTask.findMany({
      where: { agencyId: membership.agencyId, weekStart: { lt: weekStart } },
      orderBy: { weekStart: 'desc' },
      take: 4,
    })

    return NextResponse.json({
      currentTask: {
        ...task,
        earningsActual,
        newUsersActual,
        activeUsersActual,
        completionPercent,
      },
      pastTasks,
    })
  } catch (error: any) {
    console.error('[Agency Tasks] Error:', error)
    return NextResponse.json({ error: 'Görevler alınamadı' }, { status: 500 })
  }
}
