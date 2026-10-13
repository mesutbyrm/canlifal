import { giftPointAmount, giftSenderTotals } from '@/lib/gift-points'
import { settleRoomGift } from '@/lib/gift-settlement'
import { GiftRecipientError, parseGiftQuantity } from '@/lib/gift-recipient'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { atomicDebitJeton, isInsufficientBalanceError } from '@/lib/balance-guard'
import { requireFeature } from '@/lib/check-feature'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { createNotificationWithPush } from '@/lib/notify'
import { parseJetonSource, resolveJetonSpend } from '@/lib/jeton-source'
import { processAgencyCommission } from '@/lib/agency-commission'
import { triggerEventAnnouncement } from '@/lib/event-announcement'
import { emitChatEvent } from '@/lib/chat-events'
import { buildGiftRenderMeta } from '@/lib/gift-render'
import { calculateGiftDistribution, logRoomRevenue } from '@/lib/voice-room-revenue'
import { processGiftSend } from '@/lib/gift-engine'
import { recordContribution } from '@/lib/supporter-level'
import { recordTeamPoints } from '@/lib/team-points'
import { beginIdempotent, completeIdempotent, releaseIdempotent } from '@/lib/idempotency'
import { applyGiftPkScore } from '@/lib/gift-pk-score'
import { incrementLeaderboardScore } from '@/lib/leaderboard-engine'

export const dynamic = 'force-dynamic'

