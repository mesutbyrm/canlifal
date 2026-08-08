import { NextRequest } from 'next/server'
import { GET as musicGET } from '@/app/api/chat/rooms/[roomId]/music/route'

export const dynamic = 'force-dynamic'

/**
 * @deprecated GET /api/rooms/{roomId}/music/current
 * Kanonik uç: GET /api/chat/rooms/{roomId}/music
 * Şu an çalan müziği döndürür. Eski istemciler için tutuluyor.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: { roomId: string } }
) {
  console.warn(`[DEPRECATED] GET /api/rooms/${ctx.params.roomId}/music/current → kanonik: /api/chat/rooms/.../music`)
  const res = await musicGET(req, ctx)
  res.headers.set('Deprecation', 'true')
  res.headers.set('Link', '</api/chat/rooms/{roomId}/music>; rel="successor-version"')
  return res
}
