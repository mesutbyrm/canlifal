export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { safeInt } from '@/lib/short-videos'

/**
 * POST /api/short-videos/:id/share
 * Auth: opsiyonel — paylaşım sayacını artırır ve paylaşım bağlantısı döner.
 * Body: { channel?: string } (whatsapp|telegram|instagram|facebook|x|copy|qr)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params

    const video = await prisma.shortVideo.findUnique({
      where: { id: videoId },
      select: { id: true, sharesCount: true },
    })
    if (!video) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Video bulunamadı' } },
        { status: 404 }
      )
    }

    // Auth opsiyonel — sadece istatistik bağlama için
    await authenticateRequest(req).catch(() => null)

    const updated = await prisma.shortVideo.update({
      where: { id: videoId },
      data: { sharesCount: { increment: 1 } },
      select: { sharesCount: true },
    })

    const base = (process.env.NEXTAUTH_URL || 'https://canlifal.com').replace(/\/$/, '')
    const shareUrl = `${base}/tr/videolar/izle/${videoId}`

    return NextResponse.json({
      success: true,
      data: {
        shareUrl,
        sharesCount: safeInt(updated.sharesCount),
      },
    })
  } catch (error: any) {
    console.error('[short-videos] Share error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Paylaşım başarısız' } },
      { status: 500 }
    )
  }
}
