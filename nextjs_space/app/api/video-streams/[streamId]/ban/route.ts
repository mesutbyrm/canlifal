import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

// GET - Get banned users for a stream
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const bans = await prisma.streamBan.findMany({
      where: { streamId: params.streamId }
    })

    const userIds = bans.map((b: any) => b.bannedUserId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true }
    })

    const result = bans.map((b: any) => {
      const user = users.find((u: any) => u.id === b.bannedUserId)
      return { ...b, user }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching bans:', error)
    return NextResponse.json([], { status: 500 })
  }
}

// POST - Ban a user from stream
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // Check if user is the broadcaster
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId }
    })

    if (!stream || stream.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { userId, reason } = await request.json()

    // Can't ban yourself
    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot ban yourself' }, { status: 400 })
    }

    const ban = await prisma.streamBan.upsert({
      where: { streamId_bannedUserId: { streamId: params.streamId, bannedUserId: userId } },
      create: { streamId: params.streamId, bannedUserId: userId, reason },
      update: { reason, bannedAt: new Date() }
    })

    // Remove from co-broadcasters if they were one
    await prisma.streamCoBroadcaster.updateMany({
      where: { streamId: params.streamId, userId },
      data: { status: 'ended', leftAt: new Date() }
    })

    return NextResponse.json(ban)
  } catch (error) {
    console.error('Error banning user:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE - Unban a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Check if user is the broadcaster
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId }
    })

    if (!stream || stream.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    await prisma.streamBan.delete({
      where: { streamId_bannedUserId: { streamId: params.streamId, bannedUserId: userId } }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unbanning user:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
