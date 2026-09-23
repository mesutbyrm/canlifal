export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { mapVideo } from '@/lib/short-videos'

const videoInclude = (authUserId?: string | null) => ({
  user: { select: { id: true, username: true, name: true, image: true } },
  music: true,
  hashtags: { include: { hashtag: { select: { name: true } } } },
  ...(authUserId
    ? {
        likes: { where: { userId: authUserId }, select: { id: true }, take: 1 },
        views: { where: { userId: authUserId }, select: { id: true }, take: 1 },
        saves: { where: { userId: authUserId }, select: { id: true }, take: 1 },
      }
    : {}),
})

/**
 * GET /api/short-videos/user/:userId?tab=videos|liked|saved
 * Auth: opsiyonel (liked/saved sekmeleri sadece kendi profili için görünür)
 * Belirli kullanıcının videoları / beğendikleri / kaydettikleri
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 30)
    const cursor = searchParams.get('cursor') || undefined
    const tab = (searchParams.get('tab') || 'videos').toLowerCase()

    const authUser = await authenticateRequest(req).catch(() => null)
    const isOwner = authUser?.id === userId

    // liked / saved sekmeleri gizlilik: sadece profil sahibi görebilir
    if ((tab === 'liked' || tab === 'saved') && !isOwner) {
      return NextResponse.json({
        success: true,
        data: { videos: [], nextCursor: null, hasMore: false },
      })
    }

    let mapped: any[] = []
    let nextCursor: string | null = null
    let hasMore = false

    if (tab === 'liked') {
      const likes = await prisma.shortVideoLike.findMany({
        where: { userId },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { createdAt: 'desc' },
        include: { video: { include: videoInclude(authUser?.id) as any } },
      })
      hasMore = likes.length > limit
      const items = hasMore ? likes.slice(0, limit) : likes
      nextCursor = hasMore ? items[items.length - 1]?.id : null
      mapped = items.map((l: any) => l.video).filter(Boolean).map((v: any) => mapVideo(v, authUser?.id))
    } else if (tab === 'saved') {
      const saves = await prisma.shortVideoSave.findMany({
        where: { userId },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { createdAt: 'desc' },
        include: { video: { include: videoInclude(authUser?.id) as any } },
      })
      hasMore = saves.length > limit
      const items = hasMore ? saves.slice(0, limit) : saves
      nextCursor = hasMore ? items[items.length - 1]?.id : null
      mapped = items.map((s: any) => s.video).filter(Boolean).map((v: any) => mapVideo(v, authUser?.id))
    } else {
      // videos (default) — gizlilik: sahibi değilse sadece herkese açık
      const where: any = { userId }
      if (!isOwner) where.visibility = 'everyone'
      const videos = await prisma.shortVideo.findMany({
        where,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { createdAt: 'desc' },
        include: videoInclude(authUser?.id) as any,
      })
      hasMore = videos.length > limit
      const items = hasMore ? videos.slice(0, limit) : videos
      nextCursor = hasMore ? items[items.length - 1]?.id : null
      mapped = items.map((v: any) => mapVideo(v, authUser?.id))
    }

    return NextResponse.json({
      success: true,
      data: { videos: mapped, nextCursor, hasMore },
    })
  } catch (error: any) {
    console.error('[short-videos] User videos error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Kullanıcı videoları alınamadı' } },
      { status: 500 }
    )
  }
}
