import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { redisCache } from '@/lib/cache'
import { seatStaleThreshold } from '@/lib/voice-room-constants'
import { resolveRoomSeatCount, findFirstFreeSeatFor, type SeatUserContext } from '@/lib/voice-room-seats'
import { ROLE_HIERARCHY, ROLE_SYMBOLS } from '@/lib/chat-permissions'
import { getCachedChatRoom } from '@/lib/cache'
import { withTiming } from '@/lib/perf'
import { authorizeVipEntry } from '@/lib/room-access'

export const dynamic = 'force-dynamic'

/**
 * POST /api/live/join-room
 * Compound endpoint for Flutter: joins a room and returns everything the client needs
 * in a single response — room state, TRTC credentials, participant list, seat map, gift ranking.
 *
 * Supports both VideoStream (live broadcast) and ChatRoom (voice room) types.
 *
 * Body: { roomId, roomType: 'stream' | 'voice', nickname? }
 */
async function handleJoinRoom(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { roomId, roomType, nickname, password: providedPassword } = body

    if (!roomId || !roomType) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_PARAMS', message: 'roomId ve roomType gereklidir' } },
        { status: 400 }
      )
    }

    if (!['stream', 'voice'].includes(roomType)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ROOM_TYPE', message: 'roomType "stream" veya "voice" olmalıdır' } },
        { status: 400 }
      )
    }

    // Generate TRTC credentials
    const sdkAppId = parseInt(process.env.TRTC_SDK_APP_ID || process.env.TENCENT_TRTC_SDK_APP_ID || '0')
    const secretKey = process.env.TRTC_SDK_SECRET_KEY || process.env.TRTC_SECRET_KEY || process.env.TENCENT_TRTC_SECRET_KEY || ''

    if (!sdkAppId || !secretKey) {
      return NextResponse.json(
        { success: false, error: { code: 'TRTC_NOT_CONFIGURED', message: 'TRTC yapılandırılmamış' } },
        { status: 500 }
      )
    }

    const TLSSigAPIv2 = require('tls-sig-api-v2')
    const api = new TLSSigAPIv2.Api(sdkAppId, secretKey)
    const expireTime = parseInt(process.env.TRTC_EXPIRE || '86400')
    const userSig = api.genSig(authUser.id, expireTime)

    let roomInfo: any = null
    let participants: any[] = []
    let seats: any[] = []
    let giftRanking: any[] = []
    let isHost = false
    let isBanned = false

    if (roomType === 'stream') {
      // ─── Live Video Stream ───
      const stream = await prisma.videoStream.findFirst({
        where: { OR: [{ id: roomId }, { roomId }] },
        include: {
          user: { select: { id: true, name: true, image: true, role: true, membership: true } },
        }
      })

      if (!stream) {
        return NextResponse.json(
          { success: false, error: { code: 'ROOM_NOT_FOUND', message: 'Yayın bulunamadı' } },
          { status: 404 }
        )
      }

      if (stream.status !== 'live') {
        return NextResponse.json(
          { success: false, error: { code: 'STREAM_ENDED', message: 'Bu yayın sona ermiş' } },
          { status: 410 }
        )
      }

      isHost = stream.userId === authUser.id

      // Upsert viewer record
      if (!isHost) {
        await prisma.videoStreamViewer.upsert({
          where: { streamId_viewerId: { streamId: stream.id, viewerId: authUser.id } },
          update: { leftAt: null, joinedAt: new Date(), nickname: nickname || null },
          create: { streamId: stream.id, viewerId: authUser.id, nickname: nickname || null }
        })
      }

      // Active viewers
      const viewers = await prisma.videoStreamViewer.findMany({
        where: { streamId: stream.id, leftAt: null },
        select: { viewerId: true, nickname: true, joinedAt: true },
        take: 200
      })

      participants = viewers.map((v: any) => ({
        userId: v.viewerId || '',
        name: '',
        nickname: v.nickname || '',
        image: '',
        role: '',
        membership: '',
        seatIndex: -1,
        joinedAt: v.joinedAt?.toISOString?.() || v.joinedAt || '',
        lastSeen: '',
        isMicOn: false,
      }))

      // Top gift senders
      const topGifts = await prisma.streamGift.groupBy({
        by: ['senderId'],
        where: { streamId: stream.id },
        _sum: { totalPrice: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 10
      })

      if (topGifts.length > 0) {
        const senderIds = topGifts.map((g: any) => g.senderId)
        const senders = await prisma.user.findMany({
          where: { id: { in: senderIds } },
          select: { id: true, name: true, image: true }
        })
        const senderMap = new Map(senders.map((s: any) => [s.id, s]))
        giftRanking = topGifts.map((g: any, idx: number) => {
          const sender = senderMap.get(g.senderId)
          return {
            rank: idx + 1,
            userId: g.senderId || '',
            name: sender?.name || 'Anonim',
            image: sender?.image || '',
            totalAmount: g._sum.totalPrice || 0
          }
        })
      }

      roomInfo = {
        id: stream.id || '',
        roomId: stream.roomId || '',
        slug: '',
        name: stream.title || 'Canlı Yayın',
        nameEn: '',
        title: stream.title || 'Canlı Yayın',
        description: stream.description || '',
        descriptionEn: '',
        status: stream.status || 'live',
        category: stream.category || 'general',
        icon: '',
        thumbnailUrl: stream.thumbnailUrl || '',
        backgroundUrl: stream.backgroundUrl || '',
        backgroundImage: '',
        bannerImage: '',
        isImageMode: stream.isImageMode === true,
        isMuted: false,
        roomType: 'stream',
        roomAccessType: '',
        welcomeMessage: '',
        pinnedAnnouncement: '',
        viewerCount: viewers.length,
        likeCount: stream.likeCount || 0,
        startedAt: stream.startedAt?.toISOString?.() || stream.startedAt || '',
        host: {
          id: stream.user?.id || '',
          name: stream.user?.name || 'Anonim',
          image: stream.user?.image || '',
          role: stream.user?.role || '',
          membership: stream.user?.membership || '',
        }
      }

    } else {
      // ─── Voice Chat Room ───
      // Room row is cached (15s) — it's mostly static and re-read on every
      // join/heartbeat. Password is only compared server-side, never sent out.
      const room = await getCachedChatRoom(roomId)

      if (!room) {
        return NextResponse.json(
          { success: false, error: { code: 'ROOM_NOT_FOUND', message: 'Oda bulunamadı' } },
          { status: 404 }
        )
      }

      isHost = room.ownerId === authUser.id

      // Ban check + existing-presence lookup run in parallel — independent reads.
      const [ban, existingPresence] = await Promise.all([
        prisma.chatBan.findUnique({
          where: { roomId_userId: { roomId: room.id, userId: authUser.id } }
        }),
        prisma.chatPresence.findUnique({
          where: { roomId_userId: { roomId: room.id, userId: authUser.id } },
          select: { seatIndex: true, lastSeen: true }
        })
      ])
      if (ban) {
        const isExpired = ban.expiresAt && new Date(ban.expiresAt) < new Date()
        if (!isExpired) {
          isBanned = true
          return NextResponse.json(
            { success: false, error: { code: 'BANNED', message: 'Bu odadan yasaklısınız' } },
            { status: 403 }
          )
        }
      }

      // Determine if this is a fresh join (vs. a reconnect/heartbeat).
      // Auto-seat free-slot search uses the short stale window so ghost seats
      // (unclean leavers) don't block the next joiner. existingPresence was
      // already fetched in parallel above.
      const presenceTimeoutJoin = seatStaleThreshold()
      const isFreshJoin = !existingPresence || existingPresence.lastSeen < new Date(Date.now() - 30000)

      // ── Şifre kapısı: YALNIZCA VIP oda (lib/room-access.ts) ──
      if (isFreshJoin) {
        const decision = await authorizeVipEntry({
          room: { id: room.id, roomType: room.roomType, password: room.password, ownerId: room.ownerId },
          userId: authUser.id,
          globalRole: authUser.role,
          password: providedPassword,
          accessToken: body.roomAccessToken,
          ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
        })
        if (!decision.ok) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: decision.code,
                message: decision.message,
                remainingAttempts: decision.remainingAttempts,
                locked: decision.locked,
              },
            },
            { status: decision.status }
          )
        }
      }

      // ── Auto-seat on fresh join: assign first free seat (0..SEAT_COUNT-1) ──
      let autoSeatIndex = -1
      if (isFreshJoin && (existingPresence?.seatIndex ?? -1) < 0) {
        // BÖLÜM 2 — dinamik koltuk sayısı + kademeli yerleştirme
        const seatCountJoin = await resolveRoomSeatCount(room.id, (room as any).seatCount ?? null)
        const seatedNow = await prisma.chatPresence.findMany({
          where: { roomId: room.id, lastSeen: { gte: presenceTimeoutJoin }, seatIndex: { gte: 0, lt: seatCountJoin }, userId: { not: authUser.id } },
          select: { seatIndex: true }
        })
        const joinerRow = await prisma.user.findUnique({
          where: { id: authUser.id },
          select: { role: true, membership: true }
        })
        const joinerChatRole = await prisma.chatUserRole.findUnique({
          where: { roomId_userId: { roomId: room.id, userId: authUser.id } },
          select: { role: true }
        }).catch(() => null)
        const joinerCtx: SeatUserContext = {
          userId: authUser.id,
          role: joinerRow?.role ?? null,
          membership: joinerRow?.membership ?? null,
          isRoomOwner: (room as any).ownerId === authUser.id,
          chatRole: joinerChatRole?.role ?? null
        }
        autoSeatIndex = findFirstFreeSeatFor(joinerCtx, seatedNow.map((s: any) => s.seatIndex as number), seatCountJoin)
      }

      // Upsert presence
      try {
        await prisma.chatPresence.upsert({
          where: { roomId_userId: { roomId: room.id, userId: authUser.id } },
          update: { lastSeen: new Date(), ...(nickname ? { nickname } : {}), ...(autoSeatIndex >= 0 ? { seatIndex: autoSeatIndex } : {}) },
          create: { roomId: room.id, userId: authUser.id, nickname: nickname || null, seatIndex: autoSeatIndex >= 0 ? autoSeatIndex : -1 }
        })
      } catch (e: any) {
        if (e?.code === 'P2002') {
          await prisma.chatPresence.update({
            where: { roomId_userId: { roomId: room.id, userId: authUser.id } },
            data: { lastSeen: new Date(), ...(nickname ? { nickname } : {}), ...(autoSeatIndex >= 0 ? { seatIndex: autoSeatIndex } : {}) }
          })
        } else { throw e }
      }

      // Active presences
      const presenceTimeout = new Date(Date.now() - 300000)
      const presences = await prisma.chatPresence.findMany({
        where: { roomId: room.id, lastSeen: { gte: presenceTimeout } },
        select: {
          userId: true, nickname: true, lastSeen: true, seatIndex: true,
          user: { select: { id: true, name: true, image: true, role: true, membership: true } }
        }
      })

      // Fold in mic status (active voice sessions), per-room moderator roles and
      // the room gift ranking IN PARALLEL so Flutter does NOT need a second
      // /state call after join. All three reads are independent of each other.
      const activeUserIds = presences.map((p: any) => p.userId)
      const [chatRoles, micSessions, topRoomGifts] = await Promise.all([
        activeUserIds.length > 0
          ? prisma.chatUserRole.findMany({
              where: { roomId: room.id, userId: { in: activeUserIds } },
              select: { userId: true, role: true }
            })
          : Promise.resolve([] as { userId: string; role: string }[]),
        activeUserIds.length > 0
          ? prisma.voiceSession.findMany({
              where: { roomId: room.id, userId: { in: activeUserIds }, isActive: true },
              select: { userId: true }
            })
          : Promise.resolve([] as { userId: string }[]),
        prisma.chatRoomGift.groupBy({
          by: ['senderId'],
          where: { roomId: room.id },
          _sum: { totalPrice: true },
          orderBy: { _sum: { totalPrice: 'desc' } },
          take: 10
        })
      ])

      const roleMap = new Map(chatRoles.map((r: any) => [r.userId, r.role]))
      const micOnSet = new Set(micSessions.map((v: any) => v.userId))
      const globalAdminRolesJ = ['admin', 'moderator', 'site_manager']
      const roleInfo = (p: any) => {
        const isGlobalAdmin = globalAdminRolesJ.includes(p.user?.role || '')
        const chatRole = (roleMap.get(p.userId) as string | undefined) || (isGlobalAdmin ? 'superadmin' : null)
        const roleSymbol = chatRole ? (ROLE_SYMBOLS[chatRole as keyof typeof ROLE_SYMBOLS] || '') : ''
        const roleLevel = chatRole ? (ROLE_HIERARCHY[chatRole as keyof typeof ROLE_HIERARCHY] || 0) : 0
        return { isGlobalAdmin, chatRole, roleSymbol, roleLevel }
      }

      participants = presences.map((p: any) => {
        const ri = roleInfo(p)
        return {
          userId: p.user?.id || p.userId || '',
          name: p.user?.name || 'Anonim',
          nickname: p.nickname || p.user?.name || 'Anonim',
          image: p.user?.image || '',
          role: p.user?.role || '',
          membership: p.user?.membership || '',
          seatIndex: typeof p.seatIndex === 'number' ? p.seatIndex : -1,
          joinedAt: '',
          lastSeen: p.lastSeen?.toISOString?.() || p.lastSeen || '',
          isMicOn: micOnSet.has(p.userId),
          micOn: micOnSet.has(p.userId),
          chatRole: ri.chatRole,
          roleSymbol: ri.roleSymbol,
          roleLevel: ri.roleLevel,
          isAdmin: ri.isGlobalAdmin,
          isOwner: room.ownerId === p.userId,
        }
      })

      // Seat map (occupied seats). Only show a seat as taken if the occupant's
      // heartbeat is still fresh (SEAT_STALE_MS) so freed seats appear empty.
      const seatStaleMs = seatStaleThreshold().getTime()
      seats = presences
        .filter((p: any) => (p.seatIndex ?? -1) >= 0 && new Date(p.lastSeen).getTime() >= seatStaleMs)
        .map((p: any) => {
          const ri = roleInfo(p)
          return {
            seatIndex: typeof p.seatIndex === 'number' ? p.seatIndex : 0,
            userId: p.user?.id || p.userId || '',
            userName: p.nickname || p.user?.name || 'Anonim',
            name: p.nickname || p.user?.name || 'Anonim',
            image: p.user?.image || '',
            userImage: p.user?.image || '',
            isMicOn: micOnSet.has(p.userId),
            micOn: micOnSet.has(p.userId),
            chatRole: ri.chatRole,
            roleSymbol: ri.roleSymbol,
            isOwner: room.ownerId === p.userId,
          }
        })

      if (topRoomGifts.length > 0) {
        const senderIds = topRoomGifts.map((g: any) => g.senderId)
        const senders = await prisma.user.findMany({
          where: { id: { in: senderIds } },
          select: { id: true, name: true, image: true }
        })
        const senderMap = new Map(senders.map((s: any) => [s.id, s]))
        giftRanking = topRoomGifts.map((g: any, idx: number) => {
          const sender = senderMap.get(g.senderId)
          return {
            rank: idx + 1,
            userId: g.senderId || '',
            name: sender?.name || 'Anonim',
            image: sender?.image || '',
            totalAmount: g._sum.totalPrice || 0
          }
        })
      }

      roomInfo = {
        id: room.id || '',
        roomId: room.id || '',
        slug: room.slug || '',
        name: room.nameTr || room.nameEn || '',
        nameEn: room.nameEn || '',
        title: room.nameTr || room.nameEn || '',
        description: room.descTr || room.descEn || '',
        descriptionEn: room.descEn || '',
        status: 'active',
        category: '',
        icon: room.icon || '',
        thumbnailUrl: room.backgroundImage || '',
        backgroundUrl: room.backgroundImage || '',
        backgroundImage: room.backgroundImage || '',
        bannerImage: room.bannerImage || '',
        isImageMode: false,
        isMuted: room.isMuted === true,
        roomType: 'voice',
        roomAccessType: room.roomType || 'FREE',
        welcomeMessage: room.welcomeMessage || '',
        pinnedAnnouncement: room.pinnedAnnouncement || '',
        viewerCount: participants.length,
        likeCount: 0,
        startedAt: '',
        host: {
          id: room.owner?.id || '',
          name: room.owner?.name || 'Anonim',
          image: room.owner?.image || '',
          role: '',
          membership: '',
        }
      }
    }

    console.log(`[LIVE/join-room] userId=${authUser.id} roomId=${roomId} roomType=${roomType} isHost=${isHost}`)

    // Track user in cache for instant online status
    redisCache.sadd(`room:${roomId}:users`, authUser.id)
    redisCache.hset(`user:${authUser.id}:presence`, 'roomId', roomId)
    redisCache.hset(`user:${authUser.id}:presence`, 'roomType', roomType)
    redisCache.hset(`user:${authUser.id}:presence`, 'joinedAt', new Date().toISOString())
    redisCache.expire(`user:${authUser.id}:presence`, 600) // 10 min TTL, refreshed by heartbeat

    return NextResponse.json({
      success: true,
      data: {
        room: roomInfo,
        trtc: {
          sdkAppId: sdkAppId || 0,
          userId: authUser.id || '',
          userSig: userSig || '',
          roomId: roomType === 'stream' ? (roomInfo.roomId || roomId || '') : (roomId || ''),
          expireTime: expireTime || 86400,
        },
        user: {
          id: authUser.id || '',
          name: authUser.name || '',
          image: authUser.image || '',
          role: authUser.role || '',
          isHost: isHost === true,
          isBanned: false,
        },
        participants: participants || [],
        seats: seats || [],
        giftRanking: giftRanking || [],
      }
    })

  } catch (error) {
    console.error('[LIVE/join-room] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Odaya katılma başarısız' } },
      { status: 500 }
    )
  }
}

export const POST = withTiming('/api/live/join-room', handleJoinRoom)
