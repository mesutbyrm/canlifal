export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

const MAX_GUESTS = 4

/**
 * Flutter-friendly invite sub-route.
 * POST /api/video-streams/{streamId}/co-broadcast/invite
 * Delegates to the co-broadcast invite logic.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId }
    })

    if (!stream) return NextResponse.json({ error: 'Yayın bulunamadı' }, { status: 404 })
    if (stream.userId !== session.user.id) {
      return NextResponse.json({ error: 'Sadece yayıncı davet gönderebilir' }, { status: 403 })
    }

    const body = await request.json()
    const { inviteeId } = body

    if (!inviteeId) {
      return NextResponse.json({ error: 'inviteeId gerekli' }, { status: 400 })
    }

    // Check current active co-broadcasters count
    const activeCount = await prisma.streamCoBroadcaster.count({
      where: { streamId: params.streamId, status: 'active' }
    })

    if (activeCount >= MAX_GUESTS) {
      return NextResponse.json({
        error: 'Maksimum konuk sayısına ulaşıldı',
        maxGuests: MAX_GUESTS,
        currentCount: activeCount
      }, { status: 400 })
    }

    // Check if invitee already has a pending/active co-broadcast
    const existing = await prisma.streamCoBroadcaster.findFirst({
      where: {
        streamId: params.streamId,
        userId: inviteeId,
        status: { in: ['pending', 'active'] }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Bu kullanıcıya zaten davet gönderilmiş', existing }, { status: 400 })
    }

    const invite = await prisma.streamCoBroadcaster.create({
      data: {
        streamId: params.streamId,
        userId: inviteeId,
        status: 'invited'
      }
    })

    return NextResponse.json(invite, { status: 201 })
  } catch (error) {
    console.error('Co-broadcast invite error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
