import { NextRequest } from 'next/server'
import { POST as canonicalPOST } from '@/app/api/chat/rooms/[roomId]/music/stop/route'

export const dynamic = 'force-dynamic'

/**
 * @deprecated POST /api/rooms/{roomId}/music/stop
 * Kanonik uç: POST /api/chat/rooms/{roomId}/music/stop
 */
export async function POST(
  req: NextRequest,
  ctx: { params: { roomId: string } }
) {
  console.warn(`[DEPRECATED] POST /api/rooms/${ctx.params.roomId}/music/stop → kanonik: /api/chat/rooms/.../music/stop`)
  const res = await canonicalPOST(req, ctx)
  res.headers.set('Deprecation', 'true')
  res.headers.set('Link', '</api/chat/rooms/{roomId}/music/stop>; rel="successor-version"')
  return res
}