// POST - Send a gift in a chat room
export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  let _idempotencyRecord: string | null = null
  let committedReceipt: any = null
  try {
    // Feature flag kontrolü
    const featureBlocked = await requireFeature('GIFTS_ENABLED')
    if (featureBlocked) return featureBlocked

    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const giftUserId = mobileUser?.id || session?.user?.id
    
    if (!giftUserId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // Rate limit: sohbet odası hediye
    const rateLimited = await guardRateLimit(req, 'gift_send', { userId: giftUserId })
    if (rateLimited) return rateLimited

    // Faz 22 (§71) — idempotency koruması
    const replay = await beginIdempotent(req, 'chatroom_gift', giftUserId, { strict: true })
    if (replay.response) return replay.response
    _idempotencyRecord = replay.record

    const { roomId } = params
    const body = await req.json()
    const { giftTypeId, quantity: rawQuantity, senderName: _sn, receiverName: _rn, platform: _pl } = body
    let { recipientId } = body
    const paymentType = 'jeton' // Only jeton is supported in chat rooms
    const quantity = parseGiftQuantity(rawQuantity)

    if (!giftTypeId) {
      return NextResponse.json({ error: 'giftTypeId gerekli' }, { status: 400 })
    }

    // If no recipientId, fallback to room owner
    if (!recipientId) {
      const room0 = await prisma.chatRoom.findUnique({ where: { id: roomId }, select: { ownerId: true } })
      recipientId = room0?.ownerId
      if (!recipientId) {
        return NextResponse.json({ error: 'Alıcı bulunamadı' }, { status: 400 })
      }
    }



    // Verify room exists (include commission settings + roomType)
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: { owner: { select: { id: true, name: true } }, giftBeneficiary: { select: { id: true, name: true } } }
    })
    if (!room || !room.isActive) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Get gift type
    const giftType = await prisma.giftType.findUnique({ where: { id: giftTypeId } })
    if (!giftType || !giftType.isActive) {
      return NextResponse.json({ error: 'Gift type not found' }, { status: 404 })
    }

    // Get sender
    const sender = await prisma.user.findUnique({
      where: { id: giftUserId },
      select: { id: true, name: true, credits: true, jetonBalance: true, role: true }
    })
    if (!sender) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 })
    }

    const unitPrice = giftType.price
    const price = unitPrice * quantity

    // §6 Client price validation — istemci eski/sahte fiyat gönderemez
    if (typeof body.clientPrice === 'number' && body.clientPrice !== unitPrice) {
      return NextResponse.json(
        { error: 'PRICE_MISMATCH', serverPrice: unitPrice, clientPrice: body.clientPrice,
          message: 'Hediye fiyatı değişti, lütfen katalog bilgisini güncelleyin' },
        { status: 409 }
      )
    }

    // Sahte/gerçek jeton seçimi (istemci `jetonSource` gönderir)
    const spendPlan = await resolveJetonSpend(sender.id, price, parseJetonSource(body.jetonSource))
    const isStaff = spendPlan.skipDeduction

    // Check jeton balance (staff skip)
    if (!isStaff && (spendPlan.source === 'fake' ? spendPlan.fakeBalance : (sender.jetonBalance ?? 0)) < price) {
      return NextResponse.json({ error: 'insufficient_jeton', message: 'Yetersiz jeton bakiyesi' }, { status: 400 })
    }

    // Get recipient
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, name: true, jetonBalance: true }
    })
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    // Calculate revenue distribution using the new room-type-aware model
    const roomType = (room as any).roomType || 'FREE'
    const roomOwnerId = room.ownerId
    const isRecipientOwner = recipientId === roomOwnerId
    const baseDist = await calculateGiftDistribution(price, roomType, isRecipientOwner)
    const dist = recipientId === sender.id ? { ...baseDist, receiverNet: 0, ownerNet: 0, siteAmount: price } : baseDist

    // Yalnız Fake hediyeler finansal kazanç üretmez.
    const senderExcluded = !spendPlan.countsAsFinance

    const settlement = await settleRoomGift({
      scope: 'voice', contextId: roomId, sideIds: [roomId, room.slug], battleId: body.battleId, senderId: sender.id, recipientId: recipient.id,
      ownerId: roomOwnerId, giftTypeId: giftType.id, quantity, amount: price,
      source: spendPlan.source, skipDeduction: spendPlan.skipDeduction, dist,
      idempotencyRecord: _idempotencyRecord, responseStyle: 'chat', giftName: giftType.name, giftIcon: giftType.icon,
    })
    committedReceipt = settlement.receipt
    const gift = settlement.gift
    sender.jetonBalance = settlement.senderBalanceBefore
    // Create system chat message for the gift
    const qtyText = quantity > 1 ? ` x${quantity}` : ''
    await prisma.chatMessage.create({
      data: {
        roomId,
        userId: sender.id,
        content: `🎁 ${sender.name || 'Biri'} → ${recipient.name || 'Biri'}: ${giftType.icon} ${giftType.name}${qtyText} [${price} 💎]`,
      }
    })

    // Send notification to recipient
    await createNotificationWithPush({
      userId: recipient.id,
      type: 'gift_received',
      title: 'Sohbet Hediyesi! 🎁',
      message: `size ${giftType.name} hediye gönderdi!`,
      fromUserId: sender.id,
      fromUserName: sender.name || undefined,
      data: JSON.stringify({
        type: 'chat_room_gift',
        giftTypeId: giftType.id,
        giftName: giftType.name,
        giftIcon: giftType.icon,
        roomId,
        roomName: room.nameTr,
        senderId: sender.id,
        senderName: sender.name,
        currencyType: paymentType,
        amount: price
      })
    })

    // Trigger gift sent event announcement
    triggerEventAnnouncement('gift_sent', { user: sender.name || 'Bir kullanıcı', gift: giftType.name }, sender.id, sender.name, sender.role || 'free').catch(() => {})

    // PK Battle: if a PK is active and side/battleId is provided, update PK score
    // Taraf ARTIK istemcinin `side`/`streamId` parametresinden değil, hediyenin
    // gerçekten gönderildiği odadan türetilir (oda izolasyonu). İstemci
    // `battleId` gönderse bile bu oda o PK'nın tarafı değilse skor yazılmaz.
    // Oda aktif bir PK'daysa parametre gönderilmese de skor işlenir.
    const pkUpdate = settlement.pkUpdate

    // Render metadata so ALL clients (web + Flutter) display the gift the same
    // way and it is visible to everyone in the room.
    const renderMeta = buildGiftRenderMeta(giftType)

    // NOT: Legacy `gift` SSE olayı motorun ALTINDA, yalnızca motor başarısız
    // olursa yedek olarak yayınlanır (çift animasyonu önlemek için).
    // events. Never throws; the money flow above is already committed.
    let enginePayload: any = null
    try {
      enginePayload = await processGiftSend({
        context: 'voice_room',
        contextId: roomId,
        giftType,
        sender: { id: sender.id, name: sender.name, image: (sender as any).image ?? (sender as any).profileImage ?? null },
        receiver: { id: recipient.id, name: recipient.name },
        quantity,
        coinAmount: price,
        jetonSource: spendPlan.source,
      })
    } catch (engErr) {
      console.error('Chat room gift engine error (non-fatal):', engErr)
    }

    // Fallback: motor çalışmadıysa legacy `gift` SSE olayını yayınla
    if (!enginePayload) {
      emitChatEvent(roomId, 'gift', {
        type: 'gift',
        eventType: 'GIFT_SENT',
        giftId: gift.id,
        roomId,
        senderId: sender.id,
        senderName: sender.name,
        recipientId: recipient.id,
        recipientName: recipient.name,
        giftTypeId: giftType.id,
        giftName: giftType.name,
        giftIcon: giftType.icon,
        quantity,
        amount: price,
        pointAmount: price,
        jetonSource: spendPlan.source,
        countsAsFinance: spendPlan.countsAsFinance,
        currencyType: paymentType,
        timestamp: Date.now(),
        ...renderMeta,
      })
    }

    const giftResult = {
      success: true,
      gift: {
        id: gift.id,
        giftId: gift.id,
        senderId: sender.id,
        senderName: sender.name,
        recipientId: recipient.id,
        recipientName: recipient.name,
        giftIcon: giftType.icon,
        giftName: giftType.name,
        quantity,
        amount: price,
        pointAmount: price,
        jetonSource: spendPlan.source,
        countsAsFinance: spendPlan.countsAsFinance,
        currencyType: paymentType,
        timestamp: Date.now(),
        ...renderMeta,
      },
      newBalance: settlement.newBalance,
      engine: enginePayload,
      pkUpdate
    }
    await completeIdempotent(replay.record, 200, giftResult)
    return NextResponse.json(giftResult)
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
    console.error('Chat room gift error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  } finally {
    if (!committedReceipt) await releaseIdempotent(_idempotencyRecord)
  }
}

