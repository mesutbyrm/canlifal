import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

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
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { roomId, roomType, nickname } = body

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
        userId: v.viewerId,
        nickname: v.nickname,
        joinedAt: v.joinedAt,
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
            userId: g.senderId,
            name: sender?.name || 'Anonim',
            image: sender?.image || null,
            totalAmount: g._sum.totalPrice || 0
          }
        })
      }

      roomInfo = {
        id: stream.id,
        roomId: stream.roomId,
        title: stream.title,
        description: stream.description,
        status: stream.status,
        category: stream.category,
        thumbnailUrl: stream.thumbnailUrl,
        backgroundUrl: stream.backgroundUrl,
        isImageMode: stream.isImageMode,
        viewerCount: viewers.length,
        likeCount: stream.likeCount,
        startedAt: stream.startedAt,
        host: {
          id: stream.user.id,
          name: stream.user.name,
          image: stream.user.image,
          role: stream.user.role,
          membership: stream.user.membership,
        }
      }

    } else {
      // ─── Voice Chat Room ───
      const room = await prisma.chatRoom.findFirst({
        where: { OR: [{ id: roomId }, { slug: roomId }] },
        include: {
          owner: { select: { id: true, name: true, image: true } },
        }
      })

      if (!room) {
        return NextResponse.json(
          { success: false, error: { code: 'ROOM_NOT_FOUND', message: 'Oda bulunamadı' } },
          { status: 404 }
        )
      }

      isHost = room.ownerId === authUser.id

      // Check ban
      const ban = await prisma.chatBan.findUnique({
        where: { roomId_userId: { roomId: room.id, userId: authUser.id } }
      })
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

      // Upsert presence
      try {
        await prisma.chatPresence.upsert({
          where: { roomId_userId: { roomId: room.id, userId: authUser.id } },
          update: { lastSeen: new Date(), ...(nickname ? { nickname } : {}) },
          create: { roomId: room.id, userId: authUser.id, nickname: nickname || null, seatIndex: -1 }
        })
      } catch (e: any) {
        if (e?.code === 'P2002') {
          await prisma.chatPresence.update({
            where: { roomId_userId: { roomId: room.id, userId: authUser.id } },
            data: { lastSeen: new Date(), ...(nickname ? { nickname } : {}) }
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

      participants = presences.map((p: any) => ({
        userId: p.user.id,
        name: p.user.name,
        nickname: p.nickname || p.user.name,
        image: p.user.image,
        role: p.user.role,
        membership: p.user.membership,
        seatIndex: p.seatIndex ?? -1,
        lastSeen: p.lastSeen,
      }))

      // Seat map (occupied seats)
      seats = presences
        .filter((p: any) => (p.seatIndex ?? -1) >= 0)
        .map((p: any) => ({
          seatIndex: p.seatIndex,
          userId: p.user.id,
          name: p.nickname || p.user.name,
          image: p.user.image,
        }))

      // Top gift senders in this room
      const topRoomGifts = await prisma.chatRoomGift.groupBy({
        by: ['senderId'],
        where: { roomId: room.id },
        _sum: { totalPrice: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 10
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
            userId: g.senderId,
            name: sender?.name || 'Anonim',
            image: sender?.image || null,
            totalAmount: g._sum.totalPrice || 0
          }
        })
      }

      roomInfo = {
        id: room.id,
        slug: room.slug,
        name: room.nameTr,
        nameEn: room.nameEn,
        description: room.descTr,
        descriptionEn: room.descEn,
        icon: room.icon,
        backgroundImage: room.backgroundImage,
        bannerImage: room.bannerImage,
        roomType: room.roomType,
        isMuted: room.isMuted,
        welcomeMessage: room.welcomeMessage,
        pinnedAnnouncement: room.pinnedAnnouncement,
        userCount: participants.length,
        host: {
          id: room.owner?.id,
          name: room.owner?.name,
          image: room.owner?.image,
        }
      }
    }

    console.log(`[LIVE/join-room] userId=${authUser.id} roomId=${roomId} roomType=${roomType} isHost=${isHost}`)

    return NextResponse.json({
      success: true,
      data: {
        room: roomInfo,
        trtc: {
          sdkAppId,
          userId: authUser.id,
          userSig,
          roomId: roomType === 'stream' ? (roomInfo.roomId || roomId) : roomId,
          expireTime,
        },
        user: {
          id: authUser.id,
          name: authUser.name,
          role: authUser.role,
          isHost,
        },
        participants,
        seats,
        giftRanking,
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
