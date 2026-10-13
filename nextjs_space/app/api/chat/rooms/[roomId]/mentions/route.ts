import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { createNotificationWithPush } from '@/lib/notify'

export const dynamic = 'force-dynamic'

const MAX_MENTIONS = 20

/**
 * POST /api/chat/rooms/[roomId]/mentions
 * Body: { mentionedUserIds: string[], preview?: string }
 * Odada birinden bahsedildiğinde bahsedilen kullanıcılara bildirim gönderir.
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

    const body = await request.json().catch(() => ({}))
    const rawIds = Array.isArray(body?.mentionedUserIds) ? body.mentionedUserIds : []
    const preview = typeof body?.preview === 'string' ? body.preview.slice(0, 140) : ''

    const cleanedIds: string[] = rawIds
      .filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
      .map((id: string) => id.trim())
    const mentionedUserIds: string[] = Array.from(new Set(cleanedIds))
      .filter((id) => id !== actorId)
      .slice(0, MAX_MENTIONS)

    if (mentionedUserIds.length === 0) {
      return NextResponse.json({ success: true, notified: 0 })
    }

    const room = await prisma.chatRoom.findUnique({
      where: { id: params.roomId },
      select: { id: true, nameTr: true, nameEn: true, slug: true },
    })
    if (!room) {
      return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
    }

    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, name: true, username: true },
    })
    const actorName = actor?.username || actor?.name || 'Bir kullanıcı'

    const targets = await prisma.user.findMany({
      where: { id: { in: mentionedUserIds } },
      select: { id: true },
    })

    const roomName = room.nameTr || room.nameEn || 'Sohbet odası'
    let notified = 0
    for (const target of targets) {
      try {
        await createNotificationWithPush({
          userId: target.id,
          type: 'chat_mention',
          title: `${actorName} sizden bahsetti`,
          message: preview ? `${roomName}: ${preview}` : `${roomName} odasında sizden bahsetti`,
          fromUserId: actorId,
          fromUserName: actorName,
          targetPath: `/chat/${room.slug || room.id}`,
          targetId: room.id,
          data: JSON.stringify({ roomId: room.id, roomSlug: room.slug }),
        })
        notified += 1
      } catch (err) {
        console.error('mention notify error:', err)
      }
    }

    return NextResponse.json({ success: true, notified })
  } catch (error) {
    console.error('Room mentions error:', error)
    return NextResponse.json({ error: 'Bahsetme bildirimi gönderilemedi' }, { status: 500 })
  }
}
