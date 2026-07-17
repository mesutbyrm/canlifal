import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { logActivity } from '@/lib/activity-logger'
import { getPlatformSetting } from '@/lib/agency-commission'

export const dynamic = 'force-dynamic'

/**
 * POST /api/live/create-room
 * Unified room creation for Flutter.
 * Creates a live video stream and returns TRTC credentials + stream info.
 *
 * Body: { title?, description?, category?, thumbnailUrl?, coverUrl? }
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

    // Check if user is an approved live fortune teller
    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { userId: authUser.id },
      select: { id: true, applicationStatus: true, isActive: true, isBanned: true, isFrozen: true }
    })

    if (!teller) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_A_TELLER', message: 'Canlı falcı başvurusu yapmanız gerekiyor' } },
        { status: 403 }
      )
    }
    if (teller.applicationStatus !== 'approved') {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_APPROVED', message: 'Canlı falcı başvurunuz henüz onaylanmadı', status: teller.applicationStatus } },
        { status: 403 }
      )
    }
    if (!teller.isActive || teller.isBanned || teller.isFrozen) {
      return NextResponse.json(
        { success: false, error: { code: 'ACCOUNT_RESTRICTED', message: 'Hesabınız şu anda kısıtlı' } },
        { status: 403 }
      )
    }

    // Check cooldown after auto-close
    const cooldownStr = await getPlatformSetting('stream_reopen_cooldown', '30')
    const cooldownMinutes = parseInt(cooldownStr) || 30
    if (cooldownMinutes > 0) {
      const lastAutoClosed = await prisma.videoStream.findFirst({
        where: { userId: authUser.id, autoClosedAt: { not: null } },
        orderBy: { autoClosedAt: 'desc' },
        select: { autoClosedAt: true }
      })
      if (lastAutoClosed?.autoClosedAt) {
        const cooldownMs = cooldownMinutes * 60 * 1000
        const elapsed = Date.now() - new Date(lastAutoClosed.autoClosedAt).getTime()
        if (elapsed < cooldownMs) {
          const remainingMin = Math.ceil((cooldownMs - elapsed) / 60000)
          return NextResponse.json(
            { success: false, error: { code: 'COOLDOWN_ACTIVE', message: `Yayınınız otomatik kapatıldığı için ${remainingMin} dakika beklemeniz gerekiyor`, remainingMinutes: remainingMin } },
            { status: 429 }
          )
        }
      }
    }

    // Check for existing live stream
    const existingLive = await prisma.videoStream.findFirst({
      where: { userId: authUser.id, status: 'live' },
      select: { id: true, roomId: true }
    })
    if (existingLive) {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_LIVE', message: 'Zaten aktif bir yayınınız var', streamId: existingLive.id, roomId: existingLive.roomId } },
        { status: 409 }
      )
    }

    const body = await request.json()
    const { title, description, category, thumbnailUrl, coverUrl } = body

    const stream = await prisma.videoStream.create({
      data: {
        userId: authUser.id,
        title: title || null,
        description: description || null,
        category: category || 'general',
        thumbnailUrl: thumbnailUrl || coverUrl || null,
        status: 'live'
      },
      include: {
        user: { select: { id: true, name: true, image: true } }
      }
    })

    // Generate TRTC credentials
    const sdkAppId = parseInt(process.env.TRTC_SDK_APP_ID || process.env.TENCENT_TRTC_SDK_APP_ID || '0')
    const secretKey = process.env.TRTC_SDK_SECRET_KEY || process.env.TRTC_SECRET_KEY || ''
    let trtc = null
    if (sdkAppId && secretKey) {
      const TLSSigAPIv2 = require('tls-sig-api-v2')
      const api = new TLSSigAPIv2.Api(sdkAppId, secretKey)
      const expireTime = parseInt(process.env.TRTC_EXPIRE || '86400')
      const userSig = api.genSig(authUser.id, expireTime)
      trtc = { sdkAppId, userId: authUser.id, userSig, roomId: stream.roomId, expireTime }
    }

    // Log activity
    logActivity({
      userId: authUser.id,
      userName: authUser.name || 'Kullanıcı',
      userAvatar: authUser.image || null,
      activityType: 'stream_started',
      detail: 'canlı yayın başlattı 🔴',
      targetUrl: `/sohbet/video`,
    })

    // Notify followers (fire-and-forget)
    notifyFollowers(authUser.id, authUser.name || 'Falcı', stream.id, title).catch(() => {})

    console.log(`[LIVE/create-room] streamId=${stream.id} roomId=${stream.roomId} userId=${authUser.id}`)

    return NextResponse.json({
      success: true,
      data: {
        stream: {
          id: stream.id || '',
          roomId: stream.roomId || '',
          title: stream.title || '',
          description: stream.description || '',
          category: stream.category || 'general',
          status: stream.status || 'live',
          thumbnailUrl: stream.thumbnailUrl || '',
          startedAt: stream.startedAt?.toISOString?.() || stream.startedAt || '',
          host: {
            id: stream.user?.id || '',
            name: stream.user?.name || 'Anonim',
            image: stream.user?.image || '',
          }
        },
        trtc: trtc ? {
          sdkAppId: trtc.sdkAppId || 0,
          userId: trtc.userId || '',
          userSig: trtc.userSig || '',
          roomId: trtc.roomId || '',
          expireTime: trtc.expireTime || 86400,
        } : null,
      }
    })
  } catch (error) {
    console.error('[LIVE/create-room] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Yayın oluşturulamadı' } },
      { status: 500 }
    )
  }
}

/** Notify followers that a user went live */
async function notifyFollowers(userId: string, userName: string, streamId: string, streamTitle?: string) {
  const followers = await prisma.follow.findMany({
    where: { followingId: userId },
    select: { followerId: true },
    take: 500,
  })
  if (followers.length === 0) return

  const followerIds = followers.map((f: any) => f.followerId)
  await prisma.notification.createMany({
    data: followerIds.map((fId: any) => ({
      userId: fId,
      type: 'live_stream',
      title: `${userName} canlı yayında`,
      message: streamTitle || 'Canlı Fal',
      data: JSON.stringify({ streamId }),
      targetPath: 'stream',
      targetId: streamId,
      fromUserId: userId,
      fromUserName: userName,
    }))
  })
}
