import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET: Fetch leaderboard
export async function GET() {
  try {
    const profiles = await prisma.userGameProfile.findMany({
      orderBy: { totalJetons: 'desc' },
      take: 20,
    })

    // Get user details
    const userIds = profiles.map((p: any) => p.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, username: true, image: true },
    })

    const userMap = new Map(users.map((u: any) => [u.id, u]))

    const leaderboard = profiles.map((p: any, index: number) => {
      const user = userMap.get(p.userId) as any
      return {
        rank: index + 1,
        userId: p.userId,
        name: user?.name || 'Anonim',
        username: user?.username || null,
        image: user?.image || null,
        totalJetons: p.totalJetons,
        totalGames: p.totalGames,
        level: p.level,
        levelTitle: p.levelTitle,
      }
    })

    return NextResponse.json(leaderboard)
  } catch (error: any) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Liderlik tablosu yüklenemedi' }, { status: 500 })
  }
}
