import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

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
    return NextResponse.json({ error: 'Gönderi alınamadı' }, { status: 500 })
  }
}

// DELETE - Delete own post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const post = await prisma.socialPost.findUnique({
      where: { id: params.postId }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Only owner or admin can delete
    if (post.userId !== authUser.id && authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }

    await prisma.socialPost.delete({
      where: { id: params.postId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Social post delete error:', error)
    return NextResponse.json({ error: 'Gönderi silinemedi' }, { status: 500 })
  }
}
