import { NextRequest, NextResponse } from 'next/server'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import {
  MAX_PASSWORD_ATTEMPTS,
  canBypassRoomGate,
  getRemainingAttempts,
  isPasswordGatedRoom,
  issueRoomAccessToken,
  verifyRoomPasswordAttempt,
} from '@/lib/room-access'
import { fail, resolveAuthAndRoom } from '@/lib/room-join-auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/live/rooms/{roomId}/verify-password   Body: { password }
 *
 * Şifre SUNUCUDA doğrulanır (bcrypt). Kullanıcı + oda başına en fazla 3 yanlış
 * deneme; hak bitince şifre artık karşılaştırılmaz. Başarıda 5 dk geçerli,
 * odaya ve kullanıcıya bağlı imzalı `accessToken` döner — istemci bunu
 * join/presence isteğinde `roomAccessToken` olarak gönderir.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params
    const ctx = await resolveAuthAndRoom(request, roomId)
    if ('error' in ctx) return ctx.error
    const { user, room } = ctx

    // Ek koruma: dakikada en fazla 10 istek (kullanıcı bazlı).
    const limited = await guardRateLimit(request, 'room_password_verify', { userId: user.id, limit: 10, windowMs: 60_000 })
    if (limited) return limited

    if (!isPasswordGatedRoom(room)) {
      return fail(400, 'ROOM_NOT_PASSWORD_PROTECTED', 'Bu oda şifreli değil')
    }
    if (await canBypassRoomGate(room, user.id, user.role)) {
      const t = issueRoomAccessToken(room.id, user.id, room.password)
      return NextResponse.json({ success: true, data: { accessToken: t.token, expiresAt: t.expiresAt, remainingAttempts: MAX_PASSWORD_ATTEMPTS } })
    }

    const body = await request.json().catch(() => ({}))
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!password) return fail(400, 'PASSWORD_REQUIRED', 'Şifre gerekli')

    const res = await verifyRoomPasswordAttempt(
      { id: room.id, slug: room.slug, roomType: room.roomType, password: room.password, ownerId: room.ownerId },
      user.id,
      password,
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    )
    if (!res.ok) {
      return fail(
        403,
        res.code,
        res.locked ? 'Giriş hakkınız kalmadı' : `Şifre yanlış. ${res.remaining} hakkınız kaldı.`,
        { remainingAttempts: res.remaining, locked: res.locked }
      )
    }
    const t = issueRoomAccessToken(room.id, user.id, res.storedPassword)
    return NextResponse.json({
      success: true,
      data: { accessToken: t.token, expiresAt: t.expiresAt, remainingAttempts: MAX_PASSWORD_ATTEMPTS },
    })
  } catch (e) {
    console.error('verify-password error:', e)
    return fail(500, 'INTERNAL_ERROR', 'Şifre doğrulanamadı')
  }
}

/**
 * GET — modal açılırken durum: şifreli mi, kalan hak, giriş isteği durumu.
 * Şifre/hash ASLA dönmez.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params
    const ctx = await resolveAuthAndRoom(request, roomId)
    if ('error' in ctx) return ctx.error
    const { user, room } = ctx
    const gated = isPasswordGatedRoom(room)
    if (!gated) {
      return NextResponse.json({ success: true, data: { passwordProtected: false } })
    }
    const att = await getRemainingAttempts(room.id, user.id)
    const jr = await prisma.roomJoinRequest.findUnique({
      where: { roomId_requesterId: { roomId: room.id, requesterId: user.id } },
      select: { status: true },
    })
    return NextResponse.json({
      success: true,
      data: {
        passwordProtected: true,
        maxAttempts: MAX_PASSWORD_ATTEMPTS,
        remainingAttempts: att.remaining,
        locked: att.locked,
        bypass: await canBypassRoomGate(room, user.id, user.role),
        joinRequestStatus: jr?.status ?? null,
      },
    })
  } catch (e) {
    console.error('verify-password status error:', e)
    return fail(500, 'INTERNAL_ERROR', 'Durum alınamadı')
  }
}
