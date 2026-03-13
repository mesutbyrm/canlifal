import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

// User submits payment notification
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentMethod, amount, transactionId, senderName, notes } = await req.json()

    if (!paymentMethod || !amount) {
      return NextResponse.json({ error: 'Payment method and amount are required' }, { status: 400 })
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, name: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create payment notification
    const notification = await prisma.paymentNotification.create({
      data: {
        userId: session.user.id,
        username: user.username || user.name || 'Kullanıcı',
        paymentMethod,
        amount: parseFloat(amount),
        transactionId: transactionId || null,
        senderName: senderName || null,
        notes: notes || null,
        status: 'pending'
      }
    })

    // Create admin notification
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true }
    })

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'payment_notification',
          title: 'Yeni Ödeme Bildirimi 💰',
          message: `${user.username || user.name} kullanıcısı ${amount} TL ödeme bildirimi gönderdi.`,
          data: JSON.stringify({
            paymentNotificationId: notification.id,
            userId: session.user.id,
            username: user.username || user.name,
            amount,
            paymentMethod
          })
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Ödeme bildiriminiz alındı. Admin onayı bekleniyor.',
      notification 
    })
  } catch (error) {
    console.error('Payment notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get user's payment notifications
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notifications = await prisma.paymentNotification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Get payment notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
