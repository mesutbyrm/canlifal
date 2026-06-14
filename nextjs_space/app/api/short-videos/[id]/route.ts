export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { deleteFromR2, extractR2Key } from '@/lib/r2-storage'

/**
 * DELETE /api/short-videos/:id
 * Auth: ZORUNLU — yalnızca video.userId === auth user
 */
export async function DELETE(
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

    const video = await prisma.shortVideo.findUnique({
      where: { id: videoId },
      select: { id: true, userId: true, videoUrl: true, thumbnailUrl: true },
    })

    if (!video) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Video bulunamadı' } },
        { status: 404 }
      )
    }

    // Only owner or admin can delete
    if (video.userId !== authUser.id && authUser.role !== 'admin' && authUser.role !== 'yonetici') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Bu videoyu silme yetkiniz yok' } },
        { status: 403 }
      )
    }

    // Delete from R2 (fire and forget)
    try {
      const videoKey = extractR2Key(video.videoUrl)
      if (videoKey) await deleteFromR2(videoKey)
      if (video.thumbnailUrl) {
        const thumbKey = extractR2Key(video.thumbnailUrl)
        if (thumbKey) await deleteFromR2(thumbKey)
      }
    } catch (e) {
      console.error('[short-videos] R2 delete error (non-fatal):', e)
    }

    // Delete from DB (cascade deletes likes, comments, views)
    await prisma.shortVideo.delete({ where: { id: videoId } })

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    })
  } catch (error: any) {
    console.error('[short-videos] Delete error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Video silinemedi' } },
      { status: 500 }
    )
  }
}
