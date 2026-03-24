import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

// Get all payment notifications (admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // Check if admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'admin' && (session.user as any).role !== 'yonetici' && (session.user as any).role !== 'moderator' && (session.user as any).role !== 'finans') {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'all'

    const where = status !== 'all' ? { status } : {}

    const notifications = await prisma.paymentNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    // Get stats
    const stats = {
      pending: await prisma.paymentNotification.count({ where: { status: 'pending' } }),
      approved: await prisma.paymentNotification.count({ where: { status: 'approved' } }),
      rejected: await prisma.paymentNotification.count({ where: { status: 'rejected' } }),
      totalJetonLoaded: await prisma.paymentNotification.aggregate({
        where: { status: 'approved' },
        _sum: { jetonLoaded: true }
      }).then((r: any) => r._sum.jetonLoaded || 0),
      totalAmountReceived: await prisma.paymentNotification.aggregate({
        where: { status: 'approved' },
        _sum: { amount: true }
      }).then((r: any) => r._sum.amount || 0)
    }

    return NextResponse.json({ notifications, stats })
  } catch (error) {
    console.error('Admin get payments error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// Process payment notification (approve/reject)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // Check if admin
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true }
    })

    if (admin?.role !== 'admin' && (session.user as any).role !== 'yonetici' && (session.user as any).role !== 'moderator' && (session.user as any).role !== 'finans') {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }

    const { notificationId, action, jetonAmount } = await req.json()

    if (!notificationId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const paymentNotification = await prisma.paymentNotification.findUnique({
      where: { id: notificationId }
    })

    if (!paymentNotification) {
      return NextResponse.json({ error: 'Payment notification not found' }, { status: 404 })
    }

    if (paymentNotification.status !== 'pending') {
      return NextResponse.json({ error: 'Payment already processed' }, { status: 400 })
    }

    if (action === 'approve') {
      if (!jetonAmount || jetonAmount < 1) {
        return NextResponse.json({ error: 'Jeton amount is required for approval' }, { status: 400 })
      }

      // Get user's current balance
      const targetUser = await prisma.user.findUnique({
        where: { id: paymentNotification.userId },
        select: { jetonBalance: true }
      })

      const currentBalance = targetUser?.jetonBalance || 0
      const newBalance = currentBalance + jetonAmount

      // Update user's jeton balance
      await prisma.user.update({
        where: { id: paymentNotification.userId },
        data: { jetonBalance: newBalance }
      })

      // Create jeton transaction record
      await prisma.jetonTransaction.create({
        data: {
          userId: paymentNotification.userId,
          amount: jetonAmount,
          type: 'purchase',
          description: `${paymentNotification.amount} TL ödeme - ${paymentNotification.paymentMethod} (Ref: ${notificationId.slice(-8)})`,
          balanceBefore: currentBalance,
          balanceAfter: newBalance
        }
      })

      // Update payment notification
      await prisma.paymentNotification.update({
        where: { id: notificationId },
        data: {
          status: 'approved',
          jetonLoaded: jetonAmount,
          processedBy: admin?.name || 'Admin',
          processedAt: new Date()
        }
      })

      // Notify user
      await prisma.notification.create({
        data: {
          userId: paymentNotification.userId,
          type: 'payment_approved',
          title: 'Ödeme Onaylandı! ✅',
          message: `${paymentNotification.amount} TL ödemeniz onaylandı. ${jetonAmount} jeton hesabınıza eklendi.`
        }
      })

      return NextResponse.json({ 
        success: true, 
        message: `${jetonAmount} jeton yüklendi.`,
        newBalance 
      })

    } else if (action === 'reject') {
      // Update payment notification
      await prisma.paymentNotification.update({
        where: { id: notificationId },
        data: {
          status: 'rejected',
          processedBy: admin?.name || 'Admin',
          processedAt: new Date()
        }
      })

      // Notify user
      await prisma.notification.create({
        data: {
          userId: paymentNotification.userId,
          type: 'payment_rejected',
          title: 'Ödeme Reddedildi ❌',
          message: `${paymentNotification.amount} TL ödeme bildiriminiz reddedildi. Lütfen destek ile iletişime geçin.`
        }
      })

      return NextResponse.json({ success: true, message: 'Ödeme reddedildi.' })
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
  } catch (error) {
    console.error('Admin process payment error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// Manual jeton load to user (without payment notification)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // Check if admin
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true }
    })

    if (admin?.role !== 'admin' && (session.user as any).role !== 'yonetici' && (session.user as any).role !== 'moderator' && (session.user as any).role !== 'finans') {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }

    const { userId, jetonAmount, reason } = await req.json()

    if (!userId || !jetonAmount) {
      return NextResponse.json({ error: 'User ID and jeton amount are required' }, { status: 400 })
    }

    // Get user's current balance
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { jetonBalance: true, username: true, name: true }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    const currentBalance = targetUser.jetonBalance || 0
    const newBalance = currentBalance + parseInt(jetonAmount)

    // Update user's jeton balance
    await prisma.user.update({
      where: { id: userId },
      data: { jetonBalance: newBalance }
    })

    // Create jeton transaction record
    await prisma.jetonTransaction.create({
      data: {
        userId,
        amount: parseInt(jetonAmount),
        type: 'admin_load',
        description: reason || `Admin tarafından yüklendi - ${admin?.name || 'Admin'}`,
        balanceBefore: currentBalance,
        balanceAfter: newBalance
      }
    })

    // Notify user
    await prisma.notification.create({
      data: {
        userId,
        type: 'jeton_added',
        title: 'Jeton Eklendi! 🪙',
        message: `Hesabınıza ${jetonAmount} jeton eklendi.`
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: `${targetUser.username || targetUser.name} kullanıcısına ${jetonAmount} jeton yüklendi.`,
      newBalance 
    })
  } catch (error) {
    console.error('Admin manual jeton load error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
