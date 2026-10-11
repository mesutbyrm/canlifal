import { NextRequest, NextResponse } from 'next/server'
import { getQueueSnapshot } from '@/lib/gift-engine'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gift-engine/queue?context=voice_room&contextId=<roomId|streamId>
 * Returns the current pending/playing gift queue for a room/stream so a client
 * that just joined (late-join) can render the in-flight animations in order.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contextId = searchParams.get('contextId')
    if (!contextId) {
      return NextResponse.json({ error: 'contextId gerekli' }, { status: 400 })
    }
    const queue = await getQueueSnapshot(contextId)
    return NextResponse.json({ contextId, queueLength: queue.length, queue })
  } catch (e) {
    console.error('[gift-engine] queue error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
