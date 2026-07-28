import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { logActivity } from '@/lib/activity-logger'
import { isExcludedFromFinance } from '@/lib/admin-check'
import { createNotificationWithPush } from '@/lib/notify'
import { processAgencyCommission, getPlatformSetting } from '@/lib/agency-commission'
import { triggerEventAnnouncement } from '@/lib/event-announcement'
import { getCachedPlatformSetting } from '@/lib/cache'
import { emitStreamEvent } from '@/lib/stream-events'
import { buildGiftRenderMeta } from '@/lib/gift-render'
import { processGiftSend } from '@/lib/gift-engine'

async function createStreamGiftAnnouncement(
  senderName: string, senderUsername: string | null,
  recipientName: string, recipientUsername: string | null,
  giftIcon: string, giftTypeName: string, amount: number,
  giftTypeId?: string
) {
  const giftAnnouncementSettingsRaw = await getCachedPlatformSetting('gift_announcement_settings', '')
  const giftAnnouncementSettings = giftAnnouncementSettingsRaw ? { value: giftAnnouncementSettingsRaw } : null
  let maxPasses = 1
  let expireMinutes = 3
  let minAmount = 1000
  let selectedGiftTypes: string[] = []
  if (giftAnnouncementSettings) {
    try {
      const s = JSON.parse(giftAnnouncementSettings.value)
      if (s.enabled === false) return
      maxPasses = s.maxPasses ?? 1
      expireMinutes = s.expireMinutes ?? 3
      minAmount = s.minAmount ?? 1000
      selectedGiftTypes = s.selectedGiftTypes ?? []
    } catch {}
  }

  // Check minimum amount threshold
  if (amount < minAmount) return

  // Check if this gift type is allowed (empty array = all allowed)
  if (selectedGiftTypes.length > 0 && giftTypeId && !selectedGiftTypes.includes(giftTypeId)) return

  const sender = senderUsername || senderName
  const recipient = recipientUsername || recipientName
  const message = `🎁 ${sender} → ${giftIcon} ${giftTypeName} (${amount} Jeton) → ${recipient} 🎁`

  await prisma.siteAnnouncement.create({
    data: {
      type: 'gift_announcement',
      message,
      color: 'gift',
      maxPasses,
      expiresAt: new Date(Date.now() + expireMinutes * 60 * 1000)
    }
  })
}

// Get recent gifts for a stream
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const gifts = await prisma.streamGift.findMany({
      where: { streamId: params.streamId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        sender: {
          select: { name: true, image: true }
        },
        giftType: true
      }
    })

    return NextResponse.json(gifts)
  } catch (error) {
    console.error('Error fetching gifts:', error)
    return NextResponse.json([], { status: 500 })
  }
}

