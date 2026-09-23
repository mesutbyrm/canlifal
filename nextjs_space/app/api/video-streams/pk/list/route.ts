export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { expireAllStalePKs } from '@/lib/pk-expiry'

// GET - List active PK battles (for viewers to see which streams have PKs)
export async function GET(req: NextRequest) {
  try {
    // Expire stale pending PKs
    await expireAllStalePKs()

    const battles = await prisma.pKBattle.findMany({
      where: { status: 'active' },
      orderBy: { startedAt: 'desc' },
      take: 20
    })

    if (battles.length === 0) return NextResponse.json([])

    // Get all unique user IDs
    const userIds = [...new Set(battles.flatMap(b => [b.user1Id, b.user2Id]))]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true }
    })
    const userMap = Object.fromEntries(users.map(u => [u.id, u]))

    return NextResponse.json(battles.map(b => ({
      ...b,
      user1: userMap[b.user1Id] || null,
      user2: userMap[b.user2Id] || null
    })))
  } catch (e) {
    console.error('PK list error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
