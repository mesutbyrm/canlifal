import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { createNotificationWithPush } from '@/lib/notify'
import { isExcludedFromFinance } from '@/lib/admin-check'

async function createGiftAnnouncement(
  senderName: string | null, senderUsername: string | null,
  recipientName: string | null, recipientUsername: string | null,
  giftIcon: string, giftTypeName: string, amount: number
) {
  // Check if gift announcements are enabled in admin settings
  const giftAnnouncementSettings = await prisma.platformSettings.findUnique({
    where: { key: 'gift_announcement_settings' }
  })
  let enabled = true
  let maxPasses = 2
  let expireMinutes = 3
  if (giftAnnouncementSettings) {
    try {
      const s = JSON.parse(giftAnnouncementSettings.value)
      if (s.enabled === false) return
      maxPasses = s.maxPasses ?? 2
      expireMinutes = s.expireMinutes ?? 3
    } catch {}
  }

  const sender = senderUsername || senderName || 'Kullanıcı'
  const recipient = recipientUsername || recipientName || 'Kullanıcı'
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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
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
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    if (recipient.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot send gift to yourself' }, { status: 400 })
    }

    // Check reciprocal gift block: if recipient gifted sender today, block it
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const reciprocalGift = await prisma.notification.findFirst({
      where: {
        userId: session.user.id,
        type: 'gift_received',
        fromUserId: recipient.id,
        createdAt: { gte: todayStart }
      }
    })
    if (reciprocalGift) {
      return NextResponse.json({ 
        error: 'reciprocal_blocked',
        message: 'Kurnazlık yapma biz geleceği görürüz 😜'
      }, { status: 403 })
    }

    const sender = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, username: true, credits: true, jetonBalance: true }
    })

    if (!sender) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 })
    }

    // Admin/yönetici kullanıcıların hediyeleri alıcıya bakiye olarak yansımaz
    const senderExcluded = await isExcludedFromFinance(sender.id)

    if (type === 'gift' && giftTypeId) {
      // Send a gift item
      const giftType = await prisma.giftType.findUnique({ where: { id: giftTypeId } })
      if (!giftType) {
        return NextResponse.json({ error: 'Gift type not found' }, { status: 404 })
      }

      const senderJetons = sender.jetonBalance ?? 0
      if (senderJetons < giftType.price) {
        return NextResponse.json({ error: 'Yetersiz jeton' }, { status: 400 })
      }

      // Deduct jetons from sender
      await prisma.user.update({
        where: { id: sender.id },
        data: { jetonBalance: { decrement: giftType.price } }
      })

      // Record jeton transaction for sender
      await prisma.jetonTransaction.create({
        data: {
          userId: sender.id,
          amount: -giftType.price,
          type: 'gift_sent',
          description: `${giftType.name} hediyesi ${recipient.name} kişisine gönderildi`,
          balanceBefore: senderJetons,
          balanceAfter: senderJetons - giftType.price
        }
      })

      // Send notification + push to recipient
      createNotificationWithPush({
        userId: recipient.id,
        type: 'gift',
        title: 'Hediye Aldınız! 🎁',
        message: `size ${giftType.name} hediye gönderdi!`,
        fromUserId: sender.id,
        fromUserName: sender.name,
        data: JSON.stringify({
          giftTypeId: giftType.id,
          giftName: giftType.name,
          giftIcon: giftType.icon,
          senderId: sender.id,
          senderName: sender.name
        })
      }).catch(err => console.error('Gift notification error:', err))

      const isBigGift = giftType.price >= 1000
      // Auto-create scrolling announcement for big gifts
      if (isBigGift) {
        createGiftAnnouncement(sender.name, sender.username, recipient.name, recipient.username, giftType.icon, giftType.name, giftType.price).catch(err => console.error('Gift announcement error:', err))
      }

      return NextResponse.json({
        success: true,
        message: `${giftType.name} hediyesi ${recipient.name} kişisine gönderildi! 🎁`,
        bigGift: isBigGift ? {
          senderName: sender.name,
          recipientName: recipient.name,
          giftIcon: giftType.icon,
          giftType: giftType.name,
          amount: giftType.price
        } : null
      })

    } else if (type === 'jeton' && jetonAmount) {
      // Send jetons
      const amount = parseInt(jetonAmount)
      if (isNaN(amount) || amount < 1) {
        return NextResponse.json({ error: 'Invalid jeton amount' }, { status: 400 })
      }

      // Handle null jetonBalance - default to 0 if null
      const senderJetonBalance = sender.jetonBalance ?? 0
      
      console.log('[Gift Send] Jeton transfer attempt:', {
        senderId: sender.id,
        senderName: sender.name,
        senderJetonBalance: sender.jetonBalance,
        effectiveBalance: senderJetonBalance,
        requestedAmount: amount
      })

      if (senderJetonBalance < amount) {
        return NextResponse.json({ error: 'Yetersiz jeton' }, { status: 400 })
      }

      // Deduct from sender
      await prisma.user.update({
        where: { id: sender.id },
        data: { jetonBalance: { decrement: amount } }
      })

      // Add to recipient - sadece normal kullanıcılardan
      if (!senderExcluded) {
        await prisma.user.update({
          where: { id: recipient.id },
          data: { jetonBalance: { increment: amount } }
        })
      }

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
      createNotificationWithPush({
        userId: recipient.id,
        type: 'gift',
        title: 'Jeton Hediyesi! 🪙',
        message: `size ${amount} jeton hediye gönderdi!`,
        fromUserId: sender.id,
        fromUserName: sender.name,
        data: JSON.stringify({
          type: 'jeton',
          amount,
          senderId: sender.id,
          senderName: sender.name
        })
      }).catch(err => console.error('Jeton gift notification error:', err))

      const isBigJetonGift = amount >= 1000
      // Auto-create scrolling announcement for big jeton gifts
      if (isBigJetonGift) {
        createGiftAnnouncement(sender.name, sender.username, recipient.name, recipient.username, '🪙', 'Jeton', amount).catch(err => console.error('Jeton gift announcement error:', err))
      }

      return NextResponse.json({
        success: true,
        message: `${amount} jeton ${recipient.name} kişisine gönderildi!`,
        bigGift: isBigJetonGift ? {
          senderName: sender.name,
          recipientName: recipient.name,
          giftIcon: '🪙',
          giftType: 'Jeton',
          amount
        } : null
      })
    }

    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
  } catch (error) {
    console.error('Gift send error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
