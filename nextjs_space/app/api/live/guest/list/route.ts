export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

const MAX_GUESTS = 8

/**
 * GET /api/live/guest/list?streamId=...
 * Aktif canlı yayın misafir (guest) listesi.
 * İkinci backend ile aynı payload: { count, maxGuests, gridSlots, guests: [...] }
 */
export async function GET(req: NextRequest) {
  try {
    const streamId = req.nextUrl.searchParams.get('streamId') || req.nextUrl.searchParams.get('roomId')

    if (!streamId) {
      return NextResponse.json({ count: 0, maxGuests: MAX_GUESTS, gridSlots: 2, guests: [] })
    }

    const sessions = await prisma.liveGuestSession.findMany({
      where: { streamId, status: 'active' },
      orderBy: { slot: 'asc' }
    })

    const users = sessions.length
      ? await prisma.user.findMany({
          where: { id: { in: sessions.map(s => s.userId) } },
          select: { id: true, name: true, username: true, image: true }
        })
      : []
    const userMap = new Map(users.map(u => [u.id, u]))

    const guests = sessions.map(s => {
      const u = userMap.get(s.userId)
      return {
        id: s.id,
        streamId: s.streamId,
        userId: s.userId,
        name: u?.name || u?.username || 'Kullanıcı',
        image: u?.image || null,
        slot: s.slot,
        status: s.status,
        isMuted: s.isMuted,
        isVideoOff: s.isVideoOff,
        mutedByHost: s.mutedByHost,
        joinedAt: s.joinedAt,
        lastSeenAt: s.lastSeenAt
      }
    })

    const count = guests.length
    const gridSlots = count <= 2 ? 2 : count <= 4 ? 4 : count <= 6 ? 6 : MAX_GUESTS

    return NextResponse.json({ count, maxGuests: MAX_GUESTS, gridSlots, guests })
  } catch (e) {
    console.error('live/guest/list error:', e)
    return NextResponse.json({ error: 'Misafir listesi alınamadı' }, { status: 500 })
  }
}
