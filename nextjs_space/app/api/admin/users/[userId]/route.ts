import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'

// GET - Fetch single user details
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        phone: true,
        image: true,
        preferredLanguage: true,
        credits: true,
        role: true,
        membership: true,
        membershipExpiresAt: true,
        createdAt: true,
        birthDate: true,
        birthTime: true,
        zodiacSign: true,
        risingSign: true,
        referralCode: true,
        referralCreditsEarned: true,
        _count: {
          select: {
            fortunes: true,
            liveSessions: true,
            videoStreams: true,
            chatMessages: true,
            socialPosts: true,
          }
        },
        fortuneTellerProfile: {
          select: {
            id: true,
            displayName: true,
            isOnline: true,
            approvedAt: true,
          }
        },
        bannedIn: {
          select: {
            id: true,
            roomId: true,
            reason: true,
            createdAt: true,
          }
        },
        videoStreams: {
          where: { status: 'active' },
          select: { id: true, title: true, viewerCount: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is banned from live streaming
    const streamBan = await prisma.platformSettings.findFirst({
      where: { key: `stream_ban_${params.userId}` }
    })

    return NextResponse.json({
      ...user,
      isStreamBanned: !!streamBan,
      streamBanReason: streamBan?.value || null
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

// PATCH - Update user details
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { 
      action,
      name,
      email,
      username,
      phone,
      image,
      credits,
      role,
      membership,
      membershipExpiresAt,
      newPassword,
      banReason,
      streamBanReason,
    } = body

    // Handle specific actions
    if (action === 'reset_password') {
      const hashedPassword = await bcrypt.hash(newPassword, 12)
      await prisma.user.update({
        where: { id: params.userId },
        data: { password: hashedPassword }
      })
      return NextResponse.json({ success: true, message: 'Password reset successfully' })
    }

    if (action === 'ban_stream') {
      await prisma.platformSettings.upsert({
        where: { key: `stream_ban_${params.userId}` },
        create: {
          key: `stream_ban_${params.userId}`,
          value: streamBanReason || 'Admin tarafından yasaklandı'
        },
        update: {
          value: streamBanReason || 'Admin tarafından yasaklandı'
        }
      })
      // End any active streams
      await prisma.videoStream.updateMany({
        where: { userId: params.userId, status: 'active' },
        data: { status: 'ended', endedAt: new Date() }
      })
      return NextResponse.json({ success: true, message: 'User banned from streaming' })
    }

    if (action === 'unban_stream') {
      await prisma.platformSettings.deleteMany({
        where: { key: `stream_ban_${params.userId}` }
      })
      return NextResponse.json({ success: true, message: 'User unbanned from streaming' })
    }

    if (action === 'start_stream') {
      // Check if user is banned
      const streamBan = await prisma.platformSettings.findFirst({
        where: { key: `stream_ban_${params.userId}` }
      })
      if (streamBan) {
        return NextResponse.json({ error: 'User is banned from streaming' }, { status: 400 })
      }
      // Create a new stream for this user
      const stream = await prisma.videoStream.create({
        data: {
          userId: params.userId,
          title: 'Admin tarafından başlatıldı',
          status: 'active',
        }
      })
      return NextResponse.json({ success: true, streamId: stream.id, message: 'Stream started' })
    }

    if (action === 'end_stream') {
      await prisma.videoStream.updateMany({
        where: { userId: params.userId, status: 'active' },
        data: { status: 'ended', endedAt: new Date() }
      })
      return NextResponse.json({ success: true, message: 'Streams ended' })
    }

    if (action === 'add_credits') {
      const user = await prisma.user.update({
        where: { id: params.userId },
        data: { credits: { increment: credits } },
        select: { credits: true }
      })
      return NextResponse.json({ success: true, newCredits: user.credits })
    }

    if (action === 'remove_credits') {
      const user = await prisma.user.update({
        where: { id: params.userId },
        data: { credits: { decrement: Math.abs(credits) } },
        select: { credits: true }
      })
      return NextResponse.json({ success: true, newCredits: user.credits })
    }

    // General update
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (username !== undefined) updateData.username = username || null
    if (phone !== undefined) updateData.phone = phone || null
    if (image !== undefined) updateData.image = image || null
    if (role !== undefined) updateData.role = role
    if (membership !== undefined) updateData.membership = membership
    if (membershipExpiresAt !== undefined) {
      updateData.membershipExpiresAt = membershipExpiresAt ? new Date(membershipExpiresAt) : null
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        phone: true,
        image: true,
        role: true,
        membership: true,
        credits: true,
      }
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error: any) {
    console.error('Error updating user:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email or username already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Don't allow deleting yourself
    if ((session.user as any).id === params.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Delete user and related data
    await prisma.user.delete({
      where: { id: params.userId }
    })

    return NextResponse.json({ success: true, message: 'User deleted' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
