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
import {
  checkPkTransition,
  finishPkBattle,
  finalizeExpiredActivePKs,
  ensurePkSidesAlive,
  emitPkToBothSides,
  PK_LIVE_STATUSES,
  pausePkBattle,
  resumePkBattle,
  startPkBattle,
  addPkParticipants,
  listPkParticipants,
  derivePkMode,
} from '@/lib/pk-state'
import { staffCan } from '@/lib/permissions'

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

    // First, expire any stale pending PKs and finalize timed-out active PKs (backend canonical timer)
    await expireAllStalePKs()
    await finalizeExpiredActivePKs()

    const battle = await prisma.pKBattle.findFirst({
      where: {
        AND: [
          { OR: [{ stream1Id: roomId }, { stream2Id: roomId }] },
          { OR: [
            { status: { in: PK_LIVE_STATUSES } },
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

    // Taraflardan biri odadan/yayından çıktıysa PK'yı otomatik kapat
    if (PK_LIVE_STATUSES.includes(checkedBattle.status as any)) {
      const alive = await ensurePkSidesAlive(checkedBattle as any)
      if (!alive) return NextResponse.json(null)
    }

    // Fetch user info and room info for both sides
    const [user1, user2, room1, room2, participants] = await Promise.all([
      prisma.user.findUnique({ where: { id: battle.user1Id }, select: { id: true, name: true, image: true, username: true } }),
      prisma.user.findUnique({ where: { id: battle.user2Id }, select: { id: true, name: true, image: true, username: true } }),
      prisma.chatRoom.findUnique({ where: { id: battle.stream1Id }, select: { id: true, nameTr: true, icon: true } }),
      prisma.chatRoom.findUnique({ where: { id: battle.stream2Id }, select: { id: true, nameTr: true, icon: true } }),
      listPkParticipants(battle.id),
    ])

    return NextResponse.json({
      ...checkedBattle,
      user1,
      user2,
      room1: room1 ? { id: room1.id, name: room1.nameTr, icon: room1.icon } : null,
      room2: room2 ? { id: room2.id, name: room2.nameTr, icon: room2.icon } : null,
      participants,
      mode: (checkedBattle as any).mode || '1v1',
      scope: (checkedBattle as any).scope || 'room',
      scopeRoomId: (checkedBattle as any).scopeRoomId || null,
      pausedAt: (checkedBattle as any).pausedAt ? new Date((checkedBattle as any).pausedAt).toISOString() : null,
      pausedMs: (checkedBattle as any).pausedMs || 0,
      // Aliases for Flutter compatibility
      stream1Id: battle.stream1Id,
      stream2Id: battle.stream2Id,
      // Sayaç sunucu saatiyle kanonik
      endTime: (checkedBattle as any).endsAt ? new Date((checkedBattle as any).endsAt).toISOString() : null,
      serverNow: new Date().toISOString(),
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
          status: { in: PK_LIVE_STATUSES }
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
          status: { in: PK_LIVE_STATUSES }
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
          status: 'pending',
          mode: '1v1',
          scope: 'room',
          scopeRoomId: roomId,
        }
      })
      await addPkParticipants(battle.id, [
        { userId: currentUserId, side: 1, isCaptain: true },
        { userId: targetOwnerId, side: 2, isCaptain: true },
      ])

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

    // ──────────── CREATE_USER (§5: aynı oda içinde kullanıcı vs kullanıcı) ────────────
    if (action === 'create_user') {
      const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: { id: true, ownerId: true, isActive: true, nameTr: true },
      })
      if (!room || !room.isActive) {
        return NextResponse.json({ error: 'Oda aktif değil' }, { status: 400 })
      }

      // Yetki: oda sahibi, oda moderatörü/admini veya platform moderatörü
      let canStart = room.ownerId === currentUserId
      if (!canStart) {
        const modRole = await prisma.chatUserRole.findUnique({
          where: { roomId_userId: { roomId, userId: currentUserId } },
        })
        if (modRole && (modRole.role === 'moderator' || modRole.role === 'admin')) canStart = true
      }
      if (!canStart) {
        const me = await prisma.user.findUnique({ where: { id: currentUserId }, select: { role: true } })
        canStart = await staffCan(me?.role, currentUserId, 'moderation.room.manage', ['admin', 'yonetici', 'moderator'])
      }
      if (!canStart) {
        return NextResponse.json({ error: 'Oda içi PK başlatma yetkiniz yok' }, { status: 403 })
      }

      // Kısayol: yalnız opponentUserId verilirse çağıran kişi 1. taraf sayılır
      const rawSide1: string[] = Array.isArray(body?.side1UserIds)
        ? body.side1UserIds
        : (body?.opponentUserId ? [currentUserId] : [])
      const rawSide2: string[] = Array.isArray(body?.side2UserIds)
        ? body.side2UserIds
        : (body?.opponentUserId ? [body.opponentUserId] : [])
      const side1 = Array.from(new Set(rawSide1.filter((v: any) => typeof v === 'string' && v)))
      const side2 = Array.from(new Set(rawSide2.filter((v: any) => typeof v === 'string' && v)))

      if (side1.length === 0 || side2.length === 0) {
        return NextResponse.json({ error: 'side1UserIds ve side2UserIds gerekli' }, { status: 400 })
      }
      if (side1.length > 4 || side2.length > 4) {
        return NextResponse.json({ error: 'Bir tarafta en fazla 4 kullanıcı olabilir' }, { status: 400 })
      }
      const overlap = side1.filter((u) => side2.includes(u))
      if (overlap.length > 0) {
        return NextResponse.json({ error: 'Bir kullanıcı aynı anda iki tarafta olamaz' }, { status: 400 })
      }

      // Tüm katılımcılar gerçekten odada mı? (koltuk durumu DEĞİŞTİRİLMEZ, yalnız okunur)
      const all = [...side1, ...side2]
      const presences = await prisma.chatPresence.findMany({
        where: { roomId, userId: { in: all } },
        select: { userId: true, seatIndex: true },
      })
      const seatMap = new Map(presences.map((pr) => [pr.userId, pr.seatIndex]))
      const missing = all.filter((u) => !seatMap.has(u))
      if (missing.length > 0) {
        return NextResponse.json({ error: 'Bazı kullanıcılar odada bulunmuyor', missing }, { status: 400 })
      }

      // Odada zaten yaşayan bir PK var mı? / katılımcılardan biri başka PK'da mı?
      const blocking = await prisma.pKBattle.findFirst({
        where: {
          status: { in: PK_LIVE_STATUSES },
          OR: [
            { stream1Id: roomId },
            { stream2Id: roomId },
            { scopeRoomId: roomId },
            { user1Id: { in: all } },
            { user2Id: { in: all } },
          ],
        },
        select: { id: true },
      })
      if (blocking) {
        return NextResponse.json({ error: 'Bu odada veya katılımcılarda zaten aktif bir PK var' }, { status: 409 })
      }

      const countdownSec = Math.min(30, Math.max(0, Math.floor(body?.countdownSec ?? 5)))
      const battle = await prisma.pKBattle.create({
        data: {
          stream1Id: roomId,
          stream2Id: roomId,
          user1Id: side1[0],
          user2Id: side2[0],
          duration: duration || 180,
          status: 'starting',
          mode: derivePkMode(side1.length, side2.length),
          scope: 'room_user',
          scopeRoomId: roomId,
        },
      })

      await addPkParticipants(battle.id, [
        ...side1.map((u, i) => ({ userId: u, side: 1 as const, seatNumber: seatMap.get(u) ?? null, isCaptain: i === 0 })),
        ...side2.map((u, i) => ({ userId: u, side: 2 as const, seatNumber: seatMap.get(u) ?? null, isCaptain: i === 0 })),
      ])

      const participants = await listPkParticipants(battle.id)
      emitChatEvent(roomId, 'pk', {
        type: 'pk',
        battleId: battle.id,
        action: 'starting',
        eventType: 'PK_STARTING',
        room1Id: roomId,
        room2Id: roomId,
        scope: 'room_user',
        mode: battle.mode,
        user1Id: battle.user1Id,
        user2Id: battle.user2Id,
        duration: battle.duration,
        status: 'starting',
        countdownSec,
        participants,
        serverNow: new Date().toISOString(),
      })

      // Geri sayım bitince otomatik başlat (backend kanonik)
      setTimeout(() => {
        startPkBattle(battle as any, 'COUNTDOWN').catch(() => {})
      }, Math.max(1, countdownSec) * 1000)

      return NextResponse.json({ ...battle, participants, countdownSec })
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
      const acceptErr = checkPkTransition(battle.status, 'active')
      if (acceptErr) return NextResponse.json({ error: acceptErr }, { status: 400 })

      // Check if PK has expired (60s timeout)
      const elapsed = Date.now() - new Date(battle.createdAt).getTime()
      if (elapsed >= PK_TIMEOUT_MS) {
        await expirePendingPK(battle)
        return NextResponse.json({ error: 'PK isteği zaman aşımına uğradı (60 saniye)' }, { status: 400 })
      }

      const acceptedAt = new Date()
      const endTime = new Date(acceptedAt.getTime() + (battle.duration || 180) * 1000)
      let updated
      try {
        // Optimistic lock: yalnızca hâlâ pending ise kabul edilir
        updated = await prisma.pKBattle.update({
          where: { id: battleId, status: 'pending' },
          data: { status: 'active', startedAt: acceptedAt, acceptedAt, endsAt: endTime }
        })
      } catch {
        return NextResponse.json({ error: 'PK durumu değişti, tekrar deneyin' }, { status: 409 })
      }

      // Emit PK started event to both rooms
      const pkStartData = {
        battleId: battle.id,
        action: 'started',
        eventType: 'PK_STARTED',
        room1Id: battle.stream1Id,
        room2Id: battle.stream2Id,
        user1Id: battle.user1Id,
        user2Id: battle.user2Id,
        score1: updated.score1,
        score2: updated.score2,
        duration: battle.duration,
        status: 'active',
        startedAt: acceptedAt.toISOString(),
        acceptedAt: acceptedAt.toISOString(),
        endsAt: endTime.toISOString(),
        endTime: endTime.toISOString(),
        serverNow: new Date().toISOString(),
      }
      emitPkToBothSides(battle, pkStartData)

      // Push notification to challenger
      createNotificationWithPush({
        userId: battle.user1Id,
        type: 'pk_invite',
        title: 'PK Kabul Edildi! ⚔️',
        message: 'PK davetiniz kabul edildi, kapışma başladı!',
        fromUserId: currentUserId,
        data: JSON.stringify({ type: 'pk:accepted', battleId: battle.id })
      }).catch(() => {})

      return NextResponse.json({ ...updated, endTime, serverNow: new Date().toISOString() })
    }

    // ──────────── REJECT / CANCEL ────────────
    if (action === 'reject' || action === 'cancel') {
      if (!battleId) return NextResponse.json({ error: 'battleId gerekli' }, { status: 400 })

      const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
      if (!battle) return NextResponse.json({ error: 'PK bulunamadı' }, { status: 404 })

      // reject → yalnızca davet edilen (user2); cancel → yalnızca daveti gönderen (user1)
      const newStatus: 'rejected' | 'cancelled' = action === 'reject' ? 'rejected' : 'cancelled'
      const allowedUserId = newStatus === 'rejected' ? battle.user2Id : battle.user1Id
      if (allowedUserId !== currentUserId) {
        return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
      }

      const transErr = checkPkTransition(battle.status, newStatus)
      if (transErr) return NextResponse.json({ error: transErr }, { status: 400 })

      let updated
      try {
        updated = await prisma.pKBattle.update({
          where: { id: battleId, status: 'pending' },
          data: { status: newStatus, endedAt: new Date() }
        })
      } catch {
        return NextResponse.json({ error: 'PK durumu değişti, tekrar deneyin' }, { status: 409 })
      }

      // Emit event to both rooms
      const pkCancelData = {
        battleId: battle.id,
        action: newStatus,
        eventType: newStatus === 'rejected' ? 'PK_REQUEST_REJECTED' : 'PK_REQUEST_CANCELLED',
        room1Id: battle.stream1Id,
        room2Id: battle.stream2Id,
        user1Id: battle.user1Id,
        user2Id: battle.user2Id,
        status: newStatus,
      }
      emitPkToBothSides(battle, pkCancelData)

      return NextResponse.json(updated)
    }

    // ──────────── END ────────────
    if (action === 'end') {
      if (!battleId) return NextResponse.json({ error: 'battleId gerekli' }, { status: 400 })

      const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
      if (!battle) return NextResponse.json({ error: 'PK bulunamadı' }, { status: 404 })
      // Yalnızca taraflardan biri veya hedef oda sahibi/moderatörü bitirebilir
      let canEnd = battle.user1Id === currentUserId || battle.user2Id === currentUserId
      if (!canEnd) {
        const modRole = await prisma.chatUserRole.findFirst({
          where: { roomId: { in: [battle.stream1Id, battle.stream2Id] }, userId: currentUserId, role: { in: ['moderator', 'admin'] } }
        })
        if (modRole) canEnd = true
      }
      if (!canEnd) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })

      const endErr = checkPkTransition(battle.status, 'completed')
      if (endErr) return NextResponse.json({ error: endErr }, { status: 400 })

      const updated = await finishPkBattle(battle as any, 'MANUAL')
      if (!updated) return NextResponse.json({ error: 'PK zaten bitmiş' }, { status: 409 })

      return NextResponse.json(updated)
    }

    // ──────────── START / PAUSE / RESUME (§4) ────────────
    if (action === 'start' || action === 'pause' || action === 'resume') {
      if (!battleId) return NextResponse.json({ error: 'battleId gerekli' }, { status: 400 })
      const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
      if (!battle) return NextResponse.json({ error: 'PK bulunamadı' }, { status: 404 })

      let canControl = battle.user1Id === currentUserId || battle.user2Id === currentUserId
      if (!canControl) {
        const modRole = await prisma.chatUserRole.findFirst({
          where: {
            roomId: { in: [battle.stream1Id, battle.stream2Id] },
            userId: currentUserId,
            role: { in: ['moderator', 'admin'] },
          },
        })
        if (modRole) canControl = true
      }
      if (!canControl) {
        const me = await prisma.user.findUnique({ where: { id: currentUserId }, select: { role: true } })
        canControl = await staffCan(me?.role, currentUserId, 'moderation.room.manage', ['admin', 'yonetici', 'moderator'])
      }
      if (!canControl) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })

      const target: 'active' | 'paused' = action === 'pause' ? 'paused' : 'active'
      const transErr = checkPkTransition(battle.status, target)
      if (transErr) return NextResponse.json({ error: transErr }, { status: 400 })

      const updated =
        action === 'pause'
          ? await pausePkBattle(battle as any, 'MANUAL')
          : action === 'start'
            ? await startPkBattle(battle as any, 'MANUAL')
            : await resumePkBattle(battle as any, 'MANUAL')
      if (!updated) return NextResponse.json({ error: 'PK durumu değişti, tekrar deneyin' }, { status: 409 })
      return NextResponse.json({ ...updated, serverNow: new Date().toISOString() })
    }

    return NextResponse.json({ error: 'Geçersiz action. Geçerli: create, create_user, accept, reject, cancel, start, pause, resume, end' }, { status: 400 })
  } catch (e) {
    await releaseIdempotent(_idempotencyRecord)
    console.error('Chat PK POST error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
