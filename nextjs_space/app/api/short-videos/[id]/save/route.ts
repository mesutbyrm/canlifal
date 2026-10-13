export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { safeInt } from '@/lib/short-videos'

/**
 * POST /api/short-videos/:id/save
 * Auth: ZORUNLU — toggle kaydet/favori
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

    const video = await prisma.shortVideo.findUnique({
      where: { id: videoId },
      select: { id: true, savesCount: true },
    })
    if (!video) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Video bulunamadı' } },
        { status: 404 }
      )
    }

    const existing = await prisma.shortVideoSave.findUnique({
      where: { videoId_userId: { videoId, userId: authUser.id } },
    })

    let saved: boolean
    let savesCount: number

    if (existing) {
      await prisma.$transaction([
        prisma.shortVideoSave.delete({ where: { id: existing.id } }),
        prisma.shortVideo.update({ where: { id: videoId }, data: { savesCount: { decrement: 1 } } }),
      ])
      saved = false
      savesCount = Math.max(0, safeInt(video.savesCount) - 1)
    } else {
      await prisma.$transaction([
        prisma.shortVideoSave.create({ data: { videoId, userId: authUser.id } }),
        prisma.shortVideo.update({ where: { id: videoId }, data: { savesCount: { increment: 1 } } }),
      ])
      saved = true
      savesCount = safeInt(video.savesCount) + 1
    }

    return NextResponse.json({ success: true, data: { saved, savesCount } })
  } catch (error: any) {
    console.error('[short-videos] Save error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Kaydetme işlemi başarısız' } },
      { status: 500 }
    )
  }
}
