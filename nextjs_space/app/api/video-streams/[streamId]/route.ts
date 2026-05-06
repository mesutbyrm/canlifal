import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

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
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 })
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
      viewerCount: activeViewerCount,
      likeCount: stream.likeCount,  // Use direct field, not _count.likes
      commentCount: stream._count.comments,
      broadcastImage: stream.broadcastImage,
      isImageMode: stream.isImageMode,
      backgroundUrl: stream.backgroundUrl
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { status, title, description, broadcastImage, isImageMode, backgroundUrl } = await request.json()

    // Verify ownership
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId }
    })

    if (!stream || stream.userId !== session.user.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 403 })
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating stream:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
