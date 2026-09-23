import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { createNotificationWithPush } from '@/lib/notify'

export const dynamic = 'force-dynamic'

// POST - Toggle like (like/unlike)
export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // Check if post exists
    const post = await prisma.socialPost.findUnique({
      where: { id: params.postId }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check if already liked
    const existingLike = await prisma.socialLike.findUnique({
      where: {
        postId_userId: {
          postId: params.postId,
          userId: authUser.id
        }
      }
    })

    if (existingLike) {
      // Unlike
      await prisma.socialLike.delete({
        where: { id: existingLike.id }
      })

      const likeCount = await prisma.socialLike.count({
        where: { postId: params.postId }
      })

      return NextResponse.json({ liked: false, likeCount })
    } else {
      // Like
      await prisma.socialLike.create({
        data: {
          postId: params.postId,
          userId: authUser.id
        }
      })

      const likeCount = await prisma.socialLike.count({
        where: { postId: params.postId }
      })

      // Create notification + push for post owner (if not self-like)
      if (post.userId !== authUser.id) {
        createNotificationWithPush({
          userId: post.userId,
          type: 'like',
          message: 'gönderinizi beğendi',
          postId: params.postId,
          fromUserId: authUser.id,
          fromUserName: authUser.name || 'Birisi'
        }).catch((err: any) => console.error('Notification error:', err))
      }

      return NextResponse.json({ liked: true, likeCount })
    }
  } catch (error) {
    console.error('Like toggle error:', error)
    return NextResponse.json({ error: 'Beğeni işlemi başarısız' }, { status: 500 })
  }
}
