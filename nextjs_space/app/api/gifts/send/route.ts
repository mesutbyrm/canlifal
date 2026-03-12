import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recipientUsername, giftTypeId, jetonAmount, type } = await req.json()
    // type: 'gift' or 'jeton'

    if (!recipientUsername) {
      return NextResponse.json({ error: 'Recipient is required' }, { status: 400 })
    }

    // Find recipient
    const recipient = await prisma.user.findFirst({
      where: {
        OR: [
          { username: recipientUsername.toLowerCase() },
          { id: recipientUsername }
        ]
      },
      select: { id: true, name: true, username: true }
    })

    if (!recipient) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (recipient.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot send gift to yourself' }, { status: 400 })
    }

    const sender = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, username: true, credits: true, jetonBalance: true }
    })

    if (!sender) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 })
    }

    if (type === 'gift' && giftTypeId) {
      // Send a gift item
      const giftType = await prisma.giftType.findUnique({ where: { id: giftTypeId } })
      if (!giftType) {
        return NextResponse.json({ error: 'Gift type not found' }, { status: 404 })
      }

      if (sender.credits < giftType.price) {
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 400 })
      }

      // Deduct credits from sender
      await prisma.user.update({
        where: { id: sender.id },
        data: { credits: { decrement: giftType.price } }
      })

      // Record transaction for sender
      await prisma.creditTransaction.create({
        data: {
          userId: sender.id,
          amount: -giftType.price,
          type: 'gift_sent',
          description: `${giftType.name} hediyesi ${recipient.name} kişisine gönderildi`,
          balance: sender.credits - giftType.price
        }
      })

      // Send notification to recipient
      await prisma.notification.create({
        data: {
          userId: recipient.id,
          type: 'gift_received',
          title: 'Hediye Aldınız! 🎁',
          message: `${sender.name} size ${giftType.icon} ${giftType.name} hediye gönderdi!`,
          fromUserId: sender.id,
          fromUserName: sender.name,
          data: JSON.stringify({
            giftTypeId: giftType.id,
            giftName: giftType.name,
            giftIcon: giftType.icon,
            senderId: sender.id,
            senderName: sender.name
          })
        }
      })

      return NextResponse.json({
        success: true,
        message: `${giftType.icon} ${giftType.name} hediyesi ${recipient.name} kişisine gönderildi!`
      })

    } else if (type === 'jeton' && jetonAmount) {
      // Send jetons
      const amount = parseInt(jetonAmount)
      if (isNaN(amount) || amount < 1) {
        return NextResponse.json({ error: 'Invalid jeton amount' }, { status: 400 })
      }

      if (sender.jetonBalance < amount) {
        return NextResponse.json({ error: 'Insufficient jetons' }, { status: 400 })
      }

      // Deduct from sender
      await prisma.user.update({
        where: { id: sender.id },
        data: { jetonBalance: { decrement: amount } }
      })

      // Add to recipient
      await prisma.user.update({
        where: { id: recipient.id },
        data: { jetonBalance: { increment: amount } }
      })

      // Record jeton transactions
      await prisma.jetonTransaction.create({
        data: {
          userId: sender.id,
          amount: -amount,
          type: 'spend',
          description: `${recipient.name} kişisine ${amount} jeton gönderildi`,
          balanceBefore: sender.jetonBalance,
          balanceAfter: sender.jetonBalance - amount
        }
      })

      await prisma.jetonTransaction.create({
        data: {
          userId: recipient.id,
          amount: amount,
          type: 'purchase',
          description: `${sender.name} kişisinden ${amount} jeton hediye alındı`,
          balanceBefore: 0, // we don't know recipient balance easily
          balanceAfter: 0
        }
      })

      // Send notification
      await prisma.notification.create({
        data: {
          userId: recipient.id,
          type: 'gift_received',
          title: 'Jeton Hediyesi! 🪙',
          message: `${sender.name} size ${amount} jeton hediye gönderdi!`,
          fromUserId: sender.id,
          fromUserName: sender.name,
          data: JSON.stringify({
            type: 'jeton',
            amount,
            senderId: sender.id,
            senderName: sender.name
          })
        }
      })

      return NextResponse.json({
        success: true,
        message: `${amount} jeton ${recipient.name} kişisine gönderildi!`
      })
    }

    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
  } catch (error) {
    console.error('Gift send error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
