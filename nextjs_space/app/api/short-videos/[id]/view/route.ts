export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

// Kaydırıp ekranda gördüğü her video izlenmiş sayılır ve «İzlediklerim»e eklenir.
const MIN_WATCH_SEC = 1

/**
 * POST /api/short-videos/:id/view
 * Auth: ZORUNLU
 * Body: { watchedSec: number }
 * Kural: watchedSec >= 1 ve kullanıcı bu videoyu daha önce sayılmadıysa views_count +1
 */
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

    const { id: videoId } = await params
    const body = await req.json()
    const watchedSec = parseFloat(body.watchedSec) || 0

    // Check video exists
    const video = await prisma.shortVideo.findUnique({
      where: { id: videoId },
      select: { id: true, viewsCount: true },
    })

    if (!video) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Video bulunamadı' } },
        { status: 404 }
      )
    }

    // Check minimum watch time
    if (watchedSec < MIN_WATCH_SEC) {
      return NextResponse.json({
        success: true,
        data: {
          counted: false,
          viewsCount: video.viewsCount,
          reason: 'min_1_second',
        },
      })
    }

    // Check if already viewed by this user
    const existing = await prisma.shortVideoView.findUnique({
      where: { videoId_userId: { videoId, userId: authUser.id } },
    })

    if (existing) {
      // Zaten sayıldı: izleme geçmişinde en üste taşı, süre uzunsa güncelle.
      await prisma.shortVideoView.update({
        where: { id: existing.id },
        data: {
          createdAt: new Date(),
          watchedSec: Math.max(watchedSec, existing.watchedSec || 0),
        },
      })
      return NextResponse.json({
        success: true,
        data: {
          counted: false,
          viewsCount: video.viewsCount,
          reason: 'already_viewed',
        },
      })
    }

    // New view: create record and increment count
    await prisma.$transaction([
      prisma.shortVideoView.create({
        data: {
          videoId,
          userId: authUser.id,
          watchedSec,
        },
      }),
      prisma.shortVideo.update({
        where: { id: videoId },
        data: { viewsCount: { increment: 1 } },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        counted: true,
        viewsCount: video.viewsCount + 1,
      },
    })
  } catch (error: any) {
    console.error('[short-videos] View error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'İzlenme kaydedilemedi' } },
      { status: 500 }
    )
  }
}