// Send a gift
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    // Dual auth: mobile JWT or web session
    const mobileUser = await authenticateRequest(request)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id
    const userName = mobileUser?.name || session?.user?.name || 'Kullanıcı'
    const userImage = mobileUser?.image || (session?.user as any)?.image || null

    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { giftTypeId, quantity = 1 } = await request.json()

    if (!giftTypeId) {
      return NextResponse.json({ error: 'giftTypeId required' }, { status: 400 })
    }

    // Get gift type and check price
    const giftType = await prisma.giftType.findUnique({
      where: { id: giftTypeId }
    })

    if (!giftType || !giftType.isActive) {
      return NextResponse.json({ error: 'Invalid gift type' }, { status: 400 })
    }

    const totalPrice = giftType.price * quantity

    // Check user jeton balance (stream gifts require jetons)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, jetonBalance: true, role: true }
    })

    // Staff kullanıcılar (admin/yonetici) sınırsız bakiyeye sahiptir
    const isStaff = user?.role === 'yonetici'
    if (!isStaff && (!user || (user.jetonBalance ?? 0) < totalPrice)) {
      return NextResponse.json({ error: 'Yetersiz jeton' }, { status: 400 })
    }

    // Get stream and broadcaster
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId },
      select: { userId: true }
    })

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 })
    }

    // Admin/yönetici kullanıcıların hediyeleri alıcıya bakiye olarak yansımaz
    const senderExcluded = await isExcludedFromFinance(userId)

    const txOps: any[] = [
      prisma.streamGift.create({
        data: {
          streamId: params.streamId,
          senderId: userId,
          giftTypeId,
          quantity,
          totalPrice: senderExcluded ? 0 : totalPrice
        },
        include: {
          sender: { select: { name: true, image: true } },
          giftType: true
        }
      }),
    ]

    // Staff kullanıcılardan jeton düşülmez (sınırsız bakiye)
    if (!senderExcluded) {
      txOps.push(
        prisma.user.update({
          where: { id: userId },
          data: { jetonBalance: { decrement: totalPrice } }
        })
      )
    }

    // Sadece normal kullanıcıların hediyeleri yayıncıya bakiye olarak yansır
    if (!senderExcluded) {
      // Get configurable commission rate from platform settings (default 30%)
      const streamCommissionStr = await getPlatformSetting('stream_gift_commission', '30')
      const streamCommissionPercent = Math.min(100, Math.max(0, parseInt(streamCommissionStr) || 30))
      const recipientAmount = Math.floor(totalPrice * (100 - streamCommissionPercent) / 100)
      
      if (recipientAmount > 0) {
        txOps.push(
          prisma.user.update({
            where: { id: stream.userId },
            data: { jetonBalance: { increment: recipientAmount } }
          })
        )
      }

      // Process agency commission if broadcaster is in an agency
      processAgencyCommission({
        userId: stream.userId,
        earnedAmount: recipientAmount,
        sourceType: 'stream_gift',
        sourceId: params.streamId,
      }).catch(err => console.error('[Stream Gift] Agency commission error:', err))
    }

    // Update lastGiftAt for auto-close tracking
    txOps.push(
      prisma.videoStream.update({
        where: { id: params.streamId },
        data: { lastGiftAt: new Date() }
      })
    )

    const [gift] = await prisma.$transaction(txOps)

    // Log gift activity
    logActivity({
      userId: userId,
      userName: userName || 'Kullanıcı',
      userAvatar: userImage,
      activityType: 'gift_sent',
      detail: `hediye gönderdi 🎁`,
      targetUrl: `/sohbet/video`,
    })

    // Create notification for the banner (so gifts appear in scrolling banner)
    createNotificationWithPush({
      userId: stream.userId,
      type: 'stream_gift',
      title: 'Canlı Yayın Hediyesi! 🎁',
      message: `${giftType.name} hediye gönderdi!`,
      fromUserId: userId,
      fromUserName: userName || 'Kullanıcı',
      data: JSON.stringify({
        giftTypeId: giftType.id,
        giftName: giftType.name,
        giftIcon: giftType.icon,
        senderId: userId,
        senderName: userName || 'Kullanıcı',
        recipientName: '',
        streamId: params.streamId,
        amount: totalPrice
      })
    }).catch(err => console.error('Stream gift notification error:', err))

    // Auto-create scrolling announcement (settings determine threshold)
    const streamUser = await prisma.user.findUnique({ where: { id: stream.userId }, select: { name: true, username: true } })
    createStreamGiftAnnouncement(
      userName || 'Kullanıcı', null || null,
      streamUser?.name || 'Kullanıcı', streamUser?.username || null,
      giftType.icon, giftType.name, totalPrice, giftType.id
    ).catch(err => console.error('Stream gift announcement error:', err))

    // PK Battle: update scores if stream is in an active PK
    let pkUpdate = null
    try {
      const activePK = await prisma.pKBattle.findFirst({
        where: {
          OR: [
            { stream1Id: params.streamId },
            { stream2Id: params.streamId }
          ],
          status: 'active'
        }
      })
      if (activePK) {
        const isStream1 = activePK.stream1Id === params.streamId
        const updated = await prisma.pKBattle.update({
          where: { id: activePK.id },
          data: isStream1 ? { score1: { increment: totalPrice } } : { score2: { increment: totalPrice } }
        })
        pkUpdate = { battleId: activePK.id, score1: updated.score1, score2: updated.score2 }
      }
    } catch (pkErr) { console.error('PK score update error:', pkErr) }

    // Trigger gift sent event announcement
    const giftSenderName = user?.name || 'Bir kullanıcı'
    triggerEventAnnouncement('gift_sent', { user: giftSenderName, gift: giftType.name }, user?.id, giftSenderName, user?.role || 'free').catch(() => {})

    // Render metadata so ALL viewers (web + Flutter) display the gift the same
    // way (fullscreen edge-fill for big gifts) and it is visible to everyone.
    const renderMeta = buildGiftRenderMeta(giftType)

    // Emit gift event to SSE listeners
    emitStreamEvent(params.streamId, 'gift', {
      type: 'gift',
      streamId: params.streamId,
      gift: {
        id: gift.id,
        giftId: gift.id,
        senderName: userName,
        giftName: giftType.name,
        giftIcon: giftType.icon,
        quantity,
        totalPrice: senderExcluded ? 0 : totalPrice,
        timestamp: Date.now(),
        ...renderMeta,
      }
    })

    // ── Gift Engine (additive) ──────────────────────────────────────────────
    // Layer the professional engine on top: combo, per-stream FIFO queue,
    // GiftHistory and the unified gift_received / gift_queue_updated events.
    // Never throws; the money flow above is already committed.
    let enginePayload: any = null
    try {
      enginePayload = await processGiftSend({
        context: 'live_stream',
        contextId: params.streamId,
        giftType,
        sender: { id: userId as string, name: userName, image: userImage },
        receiver: { id: stream.userId, name: streamUser?.name ?? streamUser?.username ?? null },
        quantity,
        coinAmount: senderExcluded ? 0 : totalPrice,
      })
    } catch (engErr) {
      console.error('Stream gift engine error (non-fatal):', engErr)
    }

    return NextResponse.json({
      success: true,
      gift,
      giftRender: renderMeta,
      engine: enginePayload,
      newBalance: senderExcluded ? (user?.jetonBalance ?? 0) : (user?.jetonBalance ?? 0) - totalPrice,
      pkUpdate
    })
  } catch (error) {
    console.error('Error sending gift:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
