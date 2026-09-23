export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { mapVideo } from '@/lib/short-videos'

const MAX_DURATION_SEC = 15

/**
 * GET /api/short-videos
 * Feed — cursor-based pagination, auth optional.
 * tab: 'foryou' (default) | 'following'
 * Görünürlük filtrelenir: herkese açık videolar + (giriş yaptıysa) kendi videoları
 * ve takip ettiği kişilerin 'followers' videoları.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10') || 10, 20)
    const cursor = searchParams.get('cursor') || undefined
    const tab = (searchParams.get('tab') || 'foryou').toLowerCase()

    const authUser = await authenticateRequest(req).catch(() => null)

    // Takip edilen kullanıcı id'leri (following tab veya followers görünürlüğü için)
    let followingIds: string[] = []
    if (authUser) {
      const follows = await prisma.follow.findMany({
        where: { followerId: authUser.id },
        select: { followingId: true },
      }).catch(() => [] as any[])
      followingIds = follows.map((f: any) => f.followingId)
    }

    // Görünürlük koşulu
    const visibilityOr: any[] = [{ visibility: 'everyone' }]
    if (authUser) {
      visibilityOr.push({ userId: authUser.id }) // kendi tüm videoları
      if (followingIds.length > 0) {
        visibilityOr.push({ visibility: 'followers', userId: { in: followingIds } })
      }
    }

    const where: any = { AND: [{ OR: visibilityOr }] }

    // Following tab: sadece takip edilenlerin videoları
    if (tab === 'following') {
      if (!authUser || followingIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: { videos: [], nextCursor: null, hasMore: false, maxDurationSec: MAX_DURATION_SEC },
        })
      }
      where.AND.push({ userId: { in: followingIds } })
    }

    const videos = await prisma.shortVideo.findMany({
      where,
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
              views: { where: { userId: authUser.id }, select: { id: true }, take: 1 },
              saves: { where: { userId: authUser.id }, select: { id: true }, take: 1 },
            }
          : {}),
      },
    })

    const hasMore = videos.length > limit
    const items = hasMore ? videos.slice(0, limit) : videos
    const nextCursor = hasMore ? items[items.length - 1]?.id : null

    const mapped = items.map((v: any) => mapVideo(v, authUser?.id))

    return NextResponse.json({
      success: true,
      data: {
        videos: mapped,
        nextCursor,
        hasMore,
        maxDurationSec: MAX_DURATION_SEC,
      },
    })
  } catch (error: any) {
    console.error('[short-videos] Feed error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Video akışı alınamadı' } },
      { status: 500 }
    )
  }
}
