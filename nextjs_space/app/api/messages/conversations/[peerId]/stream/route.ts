import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// Özel mesaj akışı (SSE). Yeni mesajlar periyodik yoklama ile yayınlanır.
export async function GET(
  request: NextRequest,
  { params }: { params: { peerId: string } }
) {
  const auth = await authenticateRequest(request)
  if (!auth) {
    return new Response('Unauthorized', { status: 401 })
  }
  const me = auth.id
  const peer = params.peerId
  const encoder = new TextEncoder()
  let lastAt = new Date()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const send = (event: string, data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          closed = true
        }
      }

      send('connected', { peerId: peer, at: lastAt.toISOString() })

      const tick = setInterval(async () => {
        if (closed) return
        try {
          const rows = await prisma.directMessage.findMany({
            where: {
              createdAt: { gt: lastAt },
              OR: [
                { senderId: me, receiverId: peer },
                { senderId: peer, receiverId: me },
              ],
            },
            orderBy: { createdAt: 'asc' },
            take: 50,
          })
          if (rows.length) {
            lastAt = rows[rows.length - 1].createdAt
            for (const m of rows) {
              send('message', {
                id: m.id,
                senderId: m.senderId,
                receiverId: m.receiverId,
                content: m.content,
                imageUrl: m.imageUrl,
                isRead: m.isRead,
                createdAt: m.createdAt.toISOString(),
              })
            }
          } else {
            send('ping', { at: new Date().toISOString() })
          }
        } catch {
          /* yoklama hatası sessizce geçilir */
        }
      }, 3000)

      const close = () => {
        if (closed) return
        closed = true
        clearInterval(tick)
        try {
          controller.close()
        } catch {
          /* noop */
        }
      }
      request.signal.addEventListener('abort', close)
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
