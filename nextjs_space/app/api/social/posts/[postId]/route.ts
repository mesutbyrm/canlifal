import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Get single post with comments
export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const post = await prisma.socialPost.findUnique({
      where: { id: params.postId },
      include: {
        user: {
          select: { id: true, name: true, image: true, role: true, membership: true }
        },
        fortune: {
          select: { viewCount: true }
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, image: true, role: true, membership: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        likes: {
          select: { userId: true }
        },
        _count: {
          select: { comments: true, likes: true }
        }
      }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Flatten viewCount for easier access
    const postWithViewCount = {
      ...post,
      viewCount: post.fortune?.viewCount || 0
    }

    return NextResponse.json(postWithViewCount)
  } catch (error) {
    console.error('Social post fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
  }
}

// DELETE - Delete own post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const post = await prisma.socialPost.findUnique({
      where: { id: params.postId }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Only owner or admin can delete
    if (post.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.socialPost.delete({
      where: { id: params.postId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Social post delete error:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
