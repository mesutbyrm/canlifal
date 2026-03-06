import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { isUserBanned, ROLE_SYMBOLS } from '@/lib/chat-permissions'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// SSE endpoint for real-time chat updates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const session = await getServerSession(authOptions)
  const { roomId } = await params

  // Check if user is banned
  if (session?.user?.id) {
    const banned = await isUserBanned(roomId, session.user.id)
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

  let lastMessageTime = new Date()
  let lastPresenceCheck = new Date()
  let isActive = true

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', roomId })}\n\n`))

      const checkForUpdates = async () => {
        if (!isActive) return

        try {
          // Check for new messages
          const newMessages = await prisma.chatMessage.findMany({
            where: {
              roomId,
              createdAt: { gt: lastMessageTime }
            },
            include: {
              user: {
                select: { id: true, name: true, role: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          })

          if (newMessages.length > 0) {
            // Get roles and nicknames
            const userIds = [...new Set(newMessages.map(m => m.userId))]
            const [userRoles, userPresences] = await Promise.all([
              prisma.chatUserRole.findMany({
                where: { roomId, userId: { in: userIds } }
              }),
              prisma.chatPresence.findMany({
                where: { roomId, userId: { in: userIds } },
                select: { userId: true, nickname: true }
              })
            ])

            const roleMap = new Map(userRoles.map(r => [r.userId, r.role]))
            const nicknameMap = new Map(userPresences.map(p => [p.userId, p.nickname]))

            const messagesWithRoles = newMessages.map(msg => {
              const chatRole = roleMap.get(msg.userId) || (msg.user.role === 'admin' ? 'founder' : null)
              const roleSymbol = chatRole ? ROLE_SYMBOLS[chatRole] || '' : ''
              const nickname = nicknameMap.get(msg.userId) || msg.user.name
              return {
                ...msg,
                user: { ...msg.user, nickname, chatRole, roleSymbol }
              }
            })

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'messages', 
              messages: messagesWithRoles 
            })}\n\n`))

            lastMessageTime = newMessages[newMessages.length - 1].createdAt
          }

          // Check presence updates every 5 seconds
          const now = new Date()
          if (now.getTime() - lastPresenceCheck.getTime() > 5000) {
            const presences = await prisma.chatPresence.findMany({
              where: {
                roomId,
                lastSeen: { gte: new Date(Date.now() - 60000) }
              },
              include: {
                user: { select: { id: true, name: true, role: true } }
              }
            })

            // Get roles for active users
            const activeUserIds = presences.map(p => p.userId)
            const activeUserRoles = await prisma.chatUserRole.findMany({
              where: { roomId, userId: { in: activeUserIds } }
            })
            const activeRoleMap = new Map(activeUserRoles.map(r => [r.userId, r.role]))

            const activeUsers = presences.map(p => {
              const chatRole = activeRoleMap.get(p.userId) || (p.user.role === 'admin' ? 'founder' : null)
              const roleLevel = chatRole ? { founder: 5, admin: 4, op: 3, voice: 2 }[chatRole] || 0 : 0
              return {
                id: p.userId,
                name: p.user.name,
                nickname: p.nickname || p.user.name,
                lastSeen: p.lastSeen.toISOString(),
                chatRole,
                roleSymbol: chatRole ? ROLE_SYMBOLS[chatRole] : null,
                roleLevel,
                isAdmin: p.user.role === 'admin'
              }
            })

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'presence', 
              users: activeUsers 
            })}\n\n`))

            lastPresenceCheck = now
          }

          // Check typing indicators
          const typingUsers = await prisma.chatPresence.findMany({
            where: {
              roomId,
              isTyping: true,
              lastTyping: { gte: new Date(Date.now() - 3000) },
              ...(session?.user?.id ? { userId: { not: session.user.id } } : {})
            },
            select: { userId: true, nickname: true }
          })

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'typing', 
            users: typingUsers.map(u => u.nickname || 'User')
          })}\n\n`))

        } catch (error) {
          console.error('SSE update error:', error)
        }

        // Continue polling
        if (isActive) {
          setTimeout(checkForUpdates, 1000)
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
