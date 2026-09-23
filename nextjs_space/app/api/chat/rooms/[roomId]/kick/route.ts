export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { forwardToModeration } from '@/lib/chat-route-proxy'

// Mobil kısa yol: POST /api/chat/rooms/{roomId}/kick  → moderation kick_user
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  let body: any = {}
  try { body = await request.json() } catch {}
  const targetUserId = body?.userId || body?.targetUserId
  if (!targetUserId) {
    return NextResponse.json({ error: 'userId gerekli' }, { status: 400 })
  }
  return forwardToModeration(request, params.roomId, {
    action: 'kick_user',
    targetUserId,
    reason: body?.reason,
  })
}
