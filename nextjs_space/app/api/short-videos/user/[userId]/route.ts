export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

/**
 * GET /api/short-videos/user/:userId
 * Auth: opsiyonel
 * Belirli kullanıcının videoları
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 30)

    const authUser = await authenticateRequest(req).catch(() => null)

    const videos = await prisma.shortVideo.findMany({
      where: { userId },
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
        ...(authUser
          ? {
              likes: { where: { userId: authUser.id }, select: { id: true }, take: 1 },
              views: { where: { userId: authUser.id }, select: { id: true }, take: 1 },
            }
          : {}),
      },
    })

    const mapped = videos.map((v: any) => ({
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
      data: { videos: mapped },
    })
  } catch (error: any) {
    console.error('[short-videos] User videos error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Kullanıcı videoları alınamadı' } },
      { status: 500 }
    )
  }
}
