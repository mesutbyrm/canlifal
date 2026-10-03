export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/db'
import { redisCache } from '@/lib/cache'

/* ────────────────────────────────────────────────────────────────────
 *  Tencent TRTC Event Callback Endpoint
 *  POST /api/tencent/webhook
 *
 *  Tencent Cloud sends HTTP POST with JSON body.
 *  Headers: SdkAppId, Sign (HMAC-SHA256 of body with configured key)
 *
 *  EventGroupId:
 *    1 = Room   (101 create, 102 dissolve, 103 enter, 104 leave, 105 role switch)
 *    2 = Media  (201-206 audio/video start/stop)
 *    3 = Cloud Recording
 *    4 = Relay
 *
 *  We handle:
 *    Room Created   (101) — mark stream as live
 *    Room Dissolved (102) — end stream, mark users offline
 *    Member Enter   (103) — mark user online / add viewer
 *    Member Leave   (104) — mark user offline / remove viewer
 *    Role Switch    (105) — log only
 *    Media events   (201-206) — log only
 *
 *  PK events are managed via our internal PkMatch model, not TRTC callbacks.
 *  We update PK state when room events indicate relevant changes.
 * ──────────────────────────────────────────────────────────────────── */

const EXPECTED_SDK_APP_ID = parseInt(process.env.TRTC_SDK_APP_ID || '0')
const WEBHOOK_KEY = process.env.TRTC_WEBHOOK_KEY || ''

// ── Signature verification ──────────────────────────────────────────
function verifySignature(rawBody: string, signHeader: string | null): boolean {
  if (!WEBHOOK_KEY) {
    // Üretimde anahtarsız webhook kabul edilmez; yalnızca geliştirmede atlanır.
    if (process.env.NODE_ENV === 'production') {
      console.error('[TRTC-Webhook] TRTC_WEBHOOK_KEY not set in production, rejecting request')
      return false
    }
    console.warn('[TRTC-Webhook] TRTC_WEBHOOK_KEY not set, skipping signature check (dev only)')
    return true
  }
  if (!signHeader) return false

  const computed = crypto
    .createHmac('sha256', WEBHOOK_KEY)
    .update(rawBody)
    .digest('base64')

  return computed === signHeader
}

// ── Event handlers ──────────────────────────────────────────────────

async function handleRoomCreated(info: any) {
  const roomId = String(info.RoomId || '')
  if (!roomId) return

  // Try to find and ensure stream is live
  const stream = await prisma.videoStream.findFirst({
    where: { roomId, status: 'live' },
    select: { id: true },
  })

  if (stream) {
    console.log(`[TRTC-Webhook] Room ${roomId} created, stream ${stream.id} confirmed live`)
  } else {
    console.log(`[TRTC-Webhook] Room ${roomId} created, no matching stream found`)
  }
}

async function handleRoomDissolved(info: any) {
  const roomId = String(info.RoomId || '')
  if (!roomId) return

  // End any live streams for this room
  const updated = await prisma.videoStream.updateMany({
    where: { roomId, status: 'live' },
    data: { status: 'ended', endedAt: new Date() },
  })

  // Fetch all streams for this room (before updateMany clears status)
  const streams = await prisma.videoStream.findMany({
    where: { roomId },
    select: { id: true, userId: true },
  })
  const streamIds = streams.map(s => s.id)

  if (updated.count > 0) {
    console.log(`[TRTC-Webhook] Room ${roomId} dissolved — ${updated.count} stream(s) ended`)

    if (streamIds.length > 0) {
      // Mark all active viewers as left
      await prisma.videoStreamViewer.updateMany({
        where: {
          streamId: { in: streamIds },
          leftAt: null,
        },
        data: { leftAt: new Date() },
      })

      // End any active guest sessions
      await prisma.liveGuestSession.updateMany({
        where: {
          streamId: { in: streamIds },
          status: 'active',
        },
        data: { status: 'left', leftAt: new Date() },
      })
    }

    if (streamIds.length > 0) {
      await prisma.pkMatch.updateMany({
        where: {
          status: { in: ['pending', 'accepted', 'live'] },
          OR: [
            { hostStreamId: { in: streamIds } },
            { guestStreamId: { in: streamIds } },
          ],
        },
        data: { status: 'cancelled' },
      })
    }
  } else {
    console.log(`[TRTC-Webhook] Room ${roomId} dissolved, no active stream found`)
  }
}

