import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { apiSuccess, apiError, apiUnauthorized, apiValidation, apiNotFound } from '@/lib/api-response'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { createBulkNotificationsWithPush } from '@/lib/notify'
import { PAYMENT_STATUS_LABELS, PRODUCT_TYPE_LABELS } from '@/lib/payment-status'

export const dynamic = 'force-dynamic'

/**
 * Spec §84 — "Bizimle iletişime geç"
 * Kullanıcı, reddedilen/düzeltilen ödeme bildirimi için MEVCUT destek sistemi
 * üzerinden itiraz talebi açar. Yeni bağımsız mesajlaşma sistemi kurulmaz.
 */

// GET — bu ödemeye bağlı mevcut itiraz talebi (varsa)
export async function GET(req: NextRequest, { params }: { params: { notificationId: string } }) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        userId: user.id,
        relatedType: 'PaymentNotification',
        relatedId: params.notificationId,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, subject: true, status: true, createdAt: true, lastMessageAt: true },
    })

    return apiSuccess({ ticket })
  } catch (err) {
    console.error('[payments/dispute GET]', err)
    return apiError('INTERNAL_ERROR', 'İtiraz bilgisi getirilemedi', 500)
  }
}

// POST — itiraz/destek talebi oluştur
export async function POST(req: NextRequest, { params }: { params: { notificationId: string } }) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()

    const rateLimited = await guardRateLimit(req, 'report', { userId: user.id })
    if (rateLimited) return rateLimited

    const body = await req.json().catch(() => ({}))
    const message = String(body.message || '').trim()
    if (message.length < 10) {
      return apiValidation('Lütfen en az 10 karakterlik bir açıklama yazın')
    }

    const notification = await prisma.paymentNotification.findUnique({
      where: { id: params.notificationId },
    })
    if (!notification) return apiNotFound('Ödeme bildirimi bulunamadı')
    if (notification.userId !== user.id) {
      return apiError('FORBIDDEN', 'Bu ödeme bildirimi size ait değil', 403)
    }
    if (notification.status === 'pending') {
      return apiValidation('Ödemeniz henüz değerlendiriliyor, sonucu bekleyin')
    }

    // Aynı ödeme için açık talep varsa yenisini açma
    const existing = await prisma.supportTicket.findFirst({
      where: {
        userId: user.id,
        relatedType: 'PaymentNotification',
        relatedId: notification.id,
        status: { in: ['open', 'pending'] },
      },
      select: { id: true, status: true },
    })
    if (existing) {
      return apiError(
        'CONFLICT',
        'Bu ödeme için zaten açık bir destek talebiniz var',
        409,
        { ticketId: existing.id }
      )
    }

    const productLabel = PRODUCT_TYPE_LABELS[notification.productType] || notification.productType
    const statusLabel = PAYMENT_STATUS_LABELS[notification.status] || notification.status
    const subject = `Ödeme itirazı — ${productLabel} / ${notification.amount} TL (${statusLabel})`

    const contextLine =
      `İlgili ödeme: #${notification.id}\n` +
      `Tarih: ${notification.createdAt.toISOString()}\n` +
      `Ürün: ${productLabel}\n` +
      `Tutar: ${notification.amount} TL\n` +
      `Yöntem: ${notification.paymentMethod}\n` +
      `Durum: ${statusLabel}\n` +
      (notification.adminNote ? `Admin açıklaması: ${notification.adminNote}\n` : '')

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject: subject.slice(0, 200),
        category: 'payment',
        status: 'open',
        priority: 'high',
        relatedType: 'PaymentNotification',
        relatedId: notification.id,
        lastMessageAt: new Date(),
        metadata: {
          paymentNotificationId: notification.id,
          productType: notification.productType,
          amount: notification.amount,
          paymentStatus: notification.status,
        },
        messages: {
          create: [
            {
              senderId: user.id,
              senderRole: 'system',
              body: contextLine,
            },
            {
              senderId: user.id,
              senderRole: 'user',
              body: message.slice(0, 4000),
            },
          ],
        },
      },
      include: { messages: true },
    })

    // Yetkilileri bilgilendir
    const staff = await prisma.user.findMany({
      where: { role: { in: ['admin', 'yonetici', 'moderator', 'destek', 'yardim'] } },
      select: { id: true },
    })
    if (staff.length) {
      createBulkNotificationsWithPush({
        userIds: staff.map((s) => s.id),
        type: 'payment_dispute',
        title: 'Ödeme itirazı — destek talebi',
        message: `${notification.username || 'Kullanıcı'} · ${notification.amount} TL · ${statusLabel}`,
        data: JSON.stringify({ ticketId: ticket.id, paymentNotificationId: notification.id }),
        targetPath: '/admin',
        targetId: ticket.id,
        urgent: true,
      }).catch((e) => console.error('[payments/dispute] bildirim hatası:', e))
    }

    return apiSuccess({ ticket }, 201)
  } catch (err) {
    console.error('[payments/dispute POST]', err)
    return apiError('INTERNAL_ERROR', 'İtiraz oluşturulamadı', 500)
  }
}
