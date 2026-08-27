export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { createNotificationWithPush } from '@/lib/notify'
import { expirePendingPK, expireAllStalePKs, PK_TIMEOUT_MS } from '@/lib/pk-expiry'
import { emitStreamEvent } from '@/lib/stream-events'
import { requireFeature } from '@/lib/check-feature'
import { guardRateLimit } from '@/lib/rate-limit-guard'

// GET - Get active PK battle for a stream
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const streamId = searchParams.get('streamId')
    if (!streamId) return NextResponse.json({ error: 'streamId gerekli' }, { status: 400 })

    // First, expire any stale pending PKs
    await expireAllStalePKs()

    // Include recently completed/expired battles (last 5 min) so PK result screen stays visible
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
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

    // Fetch user info for both sides
    const [user1, user2, stream1, stream2] = await Promise.all([
      prisma.user.findUnique({ where: { id: battle.user1Id }, select: { id: true, name: true, image: true } }),
      prisma.user.findUnique({ where: { id: battle.user2Id }, select: { id: true, name: true, image: true } }),
      prisma.videoStream.findUnique({ where: { id: battle.stream1Id }, select: { id: true, title: true } }),
      prisma.videoStream.findUnique({ where: { id: battle.stream2Id }, select: { id: true, title: true } })
    ])

    return NextResponse.json({
      ...battle,
      user1,
      user2,
      stream1,
      stream2
    })
  } catch (e) {
    console.error('PK GET error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// POST - Create PK battle request or accept/reject/cancel
export async function POST(req: NextRequest) {
  try {
    const pkBlocked = await requireFeature('PK_ENABLED')
    if (pkBlocked) return pkBlocked

    // Dual auth: mobile JWT OR web session
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const currentUserId = mobileUser?.id || session?.user?.id
    if (!currentUserId) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    const rateLimited = await guardRateLimit(req, 'pk_create', { userId: currentUserId })
    if (rateLimited) return rateLimited

    const body = await req.json()
    const { action, streamId, targetStreamId, battleId, duration } = body

    if (action === 'create') {
      // Create a new PK battle request
      if (!streamId || !targetStreamId) {
        return NextResponse.json({ error: 'streamId ve targetStreamId gerekli' }, { status: 400 })
      }

      // Check streams are live
      const [myStream, targetStream] = await Promise.all([
        prisma.videoStream.findFirst({ where: { id: streamId, userId: currentUserId, status: 'live' } }),
        prisma.videoStream.findFirst({ where: { id: targetStreamId, status: 'live' } })
      ])

      if (!myStream) return NextResponse.json({ error: 'Aktif yayınınız bulunamadı' }, { status: 400 })
      if (!targetStream) return NextResponse.json({ error: 'Hedef yayın aktif değil' }, { status: 400 })

      // Check no existing active PK for either stream
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

      // Check if either USER already has a pending/active PK (even from a different stream)
      const userPk = await prisma.pKBattle.findFirst({
        where: {
          OR: [
            { user1Id: { in: [currentUserId, targetStream.userId] } },
            { user2Id: { in: [currentUserId, targetStream.userId] } }
          ],
          status: { in: ['pending', 'active'] }
        }
      })
      if (userPk) return NextResponse.json({ error: 'Taraflardan biri zaten bir PK\'da' }, { status: 400 })

      const battle = await prisma.pKBattle.create({
        data: {
          stream1Id: streamId,
          stream2Id: targetStreamId,
          user1Id: currentUserId,
          user2Id: targetStream.userId,
          duration: duration || 180,
          status: 'pending'
        }
      })

      // Schedule auto-expiry after 60 seconds (fire and forget)
      setTimeout(async () => {
        try {
          const pk = await prisma.pKBattle.findUnique({ where: { id: battle.id } })
          if (pk && pk.status === 'pending') {
            await expirePendingPK(pk)
          }
        } catch (e) { console.error('PK auto-expire timer error:', e) }
      }, PK_TIMEOUT_MS)

      // 3) Send push notification to opponent
      const challenger = await prisma.user.findUnique({ where: { id: currentUserId }, select: { name: true } })
      createNotificationWithPush({
        userId: targetStream.userId,
        type: 'pk_invite',
        title: 'PK Daveti! ⚔️',
        message: `${challenger?.name || 'Bir yayıncı'} sizi PK\'ya davet etti!`,
        fromUserId: currentUserId,
        fromUserName: challenger?.name || undefined,
        targetPath: '/pk',
        targetId: battle.id,
        data: JSON.stringify({
          type: 'pk:invite',
          battleId: battle.id,
          challengerStreamId: streamId,
          opponentStreamId: targetStreamId,
        })
      }).catch(err => console.error('PK invite push error:', err))

      const pkData = { type: 'pk', battleId: battle.id, action: 'created', room1Id: streamId, room2Id: targetStreamId, user1Id: currentUserId, user2Id: targetStream.userId, challengerName: challenger?.name, duration: battle.duration, status: 'pending', expiresAt: new Date(Date.now() + PK_TIMEOUT_MS).toISOString() }
      emitStreamEvent(streamId, 'pk', pkData)
      emitStreamEvent(targetStreamId, 'pk', pkData)

      return NextResponse.json(battle)
    }

    if (action === 'accept') {
      if (!battleId) return NextResponse.json({ error: 'battleId gerekli' }, { status: 400 })
      
      const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
      if (!battle) return NextResponse.json({ error: 'PK bulunamadı' }, { status: 404 })
      
      // Authorization: user2 (opponent) can accept.
      // Also allow opponent's voice room owner/moderator to accept on their behalf.
      let canAccept = battle.user2Id === session?.user?.id
      if (!canAccept && body.opponentVoiceRoomId) {
        // Check if the current user is the owner or moderator of the opponent's voice room
        const opponentRoom = await prisma.chatRoom.findUnique({
          where: { id: body.opponentVoiceRoomId },
          select: { ownerId: true }
        })
        if (opponentRoom?.ownerId === session?.user?.id) canAccept = true
        if (!canAccept) {
          const modRole = await prisma.chatUserRole.findUnique({
            where: { roomId_userId: { roomId: body.opponentVoiceRoomId, userId: session?.user?.id } }
          })
          if (modRole && (modRole.role === 'moderator' || modRole.role === 'admin')) canAccept = true
        }
      }
      
      if (!canAccept) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
      if (battle.status !== 'pending') return NextResponse.json({ error: 'Bu PK zaten kabul edilmiş' }, { status: 400 })

      // Check if PK has expired (60s timeout)
      const acceptElapsed = Date.now() - new Date(battle.createdAt).getTime()
      if (acceptElapsed >= PK_TIMEOUT_MS) {
        await expirePendingPK(battle)
        return NextResponse.json({ error: 'PK isteği zaman aşımına uğradı (60 saniye)' }, { status: 400 })
      }

      const endTime = new Date(Date.now() + (battle.duration || 180) * 1000)
      const updated = await prisma.pKBattle.update({
        where: { id: battleId },
        data: { status: 'active', startedAt: new Date() }
      })

      const pkStartData = { type: 'pk', battleId: battle.id, action: 'started', room1Id: battle.stream1Id, room2Id: battle.stream2Id, user1Id: battle.user1Id, user2Id: battle.user2Id, score1: 0, score2: 0, duration: battle.duration, status: 'active', startedAt: updated.startedAt?.toISOString(), endTime: endTime.toISOString() }
      emitStreamEvent(battle.stream1Id, 'pk', pkStartData)
      emitStreamEvent(battle.stream2Id, 'pk', pkStartData)

      return NextResponse.json({ ...updated, endTime })
    }

    if (action === 'reject' || action === 'cancel') {
      if (!battleId) return NextResponse.json({ error: 'battleId gerekli' }, { status: 400 })
      
      const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
      if (!battle) return NextResponse.json({ error: 'PK bulunamadı' }, { status: 404 })
      
      // Either party can cancel/reject
      if (battle.user1Id !== currentUserId && battle.user2Id !== currentUserId) {
        return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
      }

      const newStatus = action === 'reject' ? 'rejected' : 'cancelled'
      const updated = await prisma.pKBattle.update({
        where: { id: battleId },
        data: { status: newStatus, endedAt: new Date() }
      })

      const cancelData = { type: 'pk', battleId: battle.id, action: newStatus, room1Id: battle.stream1Id, room2Id: battle.stream2Id, status: newStatus }
      emitStreamEvent(battle.stream1Id, 'pk', cancelData)
      emitStreamEvent(battle.stream2Id, 'pk', cancelData)

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

      const endData = { type: 'pk', battleId: battle.id, action: 'completed', room1Id: battle.stream1Id, room2Id: battle.stream2Id, score1: battle.score1, score2: battle.score2, winnerId, status: 'completed' }
      emitStreamEvent(battle.stream1Id, 'pk', endData)
      emitStreamEvent(battle.stream2Id, 'pk', endData)

      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 })
  } catch (e) {
    console.error('PK POST error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
