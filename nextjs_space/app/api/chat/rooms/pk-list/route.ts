export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { expireAllStalePKs } from '@/lib/pk-expiry'

/**
 * GET /api/chat/rooms/pk-list
 * Lists all active/pending PK battles for chat rooms.
 * Since chat room PKs store roomId in stream1Id/stream2Id,
 * we filter by checking if the IDs correspond to active chat rooms.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'active'

    // Expire stale pending PKs
    await expireAllStalePKs()

    const battles = await prisma.pKBattle.findMany({
      where: {
        status: status === 'all' ? undefined : { in: status.split(',') },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Filter to only chat room PKs by checking if stream1Id matches a ChatRoom
    const allRoomIds = [...new Set(battles.flatMap(b => [b.stream1Id, b.stream2Id]))]
    const chatRooms = allRoomIds.length > 0
      ? await prisma.chatRoom.findMany({
          where: { id: { in: allRoomIds } },
          select: { id: true, nameTr: true, icon: true, ownerId: true }
        })
      : []
    const roomMap = new Map(chatRooms.map(r => [r.id, r]))

    // Only include battles where at least one side is a chat room
    const chatBattles = battles.filter(b => roomMap.has(b.stream1Id) || roomMap.has(b.stream2Id))

    // Fetch user info
    const userIds = [...new Set(chatBattles.flatMap(b => [b.user1Id, b.user2Id]))]
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, image: true, username: true }
        })
      : []
    const userMap = new Map(users.map(u => [u.id, u]))

    const result = chatBattles.map(b => ({
      ...b,
      user1: userMap.get(b.user1Id) || null,
      user2: userMap.get(b.user2Id) || null,
      room1: roomMap.get(b.stream1Id) ? {
        id: roomMap.get(b.stream1Id)!.id,
        name: roomMap.get(b.stream1Id)!.nameTr,
        icon: roomMap.get(b.stream1Id)!.icon,
      } : null,
      room2: roomMap.get(b.stream2Id) ? {
        id: roomMap.get(b.stream2Id)!.id,
        name: roomMap.get(b.stream2Id)!.nameTr,
        icon: roomMap.get(b.stream2Id)!.icon,
      } : null,
    }))

    return NextResponse.json(result)
  } catch (e) {
    console.error('Chat PK list error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
