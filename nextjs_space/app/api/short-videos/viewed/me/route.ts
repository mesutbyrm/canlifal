export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { mapVideo, safeFloat } from '@/lib/short-videos'

/**
 * GET /api/short-videos/viewed/me
 * Auth: ZORUNLU
 * Query: ?limit=&cursor=
 * Kullanıcının izlediği kısa videolar (en son izlenen önce).
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 50)
    const cursor = searchParams.get('cursor') || undefined

    const views = await prisma.shortVideoView.findMany({
      where: { userId: authUser.id },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        video: {
          include: {
            user: { select: { id: true, username: true, name: true, image: true } },
            music: true,
            hashtags: { include: { hashtag: { select: { name: true } } } },
            likes: { where: { userId: authUser.id }, select: { id: true }, take: 1 },
            saves: { where: { userId: authUser.id }, select: { id: true }, take: 1 },
          },
        },
      },
    })

    const hasMore = views.length > limit
    const page = hasMore ? views.slice(0, limit) : views
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null

    const videos = page
      .filter((v: any) => v.video)
      .map((v: any) => ({
        ...mapVideo(v.video, authUser.id),
        watchedSec: safeFloat(v.watchedSec),
        viewedAt: v.createdAt,
      }))

    return NextResponse.json({
      success: true,
      data: { videos, items: videos, nextCursor, hasMore },
    })
  } catch (error: any) {
    console.error('[short-videos] viewed/me error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'İzleme geçmişi alınamadı' } },
      { status: 500 }
    )
  }
}
