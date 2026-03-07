import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ isLiked: false })
    }

    const like = await prisma.videoStreamLike.findUnique({
      where: {
        streamId_userId: {
          streamId: params.streamId,
          userId: session.user.id
        }
      }
    })

    return NextResponse.json({ isLiked: !!like })
  } catch (error) {
    console.error('Error checking like:', error)
    return NextResponse.json({ isLiked: false }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if already liked
    const existing = await prisma.videoStreamLike.findUnique({
      where: {
        streamId_userId: {
          streamId: params.streamId,
          userId: session.user.id
        }
      }
    })

    if (existing) {
      // Unlike
      await prisma.videoStreamLike.delete({
        where: { id: existing.id }
      })

      const count = await prisma.videoStreamLike.count({
        where: { streamId: params.streamId }
      })

      await prisma.videoStream.update({
        where: { id: params.streamId },
        data: { likeCount: count }
      })

      return NextResponse.json({ isLiked: false, likeCount: count })
    } else {
      // Like
      await prisma.videoStreamLike.create({
        data: {
          streamId: params.streamId,
          userId: session.user.id
        }
      })

      const count = await prisma.videoStreamLike.count({
        where: { streamId: params.streamId }
      })

      await prisma.videoStream.update({
        where: { id: params.streamId },
        data: { likeCount: count }
      })

      return NextResponse.json({ isLiked: true, likeCount: count })
    }
  } catch (error) {
    console.error('Error toggling like:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
