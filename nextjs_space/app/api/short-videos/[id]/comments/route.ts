export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

/**
 * GET /api/short-videos/:id/comments
 * Auth: opsiyonel
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '30') || 30, 50)

    const comments = await prisma.shortVideoComment.findMany({
      where: { videoId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
          },
        },
      },
    })

    const mapped = comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      author: {
        id: c.user.id,
        userId: c.user.id,
        username: c.user.username || c.user.name || 'user',
        displayName: c.user.name || c.user.username || 'Kullanıcı',
        avatarUrl: c.user.image,
      },
    }))

    return NextResponse.json({
      success: true,
      data: { comments: mapped },
    })
  } catch (error: any) {
    console.error('[short-videos] Comments GET error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Yorumlar alınamadı' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/short-videos/:id/comments
 * Auth: ZORUNLU
 * Body: { content: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const { id: videoId } = await params
    const body = await req.json()
    const content = (body.content || '').trim()

    if (!content || content.length < 1 || content.length > 500) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CONTENT', message: 'Yorum 1-500 karakter olmalıdır' } },
        { status: 400 }
      )
    }

    // Check video exists
    const video = await prisma.shortVideo.findUnique({
      where: { id: videoId },
      select: { id: true },
    })

    if (!video) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Video bulunamadı' } },
        { status: 404 }
      )
    }

    // Create comment and increment count
    const [comment] = await prisma.$transaction([
      prisma.shortVideoComment.create({
        data: {
          videoId,
          userId: authUser.id,
          content,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
            },
          },
        },
      }),
      prisma.shortVideo.update({
        where: { id: videoId },
        data: { commentsCount: { increment: 1 } },
      }),
    ])

    const updatedVideo = await prisma.shortVideo.findUnique({
      where: { id: videoId },
      select: { commentsCount: true },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          comment: {
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt.toISOString(),
            author: {
              id: comment.user.id,
              userId: comment.user.id,
              username: comment.user.username || comment.user.name || 'user',
              displayName: comment.user.name || comment.user.username || 'Kullanıcı',
              avatarUrl: comment.user.image,
            },
          },
          commentsCount: updatedVideo?.commentsCount ?? 0,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[short-videos] Comment POST error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Yorum gönderilemedi' } },
      { status: 500 }
    )
  }
}
