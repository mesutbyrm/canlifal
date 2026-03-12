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
              gte: new Date(Date.now() - 60000)
            }
          },
          select: {
            userId: true,
            lastSeen: true,
            user: {
              select: { id: true, name: true, image: true }
            }
          },
          orderBy: { lastSeen: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    interface PresenceUser {
      userId: string
      lastSeen: Date
      user: { id: string; name: string | null; image: string | null }
    }

    const roomsWithCounts = rooms.map((room: { id: string; slug: string; nameEn: string; nameTr: string; descEn: string | null; descTr: string | null; icon: string; _count: { messages: number }; presences: PresenceUser[] }) => ({
      id: room.id,
      slug: room.slug,
      nameEn: room.nameEn,
      nameTr: room.nameTr,
      descEn: room.descEn,
      descTr: room.descTr,
      icon: room.icon,
      messageCount: room._count.messages,
      onlineCount: room.presences.length,
      recentUsers: room.presences.map((p: PresenceUser) => ({
        id: p.user.id,
        name: p.user.name,
        image: p.user.image
      }))
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
