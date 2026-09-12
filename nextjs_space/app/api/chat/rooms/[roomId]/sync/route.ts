export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { PK_LIVE_STATUSES, listPkParticipants } from '@/lib/pk-state'
import { serializeGiftBox } from '@/lib/gift-box'

/**
 * GET /api/chat/rooms/{roomId}/sync
 *
 * §26 — Bağlantı kopup geldiğinde sesli oda için tam durum senkronizasyonu.
 * Tek istekle oda durumu + PK + hediye kutusu döner.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    const roomId = params.roomId

    const [room, activePk, activeBoxes] = await Promise.all([
      prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: {
          id: true, slug: true, nameTr: true, nameEn: true,
          ownerId: true, isMuted: true,
          _count: { select: { presences: { where: { lastSeen: { gt: new Date(Date.now() - 5 * 60 * 1000) } } } } },
        },
      }),
      prisma.pKBattle.findFirst({
        where: {
          OR: [{ stream1Id: roomId }, { stream2Id: roomId }],
          status: { in: PK_LIVE_STATUSES as string[] },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.giftBox.findMany({
        where: { roomId, status: 'active' },
        include: {
          entries: {
            where: { userId },
            select: { isWinner: true, rewardAmount: true, taskVerified: true, rank: true },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    if (!room) return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })

    let pkData = null
    if (activePk) {
      const participants = await listPkParticipants(activePk.id)
      const now = Date.now()
      const endsAt = activePk.endsAt ? new Date(activePk.endsAt).getTime() : null
      pkData = {
        id: activePk.id,
        status: activePk.status,
        mode: activePk.mode,
        scope: activePk.scope,
        stream1Id: activePk.stream1Id,
        stream2Id: activePk.stream2Id,
        user1Id: activePk.user1Id,
        user2Id: activePk.user2Id,
        score1: activePk.score1,
        score2: activePk.score2,
        duration: activePk.duration,
        remainingSec: endsAt ? Math.max(0, Math.round((endsAt - now) / 1000)) : null,
        pausedMs: activePk.pausedMs,
        participants,
        serverNow: new Date().toISOString(),
      }
    }

    const giftBoxes = activeBoxes.map(box => {
      const me = box.entries[0] ?? null
      return {
        ...serializeGiftBox(box),
        me: me ? {
          joined: true,
          isWinner: me.isWinner,
          rewardAmount: me.rewardAmount,
          taskVerified: me.taskVerified,
          rank: me.rank,
        } : null,
      }
    })

    return NextResponse.json({
      room: {
        id: room.id,
        slug: room.slug,
        nameTr: room.nameTr,
        nameEn: room.nameEn,
        ownerId: room.ownerId,
        isMuted: room.isMuted,
        onlineCount: (room as any)._count?.presences ?? 0,
        serverNow: new Date().toISOString(),
      },
      pk: pkData,
      giftBoxes,
    })
  } catch (e) {
    console.error('[room/sync] Error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
