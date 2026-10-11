export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

/**
 * GET /api/celebrities/:id/posts
 * Auth: opsiyonel
 * Ünlünün gönderileri (sayfalama).
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

    const celeb = await prisma.celebrity.findFirst({
      where: { OR: [{ id }, { slug: id }], isActive: true },
      select: { id: true },
    })
    if (!celeb) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Ünlü bulunamadı' } },
        { status: 404 }
      )
    }

    const posts = await prisma.celebrityPost.findMany({
      where: { celebrityId: celeb.id },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { likes: true, comments: true } },
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
          commentCount: p._count?.comments ?? 0,
          isLiked: authUser ? (p.likes?.length ?? 0) > 0 : false,
          createdAt: p.createdAt,
        })),
        nextCursor,
        hasMore,
      },
    })
  } catch (error: any) {
    console.error('[celebrities] posts error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Gönderiler alınamadı' } },
      { status: 500 }
    )
  }
}
