export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { forwardToMessagesDelete } from '@/lib/chat-route-proxy'

// Mobil kısa yol: DELETE /api/chat/rooms/{roomId}/messages/{messageId}
export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string; messageId: string } }
) {
  return forwardToMessagesDelete(request, params.roomId, params.messageId)
}
