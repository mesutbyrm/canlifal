import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST - Toggle like (like/unlike)
export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
          userId: session.user.id
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
          userId: session.user.id
        }
      })

      const likeCount = await prisma.socialLike.count({
        where: { postId: params.postId }
      })

      return NextResponse.json({ liked: true, likeCount })
    }
  } catch (error) {
    console.error('Like toggle error:', error)
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 })
  }
}
