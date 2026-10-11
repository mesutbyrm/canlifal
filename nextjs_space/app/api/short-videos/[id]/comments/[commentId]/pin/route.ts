export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

/**
 * POST /api/short-videos/:id/comments/:commentId/pin
 * Auth: ZORUNLU — yalnızca video sahibi yorumu sabitler/kaldırır (toggle)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const { id: videoId, commentId } = await params

    const video = await prisma.shortVideo.findUnique({
      where: { id: videoId },
      select: { id: true, userId: true },
    })
    if (!video) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Video bulunamadı' } },
        { status: 404 }
      )
    }
    if (video.userId !== authUser.id && authUser.role !== 'admin' && authUser.role !== 'yonetici') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Sadece video sahibi yorum sabitleyebilir' } },
        { status: 403 }
      )
    }

    const comment = await prisma.shortVideoComment.findUnique({
      where: { id: commentId },
      select: { id: true, videoId: true, isPinned: true },
    })
    if (!comment || comment.videoId !== videoId) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Yorum bulunamadı' } },
        { status: 404 }
      )
    }

    const newPinned = !comment.isPinned
    // Bir videoda aynı anda tek sabit yorum — diğerlerini kaldır
    if (newPinned) {
      await prisma.shortVideoComment.updateMany({
        where: { videoId, isPinned: true },
        data: { isPinned: false },
      })
    }
    await prisma.shortVideoComment.update({
      where: { id: commentId },
      data: { isPinned: newPinned },
    })

    return NextResponse.json({ success: true, data: { pinned: newPinned } })
  } catch (error: any) {
    console.error('[short-videos] Comment pin error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Sabitleme başarısız' } },
      { status: 500 }
    )
  }
}
