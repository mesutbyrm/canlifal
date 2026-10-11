import { NextRequest, NextResponse } from 'next/server'
import { forwardFortuneAction, resolveStreamIdForRequest } from '@/lib/live-fortune-proxy'

export const dynamic = 'force-dynamic'

/** POST /api/live/fal-request/[requestId]/complete — Body: { streamId? } */
export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const body = await request.json().catch(() => ({}))
  const streamId = await resolveStreamIdForRequest(params.requestId, body?.streamId)
  if (!streamId) {
    return NextResponse.json({ error: 'Fal isteği bulunamadı' }, { status: 404 })
  }
  return forwardFortuneAction(request, streamId, {
    requestId: params.requestId,
    action: 'complete',
  })
}
