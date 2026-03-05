import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rooms = await prisma.chatRoom.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { messages: true }
        },
        presences: {
          where: {
            lastSeen: {
              gte: new Date(Date.now() - 60000) // Active in last 60 seconds
            }
          },
          select: { userId: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    const roomsWithCounts = rooms.map(room => ({
      id: room.id,
      slug: room.slug,
      nameEn: room.nameEn,
      nameTr: room.nameTr,
      descEn: room.descEn,
      descTr: room.descTr,
      icon: room.icon,
      messageCount: room._count.messages,
      onlineCount: room.presences.length
    }))

    return NextResponse.json(roomsWithCounts)
  } catch (error) {
    console.error('Error fetching chat rooms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat rooms' },
      { status: 500 }
    )
  }
}
