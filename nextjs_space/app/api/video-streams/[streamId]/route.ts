import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { emitStreamEvent } from '@/lib/stream-events'
import { endPksForSide } from '@/lib/pk-state'
import { closeGuestStateForStream } from '@/lib/live-guest'
import { closeGiftBoxesFor } from '@/lib/gift-box'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      }
    })

    if (!stream) {
      return NextResponse.json({ error: 'Yayın bulunamadı' }, { status: 404 })
    }

    // Count active viewers (those who haven't left)
    const activeViewerCount = await prisma.videoStreamViewer.count({
      where: {
        streamId: params.streamId,
        leftAt: null
      }
    })

    return NextResponse.json({
      ...stream,
      streamId: stream.id,
      isLive: stream.status === 'live',
      viewerCount: activeViewerCount,
      viewers: activeViewerCount,
      watching: activeViewerCount,
      likeCount: stream.likeCount,
      commentCount: stream._count.comments,
      broadcastImage: stream.broadcastImage,
      isImageMode: stream.isImageMode,
      backgroundUrl: stream.backgroundUrl,
      thumbnailUrl: stream.thumbnailUrl || stream.broadcastImage || null,
      coverUrl: stream.thumbnailUrl || stream.broadcastImage || null,
      broadcasterId: stream.userId,
      hostUserId: stream.userId,
      streamerName: stream.user?.name || 'Anonim',
    })
  } catch (error) {
    console.error('Error fetching stream:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    // Dual auth
    const mobileUser = await authenticateRequest(request)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { status, title, description, broadcastImage, isImageMode, backgroundUrl } = await request.json()

    // Verify ownership (or admin)
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId }
    })

    const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    const isAdmin = userRecord?.role === 'admin' || userRecord?.role === 'yonetici'

    if (!stream || (stream.userId !== userId && !isAdmin)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    const updated = await prisma.videoStream.update({
      where: { id: params.streamId },
      data: {
        ...(status && { status, endedAt: status === 'ended' ? new Date() : undefined }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(broadcastImage !== undefined && { broadcastImage }),
        ...(isImageMode !== undefined && { isImageMode }),
        ...(backgroundUrl !== undefined && { backgroundUrl })
      }
    })

    // If stream ended, emit event + clear viewers
    if (status === 'ended') {
      emitStreamEvent(params.streamId, 'streamEnded', {
        type: 'streamEnded',
        event: 'STREAM_ENDED',
        streamId: params.streamId,
      })
      await prisma.videoStreamViewer.updateMany({
        where: { streamId: params.streamId, leftAt: null },
        data: { leftAt: new Date() }
      })
      // Yayın bittiğinde bu yayına bağlı bekleyen/aktif PK'ları da kapat
      await endPksForSide([params.streamId], 'LIVE_ENDED')
      // Misafirlik durumunu da güvenle kapat (aktif misafirler + bekleyen talepler)
      await closeGuestStateForStream(params.streamId, 'LIVE_ENDED')
      await closeGiftBoxesFor({ streamId: params.streamId }).catch(() => {})
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating stream:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
