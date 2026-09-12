export const dynamic = 'force-dynamic'

/**
 * /api/live/guest — Multi-Guest (çoklu misafir) uçları. BÖLÜM 22 / B1.
 *
 * Tüm yetki ve durum geçişleri sunucuda doğrulanır; istemci hiçbir
 * pozisyon/onay/durum değerini dayatamaz (§1, §7, §31).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import {
  GuestErrors,
  GUEST_ERROR_MESSAGES,
  getGuestLimits,
  gridSlotsFor,
  listGuests,
  expireStalePending,
  broadcastGuests,
  emitGuestRequestEvent,
  resolveGuestAuthority,
} from '@/lib/live-guest'

function fail(code: string, status = 400, extra: Record<string, any> = {}) {
  const message = GUEST_ERROR_MESSAGES[code] || 'Bir hata oluştu'
  return NextResponse.json({ error: message, code, ...extra }, { status })
}

async function currentUserId(req: NextRequest): Promise<string | null> {
  const mobileUser = await authenticateRequest(req)
  if (mobileUser?.id) return mobileUser.id
  const session = await getServerSession(authOptions)
  return session?.user?.id || null
}

/**
 * GET /api/live/guest?streamId=...            — misafir listesi
 * GET /api/live/guest?streamId=...&view=sync  — tam durum resync (§26)
 */
