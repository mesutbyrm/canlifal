export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { forwardToModeration } from '@/lib/chat-route-proxy'

// Mobil kısa yol: POST /api/chat/rooms/{roomId}/mute → moderation mute_user / unmute_user
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
  if (body?.unmute === true) {
    return forwardToModeration(request, params.roomId, {
      action: 'unmute_user',
      targetUserId,
    })
  }
  const duration = Number(body?.minutes ?? body?.durationMinutes ?? body?.duration ?? 30)
  return forwardToModeration(request, params.roomId, {
    action: 'mute_user',
    targetUserId,
    duration: Number.isFinite(duration) && duration > 0 ? duration : 30,
    reason: body?.reason,
  })
}
