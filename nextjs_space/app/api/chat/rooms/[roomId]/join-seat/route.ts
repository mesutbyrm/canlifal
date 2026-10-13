export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { forwardToSeats } from '@/lib/chat-route-proxy'

// Mobil kısa yol: POST /api/chat/rooms/{roomId}/join-seat → seats PATCH
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  let body: any = {}
  try { body = await request.json() } catch {}
  const rawIndex = body?.seatIndex ?? body?.index ?? body?.seat
  const seatIndex = typeof rawIndex === 'number' ? rawIndex : Number(rawIndex)
  if (!Number.isFinite(seatIndex)) {
    return NextResponse.json({ error: 'seatIndex gerekli' }, { status: 400 })
  }
  return forwardToSeats(request, params.roomId, {
    seatIndex,
    targetUserId: body?.userId ?? body?.targetUserId,
  })
}
