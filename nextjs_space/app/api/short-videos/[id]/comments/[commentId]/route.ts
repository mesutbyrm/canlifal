export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

/**
 * DELETE /api/short-videos/:id/comments/:commentId
 * Auth: ZORUNLU — yorum sahibi VEYA video sahibi silebilir.
 * Yanıtlar cascade ile silinir; commentsCount düşürülür (yorum + yanıtları).
 */
export async function DELETE(
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

    const comment = await prisma.shortVideoComment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true, videoId: true },
    })
    if (!comment || comment.videoId !== videoId) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Yorum bulunamadı' } },
        { status: 404 }
      )
    }

    const video = await prisma.shortVideo.findUnique({
      where: { id: videoId },
      select: { userId: true },
    })

    const isOwner = comment.userId === authUser.id
    const isVideoOwner = video?.userId === authUser.id
    const isAdmin = authUser.role === 'admin' || authUser.role === 'yonetici'
    if (!isOwner && !isVideoOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Bu yorumu silme yetkiniz yok' } },
        { status: 403 }
      )
    }

    // Yanıt sayısı (cascade silinecek) + kendisi = toplam düşüş
    const replyCount = await prisma.shortVideoComment.count({ where: { parentId: commentId } })
    const totalRemoved = 1 + replyCount

    await prisma.$transaction([
      prisma.shortVideoComment.delete({ where: { id: commentId } }),
      prisma.shortVideo.update({
        where: { id: videoId },
        data: { commentsCount: { decrement: totalRemoved } },
      }),
    ])

    // Negatif olmaması için normalize
    const fresh = await prisma.shortVideo.findUnique({
      where: { id: videoId },
      select: { commentsCount: true },
    })
    if (fresh && fresh.commentsCount < 0) {
      await prisma.shortVideo.update({ where: { id: videoId }, data: { commentsCount: 0 } })
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true, commentsCount: Math.max(0, fresh?.commentsCount ?? 0) },
    })
  } catch (error: any) {
    console.error('[short-videos] Comment delete error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Yorum silinemedi' } },
      { status: 500 }
    )
  }
}
