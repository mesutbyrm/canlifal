/**
 * Şifreli VIP oda erişim korumasının "diğer uçlar" tarafı.
 *
 * Şifre kapısı yalnızca `presence`/`join-room` girişinde çalışır; ama mesaj
 * okuma/yazma, SSE, durum, koltuk, TRTC jetonu gibi uçlar presence olmadan da
 * çağrılabilir. Bu yardımcı o uçlarda şunu zorunlu kılar:
 *
 *   şifreli VIP oda  →  sahip / yönetici / oda SOP+  VEYA  son 10 dk içinde
 *   kapıdan geçerek açılmış presence kaydı.
 *
 * Presence kaydı yalnızca kapıdan (authorizeVipEntry) geçerek veya bu korumayı
 * geçmiş uçlar tarafından oluşturulabildiği için "presence var" = "girmeye
 * yetkili". Koruma kapalı odalarda hiçbir şey yapmaz (tek önbellekli oda okuması).
 */
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCachedChatRoom } from '@/lib/cache'
import { canBypassRoomGate, isPasswordGatedRoom } from '@/lib/room-access'

/** Kapıdan geçmiş presence'ın erişim için geçerli sayıldığı süre. */
export const ADMITTED_PRESENCE_WINDOW_MS = 10 * 60 * 1000

export interface GuardUser {
  id?: string | null
  role?: string | null
}

export function roomPasswordRequiredResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: { code: 'ROOM_PASSWORD_REQUIRED', message: 'Bu oda şifrelidir. Önce şifreyi girin.' },
      code: 'ROOM_PASSWORD_REQUIRED',
    },
    { status: 403 }
  )
}

/** `null` → erişim serbest; aksi halde 403 yanıtı. */
export async function guardGatedRoom(
  roomIdOrSlug: string | null | undefined,
  user: GuardUser | null | undefined
): Promise<NextResponse | null> {
  if (!roomIdOrSlug) return null
  let room
  try {
    room = await getCachedChatRoom(roomIdOrSlug)
  } catch {
    return null // oda çözülemezse rota kendi 404'ünü versin
  }
  if (!room || !isPasswordGatedRoom(room)) return null
  if (!user?.id) return roomPasswordRequiredResponse()
  if (await canBypassRoomGate(room, user.id, user.role)) return null
  const p = await prisma.chatPresence.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
    select: { lastSeen: true },
  })
  if (p && Date.now() - p.lastSeen.getTime() < ADMITTED_PRESENCE_WINDOW_MS) return null
  return roomPasswordRequiredResponse()
}
