import { NextRequest } from 'next/server'
import { DELETE as musicDELETE } from '@/app/api/chat/rooms/[roomId]/music/route'

export const dynamic = 'force-dynamic'

/**
 * @deprecated POST /api/rooms/{roomId}/music/skip
 * Kanonik uç: DELETE /api/chat/rooms/{roomId}/music
 * Sıradaki şarkıya geçer. Eski istemciler için tutuluyor.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: { roomId: string } }
) {
  console.warn(`[DEPRECATED] POST /api/rooms/${ctx.params.roomId}/music/skip → kanonik: DELETE /api/chat/rooms/.../music`)
  const res = await musicDELETE(req, ctx)
  res.headers.set('Deprecation', 'true')
  res.headers.set('Link', '</api/chat/rooms/{roomId}/music>; rel="successor-version"')
  return res
}
