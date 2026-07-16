import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { createNotificationWithPush } from '@/lib/notify'
import { emitChatEvent } from '@/lib/chat-events'
import { emitStreamEvent } from '@/lib/stream-events'
import { expirePendingPK, expireAllStalePKs, PK_TIMEOUT_MS } from '@/lib/pk-expiry'

export const dynamic = 'force-dynamic'

/**
 * Unified PK Battle API for Flutter.
 *
 * GET  /api/live/pk?roomId=xxx — Get active PK for a room
 * POST /api/live/pk — Actions: create, accept, reject, cancel, end
 *
 * Works for both stream and voice room PKs.
 */

export async function GET(request: NextRequest) {
  try {
    const roomId = request.nextUrl.searchParams.get('roomId')
    if (!roomId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_ROOM_ID', message: 'roomId gereklidir' } },
        { status: 400 }
      )
    }

    await expireAllStalePKs()

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
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

    if (!battle) {
      return NextResponse.json({ success: true, data: null })
    }

    const checked = await expirePendingPK(battle)
    if (!checked) {
      return NextResponse.json({ success: true, data: null })
    }

    // Fetch user + room info
    const [user1, user2] = await Promise.all([
      prisma.user.findUnique({ where: { id: battle.user1Id }, select: { id: true, name: true, image: true } }),
      prisma.user.findUnique({ where: { id: battle.user2Id }, select: { id: true, name: true, image: true } }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        id: battle.id,
        status: battle.status,
        room1Id: battle.stream1Id,
        room2Id: battle.stream2Id,
        user1Id: battle.user1Id,
        user2Id: battle.user2Id,
        score1: battle.score1,
        score2: battle.score2,
        duration: battle.duration,
        startedAt: battle.startedAt,
        endedAt: battle.endedAt,
        winnerId: battle.winnerId,
        createdAt: battle.createdAt,
        user1: user1 || null,
        user2: user2 || null,
      }
    })
  } catch (error) {
    console.error('[LIVE/pk] GET error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'PK durumu alınamadı' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, roomId, targetRoomId, battleId, duration } = body

    // ──────────── CREATE ────────────
    if (action === 'create') {
      if (!roomId || !targetRoomId) {
        return NextResponse.json(
          { success: false, error: { code: 'MISSING_PARAMS', message: 'roomId ve targetRoomId gereklidir' } },
          { status: 400 }
        )
      }

      // Verify rooms exist — try ChatRoom first, then VideoStream
      let myOwnerId: string | null = null
      let targetOwnerId: string | null = null
      let myRoomName: string | null = null
      let isStream = false

      const myRoom = await prisma.chatRoom.findUnique({ where: { id: roomId }, select: { id: true, ownerId: true, isActive: true, nameTr: true } })
      const targetRoom = await prisma.chatRoom.findUnique({ where: { id: targetRoomId }, select: { id: true, ownerId: true, isActive: true, nameTr: true } })

      if (myRoom && targetRoom) {
        // Voice room PK
        if (!myRoom.isActive) return NextResponse.json({ success: false, error: { code: 'ROOM_INACTIVE', message: 'Odanız aktif değil' } }, { status: 400 })
        if (!targetRoom.isActive) return NextResponse.json({ success: false, error: { code: 'TARGET_INACTIVE', message: 'Hedef oda aktif değil' } }, { status: 400 })
        if (myRoom.ownerId !== authUser.id) return NextResponse.json({ success: false, error: { code: 'NOT_OWNER', message: 'Sadece oda sahibi PK başlatabilir' } }, { status: 403 })
        myOwnerId = myRoom.ownerId
        targetOwnerId = targetRoom.ownerId
        myRoomName = myRoom.nameTr
      } else {
        // Check VideoStream
        const myStream = await prisma.videoStream.findFirst({ where: { OR: [{ id: roomId }, { roomId }], status: 'live' }, select: { id: true, userId: true, title: true } })
        const targetStream = await prisma.videoStream.findFirst({ where: { OR: [{ id: targetRoomId }, { roomId: targetRoomId }], status: 'live' }, select: { id: true, userId: true } })
        if (!myStream || !targetStream) return NextResponse.json({ success: false, error: { code: 'ROOM_NOT_FOUND', message: 'Oda bulunamadı' } }, { status: 404 })
        if (myStream.userId !== authUser.id) return NextResponse.json({ success: false, error: { code: 'NOT_OWNER', message: 'Sadece yayıncı PK başlatabilir' } }, { status: 403 })
        myOwnerId = myStream.userId
        targetOwnerId = targetStream.userId
        myRoomName = myStream.title
        isStream = true
      }

      if (!targetOwnerId) return NextResponse.json({ success: false, error: { code: 'NO_TARGET_OWNER', message: 'Hedef oda sahibi bulunamadı' } }, { status: 400 })

      // Check existing PKs
      const existingPK = await prisma.pKBattle.findFirst({
        where: {
          OR: [
            { stream1Id: { in: [roomId, targetRoomId] } },
            { stream2Id: { in: [roomId, targetRoomId] } }
          ],
          status: { in: ['pending', 'active'] }
        }
      })
      if (existingPK) return NextResponse.json({ success: false, error: { code: 'PK_EXISTS', message: 'Zaten aktif bir PK mevcut' } }, { status: 409 })

      const battle = await prisma.pKBattle.create({
        data: {
          stream1Id: roomId,
          stream2Id: targetRoomId,
          user1Id: authUser.id,
          user2Id: targetOwnerId,
          duration: duration || 180,
          status: 'pending'
        }
      })

      // Auto-expiry timer
      setTimeout(async () => {
        try {
          const pk = await prisma.pKBattle.findUnique({ where: { id: battle.id } })
          if (pk && pk.status === 'pending') await expirePendingPK(pk)
        } catch { /* ignore */ }
      }, PK_TIMEOUT_MS)

      // Notify opponent
      const challenger = await prisma.user.findUnique({ where: { id: authUser.id }, select: { name: true } })
      createNotificationWithPush({
        userId: targetOwnerId,
        type: 'pk_invite',
        title: 'PK Daveti! ⚔️',
        message: `${challenger?.name || 'Bir kullanıcı'} sizi PK\'ya davet etti!`,
        fromUserId: authUser.id,
        fromUserName: challenger?.name || undefined,
        targetPath: 'pk',
        targetId: battle.id,
        data: JSON.stringify({ type: 'pk:invite', battleId: battle.id, challengerRoomId: roomId, opponentRoomId: targetRoomId, challengerRoomName: myRoomName })
      }).catch(() => {})

      // Emit PK event
      const pkData = { battleId: battle.id, action: 'created', room1Id: roomId, room2Id: targetRoomId, user1Id: authUser.id, user2Id: targetOwnerId, challengerName: challenger?.name, duration: battle.duration, status: 'pending', expiresAt: new Date(Date.now() + PK_TIMEOUT_MS).toISOString() }
      emitChatEvent(roomId, 'pk', pkData)
      emitChatEvent(targetRoomId, 'pk', pkData)

      return NextResponse.json({ success: true, data: { id: battle.id, status: 'pending', room1Id: roomId, room2Id: targetRoomId, duration: battle.duration } })
    }

    // ──────────── ACCEPT ────────────
    if (action === 'accept') {
      if (!battleId) return NextResponse.json({ success: false, error: { code: 'MISSING_BATTLE_ID', message: 'battleId gereklidir' } }, { status: 400 })

      const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
      if (!battle) return NextResponse.json({ success: false, error: { code: 'PK_NOT_FOUND', message: 'PK bulunamadı' } }, { status: 404 })
      if (battle.status !== 'pending') return NextResponse.json({ success: false, error: { code: 'PK_NOT_PENDING', message: 'Bu PK zaten kabul/red edilmiş' } }, { status: 400 })

      // Check timeout
      if (Date.now() - new Date(battle.createdAt).getTime() >= PK_TIMEOUT_MS) {
        await expirePendingPK(battle)
        return NextResponse.json({ success: false, error: { code: 'PK_EXPIRED', message: 'PK isteği zaman aşımına uğradı' } }, { status: 400 })
      }

      // user2 or room owner can accept
      if (battle.user2Id !== authUser.id) {
        const targetRoom = await prisma.chatRoom.findUnique({ where: { id: battle.stream2Id }, select: { ownerId: true } })
        if (targetRoom?.ownerId !== authUser.id) {
          return NextResponse.json({ success: false, error: { code: 'NOT_AUTHORIZED', message: 'Bu PK\'yı kabul etme yetkiniz yok' } }, { status: 403 })
        }
      }

      const updated = await prisma.pKBattle.update({ where: { id: battleId }, data: { status: 'active', startedAt: new Date() } })
      const endTime = new Date(Date.now() + (battle.duration || 180) * 1000)

      const pkStartData = { battleId: battle.id, action: 'started', room1Id: battle.stream1Id, room2Id: battle.stream2Id, user1Id: battle.user1Id, user2Id: battle.user2Id, score1: 0, score2: 0, duration: battle.duration, status: 'active', startedAt: updated.startedAt?.toISOString(), endTime: endTime.toISOString() }
      emitChatEvent(battle.stream1Id, 'pk', pkStartData)
      emitChatEvent(battle.stream2Id, 'pk', pkStartData)

      createNotificationWithPush({ userId: battle.user1Id, type: 'pk_invite', title: 'PK Kabul Edildi! ⚔️', message: 'PK davetiniz kabul edildi!', fromUserId: authUser.id }).catch(() => {})

      return NextResponse.json({ success: true, data: { id: updated.id, status: 'active', startedAt: updated.startedAt, endTime, score1: 0, score2: 0 } })
    }

    // ──────────── REJECT / CANCEL ────────────
    if (action === 'reject' || action === 'cancel') {
      if (!battleId) return NextResponse.json({ success: false, error: { code: 'MISSING_BATTLE_ID', message: 'battleId gereklidir' } }, { status: 400 })

      const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
      if (!battle) return NextResponse.json({ success: false, error: { code: 'PK_NOT_FOUND', message: 'PK bulunamadı' } }, { status: 404 })
      if (battle.user1Id !== authUser.id && battle.user2Id !== authUser.id) {
        return NextResponse.json({ success: false, error: { code: 'NOT_AUTHORIZED', message: 'Yetkiniz yok' } }, { status: 403 })
      }

      const newStatus = action === 'reject' ? 'rejected' : 'cancelled'
      const updated = await prisma.pKBattle.update({ where: { id: battleId }, data: { status: newStatus, endedAt: new Date() } })

      const cancelData = { battleId: battle.id, action: newStatus, room1Id: battle.stream1Id, room2Id: battle.stream2Id, status: newStatus }
      emitChatEvent(battle.stream1Id, 'pk', cancelData)
      emitChatEvent(battle.stream2Id, 'pk', cancelData)

      return NextResponse.json({ success: true, data: { id: updated.id, status: newStatus } })
    }

    // ──────────── END ────────────
    if (action === 'end') {
      if (!battleId) return NextResponse.json({ success: false, error: { code: 'MISSING_BATTLE_ID', message: 'battleId gereklidir' } }, { status: 400 })

      const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
      if (!battle) return NextResponse.json({ success: false, error: { code: 'PK_NOT_FOUND', message: 'PK bulunamadı' } }, { status: 404 })
      if (battle.status !== 'active') return NextResponse.json({ success: false, error: { code: 'PK_NOT_ACTIVE', message: 'PK aktif değil' } }, { status: 400 })

      const winnerId = battle.score1 > battle.score2 ? battle.user1Id : battle.score2 > battle.score1 ? battle.user2Id : null
      const updated = await prisma.pKBattle.update({ where: { id: battleId }, data: { status: 'completed', endedAt: new Date(), winnerId } })

      const endData = { battleId: battle.id, action: 'completed', room1Id: battle.stream1Id, room2Id: battle.stream2Id, score1: battle.score1, score2: battle.score2, winnerId, status: 'completed' }
      emitChatEvent(battle.stream1Id, 'pk', endData)
      emitChatEvent(battle.stream2Id, 'pk', endData)

      return NextResponse.json({ success: true, data: { id: updated.id, status: 'completed', score1: battle.score1, score2: battle.score2, winnerId } })
    }

    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ACTION', message: 'Geçerli action: create, accept, reject, cancel, end' } },
      { status: 400 }
    )
  } catch (error) {
    console.error('[LIVE/pk] POST error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'PK işlemi başarısız' } },
      { status: 500 }
    )
  }
}
