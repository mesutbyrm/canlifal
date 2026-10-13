export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { mapVideo } from '@/lib/short-videos'

/**
 * GET /api/short-videos/:id/duets
 * Auth: opsiyonel
 * Bu videoya yapılmış düet/remix videolarını listeler.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 30)
    const cursor = searchParams.get('cursor') || undefined

    const authUser = await authenticateRequest(req).catch(() => null)

    const videos = await prisma.shortVideo.findMany({
      where: { duetOfId: id, visibility: 'everyone' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, name: true, image: true } },
        music: true,
        hashtags: { include: { hashtag: { select: { name: true } } } },
        ...(authUser
          ? {
              likes: { where: { userId: authUser.id }, select: { id: true }, take: 1 },
              saves: { where: { userId: authUser.id }, select: { id: true }, take: 1 },
            }
          : {}),
      },
    })

    const hasMore = videos.length > limit
    const items = hasMore ? videos.slice(0, limit) : videos
    const nextCursor = hasMore ? items[items.length - 1]?.id : null

    return NextResponse.json({
      success: true,
      data: {
        videos: items.map((v: any) => mapVideo(v, authUser?.id)),
        nextCursor,
        hasMore,
      },
    })
  } catch (error: any) {
    console.error('[short-videos] Duets list error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Düetler alınamadı' } },
      { status: 500 }
    )
  }
}
