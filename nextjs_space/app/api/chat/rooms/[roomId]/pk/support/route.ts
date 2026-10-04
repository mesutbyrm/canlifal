export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { getCachedChatRoom, getCachedPlatformSetting } from '@/lib/cache'
import { applyGiftPkScore } from '@/lib/gift-pk-score'

/** Aynı kullanıcının art arda "Destekle" dokunuşları arasındaki en kısa süre. */
const SUPPORT_COOLDOWN_MS = 1000
const lastSupportAt = new Map<string, number>()
const PRESENCE_WINDOW_MS = 5 * 60 * 1000

/**
 * POST /api/chat/rooms/{roomId}/pk/support   Body: { battleId?, side? }
 *
 * "Destekle": izleyicinin BULUNDUĞU odanın tarafına sabit puan (varsayılan 3)
 * yazar. Skor tek kanonik yoldan (applyGiftPkScore) işlenir; her iki odaya da
 * `PK_SCORE` olayı yayınlanır — iki taraf da anında günceller.
 *
 * - Oda-vs-oda PK: taraf, kullanıcının bulunduğu odadan türetilir (istemci seçemez).
 * - Aynı oda içi (takım) PK: `side` (1|2) ile desteklenen takım seçilir.
 * - Kullanıcı o odada kapıdan geçmiş (presence) olmalıdır; kısa bekleme süresi vardır.
 */
export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    const room = await getCachedChatRoom(params.roomId)
    if (!room) return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })

    const presence = await prisma.chatPresence.findUnique({
      where: { roomId_userId: { roomId: room.id, userId } },
      select: { lastSeen: true },
    })
    if (!presence || Date.now() - presence.lastSeen.getTime() > PRESENCE_WINDOW_MS) {
      return NextResponse.json({ error: 'Destek için odada olmalısınız' }, { status: 403 })
    }

    const cdKey = `${userId}:${room.id}`
    const now = Date.now()
    if (now - (lastSupportAt.get(cdKey) || 0) < SUPPORT_COOLDOWN_MS) {
      return NextResponse.json({ error: 'Çok hızlı dokunuyorsunuz' }, { status: 429 })
    }
    lastSupportAt.set(cdKey, now)
    if (lastSupportAt.size > 5000) {
      for (const [k, t] of lastSupportAt) if (now - t > 60_000) lastSupportAt.delete(k)
    }

    const body = await req.json().catch(() => ({}))
    const battle = await prisma.pKBattle.findFirst({
      where: {
        status: 'active',
        ...(body?.battleId ? { id: String(body.battleId) } : {}),
        OR: [{ stream1Id: room.id }, { stream2Id: room.id }],
      },
      select: { id: true, stream1Id: true, stream2Id: true, user1Id: true, user2Id: true },
    })
    if (!battle) return NextResponse.json({ error: 'Aktif PK bulunamadı' }, { status: 404 })

    // Aynı oda içi (takım) PK: desteklenen takımı `side` belirler.
    let receiverId: string | null = null
    if (battle.stream1Id === battle.stream2Id) {
      const side = Number(body?.side)
      if (side !== 1 && side !== 2) {
        return NextResponse.json({ error: 'Desteklenecek takım (side) gerekli' }, { status: 400 })
      }
      receiverId = side === 1 ? battle.user1Id : battle.user2Id
    }

    const points = Math.max(1, Math.min(20, parseInt(await getCachedPlatformSetting('pk_support_points', '3')) || 3))
    const res = await applyGiftPkScore({
      sideIds: [room.id, room.slug],
      amount: points,
      battleId: battle.id,
      contributorId: userId,
      receiverId,
      source: 'support',
    })
    if (!res) return NextResponse.json({ error: 'PK puanı yazılamadı (PK bitmiş olabilir)' }, { status: 409 })

    return NextResponse.json({
      success: true,
      battleId: res.battleId,
      score1: res.score1,
      score2: res.score2,
      addedAmount: res.addedAmount,
      addedSide: res.addedSide,
      side: res.side,
    })
  } catch (e) {
    console.error('pk support error:', e)
    return NextResponse.json({ error: 'Destek verilemedi' }, { status: 500 })
  }
}
