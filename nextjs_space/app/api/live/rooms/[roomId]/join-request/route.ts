import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { isPasswordGatedRoom, canBypassRoomGate, APPROVAL_TTL_MS } from '@/lib/room-access'
import { canRespondToJoinRequests, fail, resolveAuthAndRoom } from '@/lib/room-join-auth'
import { emitJoinRequest } from '@/lib/voice-room-events'
import { createNotificationWithPush } from '@/lib/notify'
import { recordAudit } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

/**
 * POST /api/live/rooms/{roomId}/join-request
 * Şifreyi bilmeyen kullanıcı oda sahibinden giriş izni ister.
 * Kullanıcı + oda başına YALNIZCA 1 istek (tekrar → 409 ALREADY_REQUESTED).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params
    const ctx = await resolveAuthAndRoom(request, roomId)
    if ('error' in ctx) return ctx.error
    const { user, room } = ctx

    const limited = await guardRateLimit(request, 'room_join_request', { userId: user.id, limit: 5, windowMs: 60_000 })
    if (limited) return limited

    if (!isPasswordGatedRoom(room) || !room.ownerId) {
      return fail(400, 'ROOM_NOT_PASSWORD_PROTECTED', 'Bu oda için giriş izni gerekmiyor')
    }
    if (await canBypassRoomGate(room, user.id, user.role)) {
      return fail(400, 'ALREADY_ALLOWED', 'Bu odaya zaten girebilirsiniz')
    }
    const ban = await prisma.chatBan.findUnique({ where: { roomId_userId: { roomId: room.id, userId: user.id } } })
    if (ban && (!ban.expiresAt || ban.expiresAt > new Date())) {
      return fail(403, 'BANNED', 'Bu odadan yasaklısınız')
    }

    const existing = await prisma.roomJoinRequest.findUnique({
      where: { roomId_requesterId: { roomId: room.id, requesterId: user.id } },
    })
    if (existing) {
      return fail(409, 'ALREADY_REQUESTED', 'Bu oda için zaten bir giriş isteği gönderdiniz', { status: existing.status })
    }

    let created
    try {
      created = await prisma.roomJoinRequest.create({
        data: { roomId: room.id, requesterId: user.id, ownerId: room.ownerId },
      })
    } catch {
      // Eşzamanlı çift istek: unique kısıtı ikincisini engeller.
      return fail(409, 'ALREADY_REQUESTED', 'Bu oda için zaten bir giriş isteği gönderdiniz')
    }

    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, username: true, image: true },
    })
    emitJoinRequest(room.id, {
      requestId: created.id,
      userId: user.id,
      userName: me?.name || 'Kullanıcı',
      username: me?.username,
      avatar: me?.image,
    })
    createNotificationWithPush({
      userId: room.ownerId,
      type: 'room_join_request',
      title: 'Odaya Giriş İsteği',
      message: `${me?.username ? '@' + me.username : me?.name || 'Bir kullanıcı'} odaya girmek istiyor`,
      fromUserId: user.id,
      fromUserName: me?.name || undefined,
      targetPath: `/voice-room/${room.slug || room.id}`,
      targetId: room.id,
      urgent: true,
    }).catch(() => {})
    await recordAudit({
      actorId: user.id,
      action: 'room_join_request',
      targetType: 'ChatRoom',
      targetId: room.id,
      description: 'Şifreli VIP odaya giriş izni istendi',
    })
    return NextResponse.json({ success: true, data: { requestId: created.id, status: created.status } })
  } catch (e) {
    console.error('join-request create error:', e)
    return fail(500, 'INTERNAL_ERROR', 'İstek gönderilemedi')
  }
}

/**
 * GET /api/live/rooms/{roomId}/join-request
 *  - Oda sahibi / yönetici: bekleyen istekler (`?status=pending` varsayılan).
 *  - Diğer kullanıcılar: yalnızca kendi isteğinin durumu.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params
    const ctx = await resolveAuthAndRoom(request, roomId)
    if ('error' in ctx) return ctx.error
    const { user, room } = ctx

    if (await canRespondToJoinRequests(room, user.id, user.role)) {
      const status = request.nextUrl.searchParams.get('status') || 'pending'
      const rows = await prisma.roomJoinRequest.findMany({
        where: { roomId: room.id, ...(status === 'all' ? {} : { status }) },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      const users = await prisma.user.findMany({
        where: { id: { in: rows.map((r) => r.requesterId) } },
        select: { id: true, name: true, username: true, image: true },
      })
      const byId = new Map(users.map((u) => [u.id, u]))
      return NextResponse.json({
        success: true,
        data: {
          requests: rows.map((r) => ({
            id: r.id,
            status: r.status,
            createdAt: r.createdAt,
            respondedAt: r.respondedAt,
            user: byId.get(r.requesterId) ?? { id: r.requesterId },
          })),
        },
      })
    }

    const mine = await prisma.roomJoinRequest.findUnique({
      where: { roomId_requesterId: { roomId: room.id, requesterId: user.id } },
    })
    const allowed =
      mine?.status === 'accepted' &&
      !!mine.respondedAt &&
      Date.now() - mine.respondedAt.getTime() < APPROVAL_TTL_MS
    return NextResponse.json({
      success: true,
      data: { request: mine ? { id: mine.id, status: mine.status, respondedAt: mine.respondedAt } : null, allowed },
    })
  } catch (e) {
    console.error('join-request list error:', e)
    return fail(500, 'INTERNAL_ERROR', 'İstekler alınamadı')
  }
}
