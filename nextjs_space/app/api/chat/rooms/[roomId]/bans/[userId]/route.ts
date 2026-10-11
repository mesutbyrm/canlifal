export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { forwardToModeration } from '@/lib/chat-route-proxy'

// Mobil kısa yol: POST/DELETE /api/chat/rooms/{roomId}/bans/{userId} → moderation ban_user / unban_user
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string; userId: string } }
) {
  let body: any = {}
  try { body = await request.json() } catch {}
  return forwardToModeration(request, params.roomId, {
    action: 'ban_user',
    targetUserId: params.userId,
    reason: body?.reason,
    duration: body?.duration,
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string; userId: string } }
) {
  return forwardToModeration(request, params.roomId, {
    action: 'unban_user',
    targetUserId: params.userId,
  })
}
