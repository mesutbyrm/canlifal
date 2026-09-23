import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { getStreamEventsSince } from '@/lib/stream-events'
import { resumeCursor, newestTimestamp, sseIdLine } from '@/lib/sse-resume'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * SSE endpoint for real-time video stream events.
 * Emits: streamMessage, viewerCount, streamEnded, gift
 * 
 * Flutter connects with: GET /api/video-streams/:streamId/stream
 * Authorization: Bearer JWT (mobile) or NextAuth session (web)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  const authUser = await authenticateRequest(request)
  const { streamId } = await params

  // Verify stream exists
  const stream = await prisma.videoStream.findUnique({
    where: { id: streamId },
    select: { id: true, status: true }
  })

  if (!stream) {
    return new Response('Stream not found', { status: 404 })
  }

  // Last-Event-ID / ?lastEventId= ile yeniden bağlanmada kaldığı yerden devam
  let lastEventCheck = resumeCursor(request)
  let isActive = true

  const encoder = new TextEncoder()

  const sseStream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', streamId })}\n\n`))

      // Send initial viewer count
      try {
        const viewerCount = await prisma.videoStreamViewer.count({
          where: { streamId, leftAt: null }
        })
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'viewerCount',
          streamId,
          viewerCount,
        })}\n\n`))
      } catch (e) {
        console.error('[Stream SSE] Initial viewer count error:', e)
      }

      const checkForUpdates = async () => {
        if (!isActive) return

        try {
          // Check in-memory event store for new events
          const newEvents = getStreamEventsSince(streamId, lastEventCheck)
          for (const event of newEvents) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event.data)}\n\n`))
          }
          if (newEvents.length > 0) {
            lastEventCheck = newestTimestamp(newEvents as any[], lastEventCheck)
            controller.enqueue(encoder.encode(sseIdLine(lastEventCheck)))
          }
        } catch (error) {
          console.error('[Stream SSE] Update error:', error)
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

      request.signal.addEventListener('abort', () => {
        isActive = false
        clearInterval(heartbeat)
      })
    },
    cancel() {
      isActive = false
    }
  })

  return new Response(sseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}
