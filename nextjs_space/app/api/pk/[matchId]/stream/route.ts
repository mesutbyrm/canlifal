import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { serializePkMatch, loadPkUsers } from '@/lib/pk-match'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/pk/{matchId}/stream  (SSE)
 *
 * Birleşik PK maçının canlı durumu. Maç durumu değiştiğinde (skor, status,
 * bitiş) `pk` olayı yayınlanır. Heartbeat 15 sn (Flutter 45 sn timeout ile uyumlu).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { matchId: string } },
) {
  const matchId = params.matchId
  const encoder = new TextEncoder()
  let isActive = true

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        } catch {
          isActive = false
        }
      }

      send({ type: 'connected', matchId })

      let lastSignature = ''

      const tick = async () => {
        if (!isActive) return
        try {
          const battle = await prisma.pKBattle.findUnique({ where: { id: matchId } })
          if (!battle) {
            send({ type: 'pk', event: 'not_found', matchId })
            isActive = false
            try { controller.close() } catch { /* already closed */ }
            return
          }

          const signature = `${battle.status}|${battle.score1}|${battle.score2}|${battle.winnerId || ''}`
          if (signature !== lastSignature) {
            lastSignature = signature
            const users = await loadPkUsers([battle])
            send({ type: 'pk', event: 'match_update', match: serializePkMatch(battle, users) })
          }

          if (['completed', 'cancelled', 'rejected', 'expired'].includes(battle.status)) {
            // Son durumu yolladık; akışı birkaç saniye sonra kapat
            setTimeout(() => {
              isActive = false
              try { controller.close() } catch { /* already closed */ }
            }, 3000)
            return
          }
        } catch (e) {
          console.error('[pk/stream] tick error:', e)
        }
        if (isActive) setTimeout(tick, 2000)
      }

      tick()

      const heartbeat = setInterval(() => {
        if (!isActive) { clearInterval(heartbeat); return }
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          clearInterval(heartbeat)
        }
      }, 15000)

      request.signal.addEventListener('abort', () => {
        isActive = false
        clearInterval(heartbeat)
      })
    },
    cancel() {
      isActive = false
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