export async function GET(req: NextRequest) {
  try {
    const streamId = req.nextUrl.searchParams.get('streamId') || req.nextUrl.searchParams.get('roomId')
    const view = req.nextUrl.searchParams.get('view')
    const { maxGuests } = await getGuestLimits()

    if (!streamId) {
      return NextResponse.json({ count: 0, maxGuests, gridSlots: 2, guests: [] })
    }

    await expireStalePending(streamId)
    const guests = await listGuests(streamId)
    const count = guests.length
    const gridSlots = gridSlotsFor(count, maxGuests)

    if (view !== 'sync') {
      return NextResponse.json({ count, maxGuests, gridSlots, guests })
    }

    // ─── Tam durum resync ───
    const userId = await currentUserId(req)
    const stream = await prisma.videoStream.findUnique({
      where: { id: streamId },
      select: { id: true, userId: true, status: true },
    })
    if (!stream) return fail(GuestErrors.STREAM_NOT_FOUND, 404)

    const authority = userId
      ? await resolveGuestAuthority(userId, stream.userId)
      : { isHost: false, isModerator: false, canManage: false, role: null }

    const pending = await prisma.liveGuestInvite.findMany({
      where: {
        streamId,
        status: 'pending',
        ...(authority.canManage ? {} : { guestId: userId || '__none__' }),
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    })
    const pendingUserIds = Array.from(new Set(pending.map(p => p.guestId)))
    const pendingUsers = pendingUserIds.length
      ? await prisma.user.findMany({
          where: { id: { in: pendingUserIds } },
          select: { id: true, name: true, username: true, image: true },
        })
      : []
    const uMap = new Map(pendingUsers.map(u => [u.id, u]))

    return NextResponse.json({
      streamId,
      streamStatus: stream.status,
      hostId: stream.userId,
      serverTime: new Date().toISOString(),
      count,
      maxGuests,
      gridSlots,
      guests,
      me: userId
        ? {
            userId,
            isHost: authority.isHost,
            isModerator: authority.isModerator,
            canManage: authority.canManage,
            isGuest: guests.some(g => g.userId === userId),
            slot: guests.find(g => g.userId === userId)?.slot ?? null,
          }
        : null,
      pending: pending.map(p => ({
        id: p.id,
        kind: p.kind,
        status: p.status,
        streamId: p.streamId,
        hostId: p.hostId,
        guestId: p.guestId,
        guestName: uMap.get(p.guestId)?.name || uMap.get(p.guestId)?.username || 'Kullanıcı',
        guestImage: uMap.get(p.guestId)?.image || null,
        message: p.message,
        createdAt: p.createdAt,
        expiresAt: p.expiresAt,
      })),
    })
  } catch (e) {
    console.error('live/guest GET error:', e)
    return NextResponse.json({ error: 'Misafir listesi alınamadı' }, { status: 500 })
  }
}

/**
 * POST /api/live/guest
 * Body: { streamId, action, ... }
 * action:
 *   request | cancel_request        — izleyici → yayın sahibi katilma talebi
 *   invite  | respond               — yayın sahibi → izleyici daveti
 *   approve | reject                — yayın sahibi talebi sonuçlandırır
 *   join | leave | kick | mute | camera | move
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await currentUserId(req)
    if (!userId) return NextResponse.json({ error: 'Giriş yapmalısınız', code: 'UNAUTHORIZED' }, { status: 401 })

    const limited = await guardRateLimit(req, 'api_default', { userId })
    if (limited) return limited

    const body = await req.json().catch(() => ({}))
    const streamId: string | null = body?.streamId ?? body?.roomId ?? null
    const action: string = body?.action ?? ''
    if (!streamId) return fail(GuestErrors.VALIDATION_ERROR, 400, { error: 'streamId gerekli' })

    const stream = await prisma.videoStream.findUnique({
      where: { id: streamId },
      select: { id: true, userId: true, status: true },
    })
    if (!stream) return fail(GuestErrors.STREAM_NOT_FOUND, 404)

    const { maxGuests, requestTtlSec, inviteTtlSec } = await getGuestLimits()
    const authority = await resolveGuestAuthority(userId, stream.userId)
    const isHost = authority.isHost
    const canManage = authority.canManage
    const ip = getAuditIp(req)

    await expireStalePending(streamId)

    const activeCount = () => prisma.liveGuestSession.count({ where: { streamId, status: 'active' } })

    // ──────────── REQUEST (izleyici → host) ────────────
    if (action === 'request') {
      if (stream.status && stream.status !== 'live' && stream.status !== 'active') {
        return fail(GuestErrors.STREAM_ENDED, 409)
      }
      if (isHost) return fail(GuestErrors.VALIDATION_ERROR, 400, { error: 'Yayın sahibi talep gönderemez' })

      const already = await prisma.liveGuestSession.findUnique({
        where: { streamId_userId: { streamId, userId } },
      })
      if (already?.status === 'active') return fail(GuestErrors.GUEST_ALREADY_JOINED, 409)

      const pending = await prisma.liveGuestInvite.findFirst({
        where: { streamId, guestId: userId, status: 'pending' },
      })
      if (pending) {
        return NextResponse.json({ request: pending, alreadyPending: true, code: GuestErrors.GUEST_ALREADY_REQUESTED })
      }

      if ((await activeCount()) >= maxGuests) return fail(GuestErrors.GUEST_SLOT_FULL, 409)

      const message = typeof body?.message === 'string' ? body.message.slice(0, 140) : null
      const request = await prisma.liveGuestInvite.create({
        data: {
          streamId,
          hostId: stream.userId,
          guestId: userId,
          kind: 'request',
          status: 'pending',
          message,
          expiresAt: new Date(Date.now() + requestTtlSec * 1000),
        },
      })
      const me = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, username: true, image: true },
      })
      emitGuestRequestEvent(streamId, 'guest_request_created', {
        requestId: request.id,
        guestId: userId,
        guestName: me?.name || me?.username || 'Kullanıcı',
        guestImage: me?.image || null,
        message,
        expiresAt: request.expiresAt,
      })
      return NextResponse.json({ request })
    }

    // ──────────── CANCEL REQUEST ────────────
    if (action === 'cancel_request' || action === 'cancel') {
      const requestId: string | null = body?.requestId ?? body?.inviteId ?? null
      const where = requestId
        ? { id: requestId }
        : undefined
      const record = requestId
        ? await prisma.liveGuestInvite.findUnique({ where: where as any })
        : await prisma.liveGuestInvite.findFirst({ where: { streamId, guestId: userId, status: 'pending' } })
      if (!record) return fail(GuestErrors.GUEST_REQUEST_NOT_FOUND, 404)
      if (record.guestId !== userId && !canManage) return fail(GuestErrors.GUEST_NOT_AUTHORIZED, 403)
      if (record.status !== 'pending') return fail(GuestErrors.GUEST_REQUEST_ALREADY_RESOLVED, 409)

      await prisma.liveGuestInvite.update({
        where: { id: record.id },
        data: { status: 'cancelled', cancelledAt: new Date(), respondedAt: new Date(), respondedBy: userId },
      })
      emitGuestRequestEvent(streamId, 'guest_request_cancelled', { requestId: record.id, guestId: record.guestId })
      return NextResponse.json({ ok: true, requestId: record.id })
    }

    // ──────────── INVITE (host → izleyici) ────────────
    if (action === 'invite') {
      if (!canManage) return fail(GuestErrors.GUEST_NOT_AUTHORIZED, 403)
      const guestId: string | null = body?.guestId ?? body?.guestUserId ?? null
      if (!guestId) return fail(GuestErrors.VALIDATION_ERROR, 400, { error: 'guestId gerekli' })
      if (guestId === stream.userId) return fail(GuestErrors.VALIDATION_ERROR, 400)

      const guestUser = await prisma.user.findUnique({ where: { id: guestId }, select: { id: true } })
      if (!guestUser) return fail(GuestErrors.GUEST_NOT_FOUND, 404)

      const existing = await prisma.liveGuestSession.findUnique({
        where: { streamId_userId: { streamId, userId: guestId } },
      })
      if (existing?.status === 'active') return fail(GuestErrors.GUEST_ALREADY_JOINED, 409)
      if ((await activeCount()) >= maxGuests) return fail(GuestErrors.GUEST_SLOT_FULL, 409)

      // Aynı kişiye bekleyen davet varsa tazele (tekrar davet — §2)
      await prisma.liveGuestInvite.updateMany({
        where: { streamId, guestId, status: 'pending' },
        data: { status: 'cancelled', cancelledAt: new Date(), respondedBy: userId },
      })

      const invite = await prisma.liveGuestInvite.create({
        data: {
          streamId,
          hostId: stream.userId,
          guestId,
          kind: 'invite',
          status: 'pending',
          expiresAt: new Date(Date.now() + inviteTtlSec * 1000),
        },
      })
      emitGuestRequestEvent(streamId, 'guest_invited', {
        inviteId: invite.id,
        guestId,
        expiresAt: invite.expiresAt,
      })
      return NextResponse.json({ invite })
    }

    // ──────────── RESPOND (davet edilen kişi cevaplar) ────────────
    if (action === 'respond') {
      const inviteId: string | null = body?.inviteId ?? body?.requestId ?? null
      const accept: boolean = body?.accept === true || body?.response === 'accept'
      if (!inviteId) return fail(GuestErrors.VALIDATION_ERROR, 400, { error: 'inviteId gerekli' })

      const invite = await prisma.liveGuestInvite.findUnique({ where: { id: inviteId } })
      if (!invite) return fail(GuestErrors.GUEST_REQUEST_NOT_FOUND, 404)
      if (invite.guestId !== userId) return fail(GuestErrors.GUEST_NOT_AUTHORIZED, 403)
      if (invite.status !== 'pending') return fail(GuestErrors.GUEST_REQUEST_ALREADY_RESOLVED, 409)
      if (invite.expiresAt.getTime() < Date.now()) {
        await prisma.liveGuestInvite.update({ where: { id: inviteId }, data: { status: 'expired', respondedAt: new Date() } })
        return fail(GuestErrors.GUEST_REQUEST_EXPIRED, 410)
      }

      await prisma.liveGuestInvite.update({
        where: { id: inviteId },
        data: { status: accept ? 'accepted' : 'rejected', respondedAt: new Date(), respondedBy: userId },
      })

      if (!accept) {
        emitGuestRequestEvent(streamId, 'guest_request_rejected', { inviteId, requestId: inviteId, guestId: userId })
        return NextResponse.json({ accepted: false })
      }

      const result = await seatGuest(streamId, userId, maxGuests, 'invite', stream.userId)
      if ('code' in result) return fail(result.code, result.status)
      const { guests } = await broadcastGuests(streamId, 'guest_joined', { guestId: userId, slot: result.session.slot })
      return NextResponse.json({ accepted: true, session: result.session, guests })
    }

    // ──────────── APPROVE / REJECT (host talebi sonuçlandırır) ────────────
    if (action === 'approve' || action === 'reject') {
      if (!canManage) return fail(GuestErrors.GUEST_NOT_AUTHORIZED, 403)
      const requestId: string | null = body?.requestId ?? body?.inviteId ?? null
      if (!requestId) return fail(GuestErrors.VALIDATION_ERROR, 400, { error: 'requestId gerekli' })

      const request = await prisma.liveGuestInvite.findUnique({ where: { id: requestId } })
      if (!request || request.streamId !== streamId) return fail(GuestErrors.GUEST_REQUEST_NOT_FOUND, 404)
      if (request.status !== 'pending') return fail(GuestErrors.GUEST_REQUEST_ALREADY_RESOLVED, 409)
      if (request.expiresAt.getTime() < Date.now()) {
        await prisma.liveGuestInvite.update({ where: { id: requestId }, data: { status: 'expired', respondedAt: new Date() } })
        return fail(GuestErrors.GUEST_REQUEST_EXPIRED, 410)
      }

      if (action === 'reject') {
        await prisma.liveGuestInvite.update({
          where: { id: requestId },
          data: { status: 'rejected', respondedAt: new Date(), respondedBy: userId },
        })
        emitGuestRequestEvent(streamId, 'guest_request_rejected', { requestId, guestId: request.guestId })
        return NextResponse.json({ ok: true, status: 'rejected' })
      }

      const result = await seatGuest(streamId, request.guestId, maxGuests, 'request', userId, body?.slot)
      if ('code' in result) return fail(result.code, result.status)

      await prisma.liveGuestInvite.update({
        where: { id: requestId },
        data: { status: 'accepted', respondedAt: new Date(), respondedBy: userId },
      })
      emitGuestRequestEvent(streamId, 'guest_request_accepted', { requestId, guestId: request.guestId })
      const { guests } = await broadcastGuests(streamId, 'guest_joined', {
        guestId: request.guestId,
        slot: result.session.slot,
      })
      await recordAudit({
        actorId: userId,
        action: 'live_guest.approve',
        targetType: 'live_guest_session',
        targetId: result.session.id,
        description: `Misafir onaylandı (stream ${streamId})`,
        metadata: { streamId, guestId: request.guestId, slot: result.session.slot },
        ip,
      })
      return NextResponse.json({ ok: true, status: 'accepted', session: result.session, guests })
    }

    // ──────────── JOIN (yalnızca onaylı) ────────────
    if (action === 'join') {
      const existing = await prisma.liveGuestSession.findUnique({
        where: { streamId_userId: { streamId, userId } },
      })
      if (existing?.status === 'active') {
        await prisma.liveGuestSession.update({
          where: { id: existing.id },
          data: { lastSeenAt: new Date() },
        })
        const guests = await listGuests(streamId)
        return NextResponse.json({ session: existing, guests, rejoined: true })
      }
      if (existing?.status === 'removed') return fail(GuestErrors.GUEST_NOT_AUTHORIZED, 403)

      // Onay zorunlu (§1): host/moderatör değilse kabul edilmiş bir talep/davet aranmalı
      if (!canManage) {
        const approved = await prisma.liveGuestInvite.findFirst({
          where: { streamId, guestId: userId, status: 'accepted' },
          orderBy: { respondedAt: 'desc' },
        })
        if (!approved) return fail(GuestErrors.GUEST_NOT_APPROVED, 403)
      }

      const result = await seatGuest(streamId, userId, maxGuests, canManage ? 'host' : 'invite', userId)
      if ('code' in result) return fail(result.code, result.status)
      const { guests } = await broadcastGuests(streamId, 'guest_joined', { guestId: userId, slot: result.session.slot })
      return NextResponse.json({ session: result.session, guests })
    }

    // ──────────── LEAVE ────────────
    if (action === 'leave') {
      await prisma.liveGuestSession.updateMany({
        where: { streamId, userId, status: 'active' },
        data: { status: 'left', leftAt: new Date() },
      })
      const { guests } = await broadcastGuests(streamId, 'guest_left', { guestId: userId })
      return NextResponse.json({ ok: true, guests })
    }

    // ──────────── KICK ────────────
    if (action === 'kick' || action === 'remove') {
      if (!canManage) return fail(GuestErrors.GUEST_NOT_AUTHORIZED, 403)
      const guestId: string | null = body?.guestId ?? body?.userId ?? null
      if (!guestId) return fail(GuestErrors.VALIDATION_ERROR, 400, { error: 'guestId gerekli' })
      const target = await prisma.liveGuestSession.findUnique({
        where: { streamId_userId: { streamId, userId: guestId } },
      })
      if (!target || target.status !== 'active') return fail(GuestErrors.GUEST_NOT_FOUND, 404)

      await prisma.$transaction([
        prisma.liveGuestSession.update({
          where: { id: target.id },
          data: { status: 'removed', leftAt: new Date() },
        }),
        prisma.liveGuestInvite.updateMany({
          where: { streamId, guestId, status: { in: ['pending', 'accepted'] } },
          data: { status: 'removed', respondedAt: new Date(), respondedBy: userId },
        }),
      ])
      const { guests } = await broadcastGuests(streamId, 'guest_removed', { guestId })
      await recordAudit({
        actorId: userId,
        action: 'live_guest.remove',
        targetType: 'live_guest_session',
        targetId: target.id,
        description: `Misafir yayından çıkarıldı (stream ${streamId})`,
        metadata: { streamId, guestId },
        ip,
      })
      return NextResponse.json({ ok: true, guests })
    }

    // ──────────── MUTE / CAMERA ────────────
    if (action === 'mute' || action === 'camera') {
      const guestId: string = body?.guestId ?? body?.userId ?? userId
      if (guestId !== userId && !canManage) return fail(GuestErrors.GUEST_NOT_AUTHORIZED, 403)

      const target = await prisma.liveGuestSession.findUnique({
        where: { streamId_userId: { streamId, userId: guestId } },
      })
      if (!target || target.status !== 'active') return fail(GuestErrors.GUEST_NOT_FOUND, 404)

      // Host tarafından susturulan misafir kendi kendini açamaz (§2)
      const data: any = { lastSeenAt: new Date() }
      let event = 'guest_updated'
      if (typeof body?.muted === 'boolean') {
        const byHost = canManage && guestId !== userId
        if (!byHost && target.mutedByHost && body.muted === false) {
          return fail(GuestErrors.GUEST_NOT_AUTHORIZED, 403)
        }
        data.isMuted = body.muted
        if (byHost) data.mutedByHost = body.muted
        event = 'guest_muted'
      }
      if (typeof body?.videoOff === 'boolean') {
        data.isVideoOff = body.videoOff
        event = 'guest_camera_off'
      }

      await prisma.liveGuestSession.update({ where: { id: target.id }, data })
      const { guests } = await broadcastGuests(streamId, event, { guestId })
      return NextResponse.json({ ok: true, guests })
    }

    // ──────────── MOVE (pozisyon değiştirme, örn. 2 → 8) ────────────
    if (action === 'move' || action === 'position') {
      if (!canManage) return fail(GuestErrors.GUEST_NOT_AUTHORIZED, 403)
      const guestId: string | null = body?.guestId ?? body?.userId ?? null
      const slot = Number(body?.slot ?? body?.toSlot)
      if (!guestId || !Number.isInteger(slot) || slot < 1 || slot > maxGuests) {
        return fail(GuestErrors.VALIDATION_ERROR, 400, { error: 'guestId ve geçerli slot gerekli' })
      }

      const moved = await prisma.$transaction(async tx => {
        const target = await tx.liveGuestSession.findUnique({
          where: { streamId_userId: { streamId, userId: guestId } },
        })
        if (!target || target.status !== 'active') return { err: GuestErrors.GUEST_NOT_FOUND, status: 404 }
        if (target.slot === slot) return { ok: true, from: slot, to: slot }

        const occupant = await tx.liveGuestSession.findFirst({
          where: { streamId, status: 'active', slot },
        })
        if (occupant) {
          // Yer değiştirme (swap) — geçici slot ile çakışma önlenir
          await tx.liveGuestSession.update({ where: { id: occupant.id }, data: { slot: -1 } })
          await tx.liveGuestSession.update({ where: { id: target.id }, data: { slot } })
          await tx.liveGuestSession.update({ where: { id: occupant.id }, data: { slot: target.slot } })
          return { ok: true, from: target.slot, to: slot, swappedWith: occupant.userId }
        }
        await tx.liveGuestSession.update({ where: { id: target.id }, data: { slot } })
        return { ok: true, from: target.slot, to: slot }
      })

      if ('err' in moved) return fail(moved.err as string, moved.status as number)
      const { guests, gridSlots } = await broadcastGuests(streamId, 'guest_position_changed', {
        guestId,
        fromSlot: moved.from,
        toSlot: moved.to,
        swappedWith: (moved as any).swappedWith ?? null,
      })
      return NextResponse.json({ ok: true, guests, gridSlots, from: moved.from, to: moved.to })
    }

    return NextResponse.json({ error: 'Geçersiz action', code: GuestErrors.VALIDATION_ERROR }, { status: 400 })
  } catch (e) {
    console.error('live/guest POST error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

/**
 * Misafiri boş bir pozisyona oturtur. Kontenjan kontrolü ve slot seçimi
 * transaction içinde yapılır; eşzamanlı iki kabulde ikinci istek
 * GUEST_SLOT_FULL alır (§3 race condition).
 */
async function seatGuest(
  streamId: string,
  guestId: string,
  maxGuests: number,
  source: string,
  approvedBy: string,
  preferredSlot?: any
): Promise<{ session: any } | { code: string; status: number }> {
  try {
    const session = await prisma.$transaction(async tx => {
      const active = await tx.liveGuestSession.findMany({
        where: { streamId, status: 'active' },
        select: { slot: true, userId: true },
      })
      if (active.some(a => a.userId === guestId)) {
        throw Object.assign(new Error('joined'), { guestCode: GuestErrors.GUEST_ALREADY_JOINED, guestStatus: 409 })
      }
      if (active.length >= maxGuests) {
        throw Object.assign(new Error('full'), { guestCode: GuestErrors.GUEST_SLOT_FULL, guestStatus: 409 })
      }
      const used = new Set(active.map(a => a.slot))
      let slot: number | null = null
      const wanted = Number(preferredSlot)
      if (Number.isInteger(wanted) && wanted >= 1 && wanted <= maxGuests && !used.has(wanted)) {
        slot = wanted
      } else {
        for (let i = 1; i <= maxGuests; i++) {
          if (!used.has(i)) {
            slot = i
            break
          }
        }
      }
      if (slot === null) {
        throw Object.assign(new Error('full'), { guestCode: GuestErrors.GUEST_SLOT_FULL, guestStatus: 409 })
      }
      return tx.liveGuestSession.upsert({
        where: { streamId_userId: { streamId, userId: guestId } },
        create: { streamId, userId: guestId, slot, status: 'active', source, approvedBy },
        update: { status: 'active', slot, source, approvedBy, leftAt: null, lastSeenAt: new Date() },
      })
    })
    return { session }
  } catch (err: any) {
    if (err?.guestCode) return { code: err.guestCode, status: err.guestStatus || 409 }
    console.error('seatGuest error:', err)
    return { code: GuestErrors.GUEST_SLOT_FULL, status: 409 }
  }
}
