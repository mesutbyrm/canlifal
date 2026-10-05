import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { createNotificationWithPush } from '@/lib/notify'
import { sendNotificationEmail } from '@/lib/email-service'
import { decoratePaymentNotification, PRODUCT_TYPE_LABELS } from '@/lib/payment-status'
import { computeJetonPrice, computeCfcPrice, validateClientAmount, round2 } from '@/lib/jeton-pricing'

export const dynamic = 'force-dynamic'

// User submits payment notification
export async function POST(req: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const { paymentMethod, amount, transactionId, senderName, notes, proofUrl } = body

    if (!paymentMethod || !amount) {
      return NextResponse.json({ error: 'Ödeme yöntemi ve tutar zorunludur' }, { status: 400 })
    }

    // Ürün bilgisi (spec §80-81): jeton | cfc | gold
    const rawProduct = String(body.productType || 'jeton').toLowerCase()
    const productType = ['jeton', 'cfc', 'gold'].includes(rawProduct) ? rawProduct : 'jeton'

    const requestedAmount =
      body.requestedAmount != null && !isNaN(Number(body.requestedAmount))
        ? Math.max(0, Math.floor(Number(body.requestedAmount)))
        : null
    const requestedGoldDays =
      productType === 'gold' && body.requestedGoldDays != null && !isNaN(Number(body.requestedGoldDays))
        ? Math.max(1, Math.min(3650, Math.floor(Number(body.requestedGoldDays))))
        : null
    const requestedGoldType =
      productType === 'gold' && body.requestedGoldType ? String(body.requestedGoldType).slice(0, 40) : null

    // ──────────────────────────────────────────────────────────────
    // SUNUCU TARAFI FİYAT DOĞRULAMASI (tek yetkili kaynak)
    // İstemciden gelen `amount` ASLA doğrudan kullanılmaz.
    // jeton/cfc için tutar = adet × birim fiyat olarak yeniden hesaplanır.
    // ──────────────────────────────────────────────────────────────
    let finalAmount = round2(parseFloat(amount))
    let pricingNote = ''
    let effectiveRequested = requestedAmount

    if (productType === 'jeton' || productType === 'cfc') {
      const compute = productType === 'jeton' ? computeJetonPrice : computeCfcPrice
      // Adet gönderilmemişse eski istemciler için tutardan türet.
      if (!effectiveRequested || effectiveRequested <= 0) {
        const probe = await compute(1)
        effectiveRequested = Math.max(1, Math.round(round2(parseFloat(amount)) / probe.unitPrice))
      }
      const quote = await compute(effectiveRequested)
      const check = validateClientAmount(quote, amount)
      if (!check.ok) {
        return NextResponse.json(
          {
            error: check.message,
            code: 'PRICE_MISMATCH',
            expectedAmount: quote.finalAmount,
            unitPrice: quote.unitPrice,
            jetonAmount: quote.jetonAmount,
            discountEnabled: quote.discountEnabled,
            discountPercent: quote.discountPercent,
          },
          { status: 400 }
        )
      }
      finalAmount = quote.finalAmount
      pricingNote = `[sunucu fiyatı: ${quote.jetonAmount} × ${quote.unitPrice.toFixed(2)} TL = ${quote.finalAmount.toFixed(2)} TL]`
    }

    if (!isFinite(finalAmount) || finalAmount <= 0) {
      return NextResponse.json({ error: 'Geçersiz tutar' }, { status: 400 })
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, name: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Create payment notification
    const notification = await prisma.paymentNotification.create({
      data: {
        userId,
        username: user.username || user.name || 'Kullanıcı',
        paymentMethod,
        amount: finalAmount,
        transactionId: transactionId || null,
        senderName: senderName || null,
        notes: [notes || '', pricingNote].filter(Boolean).join(' ').slice(0, 1000) || null,
        status: 'pending',
        productType,
        requestedAmount: effectiveRequested,
        originalRequestedAmount: effectiveRequested,
        requestedGoldDays,
        requestedGoldType,
        proofUrl: proofUrl ? String(proofUrl).slice(0, 500) : null,
      }
    })

    // Create admin notification — includes admin, moderator, site_manager
    const admins = await prisma.user.findMany({
      where: { role: { in: ['admin', 'moderator', 'site_manager'] } },
      select: { id: true, email: true }
    })

    console.log(`[payments/notify] ${admins.length} admin'e bildirim gönderiliyor`)

    for (const admin of admins) {
      await createNotificationWithPush({
        userId: admin.id,
        type: 'payment_notification',
        title: 'Yeni Ödeme Bildirimi 💰',
        message: `${user.username || user.name} kullanıcısı ${finalAmount.toFixed(2)} TL ödeme bildirimi gönderdi. (${PRODUCT_TYPE_LABELS[productType] || productType})`,
        fromUserId: userId,
        fromUserName: user.username || user.name || undefined,
        data: JSON.stringify({
          paymentNotificationId: notification.id,
          userId,
          username: user.username || user.name,
          amount: finalAmount,
          paymentMethod
        })
      })
    }

    // Send email notification to all admin/moderator/site_manager users
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4af37; border-bottom: 2px solid #d4af37; padding-bottom: 10px;">💰 Yeni Ödeme Bildirimi</h2>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Kullanıcı:</strong> ${user.username || user.name}</p>
          <p style="margin: 10px 0;"><strong>Tutar:</strong> ${finalAmount.toFixed(2)} TL</p>
          <p style="margin: 10px 0;"><strong>Ödeme Yöntemi:</strong> ${paymentMethod}</p>
          <p style="margin: 10px 0;"><strong>Ürün:</strong> ${PRODUCT_TYPE_LABELS[productType] || productType}${requestedAmount ? ` — ${requestedAmount}` : ''}${requestedGoldDays ? ` — ${requestedGoldDays} gün` : ''}</p>
          ${transactionId ? `<p style="margin: 10px 0;"><strong>İşlem No:</strong> ${transactionId}</p>` : ''}
          ${senderName ? `<p style="margin: 10px 0;"><strong>Gönderen İsmi:</strong> ${senderName}</p>` : ''}
          ${notes ? `<p style="margin: 10px 0;"><strong>Not:</strong> ${notes}</p>` : ''}
          <p style="margin: 10px 0;"><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</p>
        </div>
        <p style="color: #666; font-size: 14px;">Lütfen ödemeyi kontrol edip onaylayın.</p>
      </div>
    `;

    const emailSubject = `💰 Yeni Ödeme Bildirimi: ${user.username || user.name} - ${finalAmount.toFixed(2)} TL`

    for (const admin of admins) {
      if (!admin.email) continue
      sendNotificationEmail({
        notificationId: process.env.NOTIF_ID_DEME_BILDIRIMI || '',
        recipientEmail: admin.email,
        subject: emailSubject,
        htmlBody: emailHtml,
      }).catch((err) => console.error('Email gönderilemedi:', admin.email, err))
    }

    // Yedek: mesutbyrm1@gmail.com her zaman bilgilendirilsin (admins listesinde yoksa bile)
    if (!admins.some(a => a.email === 'mesutbyrm1@gmail.com')) {
      sendNotificationEmail({
        notificationId: process.env.NOTIF_ID_DEME_BILDIRIMI || '',
        recipientEmail: 'mesutbyrm1@gmail.com',
        subject: emailSubject,
        htmlBody: emailHtml,
      }).catch((err) => console.error('Email gönderilemedi (yedek):', err))
    }

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
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const statusFilter = searchParams.get('status')

    const where: any = { userId }
    if (statusFilter && statusFilter !== 'all') where.status = statusFilter

    const notifications = await prisma.paymentNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    // İlgili destek talepleri (spec §84) — itiraz açılmış mı?
    const ids = notifications.map((n) => n.id)
    const tickets = ids.length
      ? await prisma.supportTicket.findMany({
          where: { userId, relatedType: 'PaymentNotification', relatedId: { in: ids } },
          select: { id: true, relatedId: true, status: true },
        })
      : []
    const ticketByPayment = new Map(tickets.map((t) => [t.relatedId as string, t]))

    const decorated = notifications.map((n) => {
      const d = decoratePaymentNotification(n)
      const ticket = ticketByPayment.get(n.id)
      return {
        ...d,
        disputeTicketId: ticket?.id || null,
        disputeStatus: ticket?.status || null,
        canDispute: d.canDispute && !ticket,
      }
    })

    // Geriye dönük uyumluluk: yanıt yine düz dizi
    return NextResponse.json(decorated)
  } catch (error) {
    console.error('Get payment notifications error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
