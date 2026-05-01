import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

const MAX_GUESTS = 4 // Maximum simultaneous co-broadcasters allowed

// GET - Get co-broadcasters for a stream
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const coBroadcasters = await prisma.streamCoBroadcaster.findMany({
      where: { 
        streamId: params.streamId,
        status: { in: ['invited', 'active', 'requested'] }
      },
      orderBy: { invitedAt: 'desc' }
    })

    // Get user info for each co-broadcaster
    const userIds = coBroadcasters.map((cb: any) => cb.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true }
    })

    const result = coBroadcasters.map((cb: any) => {
      const user = users.find((u: any) => u.id === cb.userId)
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
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { userId, action } = await request.json()

    // Get stream info
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId }
    })

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 })
    }

    // Viewer requesting to co-broadcast (doesn't require broadcaster permission)
    if (action === 'request') {
      // Check if already requested or active
      const existing = await prisma.streamCoBroadcaster.findUnique({
        where: { streamId_userId: { streamId: params.streamId, userId: session.user.id } }
      })

      if (existing && ['active', 'requested'].includes(existing.status)) {
        return NextResponse.json({ error: 'Already requested or co-broadcasting' }, { status: 400 })
      }

      const request = await prisma.streamCoBroadcaster.upsert({
        where: { streamId_userId: { streamId: params.streamId, userId: session.user.id } },
        create: { streamId: params.streamId, userId: session.user.id, status: 'requested' },
        update: { status: 'requested', isMuted: false, isVideoOff: false, leftAt: null }
      })

      // Notify broadcaster
      await prisma.notification.create({
        data: {
          userId: stream.userId,
          type: 'co_broadcast_request',
          title: 'Ortak Yayın Talebi',
          message: `${session.user.name || 'Kullanıcı'} sizinle ortak yayın yapmak istiyor!`,
          data: JSON.stringify({ 
            streamId: params.streamId, 
            requesterId: session.user.id,
            requesterName: session.user.name,
            requesterImage: session.user.image
          })
        }
      })

      return NextResponse.json(request)
    }

    // All other actions require broadcaster permission
    if (stream.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (action === 'invite') {
      // Check current active co-broadcasters count
      const activeCount = await prisma.streamCoBroadcaster.count({
        where: { streamId: params.streamId, status: 'active' }
      })
      
      if (activeCount >= MAX_GUESTS) {
        return NextResponse.json({ 
          error: 'Maximum guests reached', 
          maxGuests: MAX_GUESTS,
          currentCount: activeCount
        }, { status: 400 })
      }

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

    // Host approves a viewer's join request
    if (action === 'approve') {
      const activeCount = await prisma.streamCoBroadcaster.count({
        where: { streamId: params.streamId, status: 'active' }
      })
      if (activeCount >= MAX_GUESTS) {
        return NextResponse.json({ error: 'Maximum guests reached', maxGuests: MAX_GUESTS }, { status: 400 })
      }
      const coBroadcaster = await prisma.streamCoBroadcaster.update({
        where: { streamId_userId: { streamId: params.streamId, userId } },
        data: { status: 'active', joinedAt: new Date(), isMuted: false, isVideoOff: false }
      })
      // Notify the user that their request was approved
      await prisma.notification.create({
        data: {
          userId,
          type: 'co_broadcast_accepted',
          title: 'Yayına Katılma Onaylandı',
          message: `Canlı yayına katılma isteğiniz onaylandı! Şimdi katılabilirsiniz.`,
          data: JSON.stringify({ streamId: params.streamId, action: 'approved' })
        }
      })
      return NextResponse.json(coBroadcaster)
    }

    if (action === 'reject_request') {
      await prisma.streamCoBroadcaster.update({
        where: { streamId_userId: { streamId: params.streamId, userId } },
        data: { status: 'ended', leftAt: new Date() }
      })
      return NextResponse.json({ success: true })
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

    if (action === 'video_off') {
      const coBroadcaster = await prisma.streamCoBroadcaster.update({
        where: { streamId_userId: { streamId: params.streamId, userId } },
        data: { isVideoOff: true }
      })
      return NextResponse.json(coBroadcaster)
    }

    if (action === 'video_on') {
      const coBroadcaster = await prisma.streamCoBroadcaster.update({
        where: { streamId_userId: { streamId: params.streamId, userId } },
        data: { isVideoOff: false }
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

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
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
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { action } = await request.json()

    if (action === 'accept') {
      // Check current active co-broadcasters count before accepting
      const activeCount = await prisma.streamCoBroadcaster.count({
        where: { streamId: params.streamId, status: 'active' }
      })
      
      if (activeCount >= MAX_GUESTS) {
        return NextResponse.json({ 
          error: 'Maximum guests reached', 
          message: 'Sorry, the stream already has the maximum number of guests.',
          maxGuests: MAX_GUESTS
        }, { status: 400 })
      }

      const coBroadcaster = await prisma.streamCoBroadcaster.update({
        where: { streamId_userId: { streamId: params.streamId, userId: session.user.id } },
        data: { status: 'active', joinedAt: new Date() }
      })
      
      // Notify broadcaster that user accepted
      const stream = await prisma.videoStream.findUnique({
        where: { id: params.streamId },
        select: { userId: true }
      })
      
      if (stream) {
        await prisma.notification.create({
          data: {
            userId: stream.userId,
            type: 'co_broadcast_accepted',
            title: 'Ortak Yayın Kabul Edildi',
            message: `${session.user.name || 'Kullanıcı'} ortak yayın davetinizi kabul etti!`,
            data: JSON.stringify({ 
              streamId: params.streamId, 
              userName: session.user.name,
              userImage: session.user.image
            })
          }
        })
      }
      
      return NextResponse.json(coBroadcaster)
    }

    if (action === 'reject' || action === 'leave') {
      await prisma.streamCoBroadcaster.update({
        where: { streamId_userId: { streamId: params.streamId, userId: session.user.id } },
        data: { status: 'ended', leftAt: new Date() }
      })
      
      // Notify broadcaster that user rejected
      const stream = await prisma.videoStream.findUnique({
        where: { id: params.streamId },
        select: { userId: true }
      })
      
      if (stream) {
        await prisma.notification.create({
          data: {
            userId: stream.userId,
            type: 'co_broadcast_rejected',
            title: 'Ortak Yayın Reddedildi',
            message: `${session.user.name || 'Kullanıcı'} ortak yayın davetinizi reddetti.`,
            data: JSON.stringify({ 
              streamId: params.streamId, 
              userName: session.user.name,
              userImage: session.user.image,
              action: action
            })
          }
        })
      }
      
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
  } catch (error) {
    console.error('Error updating co-broadcast status:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
