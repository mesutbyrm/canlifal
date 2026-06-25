export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { createNotificationWithPush } from '@/lib/notify'
import { getPlatformSetting } from '@/lib/agency-commission'

// GET - Check if stream should be auto-closed (called by broadcaster polling)
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId },
      select: { id: true, status: true, lastGiftAt: true, startedAt: true, userId: true }
    })

    if (!stream || stream.status !== 'live') {
      return NextResponse.json({ shouldClose: false })
    }

    // Get timeout from platform settings (default 15 minutes)
    const timeoutStr = await getPlatformSetting('stream_no_gift_timeout', '15')
    const timeoutMinutes = parseInt(timeoutStr) || 15

    // If timeout is 0, feature is disabled
    if (timeoutMinutes <= 0) {
      return NextResponse.json({ shouldClose: false })
    }

    const timeoutMs = timeoutMinutes * 60 * 1000
    const referenceTime = stream.lastGiftAt || stream.startedAt
    const elapsed = Date.now() - new Date(referenceTime).getTime()

    if (elapsed >= timeoutMs) {
      return NextResponse.json({
        shouldClose: true,
        reason: 'no_gift_timeout',
        timeoutMinutes,
        message: `${timeoutMinutes} dakikadır hediye gelmediği için yayın otomatik kapatılacak.`
      })
    }

    const remainingMs = timeoutMs - elapsed
    return NextResponse.json({
      shouldClose: false,
      remainingMinutes: Math.ceil(remainingMs / 60000),
      timeoutMinutes
    })
  } catch (e) {
    console.error('Auto-close check error:', e)
    return NextResponse.json({ shouldClose: false })
  }
}

// POST - Execute auto-close on stream
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId },
      select: { id: true, status: true, userId: true }
    })

    if (!stream) return NextResponse.json({ error: 'Yayın bulunamadı' }, { status: 404 })
    if (stream.status !== 'live') return NextResponse.json({ error: 'Yayın zaten bitti' }, { status: 400 })
    if (stream.userId !== authUser.id) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })

    // Auto-close the stream
    await prisma.videoStream.update({
      where: { id: params.streamId },
      data: {
        status: 'ended',
        endedAt: new Date(),
        autoClosedAt: new Date()
      }
    })

    // Clear viewers
    await prisma.videoStreamViewer.updateMany({
      where: { streamId: params.streamId, leftAt: null },
      data: { leftAt: new Date() }
    })

    // Create notification for broadcaster
    try {
      await createNotificationWithPush({
        userId: stream.userId,
        type: 'stream_auto_closed',
        title: 'Yayın Otomatik Kapatıldı',
        message: 'Uzun süredir hediye gelmediği için yayınınız otomatik olarak kapatıldı.',
        data: JSON.stringify({ streamId: params.streamId })
      })
    } catch {}

    return NextResponse.json({ success: true, message: 'Yayın otomatik kapatıldı' })
  } catch (e) {
    console.error('Auto-close execute error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
