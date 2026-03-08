import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

// GET - Get co-broadcasters for a stream
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const coBroadcasters = await prisma.streamCoBroadcaster.findMany({
      where: { 
        streamId: params.streamId,
        status: { in: ['invited', 'active'] }
      },
      orderBy: { invitedAt: 'desc' }
    })

    // Get user info for each co-broadcaster
    const userIds = coBroadcasters.map(cb => cb.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true }
    })

    const result = coBroadcasters.map(cb => {
      const user = users.find(u => u.id === cb.userId)
      return {
        ...cb,
        user: user || { id: cb.userId, name: 'Unknown', image: null }
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching co-broadcasters:', error)
    return NextResponse.json([], { status: 500 })
  }
}

// POST - Invite a user to co-broadcast
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is the broadcaster
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId }
    })

    if (!stream || stream.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { userId, action } = await request.json()

    if (action === 'invite') {
      // Check if already invited
      const existing = await prisma.streamCoBroadcaster.findUnique({
        where: { streamId_userId: { streamId: params.streamId, userId } }
      })

      if (existing && existing.status === 'active') {
        return NextResponse.json({ error: 'Already co-broadcasting' }, { status: 400 })
      }

      const coBroadcaster = await prisma.streamCoBroadcaster.upsert({
        where: { streamId_userId: { streamId: params.streamId, userId } },
        create: { streamId: params.streamId, userId, status: 'invited' },
        update: { status: 'invited', isMuted: false, isVideoOff: false, leftAt: null }
      })

      return NextResponse.json(coBroadcaster)
    }

    if (action === 'mute') {
      const coBroadcaster = await prisma.streamCoBroadcaster.update({
        where: { streamId_userId: { streamId: params.streamId, userId } },
        data: { isMuted: true }
      })
      return NextResponse.json(coBroadcaster)
    }

    if (action === 'unmute') {
      const coBroadcaster = await prisma.streamCoBroadcaster.update({
        where: { streamId_userId: { streamId: params.streamId, userId } },
        data: { isMuted: false }
      })
      return NextResponse.json(coBroadcaster)
    }

    if (action === 'remove') {
      await prisma.streamCoBroadcaster.update({
        where: { streamId_userId: { streamId: params.streamId, userId } },
        data: { status: 'ended', leftAt: new Date() }
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error managing co-broadcaster:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH - Accept/reject co-broadcast invitation (for the invited user)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action } = await request.json()

    if (action === 'accept') {
      const coBroadcaster = await prisma.streamCoBroadcaster.update({
        where: { streamId_userId: { streamId: params.streamId, userId: session.user.id } },
        data: { status: 'active', joinedAt: new Date() }
      })
      return NextResponse.json(coBroadcaster)
    }

    if (action === 'reject' || action === 'leave') {
      await prisma.streamCoBroadcaster.update({
        where: { streamId_userId: { streamId: params.streamId, userId: session.user.id } },
        data: { status: 'ended', leftAt: new Date() }
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating co-broadcast status:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
