import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET comments for a post
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const postId = searchParams.get('postId')
    if (!postId) return NextResponse.json({ error: 'postId gerekli' }, { status: 400 })

    const comments = await prisma.blogComment.findMany({
      where: { postId, isApproved: true, parentId: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Fetch replies
    const commentIds = comments.map((c: any) => c.id)
    const replies = commentIds.length > 0 ? await prisma.blogComment.findMany({
      where: { parentId: { in: commentIds }, isApproved: true },
      orderBy: { createdAt: 'asc' },
    }) : []

    const total = await prisma.blogComment.count({ where: { postId, isApproved: true } })

    return NextResponse.json({ comments, replies, total })
  } catch (error) {
    console.error('Comments fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST a new comment
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const body = await req.json()
    const { postId, content, parentId } = body

    if (!postId || !content || content.trim().length < 2) {
      return NextResponse.json({ error: 'Yorum en az 2 karakter olmalı' }, { status: 400 })
    }

    if (content.trim().length > 2000) {
      return NextResponse.json({ error: 'Yorum en fazla 2000 karakter olabilir' }, { status: 400 })
    }

    // Verify post exists
    const post = await prisma.blogPost.findUnique({ where: { id: postId } })
    if (!post) return NextResponse.json({ error: 'Yazı bulunamadı' }, { status: 404 })

    const user = session.user as any

    const comment = await prisma.blogComment.create({
      data: {
        postId,
        userId: user.id,
        userName: user.name || 'Anonim',
        userAvatar: user.image || user.avatar || '',
        content: content.trim(),
        parentId: parentId || null,
      },
    })

    return NextResponse.json({ comment })
  } catch (error) {
    console.error('Comment create error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE a comment (own comment only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const commentId = searchParams.get('id')
    if (!commentId) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })

    const user = session.user as any
    const comment = await prisma.blogComment.findUnique({ where: { id: commentId } })

    if (!comment) return NextResponse.json({ error: 'Yorum bulunamadı' }, { status: 404 })

    // Allow delete if owner or admin
    const isAdmin = (user.role || '').toLowerCase() === 'admin'
    if (comment.userId !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    // Delete replies too
    await prisma.blogComment.deleteMany({ where: { parentId: commentId } })
    await prisma.blogComment.delete({ where: { id: commentId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Comment delete error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
