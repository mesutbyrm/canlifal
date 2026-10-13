export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { forwardToDj } from '@/lib/chat-route-proxy'

// Mobil kısa yol: POST/DELETE /api/chat/rooms/{roomId}/dj/{targetUserId}
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string; targetUserId: string } }
) {
  return forwardToDj(request, params.roomId, {
    action: 'add_dj',
    userId: params.targetUserId,
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string; targetUserId: string } }
) {
  return forwardToDj(request, params.roomId, {
    action: 'remove_dj',
    userId: params.targetUserId,
  })
}