async function handleMemberEnter(info: any) {
  const roomId = String(info.RoomId || '')
  const userId = String(info.UserId || '')
  const role = info.Role // 20 = Anchor, 21 = Audience
  if (!roomId || !userId) return

  console.log(`[TRTC-Webhook] User ${userId} entered room ${roomId} (role: ${role})`)

  // Track in cache immediately
  redisCache.sadd(`room:${roomId}:users`, userId)
  redisCache.hset(`user:${userId}:presence`, 'roomId', roomId)
  redisCache.hset(`user:${userId}:presence`, 'lastSeen', new Date().toISOString())
  redisCache.expire(`user:${userId}:presence`, 600)

  // Find stream by roomId
  const stream = await prisma.videoStream.findFirst({
    where: { roomId, status: 'live' },
    select: { id: true, userId: true },
  })

  if (!stream) return

  // Upsert viewer record
  try {
    await prisma.videoStreamViewer.upsert({
      where: {
        streamId_viewerId: { streamId: stream.id, viewerId: userId },
      },
      update: { leftAt: null }, // Re-entering: clear leftAt
      create: {
        streamId: stream.id,
        viewerId: userId,
        joinedAt: new Date(),
      },
    })
  } catch (e) {
    // Ignore unique constraint race conditions
    console.warn(`[TRTC-Webhook] Viewer upsert warning for ${userId}:`, (e as Error).message)
  }
}

async function handleMemberLeave(info: any) {
  const roomId = String(info.RoomId || '')
  const userId = String(info.UserId || '')
  const reason = info.Reason // 0=normal, 1=timeout, 2=kicked
  if (!roomId || !userId) return

  console.log(`[TRTC-Webhook] User ${userId} left room ${roomId} (reason: ${reason})`)

  // Remove from cache immediately
  redisCache.srem(`room:${roomId}:users`, userId)
  redisCache.del(`user:${userId}:presence`)

  // Find stream by roomId
  const stream = await prisma.videoStream.findFirst({
    where: { roomId },
    select: { id: true, userId: true },
  })

  if (!stream) return

  // Mark viewer as left
  await prisma.videoStreamViewer.updateMany({
    where: {
      streamId: stream.id,
      viewerId: userId,
      leftAt: null,
    },
    data: { leftAt: new Date() },
  })

  // If the host left, end the stream
  if (stream.userId === userId) {
    console.log(`[TRTC-Webhook] Host ${userId} left room ${roomId} — ending stream`)
    await prisma.videoStream.update({
      where: { id: stream.id },
      data: { status: 'ended', endedAt: new Date() },
    })

    // Mark all remaining viewers as left
    await prisma.videoStreamViewer.updateMany({
      where: { streamId: stream.id, leftAt: null },
      data: { leftAt: new Date() },
    })

    // End guest sessions
    await prisma.liveGuestSession.updateMany({
      where: { streamId: stream.id, status: 'active' },
      data: { status: 'left', leftAt: new Date() },
    })
  }

  // End guest session if a guest left
  await prisma.liveGuestSession.updateMany({
    where: {
      streamId: stream.id,
      userId,
      status: 'active',
    },
    data: { status: 'left', leftAt: new Date() },
  })
}

async function handleRoleSwitch(info: any) {
  const roomId = String(info.RoomId || '')
  const userId = String(info.UserId || '')
  const newRole = info.Role // 20 = Anchor, 21 = Audience
  console.log(`[TRTC-Webhook] User ${userId} switched role in room ${roomId} to ${newRole}`)
  // Role switches are informational — no DB changes needed
}

