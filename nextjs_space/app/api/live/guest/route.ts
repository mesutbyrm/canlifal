export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { emitStreamEvent } from '@/lib/stream-events'

const MAX_GUESTS = 8
const INVITE_TTL_MS = 60_000

async function currentUserId(req: NextRequest): Promise<string | null> {
  const mobileUser = await authenticateRequest(req)
  if (mobileUser?.id) return mobileUser.id
  const session = await getServerSession(authOptions)
  return session?.user?.id || null
}

async function listGuests(streamId: string) {
  const sessions = await prisma.liveGuestSession.findMany({
    where: { streamId, status: 'active' },
    orderBy: { slot: 'asc' }
  })
  const users = sessions.length
    ? await prisma.user.findMany({
        where: { id: { in: sessions.map(s => s.userId) } },
        select: { id: true, name: true, username: true, image: true }
      })
    : []
  const userMap = new Map(users.map(u => [u.id, u]))
  return sessions.map(s => {
    const u = userMap.get(s.userId)
    return {
      id: s.id,
      streamId: s.streamId,
      userId: s.userId,
      name: u?.name || u?.username || 'Kullanıcı',
      image: u?.image || null,
      slot: s.slot,
      status: s.status,
      isMuted: s.isMuted,
      isVideoOff: s.isVideoOff,
      mutedByHost: s.mutedByHost,
      joinedAt: s.joinedAt,
      lastSeenAt: s.lastSeenAt
    }
  })
}

async function nextFreeSlot(streamId: string): Promise<number | null> {
  const taken = await prisma.liveGuestSession.findMany({
    where: { streamId, status: 'active' },
    select: { slot: true }
  })
  const used = new Set(taken.map(t => t.slot))
  for (let i = 1; i <= MAX_GUESTS; i++) if (!used.has(i)) return i
  return null
}

async function broadcast(streamId: string, event: string, extra: any = {}) {
  const guests = await listGuests(streamId)
  emitStreamEvent(streamId, 'guest', {
    type: 'guest',
    event,
    streamId,
    count: guests.length,
    maxGuests: MAX_GUESTS,
    guests,
    ...extra
  })
  return guests
}

/**
 * GET /api/live/guest?streamId=... — misafir listesi (list ile aynı)
 */
export async function GET(req: NextRequest) {
  try {
    const streamId = req.nextUrl.searchParams.get('streamId') || req.nextUrl.searchParams.get('roomId')
    if (!streamId) {
      return NextResponse.json({ count: 0, maxGuests: MAX_GUESTS, gridSlots: 2, guests: [] })
    }
    const guests = await listGuests(streamId)
    const count = guests.length
    const gridSlots = count <= 2 ? 2 : count <= 4 ? 4 : count <= 6 ? 6 : MAX_GUESTS
    return NextResponse.json({ count, maxGuests: MAX_GUESTS, gridSlots, guests })
  } catch (e) {
    console.error('live/guest GET error:', e)
    return NextResponse.json({ error: 'Misafir listesi alınamadı' }, { status: 500 })
  }
}

