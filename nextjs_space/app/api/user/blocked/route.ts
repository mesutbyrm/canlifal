import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Get all users blocked by the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all chat bans where the current user is the banner
    const chatBans = await prisma.chatBan.findMany({
      where: { bannedBy: session.user.id },
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
        room: { select: { id: true, nameTr: true, nameEn: true, slug: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get all stream bans where the current user is the banner (via their stream)
    const userStreams = await prisma.videoStream.findMany({
      where: { userId: session.user.id },
      select: { id: true, title: true }
    })
    const streamIds = userStreams.map(s => s.id)
    const streamMap = new Map(userStreams.map(s => [s.id, s.title]))

    const streamBans = await prisma.streamBan.findMany({
      where: { streamId: { in: streamIds } }
    })

    // Get user details for stream bans
    const bannedUserIds = streamBans.map(b => b.bannedUserId)
    const bannedUsers = await prisma.user.findMany({
      where: { id: { in: bannedUserIds } },
      select: { id: true, name: true, username: true, image: true }
    })

    const streamBansWithUsers = streamBans.map(ban => ({
      ...ban,
      streamTitle: streamMap.get(ban.streamId) || 'Yayın',
      user: bannedUsers.find(u => u.id === ban.bannedUserId)
    }))

    return NextResponse.json({
      chatBans: chatBans.map(ban => ({
        id: ban.id,
        roomId: ban.roomId,
        roomName: ban.room.nameTr,
        roomSlug: ban.room.slug,
        userId: ban.userId,
        userName: ban.user.name,
        userUsername: ban.user.username,
        userImage: ban.user.image,
        reason: ban.reason,
        createdAt: ban.createdAt,
        expiresAt: ban.expiresAt
      })),
      streamBans: streamBansWithUsers.map(ban => ({
        id: ban.id,
        streamId: ban.streamId,
        streamTitle: ban.streamTitle,
        userId: ban.bannedUserId,
        userName: ban.user?.name,
        userUsername: ban.user?.username,
        userImage: ban.user?.image,
        reason: ban.reason,
        bannedAt: ban.bannedAt
      }))
    })
  } catch (error) {
    console.error('Error fetching blocked users:', error)
    return NextResponse.json({ error: 'Failed to fetch blocked users' }, { status: 500 })
  }
}

// DELETE - Unblock a user
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, id } = await request.json()

    if (type === 'chat') {
      // Verify the ban was created by the current user
      const ban = await prisma.chatBan.findUnique({
        where: { id }
      })

      if (!ban) {
        return NextResponse.json({ error: 'Ban not found' }, { status: 404 })
      }

      if (ban.bannedBy !== session.user.id) {
        return NextResponse.json({ error: 'You can only unblock users you blocked' }, { status: 403 })
      }

      await prisma.chatBan.delete({
        where: { id }
      })

      return NextResponse.json({ success: true, message: 'User unblocked from chat room' })
    } else if (type === 'stream') {
      // Verify the stream belongs to current user
      const ban = await prisma.streamBan.findUnique({
        where: { id }
      })

      if (!ban) {
        return NextResponse.json({ error: 'Ban not found' }, { status: 404 })
      }

      // Get the stream to verify ownership
      const stream = await prisma.videoStream.findUnique({
        where: { id: ban.streamId },
        select: { userId: true }
      })

      if (!stream || stream.userId !== session.user.id) {
        return NextResponse.json({ error: 'You can only unblock users from your own streams' }, { status: 403 })
      }

      await prisma.streamBan.delete({
        where: { id }
      })

      return NextResponse.json({ success: true, message: 'User unblocked from stream' })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Error unblocking user:', error)
    return NextResponse.json({ error: 'Failed to unblock user' }, { status: 500 })
  }
}
