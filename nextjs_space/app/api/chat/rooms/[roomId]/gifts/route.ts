import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST - Send a gift in a chat room
export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomId } = params
    const { recipientId, giftTypeId, paymentType } = await req.json()
    // paymentType: 'jeton' or 'cfc'

    if (!recipientId || !giftTypeId || !paymentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['jeton', 'cfc'].includes(paymentType)) {
      return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 })
    }

    if (recipientId === session.user.id) {
      return NextResponse.json({ error: 'Kendinize hediye gönderemezsiniz' }, { status: 400 })
    }

    // Verify room exists
    const room = await prisma.chatRoom.findUnique({ where: { id: roomId } })
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
      select: { id: true, name: true, credits: true, jetonBalance: true }
    })
    if (!sender) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 })
    }

    const price = giftType.price

    // Check balance
    if (paymentType === 'jeton') {
      if ((sender.jetonBalance ?? 0) < price) {
        return NextResponse.json({ error: 'insufficient_jeton', message: 'Yetersiz jeton bakiyesi' }, { status: 400 })
      }
    } else {
      if ((sender.credits ?? 0) < price) {
        return NextResponse.json({ error: 'insufficient_cfc', message: 'Yetersiz CFC bakiyesi' }, { status: 400 })
      }
    }

    // Get recipient
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, name: true, jetonBalance: true }
    })
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    // Deduct from sender
    if (paymentType === 'jeton') {
      await prisma.user.update({
        where: { id: sender.id },
        data: { jetonBalance: { decrement: price } }
      })
      // Record jeton transaction
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
      // Add jetons to recipient (only jeton gifts give real money value)
      await prisma.user.update({
        where: { id: recipient.id },
        data: { jetonBalance: { increment: price } }
      })
    } else {
      // CFC payment - deduct CFC from sender, recipient sees it but doesn't get money
      await prisma.user.update({
        where: { id: sender.id },
        data: { credits: { decrement: price } }
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
        currencyType: paymentType
      }
    })

    // Send notification to recipient
    await prisma.notification.create({
      data: {
        userId: recipient.id,
        type: 'gift_received',
        title: 'Sohbet Hediyesi! 🎁',
        message: `${sender.name} size ${giftType.icon} ${giftType.name} hediye gönderdi! (${paymentType === 'jeton' ? 'Jeton' : 'CFC'})`,
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Get gift leaderboard for a room
export async function GET(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const { roomId } = params

    // Get aggregated gifts per sender in this room
    const gifts = await prisma.chatRoomGift.groupBy({
      by: ['senderId', 'currencyType'],
      where: { roomId },
      _sum: { totalPrice: true },
      orderBy: { _sum: { totalPrice: 'desc' } }
    })

    // Get sender details
    const senderIds = [...new Set(gifts.map(g => g.senderId))]
    const users = await prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, name: true, username: true, image: true }
    })
    const userMap = new Map(users.map(u => [u.id, u]))

    // Combine jeton and cfc amounts per sender
    const leaderboardMap = new Map<string, { userId: string; name: string; username: string | null; image: string | null; jetonTotal: number; cfcTotal: number }>()
    
    for (const g of gifts) {
      const user = userMap.get(g.senderId)
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

    return NextResponse.json({ leaderboard })
  } catch (error) {
    console.error('Gift leaderboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
