import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { guardGatedRoom } from '@/lib/room-access-guard'
import { isUserBanned, ROLE_SYMBOLS } from '@/lib/chat-permissions'
import { getLatestDjEvent, buildDjPayload } from '@/lib/chat-dj-events'
import { getChatEventsSince, getTypingUsers } from '@/lib/chat-events'
import { getPkSnapshotEvent } from '@/lib/pk-snapshot'
import { presenceCutoff } from '@/lib/presence'

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

  // Şifreli VIP oda: kapıdan geçmemiş kullanıcı canlı akışı (SSE) DİNLEYEMEZ
  const gateDenied = await guardGatedRoom(roomId, { id: currentUserId, role: mobileUser?.role || (session?.user as any)?.role })
  if (gateDenied) return gateDenied

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

  // Last-Event-ID support: on reconnect the client (web EventSource or Flutter)
  // sends the id of the last event it received. We resume the in-memory event
  // bus from that timestamp so no realtime events (gift/seat/join/leave/mic/etc.)
  // are missed across a dropped connection. Event ids ARE the bus timestamps.
  const lastEventIdHeader =
    request.headers.get('last-event-id') ||
    request.headers.get('Last-Event-ID') ||
    request.nextUrl.searchParams.get('lastEventId')
  const parsedLastEventId = lastEventIdHeader ? parseInt(lastEventIdHeader, 10) : NaN

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Bağlantı koptuğunda controller.enqueue exception atar. Eskiden bu hata
      // yutulup 2 sn'lik döngü sonsuza dek devam ediyordu: her kopan istemci
      // sunucuda kalıcı bir zamanlayıcı bırakıyor, yük arttıkça açık akışlar
      // da düşüyordu. Artık ilk başarısız yazmada akış tamamen kapatılıyor.
      const send = (chunk: string): boolean => {
        if (!isActive) return false
        try {
          controller.enqueue(encoder.encode(chunk))
          return true
        } catch {
          isActive = false
          return false
        }
      }

      // Send initial connection event
      send(`data: ${JSON.stringify({ type: 'connected', roomId })}\n\n`)

      // Bekleyen/aktif PK anlık görüntüsü: bağlantıdan hemen önce oluşmuş bir
      // davet olay veri yoluna takılmaz, bu yüzden bir kez doğrudan gönderilir.
      getPkSnapshotEvent(roomId)
        .then(pkSnap => { if (pkSnap) send(`data: ${JSON.stringify(pkSnap)}\n\n`) })
        .catch(e => console.error('[SSE] pk snapshot error:', e))

      // DJ state will be sent on the first poll cycle (2s) — no blocking initial payload

      // Resume from the client-supplied Last-Event-ID when valid, otherwise
      // start from now (only future events). The bus keeps a 2-min / 200-event
      // buffer so short reconnects replay cleanly.
      let lastEventCheck = !isNaN(parsedLastEventId) && parsedLastEventId > 0
        ? parsedLastEventId
        : Date.now()
      let presenceCheckCount = 0

      const checkForUpdates = async () => {
        if (!isActive) return

        try {
          // 1. Check in-memory event bus first (no DB hit!)
          const newEvents = getChatEventsSince(roomId, lastEventCheck)
          if (newEvents.length > 0) {
            const messages = newEvents.filter(e => e.type === 'message')
            if (messages.length > 0) {
              send(`data: ${JSON.stringify({
                type: 'messages',
                messages: messages.map(e => e.data)
              })}\n\n`)
            }
            // System events (moderation: kick, ban, mute, announcement, clear)
            const systemEvents = newEvents.filter(e => e.type === 'system')
            for (const sysEvt of systemEvents) {
              send(`data: ${JSON.stringify({
                type: 'system',
                ...sysEvt.data
              })}\n\n`)
            }
            // Gift events
            const giftEvents = newEvents.filter(e => e.type === 'gift')
            for (const giftEvt of giftEvents) {
              send(`data: ${JSON.stringify({
                type: 'gift',
                ...giftEvt.data
              })}\n\n`)
            }
            // PK events
            const pkEvents = newEvents.filter(e => e.type === 'pk')
            for (const pkEvt of pkEvents) {
              send(`data: ${JSON.stringify({
                type: 'pk',
                ...pkEvt.data
              })}\n\n`)
            }
            // Hediye Kutusu olayları (BÖLÜM 22/B4)
            const giftBoxEvents = newEvents.filter(e => e.type === 'gift_box')
            for (const gbEvt of giftBoxEvents) {
              send(`data: ${JSON.stringify({
                type: 'gift_box',
                ...gbEvt.data
              })}\n\n`)
            }
            // Voice-room realtime events (user_joined/left, mic_changed, seat_changed,
            // room_closed, owner_changed). Forwarded as `room_event` so both web
            // (ignores unknown types) and Flutter (switches on .event) can consume them.
            const roomEvents = newEvents.filter(e => e.type === 'room')
            for (const roomEvt of roomEvents) {
              send(`data: ${JSON.stringify({
                type: 'room_event',
                ...roomEvt.data
              })}\n\n`)
            }
            // Advance the cursor to the newest event we actually consumed and
            // publish it as the SSE event id so a reconnecting client can send
            // it back via Last-Event-ID and resume exactly here.
            const newestTs = Math.max(...newEvents.map(e => e.timestamp))
            lastEventCheck = newestTs
            send(`id: ${newestTs}\n\n`)
          }

          // 2. Presence: only check DB every 10 seconds (was 5s)
          presenceCheckCount++
          if (presenceCheckCount >= 5) { // 5 * 2s interval = 10s
            presenceCheckCount = 0
            const presences = await prisma.chatPresence.findMany({
              where: {
                roomId,
                lastSeen: { gte: presenceCutoff() }
              },
              include: {
                user: { select: { id: true, name: true, role: true, image: true } }
              }
            })

            const activeUserIds = presences.map((p: { userId: string }) => p.userId)
            // Active voice/mic sessions in this room (drives micOn flag)
            const activeVoiceSessions = activeUserIds.length > 0
              ? await prisma.voiceSession.findMany({
                  where: { roomId, userId: { in: activeUserIds }, isActive: true },
                  select: { userId: true }
                })
              : []
            const micOnSet = new Set(activeVoiceSessions.map((v: { userId: string }) => v.userId))
            const activeUserRoles = activeUserIds.length > 0
              ? await prisma.chatUserRole.findMany({
                  where: { roomId, userId: { in: activeUserIds } }
                })
              : []
            const activeRoleMap = new Map(activeUserRoles.map((r: { userId: string; role: string }) => [r.userId, r.role]))

            const roleLevels: Record<string, number> = { superadmin: 6, founder: 5, sop: 4, admin: 4, op: 3, voice: 2 }
            const roleSymbolsActive: Record<string, string> = ROLE_SYMBOLS as Record<string, string>
            const globalAdminRolesP = ['admin', 'moderator', 'site_manager']
            const activeUsers = presences.map((p: { userId: string; nickname: string | null; lastSeen: Date; seatIndex: number | null; user: { name: string; role: string; image: string | null } }) => {
              const isGlobalAdminP = globalAdminRolesP.includes(p.user.role)
              const chatRole = activeRoleMap.get(p.userId) || (isGlobalAdminP ? 'superadmin' : null)
              const roleLevel = chatRole && typeof chatRole === 'string' ? roleLevels[chatRole] || 0 : 0
              return {
                id: p.userId,
                name: p.user.name,
                image: p.user.image,
                nickname: p.nickname || p.user.name,
                lastSeen: p.lastSeen.toISOString(),
                seatIndex: typeof p.seatIndex === 'number' ? p.seatIndex : -1,
                micOn: micOnSet.has(p.userId),
                chatRole,
                roleSymbol: chatRole && typeof chatRole === 'string' ? roleSymbolsActive[chatRole] : null,
                roleLevel,
                isAdmin: isGlobalAdminP
              }
            })

            send(`data: ${JSON.stringify({
              type: 'presence',
              users: activeUsers,
              onlineCount: activeUsers.length,
              totalCount: activeUsers.length
            })}\n\n`)
          }

          // 3. DJ updates: first poll fetches full state, subsequent polls check in-memory bus
          if (lastDjCheck === 0) {
            // First poll — build full DJ payload so client gets initial music state
            try {
              const initialDj = await buildDjPayload(roomId)
              send(`data: ${JSON.stringify(initialDj)}\n\n`)
            } catch { /* ignore */ }
            lastDjCheck = Date.now()
          } else {
            const djEvent = getLatestDjEvent(roomId, lastDjCheck)
            if (djEvent) {
              send(`data: ${JSON.stringify(djEvent)}\n\n`)
              lastDjCheck = Date.now()
            }
          }

          // 4. Typing from in-memory event bus (no DB hit)
          const typingNames = getTypingUsers(roomId, currentUserId)
          if (typingNames.length > 0) {
            send(`data: ${JSON.stringify({
              type: 'typing',
              users: typingNames
            })}\n\n`)
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
      // 10 sn: istemci tarafı watchdog toleransının (40 sn) çok altında kalsın
      // ki tek bir gecikmiş heartbeat gereksiz yeniden bağlanma tetiklemesin.
      const heartbeat = setInterval(() => {
        if (!isActive || !send(`: heartbeat\n\n`)) {
          clearInterval(heartbeat)
        }
      }, 10000)

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
