export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const now = new Date()
    const contests = await prisma.dreamContest.findMany({
      where: { isActive: true },
      orderBy: { endDate: 'desc' },
      include: {
        _count: { select: { entries: true } },
      },
      take: 10,
    })

    const session = await getServerSession(authOptions)
    const userId = session?.user ? (session.user as any).id : null

    const contestsWithStatus = contests.map((c: any) => ({
      ...c,
      isOngoing: now >= c.startDate && now <= c.endDate,
      isEnded: now > c.endDate,
      entryCount: c._count.entries,
    }))

    return NextResponse.json({ contests: contestsWithStatus })
  } catch (error) {
    console.error('Dream contest GET error:', error)
    return NextResponse.json({ error: 'Hata olu\u015ftu' }, { status: 500 })
  }
}
