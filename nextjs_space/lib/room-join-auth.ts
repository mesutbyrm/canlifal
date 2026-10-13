/** verify-password / join-request uçları için ortak yardımcılar. */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getCachedChatRoom } from '@/lib/cache'
import { canBypassRoomGate } from '@/lib/room-access'

export function fail(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: false, error: { code, message, ...extra } }, { status })
}

/** Oturum + oda çözümleme (id veya slug). */
export async function resolveAuthAndRoom(request: NextRequest, roomIdOrSlug: string) {
  const user = await authenticateRequest(request)
  if (!user) return { error: fail(401, 'UNAUTHORIZED', 'Oturum açmanız gerekiyor') } as const
  const room = await getCachedChatRoom(roomIdOrSlug)
  if (!room) return { error: fail(404, 'ROOM_NOT_FOUND', 'Oda bulunamadı') } as const
  return { user, room } as const
}

/** Giriş isteğini yanıtlayabilir: oda sahibi, site yöneticisi, oda içi SOP+. */
export async function canRespondToJoinRequests(
  room: { id: string; ownerId?: string | null },
  userId: string,
  globalRole?: string | null
) {
  return canBypassRoomGate(room, userId, globalRole)
}
