import { NextRequest, NextResponse } from 'next/server'
import { forwardFortuneCreate } from '@/lib/live-fortune-proxy'

export const dynamic = 'force-dynamic'

/**
 * POST /api/live/fal-request/create
 * Body: { streamId, typeId, question, nickname?, isHidden? }
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const streamId = typeof body?.streamId === 'string' ? body.streamId.trim() : ''
  if (!streamId) {
    return NextResponse.json({ error: 'streamId gerekli' }, { status: 400 })
  }
  return forwardFortuneCreate(request, streamId, {
    typeId: body?.typeId,
    question: body?.question,
    nickname: body?.nickname,
    isHidden: body?.isHidden ?? false,
  })
}
