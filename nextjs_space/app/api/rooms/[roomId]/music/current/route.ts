import { NextRequest } from 'next/server'
import { GET as musicGET } from '@/app/api/chat/rooms/[roomId]/music/route'

export const dynamic = 'force-dynamic'

// Alias: GET /api/rooms/{roomId}/music/current
// Şu an çalan müziği döndürür. Mevcut /api/chat/rooms/{roomId}/music GET ucuna yönlendirir.
export async function GET(
  req: NextRequest,
  ctx: { params: { roomId: string } }
) {
  return musicGET(req, ctx)
}
