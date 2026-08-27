export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { createNotificationWithPush } from '@/lib/notify'
import { emitChatEvent } from '@/lib/chat-events'
import { expirePendingPK, expireAllStalePKs, PK_TIMEOUT_MS } from '@/lib/pk-expiry'
import { emitPkInvite } from '@/lib/voice-room-events'
import { requireFeature } from '@/lib/check-feature'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { beginIdempotent, completeIdempotent, releaseIdempotent } from '@/lib/idempotency'

/**
 * PK Battle endpoints for Chat Rooms.
 * Uses PKBattle model with stream1Id/stream2Id storing roomIds.
 * 
 * GET  /api/chat/rooms/{roomId}/pk — Get active/recent PK for this room
 * POST /api/chat/rooms/{roomId}/pk — Actions: create, accept, reject, cancel, end
 */

export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)

    // First, expire any stale pending PKs
    await expireAllStalePKs()

    const battle = await prisma.pKBattle.findFirst({
      where: {
        AND: [
          { OR: [{ stream1Id: roomId }, { stream2Id: roomId }] },
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

    // Fetch user info and room info for both sides
    const [user1, user2, room1, room2] = await Promise.all([
      prisma.user.findUnique({ where: { id: battle.user1Id }, select: { id: true, name: true, image: true, username: true } }),
      prisma.user.findUnique({ where: { id: battle.user2Id }, select: { id: true, name: true, image: true, username: true } }),
      prisma.chatRoom.findUnique({ where: { id: battle.stream1Id }, select: { id: true, nameTr: true, icon: true } }),
      prisma.chatRoom.findUnique({ where: { id: battle.stream2Id }, select: { id: true, nameTr: true, icon: true } })
    ])

    return NextResponse.json({
      ...battle,
      user1,
      user2,
      room1: room1 ? { id: room1.id, name: room1.nameTr, icon: room1.icon } : null,
      room2: room2 ? { id: room2.id, name: room2.nameTr, icon: room2.icon } : null,
      // Aliases for Flutter compatibility
      stream1Id: battle.stream1Id,
      stream2Id: battle.stream2Id,
    })
  } catch (e) {
    console.error('Chat PK GET error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  let _idempotencyRecord: string | null = null
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

    // Faz 22 (§71) — idempotency koruması
    const replay = await beginIdempotent(req, 'pk_action', currentUserId)
    if (replay.response) return replay.response
    _idempotencyRecord = replay.record

    const { roomId } = params
    const body = await req.json()
    const battleId = body?.battleId ?? body?.matchId ?? null
    const duration = body?.duration ?? body?.durationSec ?? null
    const guestUserId = body?.guestUserId ?? body?.targetUserId ?? null
    // Flutter sends { guestUserId, durationSec } with no explicit action → treat as create
    const action: string = body?.action
      ?? ((body?.targetRoomId || guestUserId) ? 'create' : '')

    // ──────────── CREATE ────────────
    if (action === 'create') {
      let targetRoomId: string | null = body?.targetRoomId ?? null

      // Resolve guestUserId → their active room
      if (!targetRoomId && guestUserId) {
        const guestRoom = await prisma.chatRoom.findFirst({
          where: { ownerId: guestUserId, isActive: true },
          orderBy: { createdAt: 'desc' },
          select: { id: true }
        })
        if (!guestRoom) {
          return NextResponse.json({ error: 'Davet edilen kullanıcının aktif odası yok' }, { status: 400 })
        }
        targetRoomId = guestRoom.id
      }

      if (!targetRoomId) {
        return NextResponse.json({ error: 'targetRoomId veya guestUserId gerekli' }, { status: 400 })
      }

      // Verify both rooms exist and are active
      const [myRoom, targetRoom] = await Promise.all([
        prisma.chatRoom.findUnique({
          where: { id: roomId },
          select: { id: true, ownerId: true, isActive: true, nameTr: true }
        }),
        prisma.chatRoom.findUnique({
          where: { id: targetRoomId },
          select: { id: true, ownerId: true, isActive: true, nameTr: true }
        })
      ])

      if (!myRoom || !myRoom.isActive) {
        return NextResponse.json({ error: 'Odanız aktif değil' }, { status: 400 })
      }
      if (!targetRoom || !targetRoom.isActive) {
        return NextResponse.json({ error: 'Hedef oda aktif değil' }, { status: 400 })
      }

      // Only room owner can initiate PK
      if (myRoom.ownerId !== currentUserId) {
        return NextResponse.json({ error: 'Sadece oda sahibi PK başlatabilir' }, { status: 403 })
      }

      // Check no existing active PK for either room
      const existingPK = await prisma.pKBattle.findFirst({
        where: {
          OR: [
            { stream1Id: { in: [roomId, targetRoomId] } },
            { stream2Id: { in: [roomId, targetRoomId] } }
          ],
          status: { in: ['pending', 'active'] }
        }
      })
      if (existingPK) {
        return NextResponse.json({ error: 'Zaten aktif bir PK mevcut' }, { status: 400 })
      }

      // Check if either user already in a PK
      const targetOwnerId = targetRoom.ownerId
      const userPk = await prisma.pKBattle.findFirst({
        where: {
          OR: [
            { user1Id: { in: [currentUserId, targetOwnerId] } },
            { user2Id: { in: [currentUserId, targetOwnerId] } }
          ],
          status: { in: ['pending', 'active'] }
        }
      })
      if (userPk) {
        return NextResponse.json({ error: 'Taraflardan biri zaten bir PK\'da' }, { status: 400 })
      }

      const battle = await prisma.pKBattle.create({
        data: {
          stream1Id: roomId,
          stream2Id: targetRoomId,
          user1Id: currentUserId,
          user2Id: targetOwnerId,
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

      // Push notification to opponent room owner
      const challenger = await prisma.user.findUnique({ where: { id: currentUserId }, select: { name: true } })
      createNotificationWithPush({
        userId: targetOwnerId,
        type: 'pk_invite',
        title: 'PK Daveti! ⚔️',
        message: `${challenger?.name || 'Bir oda sahibi'} sizi PK'ya davet etti!`,
        fromUserId: currentUserId,
        fromUserName: challenger?.name || undefined,
        targetPath: '/chat-room',
        targetId: battle.id,
        data: JSON.stringify({
          type: 'pk:invite',
          battleId: battle.id,
          challengerRoomId: roomId,
          opponentRoomId: targetRoomId,
          challengerRoomName: myRoom.nameTr,
        })
      }).catch(err => console.error('Chat PK invite push error:', err))

      // Emit PK event to both rooms
      const pkEventData = {
        battleId: battle.id,
        action: 'created',
        room1Id: roomId,
        room2Id: targetRoomId,
        user1Id: currentUserId,
        user2Id: targetOwnerId,
        challengerName: challenger?.name,
        duration: battle.duration,
        status: 'pending',
        expiresAt: new Date(Date.now() + PK_TIMEOUT_MS).toISOString(),
        timeoutSeconds: PK_TIMEOUT_MS / 1000,
      }
      emitChatEvent(roomId, 'pk', pkEventData)
      emitChatEvent(targetRoomId, 'pk', pkEventData)

      // Additive: dedicated pk_invite / pk_requested room_event for the opponent room owner popup
      try {
        emitPkInvite(targetRoomId, { ...battle, ...pkEventData }, {
          userId: currentUserId,
          userName: challenger?.name || undefined
        })
      } catch (e) { console.error('PK invite room_event emit error:', e) }

      return NextResponse.json(battle)
    }

    // ──────────── ACCEPT ────────────
    if (action === 'accept') {
      if (!battleId) return NextResponse.json({ error: 'battleId gerekli' }, { status: 400 })

      const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
      if (!battle) return NextResponse.json({ error: 'PK bulunamadı' }, { status: 404 })

      // user2 (opponent room owner) can accept
      // Or any moderator/admin of the target room
      let canAccept = battle.user2Id === currentUserId
      if (!canAccept) {
        const targetRoomId2 = battle.stream2Id
        const targetRoom = await prisma.chatRoom.findUnique({
          where: { id: targetRoomId2 },
          select: { ownerId: true }
        })
        if (targetRoom?.ownerId === currentUserId) canAccept = true
        if (!canAccept) {
          const modRole = await prisma.chatUserRole.findUnique({
            where: { roomId_userId: { roomId: targetRoomId2, userId: currentUserId } }
          })
          if (modRole && (modRole.role === 'moderator' || modRole.role === 'admin')) canAccept = true
        }
      }

      if (!canAccept) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
      if (battle.status !== 'pending') return NextResponse.json({ error: 'Bu PK zaten kabul edilmiş veya iptal' }, { status: 400 })

      // Check if PK has expired (60s timeout)
      const elapsed = Date.now() - new Date(battle.createdAt).getTime()
      if (elapsed >= PK_TIMEOUT_MS) {
        await expirePendingPK(battle)
        return NextResponse.json({ error: 'PK isteği zaman aşımına uğradı (60 saniye)' }, { status: 400 })
      }

      const updated = await prisma.pKBattle.update({
        where: { id: battleId },
        data: { status: 'active', startedAt: new Date() }
      })

      const endTime = new Date(Date.now() + (battle.duration || 180) * 1000)

      // Emit PK started event to both rooms
      const pkStartData = {
        battleId: battle.id,
        action: 'started',
        room1Id: battle.stream1Id,
        room2Id: battle.stream2Id,
        user1Id: battle.user1Id,
        user2Id: battle.user2Id,
        score1: 0,
        score2: 0,
        duration: battle.duration,
        status: 'active',
        startedAt: updated.startedAt?.toISOString(),
        endTime: endTime.toISOString(),
      }
      emitChatEvent(battle.stream1Id, 'pk', pkStartData)
      emitChatEvent(battle.stream2Id, 'pk', pkStartData)

      // Push notification to challenger
      createNotificationWithPush({
        userId: battle.user1Id,
        type: 'pk_invite',
        title: 'PK Kabul Edildi! ⚔️',
        message: 'PK davetiniz kabul edildi, kapışma başladı!',
        fromUserId: currentUserId,
        data: JSON.stringify({ type: 'pk:accepted', battleId: battle.id })
      }).catch(() => {})

      return NextResponse.json({ ...updated, endTime })
    }

    // ──────────── REJECT / CANCEL ────────────
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

      // Emit event to both rooms
      const pkCancelData = {
        battleId: battle.id,
        action: newStatus,
        room1Id: battle.stream1Id,
        room2Id: battle.stream2Id,
        user1Id: battle.user1Id,
        user2Id: battle.user2Id,
        status: newStatus,
      }
      emitChatEvent(battle.stream1Id, 'pk', pkCancelData)
      emitChatEvent(battle.stream2Id, 'pk', pkCancelData)

      return NextResponse.json(updated)
    }

    // ──────────── END ────────────
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

      // Emit PK completed event to both rooms
      const pkEndData = {
        battleId: battle.id,
        action: 'completed',
        room1Id: battle.stream1Id,
        room2Id: battle.stream2Id,
        user1Id: battle.user1Id,
        user2Id: battle.user2Id,
        score1: battle.score1,
        score2: battle.score2,
        winnerId,
        status: 'completed',
      }
      emitChatEvent(battle.stream1Id, 'pk', pkEndData)
      emitChatEvent(battle.stream2Id, 'pk', pkEndData)

      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Geçersiz action. Geçerli: create, accept, reject, cancel, end' }, { status: 400 })
  } catch (e) {
    await releaseIdempotent(_idempotencyRecord)
    console.error('Chat PK POST error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
