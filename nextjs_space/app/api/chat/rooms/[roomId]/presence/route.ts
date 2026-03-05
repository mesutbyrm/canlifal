import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET active users in a room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const oneMinuteAgo = new Date(Date.now() - 60000)

    const presences = await prisma.chatPresence.findMany({
      where: {
        roomId,
        lastSeen: { gte: oneMinuteAgo }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    const activeUsers = presences.map(p => ({
      id: p.user.id,
      name: p.user.name,
      lastSeen: p.lastSeen
    }))

    return NextResponse.json(activeUsers)
  } catch (error) {
    console.error('Error fetching presence:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active users' },
      { status: 500 }
    )
  }
}

// POST to update user presence (heartbeat)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { roomId } = await params

    // Update presence
    await prisma.chatPresence.upsert({
      where: {
        roomId_userId: {
          roomId,
          userId: session.user.id
        }
      },
      update: { lastSeen: new Date() },
      create: {
        roomId,
        userId: session.user.id
      }
    })

    // Return updated active users
    const oneMinuteAgo = new Date(Date.now() - 60000)
    const presences = await prisma.chatPresence.findMany({
      where: {
        roomId,
        lastSeen: { gte: oneMinuteAgo }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    const activeUsers = presences.map(p => ({
      id: p.user.id,
      name: p.user.name,
      lastSeen: p.lastSeen
    }))

    return NextResponse.json(activeUsers)
  } catch (error) {
    console.error('Error updating presence:', error)
    return NextResponse.json(
      { error: 'Failed to update presence' },
      { status: 500 }
    )
  }
}
