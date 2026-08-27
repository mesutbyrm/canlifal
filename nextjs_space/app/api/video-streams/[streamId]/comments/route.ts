import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { emitStreamEvent } from '@/lib/stream-events'
import { guardRateLimit } from '@/lib/rate-limit-guard'

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
    // Dual auth: mobile JWT or web session
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // Rate limit: yayın yorumu
    const rateLimited = await guardRateLimit(request, 'comment', { userId: authUser.id })
    if (rateLimited) return rateLimited

    const { content, nickname, isHidden } = await request.json()

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 })
    }

    const comment = await prisma.videoStreamComment.create({
      data: {
        streamId: params.streamId,
        userId: authUser.id,
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
    const commentPayload = {
      ...comment,
      user: {
        ...comment.user,
        id: authUser.id,
        name: displayName,
        image: comment.isHidden ? null : comment.user.image
      }
    }

    // Emit streamMessage event for SSE listeners
    emitStreamEvent(params.streamId, 'streamMessage', {
      type: 'streamMessage',
      streamId: params.streamId,
      message: commentPayload,
    })

    return NextResponse.json(commentPayload)
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}