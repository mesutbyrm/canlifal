import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { guardRateLimit } from '@/lib/rate-limit-guard'

export const dynamic = 'force-dynamic'

const VALID_REASONS = [
  'harassment',
  'spam',
  'inappropriate_content',
  'fake_account',
  'scam',
  'other',
]

/**
 * POST /api/chat/rooms/[roomId]/report
 * Body: { reason: string, userId?|targetUserId?: string, details?: string }
 * Hedef kullanıcı verilmezse oda sahibi şikayet edilir.
 * Mevcut UserReport modeline yazar (ikinci bir şikayet tablosu oluşturulmaz).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const mobileUser = await authenticateRequest(request)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const actorId = mobileUser?.id || session?.user?.id
    if (!actorId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const rateLimited = await guardRateLimit(request, 'report', { userId: actorId })
    if (rateLimited) return rateLimited

    const body = await request.json().catch(() => ({}))
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
    const details = typeof body?.details === 'string'
      ? body.details
      : (typeof body?.description === 'string' ? body.description : undefined)
    const targetUserId: string | undefined =
      body?.targetUserId || body?.userId || body?.reportedUserId || undefined

    if (!reason) {
      return NextResponse.json({ error: 'Şikayet nedeni gerekli' }, { status: 400 })
    }
    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: 'Geçersiz şikayet nedeni' }, { status: 400 })
    }

    const room = await prisma.chatRoom.findUnique({
      where: { id: params.roomId },
      select: { id: true, ownerId: true, nameTr: true, nameEn: true },
    })
    if (!room) {
      return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
    }

    const reportedId = targetUserId || room.ownerId
    if (!reportedId) {
      return NextResponse.json({ error: 'Şikayet edilecek kullanıcı bulunamadı' }, { status: 400 })
    }
    if (reportedId === actorId) {
      return NextResponse.json({ error: 'Kendinizi şikayet edemezsiniz' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: reportedId },
      select: { id: true },
    })
    if (!targetUser) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    const recentReport = await prisma.userReport.findFirst({
      where: {
        reporterId: actorId,
        reportedId,
        reason,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })
    if (recentReport) {
      return NextResponse.json({
        error: 'Bu şikayeti son 24 saat içinde zaten gönderdiniz.',
      }, { status: 429 })
    }

    const roomName = room.nameTr || room.nameEn || room.id
    const composedDetails = [`Oda: ${roomName} (${room.id})`, details || '']
      .filter(Boolean)
      .join(' — ')
      .slice(0, 1000)

    const report = await prisma.userReport.create({
      data: {
        reporterId: actorId,
        reportedId,
        reason,
        details: composedDetails,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Şikayetiniz alındı. İncelendikten sonra gerekli işlem yapılacaktır.',
      reportId: report.id,
    })
  } catch (error) {
    console.error('Room report error:', error)
    return NextResponse.json({ error: 'Şikayet gönderilemedi' }, { status: 500 })
  }
}
