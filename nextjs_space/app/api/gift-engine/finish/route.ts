import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import { finishQueueEntry } from '@/lib/gift-engine'

export const dynamic = 'force-dynamic'

/**
 * POST /api/gift-engine/finish  body: { queueId }
 * Called by a client when a gift animation finishes playing (or by a watchdog).
 * Marks the queue entry finished and emits gift_finished + gift_queue_updated so
 * the next queued animation can start. Dual auth (mobile JWT or web session).
 */
export async function POST(request: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(request)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const queueId = body?.queueId
    if (!queueId) {
      return NextResponse.json({ error: 'queueId gerekli' }, { status: 400 })
    }

    const entry = await finishQueueEntry(String(queueId))
    if (!entry) {
      return NextResponse.json({ success: false, message: 'Kuyruk kaydı bulunamadı veya zaten tamamlandı' })
    }
    return NextResponse.json({ success: true, queueId: entry.id })
  } catch (e) {
    console.error('[gift-engine] finish error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
