export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { expirePendingPK, expireAllStalePKs, PK_TIMEOUT_MS } from '@/lib/pk-expiry'

/**
 * Per-stream PK battle alias.
 * Flutter expects /api/video-streams/{streamId}/pk-battle
 * This proxies to the existing /api/video-streams/pk logic.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const streamId = params.streamId
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)

    // Expire stale pending PKs
    await expireAllStalePKs()

    const battle = await prisma.pKBattle.findFirst({
      where: {
        AND: [
          { OR: [{ stream1Id: streamId }, { stream2Id: streamId }] },
          { OR: [
            { status: { in: ['pending', 'active'] } },
            { status: { in: ['completed', 'expired'] }, endedAt: { gte: fiveMinAgo } }
          ]}
        ]
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!battle) return NextResponse.json(null)

    // Check if pending PK has expired
    const checkedBattle = await expirePendingPK(battle)
    if (!checkedBattle) return NextResponse.json(null)

    const [user1, user2, stream1, stream2] = await Promise.all([
      prisma.user.findUnique({ where: { id: battle.user1Id }, select: { id: true, name: true, image: true } }),
      prisma.user.findUnique({ where: { id: battle.user2Id }, select: { id: true, name: true, image: true } }),
      prisma.videoStream.findUnique({ where: { id: battle.stream1Id }, select: { id: true, title: true } }),
      prisma.videoStream.findUnique({ where: { id: battle.stream2Id }, select: { id: true, title: true } })
    ])

    return NextResponse.json({ ...battle, user1, user2, stream1, stream2 })
  } catch (e) {
    console.error('PK-battle GET error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    const body = await request.json()
    const { action, targetStreamId, battleId, duration } = body
    const streamId = params.streamId

    if (action === 'create') {
      if (!targetStreamId) {
        return NextResponse.json({ error: 'targetStreamId gerekli' }, { status: 400 })
      }

      const [myStream, targetStream] = await Promise.all([
        prisma.videoStream.findFirst({ where: { id: streamId, userId: authUser.id, status: 'live' } }),
        prisma.videoStream.findFirst({ where: { id: targetStreamId, status: 'live' } })
      ])

      if (!myStream) return NextResponse.json({ error: 'Aktif yayınınız bulunamadı' }, { status: 400 })
      if (!targetStream) return NextResponse.json({ error: 'Hedef yayın aktif değil' }, { status: 400 })

      const existingPK = await prisma.pKBattle.findFirst({
        where: {
          OR: [
            { stream1Id: { in: [streamId, targetStreamId] } },
            { stream2Id: { in: [streamId, targetStreamId] } }
          ],
          status: { in: ['pending', 'active'] }
        }
      })

      if (existingPK) return NextResponse.json({ error: 'Zaten aktif bir PK mevcut' }, { status: 400 })

      const battle = await prisma.pKBattle.create({
        data: {
          stream1Id: streamId,
          stream2Id: targetStreamId,
          user1Id: authUser.id,
          user2Id: targetStream.userId,
          duration: duration || 180,
          status: 'pending'
        }
      })

      // Schedule auto-expiry after 60 seconds
      setTimeout(async () => {
        try {
          const pk = await prisma.pKBattle.findUnique({ where: { id: battle.id } })
          if (pk && pk.status === 'pending') {
            await expirePendingPK(pk)
          }
        } catch (e) { console.error('PK auto-expire timer error:', e) }
      }, PK_TIMEOUT_MS)

      return NextResponse.json(battle)
    }

    if (action === 'accept') {
      if (!battleId) return NextResponse.json({ error: 'battleId gerekli' }, { status: 400 })
      const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
      if (!battle) return NextResponse.json({ error: 'PK bulunamadı' }, { status: 404 })
      if (battle.user2Id !== authUser.id) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
      if (battle.status !== 'pending') return NextResponse.json({ error: 'Bu PK zaten kabul edilmiş' }, { status: 400 })

      // Check if PK has expired (60s timeout)
      const acceptElapsed = Date.now() - new Date(battle.createdAt).getTime()
      if (acceptElapsed >= PK_TIMEOUT_MS) {
        await expirePendingPK(battle)
        return NextResponse.json({ error: 'PK isteği zaman aşımına uğradı (60 saniye)' }, { status: 400 })
      }

      const updated = await prisma.pKBattle.update({
        where: { id: battleId },
        data: { status: 'active', startedAt: new Date() }
      })
      return NextResponse.json(updated)
    }

    if (action === 'reject' || action === 'cancel') {
      if (!battleId) return NextResponse.json({ error: 'battleId gerekli' }, { status: 400 })
      const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
      if (!battle) return NextResponse.json({ error: 'PK bulunamadı' }, { status: 404 })
      if (battle.user1Id !== authUser.id && battle.user2Id !== authUser.id) {
        return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
      }
      const updated = await prisma.pKBattle.update({
        where: { id: battleId },
        data: { status: action === 'reject' ? 'rejected' : 'cancelled', endedAt: new Date() }
      })
      return NextResponse.json(updated)
    }

    if (action === 'end') {
      if (!battleId) return NextResponse.json({ error: 'battleId gerekli' }, { status: 400 })
      const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
      if (!battle) return NextResponse.json({ error: 'PK bulunamadı' }, { status: 404 })
      if (battle.status !== 'active') return NextResponse.json({ error: 'PK aktif değil' }, { status: 400 })

      const winnerId = battle.score1 > battle.score2 ? battle.user1Id :
                       battle.score2 > battle.score1 ? battle.user2Id : null
      const updated = await prisma.pKBattle.update({
        where: { id: battleId },
        data: { status: 'completed', endedAt: new Date(), winnerId }
      })
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 })
  } catch (e) {
    console.error('PK-battle POST error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
