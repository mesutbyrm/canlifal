export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { finalizeExpiredActivePKs } from '@/lib/pk-state'

/**
 * GET /api/chat/rooms/pk/candidates?roomId=...
 *
 * Sesli odalar için PK daveti gönderilebilecek odaların kanonik listesi.
 * Sunucu şunları garanti eder:
 *   - yalnızca aktif ve sahibi olan odalar (sahipsiz odaya PK gönderilemez)
 *   - kendi odanız ve kendi sahipliğinizdeki odalar hariç
 *   - bekleyen/aktif PK'da olan oda veya oda sahipleri hariç
 *   - oda sahibi başına tek kayıt
 *   - oda sahibinin odada mevcut (çevrimiçi) olması şartı
 */
const OWNER_ONLINE_WINDOW_MS = 2 * 60 * 1000

export async function GET(req: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const currentUserId = mobileUser?.id || session?.user?.id
    if (!currentUserId) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    const roomId = new URL(req.url).searchParams.get('roomId')

    await finalizeExpiredActivePKs()

    const [rooms, busyPks] = await Promise.all([
      prisma.chatRoom.findMany({
        where: { isActive: true, ownerId: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nameTr: true,
          nameEn: true,
          icon: true,
          slug: true,
          ownerId: true,
          owner: { select: { id: true, name: true, username: true, image: true } },
        },
        take: 200,
      }),
      prisma.pKBattle.findMany({
        where: { status: { in: ['pending', 'active'] } },
        select: { stream1Id: true, stream2Id: true, user1Id: true, user2Id: true },
      }),
    ])

    const busySides = new Set<string>()
    const busyUsers = new Set<string>()
    for (const p of busyPks) {
      busySides.add(p.stream1Id)
      busySides.add(p.stream2Id)
      busyUsers.add(p.user1Id)
      busyUsers.add(p.user2Id)
    }

    // Oda sahibi şu anda kendi odasında mı?
    const since = new Date(Date.now() - OWNER_ONLINE_WINDOW_MS)
    const ownerIds = rooms.map((r) => r.ownerId!).filter(Boolean)
    const presences = ownerIds.length
      ? await prisma.chatPresence.findMany({
          where: { userId: { in: ownerIds }, lastSeen: { gte: since } },
          select: { userId: true, roomId: true },
        })
      : []
    const onlineInRoom = new Set(presences.map((p) => `${p.roomId}:${p.userId}`))

    const seen = new Set<string>()
    const candidates = []
    for (const r of rooms) {
      const ownerId = r.ownerId!
      if (roomId && r.id === roomId) continue
      if (ownerId === currentUserId) continue
      if (busySides.has(r.id) || busyUsers.has(ownerId)) continue
      if (!onlineInRoom.has(`${r.id}:${ownerId}`)) continue
      if (seen.has(ownerId)) continue
      seen.add(ownerId)
      candidates.push({
        roomId: r.id,
        slug: r.slug,
        name: r.nameTr || r.nameEn,
        icon: r.icon,
        ownerId,
        ownerName: r.owner?.name || r.owner?.username || 'Oda sahibi',
        ownerImage: r.owner?.image || null,
      })
    }

    const selfBusy = Boolean(
      busyUsers.has(currentUserId) || (roomId && busySides.has(roomId))
    )

    return NextResponse.json({ candidates, selfBusy, total: candidates.length })
  } catch (e) {
    console.error('Chat PK candidates error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
