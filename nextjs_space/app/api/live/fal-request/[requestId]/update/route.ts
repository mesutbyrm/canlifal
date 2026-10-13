import { NextRequest, NextResponse } from 'next/server'
import {
  forwardFortuneAction,
  resolveStreamIdForRequest,
  statusToFortuneAction,
} from '@/lib/live-fortune-proxy'

export const dynamic = 'force-dynamic'

/**
 * POST /api/live/fal-request/[requestId]/update
 * Body: { status, streamId? } — mobil kısa yol.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const body = await request.json().catch(() => ({}))
  const action = statusToFortuneAction(body?.status ?? body?.action)
  if (!action) {
    return NextResponse.json({ error: 'Geçersiz durum' }, { status: 400 })
  }
  const streamId = await resolveStreamIdForRequest(params.requestId, body?.streamId)
  if (!streamId) {
    return NextResponse.json({ error: 'Fal isteği bulunamadı' }, { status: 404 })
  }
  return forwardFortuneAction(request, streamId, { requestId: params.requestId, action })
}

export const PATCH = POST
