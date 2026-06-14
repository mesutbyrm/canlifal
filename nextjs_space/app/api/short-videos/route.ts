export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

const MAX_DURATION_SEC = 15

/**
 * GET /api/short-videos
 * Feed — cursor-based pagination, auth optional.
 * If authed, likedByMe / viewedByMe are populated.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10') || 10, 20)
    const cursor = searchParams.get('cursor') || undefined

    const authUser = await authenticateRequest(req).catch(() => null)

    const videos = await prisma.shortVideo.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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
        ...(authUser
          ? {
              likes: { where: { userId: authUser.id }, select: { id: true }, take: 1 },
              views: { where: { userId: authUser.id }, select: { id: true }, take: 1 },
            }
          : {}),
      },
    })

    const hasMore = videos.length > limit
    const items = hasMore ? videos.slice(0, limit) : videos
    const nextCursor = hasMore ? items[items.length - 1]?.id : null

    const mapped = items.map((v: any) => ({
      id: v.id,
      userId: v.userId,
      videoUrl: v.videoUrl,
      thumbnailUrl: v.thumbnailUrl,
      description: v.description,
      viewsCount: v.viewsCount,
      likesCount: v.likesCount,
      commentsCount: v.commentsCount,
      durationSec: v.durationSec,
      createdAt: v.createdAt.toISOString(),
      author: {
        id: v.user.id,
        userId: v.user.id,
        username: v.user.username || v.user.name || 'user',
        displayName: v.user.name || v.user.username || 'Kullanıcı',
        avatarUrl: v.user.image,
      },
      likedByMe: authUser ? (v.likes?.length > 0) : false,
      viewedByMe: authUser ? (v.views?.length > 0) : false,
    }))

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
