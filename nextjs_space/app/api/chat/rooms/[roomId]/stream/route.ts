import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { isUserBanned, ROLE_SYMBOLS } from '@/lib/chat-permissions'
import { getLatestDjEvent, buildDjPayload } from '@/lib/chat-dj-events'
import { getChatEventsSince, getTypingUsers } from '@/lib/chat-events'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// SSE endpoint for real-time chat updates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  // Dual auth: web session OR mobile JWT
  const mobileUser = await authenticateRequest(request)
  const session = !mobileUser ? await getServerSession(authOptions) : null
  const currentUserId = mobileUser?.id || session?.user?.id
  const { roomId } = await params

  console.log(`[SSE] Stream opened roomId=${roomId} userId=${currentUserId || 'anonymous'} source=${mobileUser ? 'mobile' : 'web'}`)

  // Check if user is banned
  if (currentUserId) {
    const banned = await isUserBanned(roomId, currentUserId)
    if (banned) {
      return new Response('Banned from this room', { status: 403 })
    }
  }

  // Verify room exists
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId }
  })

  if (!room) {
    return new Response('Room not found', { status: 404 })
  }

  let lastDjCheck = 0 // Start at 0 so first poll cycle sends DJ state immediately
  let isActive = true

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', roomId })}\n\n`))

      // DJ state will be sent on the first poll cycle (2s) — no blocking initial payload

      let lastEventCheck = Date.now()
      let presenceCheckCount = 0

      const checkForUpdates = async () => {
        if (!isActive) return

        try {
          // 1. Check in-memory event bus first (no DB hit!)
          const newEvents = getChatEventsSince(roomId, lastEventCheck)
          if (newEvents.length > 0) {
            const messages = newEvents.filter(e => e.type === 'message')
            if (messages.length > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'messages',
                messages: messages.map(e => e.data)
              })}\n\n`))
            }
            // System events (moderation: kick, ban, mute, announcement, clear)
            const systemEvents = newEvents.filter(e => e.type === 'system')
            for (const sysEvt of systemEvents) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'system',
                ...sysEvt.data
              })}\n\n`))
            }
            // Gift events
            const giftEvents = newEvents.filter(e => e.type === 'gift')
            for (const giftEvt of giftEvents) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'gift',
                ...giftEvt.data
              })}\n\n`))
            }
            // PK events
            const pkEvents = newEvents.filter(e => e.type === 'pk')
            for (const pkEvt of pkEvents) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'pk',
                ...pkEvt.data
              })}\n\n`))
            }
            lastEventCheck = Date.now()
          }

          // 2. Presence: only check DB every 10 seconds (was 5s)
          presenceCheckCount++
          if (presenceCheckCount >= 5) { // 5 * 2s interval = 10s
            presenceCheckCount = 0
            const presences = await prisma.chatPresence.findMany({
              where: {
                roomId,
                lastSeen: { gte: new Date(Date.now() - 300000) }
              },
              include: {
                user: { select: { id: true, name: true, role: true } }
              }
            })

            const activeUserIds = presences.map((p: { userId: string }) => p.userId)
            const activeUserRoles = activeUserIds.length > 0
              ? await prisma.chatUserRole.findMany({
                  where: { roomId, userId: { in: activeUserIds } }
                })
              : []
            const activeRoleMap = new Map(activeUserRoles.map((r: { userId: string; role: string }) => [r.userId, r.role]))

            const roleLevels: Record<string, number> = { superadmin: 6, founder: 5, sop: 4, admin: 4, op: 3, voice: 2 }
            const roleSymbolsActive: Record<string, string> = ROLE_SYMBOLS as Record<string, string>
            const globalAdminRolesP = ['admin', 'moderator', 'site_manager']
            const activeUsers = presences.map((p: { userId: string; nickname: string | null; lastSeen: Date; user: { name: string; role: string } }) => {
              const isGlobalAdminP = globalAdminRolesP.includes(p.user.role)
              const chatRole = activeRoleMap.get(p.userId) || (isGlobalAdminP ? 'superadmin' : null)
              const roleLevel = chatRole && typeof chatRole === 'string' ? roleLevels[chatRole] || 0 : 0
              return {
                id: p.userId,
                name: p.user.name,
                nickname: p.nickname || p.user.name,
                lastSeen: p.lastSeen.toISOString(),
                chatRole,
                roleSymbol: chatRole && typeof chatRole === 'string' ? roleSymbolsActive[chatRole] : null,
                roleLevel,
                isAdmin: isGlobalAdminP
              }
            })

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'presence',
              users: activeUsers
            })}\n\n`))
          }

          // 3. DJ updates: first poll fetches full state, subsequent polls check in-memory bus
          if (lastDjCheck === 0) {
            // First poll — build full DJ payload so client gets initial music state
            try {
              const initialDj = await buildDjPayload(roomId)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialDj)}\n\n`))
            } catch { /* ignore */ }
            lastDjCheck = Date.now()
          } else {
            const djEvent = getLatestDjEvent(roomId, lastDjCheck)
            if (djEvent) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(djEvent)}\n\n`))
              lastDjCheck = Date.now()
            }
          }

          // 4. Typing from in-memory event bus (no DB hit)
          const typingNames = getTypingUsers(roomId, currentUserId)
          if (typingNames.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'typing',
              users: typingNames
            })}\n\n`))
          }

        } catch (error) {
          console.error('SSE update error:', error)
        }

        // Continue polling at 2s interval (was 1s - 50% reduction in polling)
        if (isActive) {
          setTimeout(checkForUpdates, 2000)
        }
      }

      // Start checking for updates
      checkForUpdates()

      // Heartbeat to keep connection alive
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
