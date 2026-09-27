import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { getRoomEventsSince } from '@/lib/room-events'
import { resumeCursor, newestTimestamp, sseIdLine } from '@/lib/sse-resume'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * SSE endpoint for real-time fortune session room events.
 * Emits: message, timer_started, time_extended, session_ended, system
 * 
 * Flutter connects with: GET /api/room/:sessionId/stream
 * Authorization: Bearer JWT (mobile) or NextAuth session (web)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  // Dual auth
  const mobileUser = await authenticateRequest(request)
  const webSession = !mobileUser ? await getServerSession(authOptions) : null
  const currentUserId = mobileUser?.id || webSession?.user?.id

  if (!currentUserId) {
    return new Response('Oturum açmanız gerekiyor', { status: 401 })
  }

  const { sessionId } = params

  // Verify session exists and user is part of it
  const liveSession = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: { teller: { select: { userId: true } } }
  })

  if (!liveSession) {
    return new Response('Seans bulunamadı', { status: 404 })
  }

  const isUser = liveSession.userId === currentUserId
  const isTeller = liveSession.teller.userId === currentUserId

  if (!isUser && !isTeller) {
    return new Response('Erişim reddedildi', { status: 403 })
  }

  // Last-Event-ID / ?lastEventId= ile yeniden bağlanmada kaldığı yerden devam
  let lastEventCheck = resumeCursor(request)
  let isActive = true

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'connected',
        sessionId,
        isUser,
        isTeller,
        status: liveSession.status,
        timerStarted: liveSession.timerStarted,
        timerStartedAt: liveSession.timerStartedAt?.toISOString() || null,
        maxMinutes: liveSession.maxMinutes,
        minutesUsed: liveSession.minutesUsed
      })}\n\n`))

      // DB yedeği için durum takibi. Bellek-içi olay veri yolu yalnız aynı
      // sunucu sürecinde çalışır; farklı süreçte yazılan mesaj/durum değişimi
      // buradan yakalanır.
      const emittedMessageIds = new Set<string>()
      let lastMessageAt = new Date(Date.now() - 10_000)
      let lastStatus = liveSession.status
      let lastTimerStartedAt = liveSession.timerStartedAt?.getTime() ?? null
      let dbTick = 0

      const checkForUpdates = async () => {
        if (!isActive) return

        try {
          // Check in-memory event store
          const newEvents = getRoomEventsSince(sessionId, lastEventCheck)
          for (const event of newEvents) {
            const mid = (event.data as any)?.id
            if (event.type === 'message' && typeof mid === 'string') {
              if (emittedMessageIds.has(mid)) continue
              emittedMessageIds.add(mid)
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event.data)}\n\n`))
          }
          if (newEvents.length > 0) {
            lastEventCheck = newestTimestamp(newEvents as any[], lastEventCheck)
            controller.enqueue(encoder.encode(sseIdLine(lastEventCheck)))
          }

          // DB yedeği: 3 saniyede bir yeni mesajlar ve seans durumu
          dbTick++
          if (dbTick >= 3) {
            dbTick = 0

            const rows = await prisma.liveSessionMessage.findMany({
              where: { sessionId, createdAt: { gt: lastMessageAt } },
              orderBy: { createdAt: 'asc' },
              take: 50
            })
            for (const row of rows) {
              if (emittedMessageIds.has(row.id)) continue
              emittedMessageIds.add(row.id)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'message',
                id: row.id,
                senderId: row.senderId,
                message: row.message,
                createdAt: row.createdAt.toISOString()
              })}\n\n`))
            }
            if (rows.length > 0) {
              lastMessageAt = rows[rows.length - 1].createdAt
            }
            if (emittedMessageIds.size > 500) {
              const keep = Array.from(emittedMessageIds).slice(-200)
              emittedMessageIds.clear()
              for (const k of keep) emittedMessageIds.add(k)
            }

            const fresh = await prisma.liveSession.findUnique({
              where: { id: sessionId },
              select: {
                status: true, timerStarted: true, timerStartedAt: true,
                maxMinutes: true, minutesUsed: true, roomId: true
              }
            })
            if (fresh) {
              const freshTimerAt = fresh.timerStartedAt?.getTime() ?? null
              if (fresh.status !== lastStatus || freshTimerAt !== lastTimerStartedAt) {
                lastStatus = fresh.status
                lastTimerStartedAt = freshTimerAt
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: fresh.status === 'active' ? 'session_started' : 'session_status',
                  status: fresh.status,
                  roomId: fresh.roomId,
                  timerStarted: fresh.timerStarted,
                  timerStartedAt: fresh.timerStartedAt?.toISOString() || null,
                  maxMinutes: fresh.maxMinutes,
                  minutesUsed: fresh.minutesUsed
                })}\n\n`))
              }
            }
          }
        } catch (error) {
          console.error('[Room SSE] Update error:', error)
        }

        if (isActive) {
          setTimeout(checkForUpdates, 1000)
        }
      }

      checkForUpdates()

      // Heartbeat every 15 seconds
      const heartbeat = setInterval(() => {
        if (isActive) {
          try {
            controller.enqueue(encoder.encode(`: heartbeat\n\n`))
          } catch {
            clearInterval(heartbeat)
          }
        }
      }, 15000)

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        isActive = false
        clearInterval(heartbeat)
      })
    },
    cancel() {
      isActive = false
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}
