import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getCachedPlatformSetting } from '@/lib/cache'
import { applyGiftPkScore } from '@/lib/gift-pk-score'
import { emitStreamEvent } from '@/lib/stream-events'

/** PK sırasında aynı kullanıcının beğeni→puan dönüşümü için en kısa aralık. */
const PK_LIKE_COOLDOWN_MS = 400
const lastPkLikeAt = new Map<string, number>()

export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId },
      select: { likeCount: true }
    })

    return NextResponse.json({ likeCount: stream?.likeCount || 0 })
  } catch (error) {
    console.error('Error getting like count:', error)
    return NextResponse.json({ likeCount: 0 }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    // Allow both logged-in users and guests to like
    // Each tap adds likes (no toggling - TikTok style)
    // Flutter sends { count } for batch likes; default to 1
    let count = 1
    try {
      const body = await request.json()
      if (body.count && typeof body.count === 'number' && body.count > 0) {
        count = Math.min(Math.floor(body.count), 100) // cap at 100 per request
      }
    } catch {}
    
    const stream = await prisma.videoStream.update({
      where: { id: params.streamId },
      data: { likeCount: { increment: count } },
      select: { likeCount: true }
    })

    // Beğeniyi yayındaki HERKESE anında yayınla. Eskiden yalnızca likeCount DB'ye
    // yazılıyordu: diğer izleyiciler/yayıncı, kendileri beğeni yapıp yanıttaki
    // toplamı alana dek bu beğenileri göremiyordu.
    let likerId: string | null = null
    try {
      likerId = (await authenticateRequest(request))?.id ?? null
    } catch {}
    emitStreamEvent(params.streamId, 'like', {
      type: 'like',
      eventType: 'STREAM_LIKE',
      streamId: params.streamId,
      likeCount: stream.likeCount,
      count,
      userId: likerId,
      timestamp: Date.now(),
    })

    // Aktif PK varsa beğeni, izleyicinin bulunduğu yayının tarafına PK puanı yazar
    // (TikTok/Bigo gibi). Skor tek kanonik yoldan işlenir; iki tarafa anında yayınlanır.
    let pk: { score1: number; score2: number; addedAmount: number; side: number } | null = null
    try {
      const user = await authenticateRequest(request)
      const now = Date.now()
      const key = `${user?.id || 'guest'}:${params.streamId}`
      if (user?.id && now - (lastPkLikeAt.get(key) || 0) >= PK_LIKE_COOLDOWN_MS) {
        const active = await prisma.pKBattle.findFirst({
          where: {
            status: 'active',
            OR: [{ stream1Id: params.streamId }, { stream2Id: params.streamId }],
          },
          select: { id: true },
        })
        if (active) {
          lastPkLikeAt.set(key, now)
          if (lastPkLikeAt.size > 5000) {
            for (const [k, t] of lastPkLikeAt) if (now - t > 60_000) lastPkLikeAt.delete(k)
          }
          const points = Math.max(1, Math.min(20, parseInt(await getCachedPlatformSetting('pk_support_points', '3')) || 3))
          const res = await applyGiftPkScore({
            sideIds: [params.streamId],
            amount: points,
            battleId: active.id,
            contributorId: user.id,
            source: 'support',
          })
          if (res) pk = { score1: res.score1, score2: res.score2, addedAmount: res.addedAmount, side: res.side }
        }
      }
    } catch (e) {
      console.error('PK like score error:', e)
    }

    return NextResponse.json({ likeCount: stream.likeCount, pk })
  } catch (error) {
    console.error('Error adding like:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
