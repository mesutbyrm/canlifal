import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { atomicDebitJeton, isInsufficientBalanceError } from '@/lib/balance-guard'
import { requireFeature } from '@/lib/check-feature'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { createNotificationWithPush } from '@/lib/notify'
import { isExcludedFromFinance } from '@/lib/admin-check'
import { processAgencyCommission } from '@/lib/agency-commission'
import { triggerEventAnnouncement } from '@/lib/event-announcement'
import { emitChatEvent } from '@/lib/chat-events'
import { buildGiftRenderMeta } from '@/lib/gift-render'
import { calculateGiftDistribution, logRoomRevenue } from '@/lib/voice-room-revenue'
import { processGiftSend } from '@/lib/gift-engine'
import { recordMultiLeg, type LedgerLeg } from '@/lib/ledger'
import { recordContribution } from '@/lib/supporter-level'
import { recordTeamPoints } from '@/lib/team-points'
import { beginIdempotent, completeIdempotent, releaseIdempotent } from '@/lib/idempotency'
import { applyGiftPkScore } from '@/lib/gift-pk-score'
import { incrementLeaderboardScore } from '@/lib/leaderboard-engine'

export const dynamic = 'force-dynamic'

// POST - Send a gift in a chat room
export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  let _idempotencyRecord: string | null = null
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
    const replay = await beginIdempotent(req, 'chatroom_gift', giftUserId)
    if (replay.response) return replay.response
    _idempotencyRecord = replay.record

    const { roomId } = params
    const body = await req.json()
    const { giftTypeId, quantity: rawQuantity, senderName: _sn, receiverName: _rn, platform: _pl } = body
    let { recipientId } = body
    const paymentType = 'jeton' // Only jeton is supported in chat rooms
    const quantity = Math.max(1, Math.min(100, parseInt(rawQuantity) || 1))

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

    if (recipientId === giftUserId) {
      return NextResponse.json({ error: 'Kendinize hediye gönderemezsiniz' }, { status: 400 })
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
    const isStaff = sender.role === 'yonetici'

    // Check jeton balance (staff skip)
    if (!isStaff && (sender.jetonBalance ?? 0) < price) {
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
    const dist = await calculateGiftDistribution(price, roomType)
    const roomOwnerId = room.ownerId

    // Admin/yönetici kullanıcıların hediyeleri alıcıya bakiye olarak yansımaz
    const senderExcluded = await isExcludedFromFinance(sender.id)

    // ── Atomic money movement ──────────────────────────────────────────────
    // Sender deduction, recipient credit and room-owner commission are wrapped
    // in a single interactive transaction so balances can never end up partially
    // updated on a mid-flight failure. Business logic and amounts are unchanged.
    await prisma.$transaction(async (tx: any) => {
      // Deduct jetons from sender (staff skip - unlimited balance)
      if (!isStaff) {
        await atomicDebitJeton(tx, sender.id, price)
        await tx.jetonTransaction.create({
          data: {
            userId: sender.id,
            amount: -price,
            type: 'gift_sent',
            description: `${giftType.name} hediyesi ${recipient.name} kişisine gönderildi (Sohbet odası)`,
            balanceBefore: sender.jetonBalance ?? 0,
            balanceAfter: (sender.jetonBalance ?? 0) - price
          }
        })
      }

      // Add net amount to recipient - sadece normal kullanıcılardan
      if (dist.receiverNet > 0 && !senderExcluded) {
        const recipientBefore = recipient.jetonBalance ?? 0
        await tx.user.update({
          where: { id: recipient.id },
          data: { jetonBalance: { increment: dist.receiverNet } }
        })
        await tx.jetonTransaction.create({
          data: {
            userId: recipient.id,
            amount: dist.receiverNet,
            type: 'gift_received',
            description: `${sender.name} tarafından ${giftType.name} hediyesi alındı (${room.nameTr})`,
            balanceBefore: recipientBefore,
            balanceAfter: recipientBefore + dist.receiverNet
          }
        })
      }

      // Give net amount to room owner (NORMAL/VIP rooms only)
      if (dist.ownerNet > 0 && roomOwnerId && !senderExcluded) {
        const ownerUser = await tx.user.findUnique({ where: { id: roomOwnerId }, select: { jetonBalance: true } })
        const ownerBefore = ownerUser?.jetonBalance ?? 0
        await tx.user.update({
          where: { id: roomOwnerId },
          data: { jetonBalance: { increment: dist.ownerNet } }
        })
        await tx.jetonTransaction.create({
          data: {
            userId: roomOwnerId,
            amount: dist.ownerNet,
            type: 'gift_commission',
            description: `Oda sahibi payı: ${giftType.name} hediyesinden (${room.nameTr})`,
            balanceBefore: ownerBefore,
            balanceAfter: ownerBefore + dist.ownerNet
          }
        })
      }
    })

    // Process agency commission if recipient is in an agency (outside the money
    // transaction — fire-and-forget, must not block or roll back balances)
    if (dist.receiverNet > 0 && !senderExcluded) {
      processAgencyCommission({
        userId: recipient.id,
        earnedAmount: dist.receiverNet,
        sourceType: 'chat_gift',
      }).catch(err => console.error('[Chat Gift] Agency commission error:', err))
    }

    // Log revenue to audit table
    logRoomRevenue({
      roomId,
      eventType: 'gift',
      totalAmount: price,
      receiverAmount: senderExcluded ? 0 : dist.receiverNet,
      ownerAmount: senderExcluded ? 0 : dist.ownerNet,
      siteAmount: dist.siteAmount,
      senderId: sender.id,
      receiverId: recipient.id,
      ownerId: roomOwnerId || undefined,
      metadata: {
        giftName: giftType.name,
        giftIcon: giftType.icon,
        quantity,
        roomType,
        receiverGross: dist.receiverGross,
        ownerGross: dist.ownerGross,
        receiverCommission: dist.receiverCommission,
        ownerCommission: dist.ownerCommission,
      }
    }).catch(() => {})

    // Record the gift
    const gift = await prisma.chatRoomGift.create({
      data: {
        roomId,
        senderId: sender.id,
        recipientId: recipient.id,
        giftTypeId: giftType.id,
        quantity,
        totalPrice: price,
        currencyType: paymentType,
        commissionAmount: dist.siteAmount,
        beneficiaryId: dist.ownerNet > 0 ? roomOwnerId : null
      }
    })

    // ── Immutable ledger (fire-and-forget, never blocks the money flow) ──
    if (!isStaff && !senderExcluded) {
      const legs: LedgerLeg[] = [
        {
          accountType: 'user_jeton',
          accountId: sender.id,
          direction: 'debit',
          amount: price,
          balanceBefore: sender.jetonBalance ?? 0,
          balanceAfter: (sender.jetonBalance ?? 0) - price,
        },
      ]
      if (dist.receiverNet > 0) {
        legs.push({
          accountType: 'user_jeton',
          accountId: recipient.id,
          direction: 'credit',
          amount: dist.receiverNet,
        })
      }
      if (dist.ownerNet > 0 && roomOwnerId) {
        legs.push({
          accountType: 'user_jeton',
          accountId: roomOwnerId,
          direction: 'credit',
          amount: dist.ownerNet,
        })
      }
      if (dist.siteAmount > 0) {
        legs.push({
          accountType: 'platform_jeton',
          accountId: 'platform',
          direction: 'credit',
          amount: dist.siteAmount,
        })
      }
      recordMultiLeg({
        legs,
        category: 'gift_send',
        currency: 'jeton',
        description: `Sohbet odası hediyesi: ${giftType.name} x${quantity}`,
        referenceType: 'ChatRoomGift',
        referenceId: gift.id,
        actorId: sender.id,
        metadata: { roomId, roomType, giftTypeId: giftType.id, quantity },
      }).catch((e) => console.error('[Ledger][chat-gift]', e))
      recordContribution(sender.id, recipient.id, price).catch(() => {})
      recordTeamPoints(sender.id, price).catch(() => {})
    }

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
    const pkUpdate = await applyGiftPkScore({
      sideIds: [roomId, (room as any)?.id, (room as any)?.slug],
      amount: price,
      battleId: (body as any)?.battleId || null,
    })

    // Leaderboard skor: hediye alıcısına puan (sesli oda)
    incrementLeaderboardScore('voice_room', recipientId, price, 'gift_received', roomId).catch(() => {})

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
        currencyType: paymentType,
        timestamp: Date.now(),
        ...renderMeta,
      },
      engine: enginePayload,
      pkUpdate
    }
    await completeIdempotent(replay.record, 200, giftResult)
    return NextResponse.json(giftResult)
  } catch (error) {
    await releaseIdempotent(_idempotencyRecord)
    if (isInsufficientBalanceError(error)) {
      return NextResponse.json({ error: 'Yetersiz jeton bakiyesi', code: 'INSUFFICIENT_BALANCE' }, { status: 400 })
    }
    console.error('Chat room gift error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
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
    const gifts = await prisma.chatRoomGift.groupBy({
      by: ['senderId', 'currencyType'],
      where: {
        roomId,
        createdAt: { gte: todayStart },
        senderId: { in: activeUserIds.length > 0 ? activeUserIds : ['__none__'] }
      },
      _sum: { totalPrice: true },
      orderBy: { _sum: { totalPrice: 'desc' } }
    })

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
      amount: g.totalPrice,
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