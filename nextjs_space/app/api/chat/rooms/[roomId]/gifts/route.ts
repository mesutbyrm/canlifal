import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { isExcludedFromFinance } from '@/lib/admin-check'
import { processAgencyCommission } from '@/lib/agency-commission'

export const dynamic = 'force-dynamic'

// POST - Send a gift in a chat room
export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { roomId } = params
    const { recipientId, giftTypeId, paymentType: _pt } = await req.json()
    const paymentType = 'jeton' // Only jeton is supported in chat rooms

    if (!recipientId || !giftTypeId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (recipientId === session.user.id) {
      return NextResponse.json({ error: 'Kendinize hediye gönderemezsiniz' }, { status: 400 })
    }

    // Verify room exists (include commission settings)
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
      where: { id: session.user.id },
      select: { id: true, name: true, credits: true, jetonBalance: true, role: true }
    })
    if (!sender) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 })
    }

    const price = giftType.price
    const isStaff = sender.role === 'admin' || sender.role === 'yonetici'

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

    // Commission: 50% site, 50% recipient. If recipient is seated, additional 10% to room owner
    const siteCommissionPercent = 50
    const siteCommissionAmount = Math.floor(price * siteCommissionPercent / 100)
    const recipientAmount = price - siteCommissionAmount

    // Check if recipient is seated (for room owner commission)
    let ownerCommissionAmount = 0
    const roomOwnerId = room.ownerId
    if (roomOwnerId && roomOwnerId !== recipientId && roomOwnerId !== session.user.id) {
      // Check if recipient is currently sitting in a seat
      const recipientPresence = await prisma.chatPresence.findUnique({
        where: { roomId_userId: { roomId, userId: recipientId } },
        select: { seatIndex: true, lastSeen: true }
      })
      const presenceTimeout = new Date(Date.now() - 300000) // 5 min
      if (recipientPresence && recipientPresence.seatIndex >= 0 && recipientPresence.lastSeen >= presenceTimeout) {
        ownerCommissionAmount = Math.floor(price * 10 / 100) // 10% to room owner
      }
    }

    const totalCommission = siteCommissionAmount + ownerCommissionAmount

    // Admin/yönetici kullanıcıların hediyeleri alıcıya bakiye olarak yansımaz
    const senderExcluded = await isExcludedFromFinance(sender.id)

    // Deduct jetons from sender (staff skip - unlimited balance)
    if (!isStaff) {
      await prisma.user.update({
        where: { id: sender.id },
        data: { jetonBalance: { decrement: price } }
      })
      await prisma.jetonTransaction.create({
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
    // Add jetons to recipient (50%) - sadece normal kullanıcılardan
    if (recipientAmount > 0 && !senderExcluded) {
      const recipientBefore = recipient.jetonBalance ?? 0
      await prisma.user.update({
        where: { id: recipient.id },
        data: { jetonBalance: { increment: recipientAmount } }
      })
      await prisma.jetonTransaction.create({
        data: {
          userId: recipient.id,
          amount: recipientAmount,
          type: 'gift_received',
          description: `${sender.name} tarafından ${giftType.name} hediyesi alındı (%50)`,
          balanceBefore: recipientBefore,
          balanceAfter: recipientBefore + recipientAmount
        }
      })
    }
    // Process agency commission if recipient is in an agency
    if (recipientAmount > 0 && !senderExcluded) {
      processAgencyCommission({
        userId: recipient.id,
        earnedAmount: recipientAmount,
        sourceType: 'chat_gift',
      }).catch(err => console.error('[Chat Gift] Agency commission error:', err))
    }

    // Give 10% commission to room owner if recipient is seated
    if (ownerCommissionAmount > 0 && roomOwnerId && !senderExcluded) {
      const ownerUser = await prisma.user.findUnique({ where: { id: roomOwnerId }, select: { jetonBalance: true } })
      const ownerBefore = ownerUser?.jetonBalance ?? 0
      await prisma.user.update({
        where: { id: roomOwnerId },
        data: { jetonBalance: { increment: ownerCommissionAmount } }
      })
      await prisma.jetonTransaction.create({
        data: {
          userId: roomOwnerId,
          amount: ownerCommissionAmount,
          type: 'gift_commission',
          description: `Oda sahibi komisyonu: ${giftType.name} hediyesinden %10 (${room.nameTr})`,
          balanceBefore: ownerBefore,
          balanceAfter: ownerBefore + ownerCommissionAmount
        }
      })
    }

    // Record the gift
    const gift = await prisma.chatRoomGift.create({
      data: {
        roomId,
        senderId: sender.id,
        recipientId: recipient.id,
        giftTypeId: giftType.id,
        quantity: 1,
        totalPrice: price,
        currencyType: paymentType,
        commissionAmount: totalCommission,
        beneficiaryId: ownerCommissionAmount > 0 ? roomOwnerId : null
      }
    })

    // Send notification to recipient
    await prisma.notification.create({
      data: {
        userId: recipient.id,
        type: 'gift_received',
        title: 'Sohbet Hediyesi! 🎁',
        message: `size ${giftType.name} hediye gönderdi!`,
        fromUserId: sender.id,
        fromUserName: sender.name,
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
      }
    })

    return NextResponse.json({
      success: true,
      gift: {
        id: gift.id,
        senderName: sender.name,
        recipientName: recipient.name,
        giftIcon: giftType.icon,
        giftName: giftType.name,
        amount: price,
        currencyType: paymentType
      }
    })
  } catch (error) {
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
        giftType: { select: { id: true, name: true, icon: true, price: true } }
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
      amount: g.totalPrice,
      currencyType: g.currencyType,
      createdAt: g.createdAt.toISOString()
    }))

    return NextResponse.json({ leaderboard, recentGifts: recentGiftsFormatted })
  } catch (error) {
    console.error('Gift leaderboard error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
