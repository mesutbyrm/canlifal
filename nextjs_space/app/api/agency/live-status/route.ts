import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

/**
 * §19 — Ajans Canlı Takip
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const user = (auth as any).user

  const isAdmin = ['admin', 'yonetici', 'kurucu', 'moderator'].includes(user.role)
  let agencyId: string | null = null
  const qAgencyId = req.nextUrl.searchParams.get('agencyId')
  if (isAdmin && qAgencyId) {
    agencyId = qAgencyId
  } else {
    const owned = await prisma.agency.findFirst({ where: { ownerId: user.id, status: 'approved' }, select: { id: true } })
    const membership = await prisma.agencyUser.findUnique({ where: { userId: user.id }, select: { agencyId: true, role: true, isActive: true } })
    agencyId = owned?.id || (membership?.isActive && ['owner', 'manager'].includes(membership.role) ? membership.agencyId : null)
  }
  if (!agencyId) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Ajans canlı takip yetkiniz yok' } }, { status: 403 })
  }

  const members = await prisma.agencyUser.findMany({
    where: { agencyId, isActive: true },
    select: { userId: true, role: true, user: { select: { id: true, name: true, username: true, image: true, lastActiveAt: true } } },
  })
  const userIds = members.map(m => m.userId)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)

  const [liveStreams, voiceSessions, roomPresences, roomOwners] = await Promise.all([
    prisma.videoStream.findMany({ where: { userId: { in: userIds }, status: 'live' }, select: { userId: true, id: true, title: true, viewerCount: true, startedAt: true, category: true } }),
    prisma.voiceSession.findMany({ where: { userId: { in: userIds }, isActive: true, lastPing: { gte: fiveMinAgo } }, select: { userId: true, roomId: true, joinedAt: true } }),
    prisma.chatPresence.findMany({ where: { userId: { in: userIds }, lastSeen: { gte: fiveMinAgo } }, select: { userId: true, roomId: true, seatIndex: true, lastSeen: true } }),
    prisma.chatRoom.findMany({ where: { ownerId: { in: userIds }, isActive: true }, select: { id: true, ownerId: true, nameTr: true } }),
  ])

  const streamMap = new Map<string, (typeof liveStreams)[0]>()
  for (const s of liveStreams) streamMap.set(s.userId, s)
  const voiceMap = new Map<string, (typeof voiceSessions)[0]>()
  for (const v of voiceSessions) voiceMap.set(v.userId, v)
  const presenceMap = new Map<string, (typeof roomPresences)[0]>()
  for (const p of roomPresences) presenceMap.set(p.userId, p)
  const ownerRooms = new Map<string, string>()
  for (const r of roomOwners) if (r.ownerId) ownerRooms.set(r.ownerId, r.id)

  const now = new Date()
  const result = members.map(m => {
    const u = m.user
    const stream = streamMap.get(m.userId)
    const voice = voiceMap.get(m.userId)
    const presence = presenceMap.get(m.userId)
    const ownedRoom = ownerRooms.get(m.userId)

    let status: string, statusEmoji: string, statusLabel: string
    let detail: any = null

    if (stream) {
      status = 'live_streaming'; statusEmoji = '🟢'; statusLabel = 'Canlı yayında'
      detail = { streamId: stream.id, title: stream.title, viewerCount: stream.viewerCount, durationMinutes: Math.round((now.getTime() - stream.startedAt.getTime()) / 60000), category: stream.category }
    } else if (voice) {
      status = 'voice_room'; statusEmoji = '🔵'; statusLabel = 'Sesli sohbet odasında'
      detail = { roomId: voice.roomId, durationMinutes: Math.round((now.getTime() - voice.joinedAt.getTime()) / 60000) }
    } else if (presence && ownedRoom && presence.roomId === ownedRoom) {
      status = 'room_owner'; statusEmoji = '🟣'; statusLabel = 'Oda sahibi (odada)'
      detail = { roomId: presence.roomId, seatIndex: presence.seatIndex }
    } else if (presence) {
      status = 'room_guest'; statusEmoji = '🟡'; statusLabel = 'Odada misafir'
      detail = { roomId: presence.roomId, seatIndex: presence.seatIndex }
    } else {
      status = 'offline'; statusEmoji = '⚪'; statusLabel = 'Çevrimdışı'
      if (u.lastActiveAt) detail = { lastSeenMinutes: Math.round((now.getTime() - u.lastActiveAt.getTime()) / 60000) }
    }

    return { userId: m.userId, name: u.name, username: u.username, image: u.image, role: m.role, status, statusEmoji, statusLabel, detail }
  })

  const statusOrder: Record<string, number> = { live_streaming: 0, voice_room: 1, room_owner: 2, room_guest: 3, offline: 4 }
  result.sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9))

  return NextResponse.json({
    success: true,
    data: {
      members: result,
      summary: {
        total: result.length,
        live_streaming: result.filter(r => r.status === 'live_streaming').length,
        voice_room: result.filter(r => r.status === 'voice_room').length,
        room_active: result.filter(r => r.status === 'room_owner' || r.status === 'room_guest').length,
        offline: result.filter(r => r.status === 'offline').length,
      },
    },
  })
}