// GET - Get gift leaderboard and recent gifts for a room
export async function GET(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const { roomId } = params
    const { searchParams } = new URL(req.url)
    const after = searchParams.get('after') // ISO timestamp for polling recent gifts

    // Calculate start of today (midnight UTC+3 Turkey time)
    const now = new Date()
    const turkeyOffset = 3 * 60 * 60 * 1000 // UTC+3
    const turkeyNow = new Date(now.getTime() + turkeyOffset)
    const todayStart = new Date(Date.UTC(turkeyNow.getUTCFullYear(), turkeyNow.getUTCMonth(), turkeyNow.getUTCDate()) - turkeyOffset)

    // Get currently active users in the room (present in last 120s)
    const twoMinutesAgo = new Date(Date.now() - 120000)
    const activePresences = await prisma.chatPresence.findMany({
      where: { roomId, lastSeen: { gte: twoMinutesAgo } },
      select: { userId: true }
    })
    const activeUserIds = activePresences.map((p: { userId: string }) => p.userId)

    // Get aggregated gifts per sender in this room - only today's gifts from active users
    const gifts = (await giftSenderTotals('voice', {
      roomId, currencyType: 'jeton', createdAt: { gte: todayStart },
      senderId: { in: activeUserIds.length > 0 ? activeUserIds : ['__none__'] },
    })).map(g => ({ ...g, currencyType: 'jeton', _sum: { totalPrice: g.pointAmount } }))

    // Get sender details
    const senderIds = [...new Set(gifts.map((g: any) => g.senderId))]
    const users = senderIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, name: true, username: true, image: true }
    }) : []
    const userMap = new Map(users.map((u: any) => [u.id, u]))

    // Combine jeton and cfc amounts per sender
    const leaderboardMap = new Map<string, { userId: string; name: string; username: string | null; image: string | null; jetonTotal: number; cfcTotal: number }>()
    
    for (const g of gifts) {
      const user = userMap.get(g.senderId) as any
      if (!user) continue
      const existing = leaderboardMap.get(g.senderId) || {
        userId: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
        jetonTotal: 0,
        cfcTotal: 0
      }
      if (g.currencyType === 'jeton') {
        existing.jetonTotal += g._sum.totalPrice || 0
      } else {
        existing.cfcTotal += g._sum.totalPrice || 0
      }
      leaderboardMap.set(g.senderId, existing)
    }

    // Sort by jeton total (primary) then cfc total
    const leaderboard = Array.from(leaderboardMap.values())
      .sort((a, b) => (b.jetonTotal + b.cfcTotal) - (a.jetonTotal + a.cfcTotal))
      .slice(0, 20)

    // Get recent gifts for broadcasting to all users
    const recentWhere: any = { roomId }
    if (after) {
      recentWhere.createdAt = { gt: new Date(after) }
    } else {
      // Default: gifts from last 15 seconds
      recentWhere.createdAt = { gt: new Date(Date.now() - 15000) }
    }

    const recentGifts = await prisma.chatRoomGift.findMany({
      where: recentWhere,
      include: {
        sender: { select: { id: true, name: true, username: true } },
        recipient: { select: { id: true, name: true, username: true } },
        giftType: true
      },
      orderBy: { createdAt: 'asc' },
      take: 20
    })

    const recentGiftsFormatted = recentGifts.map((g: any) => ({
      id: g.id,
      senderId: g.senderId,
      senderName: g.sender.username || g.sender.name,
      recipientId: g.recipientId,
      recipientName: g.recipient.username || g.recipient.name,
      giftTypeId: g.giftType.id,
      giftName: g.giftType.name,
      giftIcon: g.giftType.icon,
      giftImage: '',
      quantity: g.quantity ?? 1,
      amount: giftPointAmount(g),
      pointAmount: giftPointAmount(g),
      financialAmount: g.totalPrice,
      jetonSource: g.jetonSource,
      currencyType: g.currencyType,
      createdAt: g.createdAt.toISOString(),
      ...buildGiftRenderMeta(g.giftType),
    }))

    return NextResponse.json({ leaderboard, recentGifts: recentGiftsFormatted })
  } catch (error) {
    console.error('Gift leaderboard error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}