import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const withCounts = searchParams.get('withCounts') === 'true'

    const rooms = await prisma.chatRoom.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { messages: true }
        },
        owner: {
          select: { id: true, name: true, username: true }
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
          take: withCounts ? 100 : 5  // Get all for count, or just 5 for preview
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    interface PresenceUser {
      userId: string
      lastSeen: Date
      user: { id: string; name: string | null; image: string | null }
    }

    interface RoomType {
      id: string
      slug: string
      nameEn: string
      nameTr: string
      descEn: string | null
      descTr: string | null
      icon: string
      ownerId: string | null
      owner: { id: string; name: string | null; username: string | null } | null
      _count: { messages: number }
      presences: PresenceUser[]
    }

    const roomsWithCounts = rooms.map((room: RoomType) => ({
      id: room.id,
      slug: room.slug,
      nameEn: room.nameEn,
      nameTr: room.nameTr,
      descEn: room.descEn,
      descTr: room.descTr,
      icon: room.icon,
      ownerId: room.ownerId,
      owner: room.owner,
      messageCount: room._count.messages,
      onlineCount: room.presences.length,
      userCount: room.presences.length,  // Alias for the popup
      recentUsers: room.presences.slice(0, 5).map((p: PresenceUser) => ({
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
