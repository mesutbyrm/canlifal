export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { listGuests, getGuestLimits } from '@/lib/live-guest'
import { PK_LIVE_STATUSES, listPkParticipants } from '@/lib/pk-state'
import { serializeGiftBox } from '@/lib/gift-box'

/**
 * GET /api/video-streams/{streamId}/sync
 *
 * §26 — Bağlantı kopup geldiğinde tam durum senkronizasyonu.
 * Tek istekle yayın + misafirler + PK + hediye kutusu durumu döner.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    const streamId = params.streamId

    // Paralel sorgular
    const [stream, guests, guestLimits, activePk, activeBoxes] = await Promise.all([
      // Yayın bilgisi
      prisma.videoStream.findUnique({
        where: { id: streamId },
        select: {
          id: true, title: true, status: true, userId: true,
          viewerCount: true, likeCount: true, roomId: true,
          createdAt: true,
        },
      }),
      // Misafir durumu
      listGuests(streamId),
      getGuestLimits(),
      // PK durumu
      prisma.pKBattle.findFirst({
        where: {
          OR: [{ stream1Id: streamId }, { stream2Id: streamId }],
          status: { in: PK_LIVE_STATUSES as string[] },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Hediye kutusu durumu
      prisma.giftBox.findMany({
        where: { streamId, status: 'active' },
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

    if (!stream) return NextResponse.json({ error: 'Yayın bulunamadı' }, { status: 404 })

    // PK katılımcıları (varsa)
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

    // Hediye kutusu serialization
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
      stream: {
        ...stream,
        serverNow: new Date().toISOString(),
      },
      guests: {
        items: guests,
        maxGuests: guestLimits.maxGuests,
      },
      pk: pkData,
      giftBoxes,
    })
  } catch (e) {
    console.error('[stream/sync] Error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