// ── Main handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let rawBody = ''
  let body: any = {}

  try {
    rawBody = await request.text()
    body = JSON.parse(rawBody)
  } catch {
    console.error('[TRTC-Webhook] Invalid JSON body')
    return NextResponse.json({ code: 0 }, { status: 200 }) // Always return 200 to Tencent
  }

  const signHeader = request.headers.get('sign') || request.headers.get('Sign')
  const sdkAppIdHeader = parseInt(request.headers.get('sdkappid') || request.headers.get('SdkAppId') || '0')

  // ── Security: Validate SDKAppID ──
  if (EXPECTED_SDK_APP_ID && sdkAppIdHeader && sdkAppIdHeader !== EXPECTED_SDK_APP_ID) {
    console.warn(`[TRTC-Webhook] SDKAppID mismatch: got ${sdkAppIdHeader}, expected ${EXPECTED_SDK_APP_ID}`)
    return NextResponse.json({ code: -1, message: 'Invalid SDKAppID' }, { status: 403 })
  }

  // ── Security: Validate signature ──
  if (WEBHOOK_KEY && !verifySignature(rawBody, signHeader)) {
    console.warn('[TRTC-Webhook] Signature verification failed')
    return NextResponse.json({ code: -1, message: 'Invalid signature' }, { status: 403 })
  }

  const eventGroupId = body.EventGroupId || 0
  const eventType = body.EventType || 0
  const eventInfo = body.EventInfo || {}
  const callbackTs = body.CallbackTs || Date.now()

  console.log(`[TRTC-Webhook] Event received: GroupId=${eventGroupId} Type=${eventType} Ts=${callbackTs}`)

  let processedOk = true
  let errorMessage: string | undefined

  try {
    // ── Room events (EventGroupId: 1) ──
    if (eventGroupId === 1) {
      switch (eventType) {
        case 101: // Room Created
          await handleRoomCreated(eventInfo)
          break
        case 102: // Room Dissolved
          await handleRoomDissolved(eventInfo)
          break
        case 103: // Member Enter
          await handleMemberEnter(eventInfo)
          break
        case 104: // Member Leave
          await handleMemberLeave(eventInfo)
          break
        case 105: // Role Switch
          await handleRoleSwitch(eventInfo)
          break
        default:
          console.log(`[TRTC-Webhook] Unhandled room event type: ${eventType}`)
      }
    }
    // ── Media events (EventGroupId: 2) — log only ──
    else if (eventGroupId === 2) {
      console.log(`[TRTC-Webhook] Media event: type=${eventType} user=${eventInfo.UserId} room=${eventInfo.RoomId}`)
    }
    // ── Recording events (EventGroupId: 3) — log only ──
    else if (eventGroupId === 3) {
      console.log(`[TRTC-Webhook] Recording event: type=${eventType} room=${eventInfo.RoomId}`)
    }
    // ── Relay events (EventGroupId: 4) — log only ──
    else if (eventGroupId === 4) {
      console.log(`[TRTC-Webhook] Relay event: type=${eventType} room=${eventInfo.RoomId}`)
    }
    else {
      console.log(`[TRTC-Webhook] Unknown EventGroupId: ${eventGroupId}`)
    }
  } catch (err) {
    processedOk = false
    errorMessage = (err as Error).message
    console.error(`[TRTC-Webhook] Error processing event ${eventGroupId}/${eventType}:`, err)
  }

  // ── Log every event to DB ──
  try {
    await prisma.trtcWebhookLog.create({
      data: {
        eventGroupId,
        eventType,
        sdkAppId: sdkAppIdHeader || EXPECTED_SDK_APP_ID || 0,
        roomId: String(eventInfo.RoomId || ''),
        userId: String(eventInfo.UserId || ''),
        payload: rawBody,
        processedOk,
        errorMessage,
      },
    })
  } catch (logErr) {
    console.error('[TRTC-Webhook] Failed to write webhook log:', logErr)
  }

  // Tencent expects HTTP 200 with { code: 0 }
  return NextResponse.json({ code: 0 })
}
