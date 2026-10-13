export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { mapVideo, safeInt, safeFloat } from '@/lib/short-videos'

/**
 * GET /api/short-videos/explore
 * Auth: opsiyonel
 * Keşfet ekranı — trend videolar (grid), trend hashtag'ler ve popüler müzikler.
 * ?q= verilirse açıklama/hashtag'e göre arama yapılır.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '24') || 24, 40)
    const cursor = searchParams.get('cursor') || undefined
    const q = (searchParams.get('q') || '').trim()

    const authUser = await authenticateRequest(req).catch(() => null)

    // Trend sıralaması: görüntülenme + beğeni ağırlıklı (son videolar öncelikli)
    const where: any = { visibility: 'everyone' }
    if (q) {
      where.OR = [
        { description: { contains: q, mode: 'insensitive' } },
        { hashtags: { some: { hashtag: { name: { contains: q.replace(/^#/, '').toLowerCase() } } } } },
      ]
    }

    const videos = await prisma.shortVideo.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ viewsCount: 'desc' }, { likesCount: 'desc' }, { createdAt: 'desc' }],
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
    const mappedVideos = items.map((v: any) => mapVideo(v, authUser?.id))

    // Sadece ilk sayfada trend hashtag ve müzik döndür
    let trendingHashtags: any[] = []
    let popularMusic: any[] = []
    if (!cursor) {
      const [tags, music] = await Promise.all([
        prisma.hashtag.findMany({
          where: { videosCount: { gt: 0 } },
          take: 12,
          orderBy: [{ videosCount: 'desc' }],
        }),
        prisma.shortVideoMusic.findMany({
          where: { isActive: true },
          take: 12,
          orderBy: [{ usesCount: 'desc' }, { createdAt: 'desc' }],
        }),
      ])
      trendingHashtags = tags.map((h: any) => ({ name: h.name, videosCount: safeInt(h.videosCount) }))
      popularMusic = music.map((m: any) => ({
        id: m.id,
        title: m.title,
        artist: m.artist ?? null,
        audioUrl: m.audioUrl,
        coverUrl: m.coverUrl ?? null,
        durationSec: safeFloat(m.durationSec),
        usesCount: safeInt(m.usesCount),
      }))
    }

    return NextResponse.json({
      success: true,
      data: {
        videos: mappedVideos,
        nextCursor,
        hasMore,
        trendingHashtags,
        popularMusic,
      },
    })
  } catch (error: any) {
    console.error('[short-videos] Explore error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Keşfet içeriği alınamadı' } },
      { status: 500 }
    )
  }
}
