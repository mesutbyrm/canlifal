import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/notifications/stream
 * SSE endpoint for real-time notifications.
 * Flutter connects with: Authorization: Bearer <jwt>
 */
export async function GET(request: NextRequest) {
  const authUser = await authenticateRequest(request)
  if (!authUser) {
    return new Response('Oturum açmanız gerekiyor', { status: 401 })
  }

  const userId = authUser.id
  let lastCheck = new Date()
  let isActive = true

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial unread count
      try {
        const unreadCount = await prisma.notification.count({
          where: { userId, isRead: false }
        })
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'connected',
          unreadCount
        })}\n\n`))
      } catch (e) {
        console.error('[Notifications SSE] Initial count error:', e)
      }

      const checkForUpdates = async () => {
        if (!isActive) return

        try {
          const newNotifications = await prisma.notification.findMany({
            where: {
              userId,
              createdAt: { gt: lastCheck }
            },
            orderBy: { createdAt: 'asc' },
            take: 10
          })

          if (newNotifications.length > 0) {
            lastCheck = new Date()
            for (const notif of newNotifications) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'notification',
                notification: {
                  id: notif.id,
                  title: notif.title,
                  body: notif.message,
                  type: notif.type,
                  isRead: notif.isRead,
                  createdAt: notif.createdAt.toISOString(),
                  data: notif.data ? JSON.parse(notif.data as string) : null
                }
              })}\n\n`))
            }
          }
        } catch (error) {
          console.error('[Notifications SSE] Update error:', error)
        }

        if (isActive) {
          setTimeout(checkForUpdates, 5000)
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
      'X-Accel-Buffering': 'no',
      // Mirror of the directive above under a name no proxy consumes, so the
      // no-buffering intent is still observable by clients on the live domain.
      'X-Sse-Buffering': 'no'
    }
  })
}
