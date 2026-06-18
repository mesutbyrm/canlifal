import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { getTellerEventsSince } from '@/lib/room-events'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * SSE endpoint for fortune tellers to receive real-time session requests.
 * Emits: session_request, session_cancelled
 * 
 * Flutter connects with: GET /api/fortune-tellers/sessions/stream
 * Authorization: Bearer JWT (mobile) or NextAuth session (web)
 */
export async function GET(request: NextRequest) {
  // Dual auth
  const mobileUser = await authenticateRequest(request)
  const webSession = !mobileUser ? await getServerSession(authOptions) : null
  const currentUserId = mobileUser?.id || webSession?.user?.id

  if (!currentUserId) {
    return new Response('Oturum açmanız gerekiyor', { status: 401 })
  }

  // Verify user is a teller
  const teller = await prisma.liveFortuneTeller.findUnique({
    where: { userId: currentUserId },
    select: { id: true, isOnline: true, applicationStatus: true, isBanned: true }
  })

  if (!teller || teller.applicationStatus !== 'approved' || teller.isBanned) {
    return new Response('Falcı profili bulunamadı veya aktif değil', { status: 403 })
  }

  const tellerId = teller.id
  let lastEventCheck = Date.now()
  let isActive = true
  let pendingCheckCount = 0

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'connected',
        tellerId,
        isOnline: teller.isOnline
      })}\n\n`))

      // Send any existing pending sessions on connect
      try {
        const pendingSessions = await prisma.liveSession.findMany({
          where: { tellerId, status: 'pending' },
          include: {
            user: { select: { id: true, name: true, image: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        })

        if (pendingSessions.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'pending_sessions',
            sessions: pendingSessions.map(s => ({
              id: s.id,
              userId: s.userId,
              fortuneType: s.fortuneType,
              maxMinutes: s.maxMinutes,
              creditsCharged: s.creditsCharged,
              creditsPerMinute: s.creditsPerMinute,
              createdAt: s.createdAt.toISOString(),
              user: s.user
            }))
          })}\n\n`))
        }
      } catch (e) {
        console.error('[Teller SSE] Initial pending fetch error:', e)
      }

      const checkForUpdates = async () => {
        if (!isActive) return

        try {
          // 1. Check in-memory event bus for new events
          const newEvents = getTellerEventsSince(tellerId, lastEventCheck)
          for (const event of newEvents) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event.data)}\n\n`))
          }
          if (newEvents.length > 0) {
            lastEventCheck = Date.now()
          }

          // 2. DB fallback: check pending sessions every 15 seconds
          pendingCheckCount++
          if (pendingCheckCount >= 5) { // 5 * 3s = 15s
            pendingCheckCount = 0
            const pendingSessions = await prisma.liveSession.findMany({
              where: { tellerId, status: 'pending' },
              include: {
                user: { select: { id: true, name: true, image: true } }
              },
              orderBy: { createdAt: 'desc' },
              take: 10
            })

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'pending_sessions',
              sessions: pendingSessions.map(s => ({
                id: s.id,
                userId: s.userId,
                fortuneType: s.fortuneType,
                maxMinutes: s.maxMinutes,
                creditsCharged: s.creditsCharged,
                creditsPerMinute: s.creditsPerMinute,
                createdAt: s.createdAt.toISOString(),
                user: s.user
              }))
            })}\n\n`))
          }
        } catch (error) {
          console.error('[Teller SSE] Update error:', error)
        }

        if (isActive) {
          setTimeout(checkForUpdates, 3000)
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
