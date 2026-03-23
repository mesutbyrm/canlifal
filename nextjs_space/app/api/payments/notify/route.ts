import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { sendNotificationEmail } from '@/lib/email-service'

// User submits payment notification
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
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
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
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

    // Send email notification to admin
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4af37; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">💰 Yeni Ödeme Bildirimi</h2>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Kullanıcı:</strong> ${user.username || user.name}</p>
          <p style="margin: 10px 0;"><strong>Tutar:</strong> ${amount} TL</p>
          <p style="margin: 10px 0;"><strong>Ödeme Yöntemi:</strong> ${paymentMethod}</p>
          ${transactionId ? `<p style="margin: 10px 0;"><strong>İşlem No:</strong> ${transactionId}</p>` : ''}
          ${senderName ? `<p style="margin: 10px 0;"><strong>Gönderen İsmi:</strong> ${senderName}</p>` : ''}
          ${notes ? `<p style="margin: 10px 0;"><strong>Not:</strong> ${notes}</p>` : ''}
          <p style="margin: 10px 0;"><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR')}</p>
        </div>
        <p style="color: #666; font-size: 14px;">Lütfen ödemeyi kontrol edip onaylayın.</p>
      </div>
    `;

    sendNotificationEmail({
      notificationId: process.env.NOTIF_ID_DEME_BILDIRIMI || '',
      recipientEmail: 'mesutbyrm1@gmail.com',
      subject: `💰 Yeni Ödeme Bildirimi: ${user.username || user.name} - ${amount} TL`,
      htmlBody: emailHtml,
    }).catch(err => console.error('Payment email error:', err))

    return NextResponse.json({ 
      success: true, 
      message: 'Ödeme bildiriminiz alındı. Admin onayı bekleniyor.',
      notification 
    })
  } catch (error) {
    console.error('Payment notification error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// Get user's payment notifications
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const notifications = await prisma.paymentNotification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Get payment notifications error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
