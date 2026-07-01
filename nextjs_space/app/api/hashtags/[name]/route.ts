export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { mapVideo, safeInt } from '@/lib/short-videos'

/**
 * GET /api/hashtags/:name
 * Hashtag sayfası — etiket bilgisi + videolar (cursor pagination).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: rawName } = await params
    const name = decodeURIComponent(rawName).replace(/^#/, '').toLocaleLowerCase('tr-TR')
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '18') || 18, 30)
    const cursor = searchParams.get('cursor') || undefined

    const authUser = await authenticateRequest(req).catch(() => null)

    const hashtag = await prisma.hashtag.findUnique({
      where: { name },
      select: { id: true, name: true, videosCount: true },
    })
    if (!hashtag) {
      return NextResponse.json({
        success: true,
        data: { hashtag: { name, tag: `#${name}`, videosCount: 0 }, videos: [], nextCursor: null, hasMore: false },
      })
    }

    const links = await prisma.shortVideoHashtag.findMany({
      where: { hashtagId: hashtag.id },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        video: {
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
        },
      },
    })

    const hasMore = links.length > limit
    const items = hasMore ? links.slice(0, limit) : links
    const nextCursor = hasMore ? items[items.length - 1]?.id : null

    const videos = items
      .map((l: any) => l.video)
      .filter((v: any) => v && (v.visibility === 'everyone' || (authUser && v.userId === authUser.id)))
      .map((v: any) => mapVideo(v, authUser?.id))

    return NextResponse.json({
      success: true,
      data: {
        hashtag: { id: hashtag.id, name: hashtag.name, tag: `#${hashtag.name}`, videosCount: safeInt(hashtag.videosCount) },
        videos,
        nextCursor,
        hasMore,
      },
    })
  } catch (error: any) {
    console.error('[hashtags] feed error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Hashtag videoları alınamadı' } },
      { status: 500 }
    )
  }
}
