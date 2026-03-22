import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const comments = await prisma.videoStreamComment.findMany({
      where: { streamId: params.streamId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: {
            name: true,
            image: true,
            role: true,
            membership: true,
          }
        }
      }
    })

    // Apply nickname/isHidden logic to each comment
    const processedComments = comments.map((comment: any) => {
      const displayName = comment.isHidden ? (comment.nickname || 'Anonim') : (comment.nickname || comment.user.name)
      return {
        ...comment,
        user: {
          ...comment.user,
          name: displayName,
          image: comment.isHidden ? null : comment.user.image
        }
      }
    })

    return NextResponse.json(processedComments)
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json([], { status: 500 })
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

    const { content, nickname, isHidden } = await request.json()

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 })
    }

    const comment = await prisma.videoStreamComment.create({
      data: {
        streamId: params.streamId,
        userId: session.user.id,
        content: content.trim(),
        nickname: nickname || null,
        isHidden: isHidden || false
      },
      include: {
        user: {
          select: {
            name: true,
            image: true,
            role: true,
            membership: true,
          }
        }
      }
    })

    // Return comment with display name (nickname if set, otherwise real name)
    const displayName = comment.isHidden ? (comment.nickname || 'Anonim') : (comment.nickname || comment.user.name)
    return NextResponse.json({
      ...comment,
      user: {
        ...comment.user,
        name: displayName,
        image: comment.isHidden ? null : comment.user.image
      }
    })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}