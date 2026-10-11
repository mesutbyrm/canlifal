export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { createNotificationWithPush } from '@/lib/notify'
import { expirePendingPK, expireAllStalePKs, PK_TIMEOUT_MS } from '@/lib/pk-expiry'
import { emitStreamEvent } from '@/lib/stream-events'
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
  getPkLimits,
} from '@/lib/pk-state'
import { staffCan } from '@/lib/permissions'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

// GET - Get active PK battle for a stream
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const rawStreamId = searchParams.get('streamId')
    if (!rawStreamId) return NextResponse.json({ error: 'streamId gerekli' }, { status: 400 })

    // `roomId` ile gelen istemcileri de kanonik yayın id'sine çevir
    const resolved = await prisma.videoStream.findFirst({
      where: { OR: [{ id: rawStreamId }, { roomId: rawStreamId }] },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })
    const streamId = resolved?.id || rawStreamId

    // First, expire any stale pending PKs and finalize timed-out active PKs (backend canonical timer)
    await expireAllStalePKs()
    await finalizeExpiredActivePKs()

    // Include recently completed/expired battles (last 5 min) so PK result screen stays visible
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    const battle = await prisma.pKBattle.findFirst({
      where: {
        AND: [
          { OR: [{ stream1Id: streamId }, { stream2Id: streamId }] },
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

    // Taraflardan biri yayından/odadan çıktıysa PK'yı otomatik kapat
    if (checkedBattle.status === 'pending' || checkedBattle.status === 'active') {
      const alive = await ensurePkSidesAlive(checkedBattle as any)
      if (!alive) return NextResponse.json(null)
    }

    // Fetch user info for both sides
    const [user1, user2, stream1, stream2] = await Promise.all([
      prisma.user.findUnique({ where: { id: battle.user1Id }, select: { id: true, name: true, image: true } }),
      prisma.user.findUnique({ where: { id: battle.user2Id }, select: { id: true, name: true, image: true } }),
      prisma.videoStream.findUnique({ where: { id: battle.stream1Id }, select: { id: true, title: true } }),
      prisma.videoStream.findUnique({ where: { id: battle.stream2Id }, select: { id: true, title: true } })
    ])

    return NextResponse.json({
      ...checkedBattle,
      user1,
      user2,
      stream1,
      stream2,
      // Sayaç sunucu saatiyle kanonik: istemci endsAt - serverNow ile hesaplar
      endTime: (checkedBattle as any).endsAt ? new Date((checkedBattle as any).endsAt).toISOString() : null,
      serverNow: new Date().toISOString(),
    })
  } catch (e) {
    console.error('PK GET error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// POST - Create PK battle request or accept/reject/cancel
export async function POST(req: NextRequest) {
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
    const replay = await beginIdempotent(req, 'stream_pk', currentUserId)
    if (replay.response) return replay.response
    _idempotencyRecord = replay.record

    const body = await req.json()
    const { action, streamId: rawStreamId, targetStreamId: rawTargetStreamId, battleId, duration } = body
    const pkLimits = await getPkLimits()
    const clampedDuration = Math.max(pkLimits.minDuration, Math.min(pkLimits.maxDuration, Math.floor(duration || pkLimits.defaultDuration)))

    if (action === 'create') {
      // Create a new PK battle request
      if (!rawStreamId || !rawTargetStreamId) {
        return NextResponse.json({ error: 'streamId ve targetStreamId gerekli' }, { status: 400 })
      }

      // Yayınları hem `id` hem de `roomId` ile çözümle (istemciler ikisini de gönderebiliyor)
      const [myStream, targetStream] = await Promise.all([
        prisma.videoStream.findFirst({ where: { OR: [{ id: rawStreamId }, { roomId: rawStreamId }] }, orderBy: { createdAt: 'desc' } }),
        prisma.videoStream.findFirst({ where: { OR: [{ id: rawTargetStreamId }, { roomId: rawTargetStreamId }] }, orderBy: { createdAt: 'desc' } })
      ])

      // Ayrıştırılmış hata mesajları: neyin yanlış olduğu artık belli
      if (!myStream) return NextResponse.json({ error: 'Yayınınız bulunamadı (geçersiz yayın kimliği). Sayfayı yenileyip tekrar deneyin.', code: 'STREAM_NOT_FOUND' }, { status: 404 })
      if (myStream.userId !== currentUserId) return NextResponse.json({ error: 'Sadece yayın sahibi PK başlatabilir', code: 'NOT_STREAM_OWNER' }, { status: 403 })
      if (myStream.status !== 'live') return NextResponse.json({ error: 'Aktif yayınınız bulunamadı (yayın kapanmış)', code: 'STREAM_NOT_LIVE' }, { status: 400 })
      if (!targetStream) return NextResponse.json({ error: 'Hedef yayın bulunamadı', code: 'TARGET_NOT_FOUND' }, { status: 404 })
      if (targetStream.status !== 'live') return NextResponse.json({ error: 'Hedef yayın aktif değil', code: 'TARGET_NOT_LIVE' }, { status: 400 })

      // Bundan sonrası daima kanonik yayın id'leri ile çalışır
      const streamId = myStream.id
      const targetStreamId = targetStream.id

      // Check no existing active PK for either stream
      const existingPK = await prisma.pKBattle.findFirst({
        where: {
          OR: [
            { stream1Id: { in: [streamId, targetStreamId] } },
            { stream2Id: { in: [streamId, targetStreamId] } }
          ],
          status: { in: PK_LIVE_STATUSES }
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
          status: { in: PK_LIVE_STATUSES }
        }
      })
      if (userPk) return NextResponse.json({ error: 'Taraflardan biri zaten bir PK\'da' }, { status: 400 })

      const battle = await prisma.pKBattle.create({
        data: {
          stream1Id: streamId,
          stream2Id: targetStreamId,
          user1Id: currentUserId,
          user2Id: targetStream.userId,
          duration: clampedDuration,
          status: 'pending',
          mode: '1v1',
          scope: 'stream',
        }
      })

      // §6 — Multi-Guest açıkken misafirler de PK taraflarına dahil edilir.
      // Misafir oturumları (guest_session) DEĞİŞTİRİLMEZ; yalnız okunur.
      const guestRows = await prisma.liveGuestSession.findMany({
        where: { streamId: { in: [streamId, targetStreamId] }, status: 'active' },
        select: { streamId: true, userId: true, slot: true },
      })
      await addPkParticipants(battle.id, [
        { userId: currentUserId, side: 1 as const, isCaptain: true },
        { userId: targetStream.userId, side: 2 as const, isCaptain: true },
        ...guestRows
          .filter((g) => g.userId !== currentUserId && g.userId !== targetStream.userId)
          .map((g) => ({
            userId: g.userId,
            side: (g.streamId === streamId ? 1 : 2) as 1 | 2,
            seatNumber: g.slot,
            isCaptain: false,
          })),
      ])
      const side1Count = 1 + guestRows.filter((g) => g.streamId === streamId && g.userId !== currentUserId).length
      const side2Count = 1 + guestRows.filter((g) => g.streamId === targetStreamId && g.userId !== targetStream.userId).length
      const derivedMode = derivePkMode(side1Count, side2Count)
      if (derivedMode !== '1v1') {
        await prisma.pKBattle.update({ where: { id: battle.id }, data: { mode: derivedMode } }).catch(() => {})
        battle.mode = derivedMode
      }

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
      // Ortak yayıncı: karışık oda↔yayın PK'sında sohbet veri yolunu dinleyen taraf da daveti alır.
      emitPkToBothSides({ stream1Id: streamId, stream2Id: targetStreamId }, pkData)
      try {
        emitPkInvite(targetStreamId, { ...battle, ...pkData }, {
          userId: currentUserId,
          userName: challenger?.name || undefined,
        })
      } catch (e) { console.error('PK invite room_event emit error:', e) }

      recordAudit({ actorId: currentUserId, action: 'pk.create', targetType: 'pk_battle', targetId: battle.id, metadata: { streamId, targetStreamId, duration: battle.duration }, ip: getAuditIp(req) }).catch(() => {})
      return NextResponse.json(battle)
    }

    if (action === 'accept') {
      if (!battleId) return NextResponse.json({ error: 'battleId gerekli' }, { status: 400 })
      
      const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
      if (!battle) return NextResponse.json({ error: 'PK bulunamadı' }, { status: 404 })
      
      // Authorization: user2 (opponent) can accept.
      // Also allow opponent's voice room owner/moderator to accept on their behalf.
      let canAccept = battle.user2Id === currentUserId
      if (!canAccept && body.opponentVoiceRoomId) {
        // Check if the current user is the owner or moderator of the opponent's voice room
        const opponentRoom = await prisma.chatRoom.findUnique({
          where: { id: body.opponentVoiceRoomId },
          select: { ownerId: true }
        })
        if (opponentRoom?.ownerId === currentUserId) canAccept = true
        if (!canAccept) {
          const modRole = await prisma.chatUserRole.findUnique({
            where: { roomId_userId: { roomId: body.opponentVoiceRoomId, userId: currentUserId } }
          })
          if (modRole && (modRole.role === 'moderator' || modRole.role === 'admin')) canAccept = true
        }
      }
      
      if (!canAccept) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
      const acceptErr = checkPkTransition(battle.status, 'active')
      if (acceptErr) return NextResponse.json({ error: acceptErr }, { status: 400 })

      // Check if PK has expired (60s timeout)
      const acceptElapsed = Date.now() - new Date(battle.createdAt).getTime()
      if (acceptElapsed >= PK_TIMEOUT_MS) {
        await expirePendingPK(battle)
        return NextResponse.json({ error: 'PK isteği zaman aşımına uğradı (60 saniye)' }, { status: 400 })
      }

      const acceptedAt = new Date()
      const pkL = await getPkLimits()
      const endTime = new Date(acceptedAt.getTime() + (battle.duration || pkL.defaultDuration) * 1000)
      let updated
      try {
        // Optimistic lock: yalnızca hâlâ pending ise kabul edilir (çift kabul yarışı engellenir)
        updated = await prisma.pKBattle.update({
          where: { id: battleId, status: 'pending' },
          data: { status: 'active', startedAt: acceptedAt, acceptedAt, endsAt: endTime }
        })
      } catch {
        return NextResponse.json({ error: 'PK durumu değişti, tekrar deneyin' }, { status: 409 })
      }

      const pkStartData = { type: 'pk', battleId: battle.id, action: 'started', eventType: 'PK_STARTED', room1Id: battle.stream1Id, room2Id: battle.stream2Id, user1Id: battle.user1Id, user2Id: battle.user2Id, score1: updated.score1, score2: updated.score2, duration: battle.duration, status: 'active', startedAt: acceptedAt.toISOString(), acceptedAt: acceptedAt.toISOString(), endsAt: endTime.toISOString(), endTime: endTime.toISOString(), serverNow: new Date().toISOString() }
      emitPkToBothSides(battle, pkStartData)

      recordAudit({ actorId: currentUserId, action: 'pk.accept', targetType: 'pk_battle', targetId: battleId, metadata: { endTime: endTime.toISOString() }, ip: getAuditIp(req) }).catch(() => {})
      return NextResponse.json({ ...updated, endTime, serverNow: new Date().toISOString() })
    }

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

      const cancelData = { type: 'pk', battleId: battle.id, action: newStatus, eventType: newStatus === 'rejected' ? 'PK_REQUEST_REJECTED' : 'PK_REQUEST_CANCELLED', room1Id: battle.stream1Id, room2Id: battle.stream2Id, user1Id: battle.user1Id, user2Id: battle.user2Id, status: newStatus }
      emitPkToBothSides(battle, cancelData)
      recordAudit({ actorId: currentUserId, action: 'pk.' + newStatus, targetType: 'pk_battle', targetId: battleId, metadata: { status: newStatus }, ip: getAuditIp(req) }).catch(() => {})

      return NextResponse.json(updated)
    }

    if (action === 'end') {
      if (!battleId) return NextResponse.json({ error: 'battleId gerekli' }, { status: 400 })
      
      const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
      if (!battle) return NextResponse.json({ error: 'PK bulunamadı' }, { status: 404 })
      if (battle.user1Id !== currentUserId && battle.user2Id !== currentUserId) {
        return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
      }
      const endErr = checkPkTransition(battle.status, 'completed')
      if (endErr) return NextResponse.json({ error: endErr }, { status: 400 })

      const updated = await finishPkBattle(battle as any, 'MANUAL')
      if (!updated) return NextResponse.json({ error: 'PK zaten bitmiş' }, { status: 409 })
      recordAudit({ actorId: currentUserId, action: 'pk.end', targetType: 'pk_battle', targetId: battleId, metadata: { winner: (updated as any).winner, reason: 'MANUAL' }, ip: getAuditIp(req) }).catch(() => {})

      return NextResponse.json(updated)
    }

    // ──────────── START / PAUSE / RESUME (§4) ────────────
    if (action === 'start' || action === 'pause' || action === 'resume') {
      if (!battleId) return NextResponse.json({ error: 'battleId gerekli' }, { status: 400 })
      const battle = await prisma.pKBattle.findUnique({ where: { id: battleId } })
      if (!battle) return NextResponse.json({ error: 'PK bulunamadı' }, { status: 404 })

      let canControl = battle.user1Id === currentUserId || battle.user2Id === currentUserId
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
      recordAudit({ actorId: currentUserId, action: 'pk.' + action, targetType: 'pk_battle', targetId: battleId, metadata: { status: (updated as any).status }, ip: getAuditIp(req) }).catch(() => {})
      return NextResponse.json({ ...updated, serverNow: new Date().toISOString() })
    }

    // ──────────── PARTICIPANTS (çok taraflı PK listesi) ────────────
    if (action === 'participants') {
      if (!battleId) return NextResponse.json({ error: 'battleId gerekli' }, { status: 400 })
      return NextResponse.json({ battleId, participants: await listPkParticipants(battleId) })
    }

    return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 })
  } catch (e) {
    await releaseIdempotent(_idempotencyRecord)
    console.error('PK POST error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
