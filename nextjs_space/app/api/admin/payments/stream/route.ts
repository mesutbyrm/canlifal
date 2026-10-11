export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { isAdminRole } from '@/lib/admin-utils'

/**
 * GET /api/admin/payments/stream
 * SSE — yeni ödeme bildirimleri gerçek zamanlı akışı (admin panel).
 * 5sn aralıkla son bildirimleri kontrol eder.
 */
export async function GET(req: NextRequest) {
  const actor = await resolveUser(req)
  if (!actor) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }
  if (!isAdminRole(actor.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  }

  const encoder = new TextEncoder()
  let closed = false
  let lastChecked = new Date()

  const stream = new ReadableStream({
    async start(controller) {
      // İlk mesaj
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`))

      const poll = async () => {
        if (closed) return
        try {
          const newItems = await (prisma as any).paymentNotification.findMany({
            where: { createdAt: { gt: lastChecked } },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { user: { select: { id: true, name: true, username: true, image: true } } },
          })
          if (newItems.length > 0) {
            lastChecked = new Date()
            for (const item of newItems) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'payment', data: item })}\n\n`))
            }
          }
          // Heartbeat
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch (e) {
          console.error('[payments/stream poll]', e)
        }
        if (!closed) setTimeout(poll, 5000)
      }

      setTimeout(poll, 1000)

      // 5dk sonra kapat (mobil yeniden bağlanacak)
      setTimeout(() => {
        closed = true
        try { controller.close() } catch {}
      }, 300_000)
    },
    cancel() {
      closed = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
