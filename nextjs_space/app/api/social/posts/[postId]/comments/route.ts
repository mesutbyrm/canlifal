import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { createNotificationWithPush } from '@/lib/notify'
import { guardRateLimit } from '@/lib/rate-limit-guard'

export const dynamic = 'force-dynamic'

// GET - Get comments for a post
export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const comments = await prisma.socialComment.findMany({
      where: { postId: params.postId },
      include: {
        user: {
          select: { id: true, name: true, image: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Comments fetch error:', error)
    return NextResponse.json({ error: 'Yorumlar alınamadı' }, { status: 500 })
  }
}

// POST - Add comment
export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // Rate limit: yorum
    const rateLimited = await guardRateLimit(request, 'comment', { userId: authUser.id })
    if (rateLimited) return rateLimited

    const { content } = await request.json()

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'Comment too long (max 500 chars)' }, { status: 400 })
    }

    // Check if post exists
    const post = await prisma.socialPost.findUnique({
      where: { id: params.postId }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const comment = await prisma.socialComment.create({
      data: {
        postId: params.postId,
        userId: authUser.id,
        content: content.trim()
      },
      include: {
        user: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    // Create notification + push for post owner (if not self-comment)
    if (post.userId !== authUser.id) {
      createNotificationWithPush({
        userId: post.userId,
        type: 'comment',
        message: 'gönderinize yorum yaptı',
        postId: params.postId,
        fromUserId: authUser.id,
        fromUserName: authUser.name || 'Birisi'
      }).catch((err: any) => console.error('Notification error:', err))
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Comment create error:', error)
    return NextResponse.json({ error: 'Yorum eklenemedi' }, { status: 500 })
  }
}

// DELETE - Delete own comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('commentId')

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID required' }, { status: 400 })
    }

    const comment = await prisma.socialComment.findUnique({
      where: { id: commentId }
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Only owner or admin can delete
    if (comment.userId !== authUser.id && authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }

    await prisma.socialComment.delete({
      where: { id: commentId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Comment delete error:', error)
    return NextResponse.json({ error: 'Yorum silinemedi' }, { status: 500 })
  }
}
