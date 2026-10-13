export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { forwardToModeration } from '@/lib/chat-route-proxy'

// Mobil kısa yol: POST /api/chat/rooms/{roomId}/roles → moderation set_role / remove_role
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  let body: any = {}
  try { body = await request.json() } catch {}
  const targetUserId = body?.userId || body?.targetUserId
  const role = body?.role ?? body?.symbol ?? body?.roleSymbol
  if (!targetUserId) {
    return NextResponse.json({ error: 'userId gerekli' }, { status: 400 })
  }
  if (role === undefined || role === null || role === '' || role === 'none') {
    return forwardToModeration(request, params.roomId, {
      action: 'remove_role',
      targetUserId,
    })
  }
  return forwardToModeration(request, params.roomId, {
    action: 'set_role',
    targetUserId,
    role,
  })
}
