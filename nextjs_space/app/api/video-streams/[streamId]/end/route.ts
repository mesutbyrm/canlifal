import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { finalizeStreamEnd, canStaffEndStream } from '@/lib/video-stream-end'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

/**
 * POST /api/video-streams/:streamId/end
 * End a live stream. Broadcaster or staff (admin/yönetici/kurucu/moderatör).
 * Auth: Bearer JWT (mobile) or NextAuth session (web).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId },
      select: { id: true, userId: true, status: true }
    })

    if (!stream) {
      return NextResponse.json({ error: 'Yayın bulunamadı' }, { status: 404 })
    }

    // Only broadcaster or admin can end
    const isOwner = stream.userId === authUser.id
    if (!isOwner && !(await canStaffEndStream(authUser.role, authUser.id))) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    if (stream.status === 'ended') {
      return NextResponse.json({ success: true, message: 'Yayın zaten sona ermiş' })
    }

    // Update stream status
    await prisma.videoStream.update({
      where: { id: params.streamId },
      data: {
        status: 'ended',
        endedAt: new Date(),
      }
    })

    await finalizeStreamEnd(params.streamId)

    if (!isOwner) {
      recordAudit({
        actorId: authUser.id,
        actorRole: authUser.role,
        action: 'live_stream_force_end',
        targetType: 'video_stream',
        targetId: params.streamId,
        ip: getAuditIp(request),
      }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Stream end error:', error)
    return NextResponse.json({ error: 'Yayın sonlandırılamadı' }, { status: 500 })
  }
}
