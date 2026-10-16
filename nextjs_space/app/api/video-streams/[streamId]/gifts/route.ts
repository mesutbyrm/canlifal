import { giftPointAmount } from '@/lib/gift-points'
import { settleRoomGift } from '@/lib/gift-settlement'
import { GiftRecipientError, parseGiftQuantity } from '@/lib/gift-recipient'
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
import { calculateGiftDistribution } from '@/lib/voice-room-revenue'
import { triggerEventAnnouncement } from '@/lib/event-announcement'
import { getCachedPlatformSetting } from '@/lib/cache'
import { emitStreamEvent } from '@/lib/stream-events'
import { durableEmitSSE, durableNotify } from '@/lib/event-outbox'
import { buildGiftRenderMeta } from '@/lib/gift-render'
import { serializeGiftMedia } from '@/lib/media-url'
import { processGiftSend } from '@/lib/gift-engine'
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

    if (request.nextUrl.searchParams.get('summary') === '1') {
      const mobile = await authenticateRequest(request)
      const session = !mobile ? await getServerSession(authOptions) : null
      const userId = mobile?.id || session?.user?.id
      if (!userId) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
      const stream = await prisma.videoStream.findUnique({ where: { id: params.streamId }, select: { userId: true } })
      if (!stream || stream.userId !== userId) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
      const [all, host] = await Promise.all([
        prisma.streamGift.aggregate({ where: { streamId: params.streamId }, _sum: { totalPrice: true, ownerAmount: true, receiverAmount: true, siteAmount: true }, _count: true }),
        prisma.streamGift.aggregate({ where: { streamId: params.streamId, OR: [{ recipientId: userId }, { recipientId: null }] }, _sum: { receiverAmount: true } }),
      ])
      return NextResponse.json({ gifts: gifts.map((g: any) => ({ ...g, giftType: serializeGiftMedia(g.giftType) })), totals: {
        grossJeton: all._sum.totalPrice || 0, platformJeton: all._sum.siteAmount || 0,
        ownerNetJeton: (all._sum.ownerAmount || 0) + (host._sum.receiverAmount || 0),
        guestNetJeton: (all._sum.receiverAmount || 0) - (host._sum.receiverAmount || 0), giftCount: all._count,
      } }, { headers: { 'Cache-Control': 'private, no-store' } })
    }

    const serialized = gifts.map((gft: any) => ({
      ...gft,
      pointAmount: giftPointAmount(gft),
      financialAmount: gft.totalPrice,
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
  let committedReceipt: any = null
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
    const replay = await beginIdempotent(request, 'stream_gift', userId, { strict: true })
    if (replay.response) return replay.response
    _idempotencyRecord = replay.record

    const { giftTypeId, quantity: rawQuantity, jetonSource, clientPrice, recipientId: requestedRecipient, toUserId } = await request.json()
    const quantity = parseGiftQuantity(rawQuantity)

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

    // §6 Client price validation — istemci eski/sahte fiyat gönderemez
    if (typeof clientPrice === 'number' && clientPrice !== giftType.price) {
      return NextResponse.json(
        { error: 'PRICE_MISMATCH', serverPrice: giftType.price, clientPrice,
          message: 'Hediye fiyatı değişti, lütfen katalog bilgisini güncelleyin' },
        { status: 409 }
      )
    }

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
      select: { id: true, roomId: true, userId: true, status: true }
    })

    if (!stream || stream.status !== 'live') {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 })
    }

    // Mobil uygulama misafire hediyeyi `toUserId` ile gönderir; önceden yok
    // sayılıp hediye hep yayıncıya gidiyordu. Yalnızca bu yayının AKTİF
    // misafiri kabul edilir (aksi halde yayıncıya gider).
    let recipientId: string = requestedRecipient || stream.userId
    if (!requestedRecipient && typeof toUserId === 'string' && toUserId && toUserId !== stream.userId) {
      const guest = await prisma.liveGuestSession.findFirst({
        where: { streamId: stream.id, userId: toUserId, status: 'active' },
        select: { id: true },
      })
      if (guest) recipientId = toUserId
    }
    const senderExcluded = !spendPlan.countsAsFinance
    const baseDist = await calculateGiftDistribution(totalPrice, 'NORMAL', recipientId === stream.userId)
    // Kendine hediye de normal hediye gibi dağıtılır: alıcı (gönderenin
    // kendisi) komisyon düşülmüş payını, oda/yayın sahibi kendi payını alır.
    // (Önceden tutarın tamamı platforma gidiyordu.)
    const dist = baseDist
    const settlement = await settleRoomGift({
      scope: 'stream', contextId: params.streamId, sideIds: [stream.id, stream.roomId], senderId: userId, recipientId, ownerId: stream.userId,
      giftTypeId, quantity, amount: totalPrice, source: spendPlan.source, skipDeduction: spendPlan.skipDeduction,
      dist, idempotencyRecord: _idempotencyRecord, responseStyle: 'stream', giftName: giftType.name, giftIcon: giftType.icon,
    })
    committedReceipt = settlement.receipt
    const gift = settlement.gift
    if (user) user.jetonBalance = settlement.senderBalanceBefore
    const ledgerRecipientAmount = dist.receiverNet + dist.ownerNet
    // ── GERÇEK ZAMANLI YOL: PK skoru + hediye motoru, para akışı commit olur
    // olmaz ve diğer (ledger/bildirim/duyuru) işlerden BAĞIMSIZ başlar. Eskiden
    // bunlar ledger/aktivite/bildirim/duyuru işlerinin ve ek DB sorgusunun
    // ARKASINDA bekliyordu → izleyicilerde hediye ve PK puanı geç görünüyordu.
    const streamUserPromise = prisma.user.findUnique({
      where: { id: recipientId },
      select: { name: true, username: true },
    })
    const pkPromise = Promise.resolve(settlement.pkUpdate)
    const enginePromise = streamUserPromise
      .then((streamUser) =>
        processGiftSend({
          context: 'live_stream',
          contextId: params.streamId,
          giftType,
          sender: { id: userId as string, name: userName, image: userImage },
          receiver: { id: recipientId, name: streamUser?.name ?? streamUser?.username ?? null },
          quantity,
          coinAmount: totalPrice,
          jetonSource: spendPlan.source,
        })
      )
      .catch((engErr) => {
        console.error('Stream gift engine error (non-fatal):', engErr)
        return null
      })



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
    durableNotify(recipientId, {
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
      durableEmitSSE('stream', params.streamId, 'gift', {
        type: 'gift',
        eventType: 'GIFT_SENT',
        streamId: params.streamId,
        gift: {
          id: gift.id,
          giftId: gift.id,
          recipientId,
          receiverId: recipientId,
          senderName: userName,
          giftName: giftType.name,
          giftIcon: giftType.icon,
          quantity,
          totalPrice,
          pointAmount: totalPrice,
          jetonSource: spendPlan.source,
          countsAsFinance: spendPlan.countsAsFinance,
          timestamp: Date.now(),
          ...renderMeta,
        }
      })
    }

    const streamGiftResult = {
      success: true,
      jetonSource: spendPlan.source,
      countsAsFinance: spendPlan.countsAsFinance,
      pointAmount: totalPrice,
      gift,
      giftRender: renderMeta,
      engine: enginePayload,
      newBalance: settlement.newBalance,
      pkUpdate
    }
    await completeIdempotent(replay.record, 200, streamGiftResult)
    return NextResponse.json(streamGiftResult)
  } catch (error) {
    if (committedReceipt) {
      console.error('[Gift] post-commit side effect failed:', error)
      return NextResponse.json(committedReceipt)
    }
    await releaseIdempotent(_idempotencyRecord)
    if (error instanceof GiftRecipientError) return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    if (isInsufficientBalanceError(error)) {
      return NextResponse.json({ error: 'Yetersiz jeton bakiyesi', code: 'INSUFFICIENT_BALANCE' }, { status: 400 })
    }
    console.error('Error sending gift:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  } finally {
    if (!committedReceipt) await releaseIdempotent(_idempotencyRecord)
  }
}