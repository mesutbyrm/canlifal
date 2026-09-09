export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { finalizeExpiredActivePKs } from '@/lib/pk-state'

/**
 * GET /api/video-streams/pk/candidates?streamId=...
 *
 * PK daveti gönderilebilecek canlı yayınların kanonik listesi.
 * İstemci tarafında filtreleme yapmak yerine sunucu şunları garanti eder:
 *   - yalnızca status = 'live' yayınlar
 *   - kendi yayınınız ve kendi kullanıcınız hariç
 *   - hâlihazırda bekleyen/aktif bir PK'da olan yayın veya kullanıcılar hariç
 *   - kullanıcı başına tek kayıt (en son başlayan yayın)
 */
export async function GET(req: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const currentUserId = mobileUser?.id || session?.user?.id
    if (!currentUserId) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    const streamId = new URL(req.url).searchParams.get('streamId')

    // Önce süresi dolmuş PK'ları kapat ki liste güncel olsun
    await finalizeExpiredActivePKs()

    const [streams, busyPks] = await Promise.all([
      prisma.videoStream.findMany({
        where: { status: 'live', userId: { not: currentUserId } },
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          userId: true,
          title: true,
          viewerCount: true,
          startedAt: true,
          user: { select: { id: true, name: true, username: true, image: true } },
        },
        take: 100,
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

    const seen = new Set<string>()
    const candidates = []
    for (const s of streams) {
      if (streamId && s.id === streamId) continue
      if (busySides.has(s.id) || busyUsers.has(s.userId)) continue
      if (seen.has(s.userId)) continue
      seen.add(s.userId)
      candidates.push({
        streamId: s.id,
        userId: s.userId,
        name: s.user?.name || s.user?.username || 'Yayıncı',
        image: s.user?.image || null,
        title: s.title || null,
        viewers: s.viewerCount,
        startedAt: s.startedAt,
      })
    }

    // Kendi yayınımız zaten bir PK'da mı?
    const selfBusy = Boolean(
      busyUsers.has(currentUserId) || (streamId && busySides.has(streamId))
    )

    return NextResponse.json({ candidates, selfBusy, total: candidates.length })
  } catch (e) {
    console.error('PK candidates error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
