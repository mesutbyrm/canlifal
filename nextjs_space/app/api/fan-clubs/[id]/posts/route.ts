export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { guardRateLimit } from '@/lib/rate-limit-guard'

/**
 * GET  /api/fan-clubs/:id/posts — kulüp gönderileri
 * POST /api/fan-clubs/:id/posts — yeni gönderi (üye olmalı)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await authenticateRequest(req).catch(() => null)
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 50)
    const cursor = searchParams.get('cursor') || undefined

    const posts = await prisma.fanClubPost.findMany({
      where: { fanClubId: id },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
        _count: { select: { likes: true } },
        ...(authUser
          ? { likes: { where: { userId: authUser.id }, select: { id: true }, take: 1 } }
          : {}),
      },
    })

    const hasMore = posts.length > limit
    const items = hasMore ? posts.slice(0, limit) : posts
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null

    return NextResponse.json({
      success: true,
      data: {
        posts: items.map((p: any) => ({
          id: p.id,
          content: p.content,
          image: p.image,
          likeCount: p._count?.likes ?? 0,
          isLiked: authUser ? (p.likes?.length ?? 0) > 0 : false,
          isPinned: p.isPinned,
          user: p.user,
          createdAt: p.createdAt,
        })),
        nextCursor,
        hasMore,
      },
    })
  } catch (error: any) {
    console.error('[fan-clubs] posts list error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Gönderiler alınamadı' } },
      { status: 500 }
    )
  }
}

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

    const rateLimited = await guardRateLimit(req, 'content_create', { userId: authUser.id })
    if (rateLimited) return rateLimited

    const { id } = await params

    // Üyelik kontrolü
    const member = await prisma.fanClubMember.findUnique({
      where: { fanClubId_userId: { fanClubId: id, userId: authUser.id } },
    })
    if (!member) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_MEMBER', message: 'Önce fan kulübüne katılmanız gerekiyor' } },
        { status: 403 }
      )
    }

    const body = await req.json()
    const content = (body.content || '').trim()
    if (!content || content.length > 1000) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION', message: 'İçerik 1-1000 karakter olmalıdır' } },
        { status: 400 }
      )
    }

    const post = await prisma.fanClubPost.create({
      data: {
        fanClubId: id,
        userId: authUser.id,
        content,
        image: body.image || null,
      },
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: post.id,
        content: post.content,
        image: post.image,
        likeCount: 0,
        isLiked: false,
        isPinned: false,
        user: (post as any).user,
        createdAt: post.createdAt,
      },
    })
  } catch (error: any) {
    console.error('[fan-clubs] post create error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Gönderi oluşturulamadı' } },
      { status: 500 }
    )
  }
}
