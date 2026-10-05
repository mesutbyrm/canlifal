import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { atomicDebitJeton, isInsufficientBalanceError } from '@/lib/balance-guard'
import { logActivity } from '@/lib/activity-logger'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { parseJetonSource, resolveJetonSpend } from '@/lib/jeton-source'
import { createNotificationWithPush } from '@/lib/notify'
import { processAgencyCommission, getPlatformSetting } from '@/lib/agency-commission'
import { triggerEventAnnouncement } from '@/lib/event-announcement'
import { getCachedPlatformSetting } from '@/lib/cache'
import { emitStreamEvent } from '@/lib/stream-events'
import { buildGiftRenderMeta } from '@/lib/gift-render'
import { serializeGiftMedia } from '@/lib/media-url'
import { processGiftSend } from '@/lib/gift-engine'
import { recordMultiLeg, type LedgerLeg } from '@/lib/ledger'
import { recordContribution } from '@/lib/supporter-level'
import { recordTeamPoints } from '@/lib/team-points'
import { beginIdempotent, completeIdempotent, releaseIdempotent } from '@/lib/idempotency'
import { applyGiftPkScore } from '@/lib/gift-pk-score'
import { incrementLeaderboardScore } from '@/lib/leaderboard-engine'

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

    const serialized = gifts.map((gft: any) => ({
      ...gft,
      giftType: gft.giftType ? serializeGiftMedia(gft.giftType) : gft.giftType,
    }))
    return NextResponse.json(serialized)
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
  let _idempotencyRecord: string | null = null
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

    // Rate limit: yayın hediye
    const rateLimited = await guardRateLimit(request, 'gift_send', { userId })
    if (rateLimited) return rateLimited

    // Faz 22 (§71) — idempotency koruması
    const replay = await beginIdempotent(request, 'stream_gift', userId)
    if (replay.response) return replay.response
    _idempotencyRecord = replay.record

    const { giftTypeId, quantity = 1, jetonSource } = await request.json()

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

    // Sahte/gerçek jeton seçimi — staff (admin/yonetici) sınırsız bakiyeye sahiptir
    const spendPlan = await resolveJetonSpend(userId, totalPrice, parseJetonSource(jetonSource))
    const isStaff = spendPlan.skipDeduction
    if (!isStaff && (!user || (spendPlan.source === 'fake' ? spendPlan.fakeBalance : (user.jetonBalance ?? 0)) < totalPrice)) {
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
    const senderExcluded = !spendPlan.countsAsFinance

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
        atomicDebitJeton(prisma, userId, totalPrice, spendPlan.source)
      )
    }

    // Ledger için yayıncıya giden net tutar (blok dışında da erişilebilsin)
    let ledgerRecipientAmount = 0

    // Sadece normal kullanıcıların hediyeleri yayıncıya bakiye olarak yansır
    if (!senderExcluded) {
      // Get configurable commission rate from platform settings (default 30%)
      const streamCommissionStr = await getPlatformSetting('stream_gift_commission', '30')
      const streamCommissionPercent = Math.min(100, Math.max(0, parseInt(streamCommissionStr) || 30))
      const recipientAmount = Math.floor(totalPrice * (100 - streamCommissionPercent) / 100)
      ledgerRecipientAmount = recipientAmount

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

    // ── GERÇEK ZAMANLI YOL: PK skoru + hediye motoru, para akışı commit olur
    // olmaz ve diğer (ledger/bildirim/duyuru) işlerden BAĞIMSIZ başlar. Eskiden
    // bunlar ledger/aktivite/bildirim/duyuru işlerinin ve ek DB sorgusunun
    // ARKASINDA bekliyordu → izleyicilerde hediye ve PK puanı geç görünüyordu.
    const streamUserPromise = prisma.user.findUnique({
      where: { id: stream.userId },
      select: { name: true, username: true },
    })
    const pkPromise = applyGiftPkScore({
      sideIds: [params.streamId, (stream as any)?.id, (stream as any)?.roomId],
      amount: totalPrice,
      contributorId: userId,
      receiverId: stream.userId,
      giftTypeId: giftType.id,
      quantity,
      source: 'gift',
    })
    const enginePromise = streamUserPromise
      .then((streamUser) =>
        processGiftSend({
          context: 'live_stream',
          contextId: params.streamId,
          giftType,
          sender: { id: userId as string, name: userName, image: userImage },
          receiver: { id: stream.userId, name: streamUser?.name ?? streamUser?.username ?? null },
          quantity,
          coinAmount: senderExcluded ? 0 : totalPrice,
        })
      )
      .catch((engErr) => {
        console.error('Stream gift engine error (non-fatal):', engErr)
        return null
      })

    // ── Immutable ledger (fire-and-forget) ──
    if (!senderExcluded) {
      const siteAmount = totalPrice - ledgerRecipientAmount
      const legs: LedgerLeg[] = [
        {
          accountType: 'user_jeton',
          accountId: userId,
          direction: 'debit',
          amount: totalPrice,
          balanceBefore: user?.jetonBalance ?? 0,
          balanceAfter: (user?.jetonBalance ?? 0) - totalPrice,
        },
      ]
      if (ledgerRecipientAmount > 0) {
        legs.push({ accountType: 'user_jeton', accountId: stream.userId, direction: 'credit', amount: ledgerRecipientAmount })
      }
      if (siteAmount > 0) {
        legs.push({ accountType: 'platform_jeton', accountId: 'platform', direction: 'credit', amount: siteAmount })
      }
      recordMultiLeg({
        legs,
        category: 'gift_send',
        currency: 'jeton',
        description: `Video yayın hediyesi x${quantity}`,
        referenceType: 'StreamGift',
        referenceId: (gift as any)?.id,
        actorId: userId,
        metadata: { streamId: params.streamId, giftTypeId, quantity },
      }).catch((e) => console.error('[Ledger][video-stream-gift]', e))
      recordContribution(userId, stream.userId, totalPrice).catch(() => {})
      recordTeamPoints(userId, totalPrice).catch(() => {})
    }

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
    const streamUser = await streamUserPromise
    createStreamGiftAnnouncement(
      userName || 'Kullanıcı', null || null,
      streamUser?.name || 'Kullanıcı', streamUser?.username || null,
      giftType.icon, giftType.name, totalPrice, giftType.id
    ).catch(err => console.error('Stream gift announcement error:', err))

    // Leaderboard skor: hediye alıcısına puan (canlı yayın)
    incrementLeaderboardScore('live_stream', stream.userId, totalPrice, 'gift_received', params.streamId).catch(() => {})

    // Trigger gift sent event announcement
    const giftSenderName = user?.name || 'Bir kullanıcı'
    triggerEventAnnouncement('gift_sent', { user: giftSenderName, gift: giftType.name }, user?.id, giftSenderName, user?.role || 'free').catch(() => {})

    // Render metadata so ALL viewers (web + Flutter) display the gift the same
    // way (fullscreen edge-fill for big gifts) and it is visible to everyone.
    const renderMeta = buildGiftRenderMeta(giftType)

    // NOT: Legacy `gift` SSE olayı motorun ALTINDA, yalnızca motor başarısız
    // olursa yedek olarak yayınlanır (çift animasyonu önlemek için).

    // Gift Engine + PK skoru yukarıda paralel başlatıldı; burada sonuçları topla.
    const [pkUpdate, enginePayload] = await Promise.all([pkPromise, enginePromise])

    // Fallback: motor çalışmadıysa legacy `gift` SSE olayını yayınla
    if (!enginePayload) {
      emitStreamEvent(params.streamId, 'gift', {
        type: 'gift',
        eventType: 'GIFT_SENT',
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
    }

    const streamGiftResult = {
      success: true,
      gift,
      giftRender: renderMeta,
      engine: enginePayload,
      newBalance: senderExcluded ? (user?.jetonBalance ?? 0) : (user?.jetonBalance ?? 0) - totalPrice,
      pkUpdate
    }
    await completeIdempotent(replay.record, 200, streamGiftResult)
    return NextResponse.json(streamGiftResult)
  } catch (error) {
    await releaseIdempotent(_idempotencyRecord)
    if (isInsufficientBalanceError(error)) {
      return NextResponse.json({ error: 'Yetersiz jeton bakiyesi', code: 'INSUFFICIENT_BALANCE' }, { status: 400 })
    }
    console.error('Error sending gift:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}