/**
 * POST /api/live/guest
 * Body: { streamId, action, guestId?, inviteId?, muted?, videoOff? }
 * action: invite | respond | join | leave | kick | mute
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await currentUserId(req)
    if (!userId) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const streamId: string | null = body?.streamId ?? body?.roomId ?? null
    const action: string = body?.action ?? ''
    if (!streamId) return NextResponse.json({ error: 'streamId gerekli' }, { status: 400 })

    const stream = await prisma.videoStream.findUnique({
      where: { id: streamId },
      select: { id: true, userId: true, status: true }
    })
    if (!stream) return NextResponse.json({ error: 'Yayın bulunamadı' }, { status: 404 })
    const isHost = stream.userId === userId

    // ──────────── INVITE ────────────
    if (action === 'invite') {
      if (!isHost) return NextResponse.json({ error: 'Sadece yayın sahibi davet edebilir' }, { status: 403 })
      const guestId: string | null = body?.guestId ?? body?.guestUserId ?? null
      if (!guestId) return NextResponse.json({ error: 'guestId gerekli' }, { status: 400 })

      const active = await prisma.liveGuestSession.count({ where: { streamId, status: 'active' } })
      if (active >= MAX_GUESTS) return NextResponse.json({ error: 'Misafir kontenjanı dolu' }, { status: 400 })

      const invite = await prisma.liveGuestInvite.create({
        data: {
          streamId,
          hostId: userId,
          guestId,
          status: 'pending',
          expiresAt: new Date(Date.now() + INVITE_TTL_MS)
        }
      })
      emitStreamEvent(streamId, 'guest', {
        type: 'guest', event: 'guest_invited', streamId, inviteId: invite.id, guestId, expiresAt: invite.expiresAt
      })
      return NextResponse.json({ invite })
    }

    // ──────────── RESPOND ────────────
    if (action === 'respond') {
      const inviteId: string | null = body?.inviteId ?? null
      const accept: boolean = body?.accept === true || body?.response === 'accept'
      if (!inviteId) return NextResponse.json({ error: 'inviteId gerekli' }, { status: 400 })

      const invite = await prisma.liveGuestInvite.findUnique({ where: { id: inviteId } })
      if (!invite) return NextResponse.json({ error: 'Davet bulunamadı' }, { status: 404 })
      if (invite.guestId !== userId) return NextResponse.json({ error: 'Bu davet size ait değil' }, { status: 403 })
      if (invite.status !== 'pending') return NextResponse.json({ error: 'Davet artık geçerli değil' }, { status: 400 })
      if (invite.expiresAt.getTime() < Date.now()) {
        await prisma.liveGuestInvite.update({ where: { id: inviteId }, data: { status: 'expired' } })
        return NextResponse.json({ error: 'Davetin süresi doldu' }, { status: 400 })
      }

      await prisma.liveGuestInvite.update({
        where: { id: inviteId },
        data: { status: accept ? 'accepted' : 'rejected', respondedAt: new Date() }
      })

      if (!accept) {
        emitStreamEvent(streamId, 'guest', { type: 'guest', event: 'guest_rejected', streamId, inviteId, guestId: userId })
        return NextResponse.json({ accepted: false })
      }

      const slot = await nextFreeSlot(streamId)
      if (slot === null) return NextResponse.json({ error: 'Misafir kontenjanı dolu' }, { status: 400 })

      const guestSession = await prisma.liveGuestSession.upsert({
        where: { streamId_userId: { streamId, userId } },
        create: { streamId, userId, slot, status: 'active' },
        update: { status: 'active', slot, leftAt: null, lastSeenAt: new Date() }
      })
      const guests = await broadcast(streamId, 'guest_joined', { guestId: userId })
      return NextResponse.json({ accepted: true, session: guestSession, guests })
    }

    // ──────────── JOIN ────────────
    if (action === 'join') {
      const existing = await prisma.liveGuestSession.findUnique({
        where: { streamId_userId: { streamId, userId } }
      })
      const slot = existing?.status === 'active' ? existing.slot : await nextFreeSlot(streamId)
      if (slot === null) return NextResponse.json({ error: 'Misafir kontenjanı dolu' }, { status: 400 })

      const guestSession = await prisma.liveGuestSession.upsert({
        where: { streamId_userId: { streamId, userId } },
        create: { streamId, userId, slot, status: 'active' },
        update: { status: 'active', slot, leftAt: null, lastSeenAt: new Date() }
      })
      const guests = await broadcast(streamId, 'guest_joined', { guestId: userId })
      return NextResponse.json({ session: guestSession, guests })
    }

    // ──────────── LEAVE ────────────
    if (action === 'leave') {
      await prisma.liveGuestSession.updateMany({
        where: { streamId, userId },
        data: { status: 'left', leftAt: new Date() }
      })
      const guests = await broadcast(streamId, 'guest_left', { guestId: userId })
      return NextResponse.json({ ok: true, guests })
    }

    // ──────────── KICK ────────────
    if (action === 'kick') {
      if (!isHost) return NextResponse.json({ error: 'Sadece yayın sahibi çıkarabilir' }, { status: 403 })
      const guestId: string | null = body?.guestId ?? body?.userId ?? null
      if (!guestId) return NextResponse.json({ error: 'guestId gerekli' }, { status: 400 })
      await prisma.liveGuestSession.updateMany({
        where: { streamId, userId: guestId },
        data: { status: 'removed', leftAt: new Date() }
      })
      const guests = await broadcast(streamId, 'guest_removed', { guestId })
      return NextResponse.json({ ok: true, guests })
    }

    // ──────────── MUTE / VIDEO ────────────
    if (action === 'mute') {
      const guestId: string = body?.guestId ?? body?.userId ?? userId
      if (guestId !== userId && !isHost) {
        return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
      }
      const data: any = { lastSeenAt: new Date() }
      if (typeof body?.muted === 'boolean') {
        data.isMuted = body.muted
        if (isHost && guestId !== userId) data.mutedByHost = body.muted
      }
      if (typeof body?.videoOff === 'boolean') data.isVideoOff = body.videoOff

      await prisma.liveGuestSession.updateMany({ where: { streamId, userId: guestId }, data })
      const guests = await broadcast(streamId, 'guest_updated', { guestId })
      return NextResponse.json({ ok: true, guests })
    }

    return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 })
  } catch (e) {
    console.error('live/guest POST error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
