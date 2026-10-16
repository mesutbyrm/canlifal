import prisma from '@/lib/db'
import { createBulkNotificationsWithPush } from '@/lib/notify'
import { computeJetonPrice } from '@/lib/jeton-pricing'

/** Mobil ödeme talebi gövdesi jeton alımı mı (üyelik hariç)? */
export function isJetonPurchaseBody(body: any): boolean {
  if (!body || typeof body !== 'object') return false
  if (body.tierId || body.membershipTier) return false // üyelik ayrı akış
  const kind = String(body.requestType || body.creditType || body.type || '').toLowerCase()
  return kind === 'jeton'
}

const METHOD_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  papara: 'Papara',
  bank_transfer: 'Banka Transferi',
  havale: 'Havale/EFT',
}

/**
 * Jeton alımı ödeme bildirimi — tek kayıt (`PaymentNotification`, productType
 * jeton). Tutar istemciden alınmaz: jeton adedi × sunucu birim fiyatı (indirim
 * dahil). Ör. 2000 jeton → 1000 TL. Adminlere tek «Jeton ödemesi» bildirimi.
 *
 * Aynı kullanıcının aynı adette bekleyen talebi son 30 dakikada varsa yeni
 * kayıt açılmaz (çift dokunma / eski sürüm tekrarları).
 */
export async function createJetonPaymentNotification(params: {
  userId: string
  coins: number
  method: string
  senderInfo?: string | null
  notes?: string | null
  proofUrl?: string | null
}) {
  const coins = Math.max(1, Math.floor(Number(params.coins) || 0))
  const quote = await computeJetonPrice(coins)

  const recent = await prisma.paymentNotification.findFirst({
    where: {
      userId: params.userId,
      status: 'pending',
      productType: 'jeton',
      requestedAmount: coins,
      createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (recent) return { notification: recent, quote, duplicate: true }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { name: true, username: true },
  })
  const userName = user?.username || user?.name || 'Kullanıcı'
  const pricingNote = `[sunucu fiyatı: ${quote.jetonAmount} × ${quote.unitPrice.toFixed(2)} TL = ${quote.finalAmount.toFixed(2)} TL]`

  const notification = await prisma.paymentNotification.create({
    data: {
      userId: params.userId,
      username: userName,
      paymentMethod: params.method,
      amount: quote.finalAmount,
      senderName: params.senderInfo || null,
      notes: [params.notes || '', pricingNote].filter(Boolean).join(' ').slice(0, 1000) || null,
      status: 'pending',
      productType: 'jeton',
      requestedAmount: coins,
      originalRequestedAmount: coins,
      proofUrl: params.proofUrl ? String(params.proofUrl).slice(0, 500) : null,
    },
  })

  const admins = await prisma.user.findMany({
    where: { role: { in: ['admin', 'yonetici', 'moderator', 'site_manager', 'destek', 'yardim'] } },
    select: { id: true },
  })
  if (admins.length > 0) {
    const methodLabel = METHOD_LABELS[params.method] || params.method
    createBulkNotificationsWithPush({
      userIds: admins.map((a) => a.id),
      type: 'payment_notification',
      title: 'Jeton ödemesi — onay bekliyor 💰',
      message: `${userName} · ${coins.toLocaleString('tr-TR')} jeton · ${quote.finalAmount.toFixed(2)} TL · ${methodLabel}`,
      fromUserId: params.userId,
      fromUserName: userName,
      data: JSON.stringify({
        paymentNotificationId: notification.id,
        userId: params.userId,
        productType: 'jeton',
        requestedAmount: coins,
        amount: quote.finalAmount,
        paymentMethod: params.method,
      }),
      targetPath: '/admin',
      targetId: notification.id,
      urgent: true,
    }).catch((err) => console.error('[jeton-payment] admin push error:', err))
  }

  return { notification, quote, duplicate: false }
}
