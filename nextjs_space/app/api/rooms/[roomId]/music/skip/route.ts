import { NextRequest } from 'next/server'
import { DELETE as musicDELETE } from '@/app/api/chat/rooms/[roomId]/music/route'

export const dynamic = 'force-dynamic'

// Alias: POST /api/rooms/{roomId}/music/skip
// Sıradaki şarkıya geçer (mevcut şarkıyı bitirip kuyruktan bir sonrakini otomatik çalar).
// Mevcut /api/chat/rooms/{roomId}/music DELETE davranışına eşdeğerdir.
export async function POST(
  req: NextRequest,
  ctx: { params: { roomId: string } }
) {
  return musicDELETE(req, ctx)
}
