import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { createBulkNotificationsWithPush } from '@/lib/notify'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { beginIdempotent, completeIdempotent, releaseIdempotent } from '@/lib/idempotency'
import { recordRiskEvent } from '@/lib/risk-score'
import { getAuditIp } from '@/lib/audit-log'
import { createJetonPaymentNotification, isJetonPurchaseBody } from '@/lib/jeton-payment-request'

export const dynamic = 'force-dynamic'

// POST - Create a new CFC payment request
export async function POST(request: NextRequest) {
  let idemRecord: string | null = null
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const userId = authUser.id

    // Rate limit: ödeme talebi (varsayılan 10/dk)
    const limited = await guardRateLimit(request, 'payment', { userId })
    if (limited) return limited

    const body = await request.json()
    const { amount, method, senderInfo, notes } = body

    if (!amount || amount < 1) {
      return NextResponse.json({ error: 'Geçersiz miktar' }, { status: 400 })
    }

    if (!method || !['whatsapp', 'papara', 'bank_transfer'].includes(method)) {
      return NextResponse.json({ error: 'Geçersiz ödeme yöntemi' }, { status: 400 })
    }

    // Jeton alımı CFC talebi DEĞİLDİR. Önceden mobil jeton alımı burada
    // CfcPaymentRequest olarak («2000 CFC») kaydediliyordu; artık tek bir jeton
    // ödeme bildirimi açılır ve tutar sunucu fiyatından hesaplanır
    // (ör. 2000 jeton → 1000 TL).
    if (isJetonPurchaseBody(body)) {
      const coins = parseInt(String(body.coins ?? amount)) || 0
      if (coins < 1) {
        return NextResponse.json({ error: 'Geçersiz miktar' }, { status: 400 })
      }
      const { notification, quote, duplicate } = await createJetonPaymentNotification({
        userId,
        coins,
        method,
        senderInfo: senderInfo || null,
        notes: notes || null,
        proofUrl: body.receiptUrl || body.proofUrl || null,
      })
      return NextResponse.json(
        {
          success: true,
          id: notification.id,
          requestType: 'jeton',
          productType: 'jeton',
          coins,
          requestedAmount: coins,
          amount: coins,
          priceTry: quote.finalAmount,
          status: notification.status,
          duplicate,
          message: 'Jeton ödeme bildiriminiz alındı. Admin onayı bekleniyor.',
          notification,
        },
        { status: duplicate ? 200 : 201 }
      )
    }

    // Check if user has pending request already
    // TTL: 24 saatten eski bekleyen talepleri otomatik iptal et
    const PENDING_TTL_MS = 24 * 60 * 60 * 1000
    const ttlCutoff = new Date(Date.now() - PENDING_TTL_MS)
    const expiredCount = await prisma.cfcPaymentRequest.updateMany({
      where: {
        userId,
        status: 'pending',
        createdAt: { lt: ttlCutoff },
      },
      data: {
        status: 'expired',
        reviewNote: '[Otomatik] 24 saat içinde işlenmediği için süresi doldu',
      },
    })
    if (expiredCount.count > 0) {
      console.log(`[payments/requests] ${expiredCount.count} stale pending CFC request(s) auto-expired for user ${userId}`)
    }

    const pendingRequest = await prisma.cfcPaymentRequest.findFirst({
      where: {
        userId,
        status: 'pending',
      },
      select: { id: true, amount: true, method: true, createdAt: true },
    })

    if (pendingRequest) {
      return NextResponse.json({
        error: 'Zaten bekleyen bir ödeme talebiniz var',
        code: 'PENDING_EXISTS',
        existingRequest: {
          id: pendingRequest.id,
          amount: pendingRequest.amount,
          method: pendingRequest.method,
          createdAt: pendingRequest.createdAt,
          cancelUrl: `/api/payments/requests/${pendingRequest.id}/cancel`,
        },
      }, { status: 409 })
    }

    // Idempotency: reserved only once every validation has passed, so a
    // rejected request never blocks a corrected retry with the same key.
    const idem = await beginIdempotent(request, 'payment_request', userId)
    if (idem.response) return idem.response
    idemRecord = idem.record

    // Create the payment request
    const paymentRequest = await prisma.cfcPaymentRequest.create({
      data: {
        userId,
        amount: parseInt(String(amount)),
        method,
        senderInfo: senderInfo || null,
        notes: notes || null,
      },
    })

    // Risk skoru (Faz 9): yalnızca gözlem amaçlı, akışı engellemez
    recordRiskEvent({
      userId,
      category: 'payment_request',
      amount: parseInt(String(amount)),
      currency: 'tl',
      referenceType: 'CfcPaymentRequest',
      referenceId: paymentRequest.id,
      ip: getAuditIp(request as any),
      metadata: { method },
    }).catch((e) => console.error('[Risk] payment_request error:', e))

    // Notify admin/yonetici/moderator/destek/yardim users
    const NOTIFY_ROLES = ['admin', 'yonetici', 'moderator', 'destek', 'yardim']
    const adminUsers = await prisma.user.findMany({
      where: { role: { in: NOTIFY_ROLES } },
      select: { id: true },
    })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, username: true },
    })
    const userName = user?.name || user?.username || 'Kullanıcı'

    if (adminUsers.length > 0) {
      const methodLabel = method === 'whatsapp' ? 'WhatsApp' : method === 'papara' ? 'Papara' : 'Banka Transferi'
      createBulkNotificationsWithPush({
        userIds: adminUsers.map((a) => a.id),
        type: 'cfc_payment_request',
        title: 'CFC ödemesi — onay bekliyor',
        message: `${userName} · ${amount} CFC · ${methodLabel}`,
        data: JSON.stringify({ paymentRequestId: paymentRequest.id, amount, method }),
        targetPath: '/admin',
        targetId: paymentRequest.id,
        urgent: true,
      }).catch(err => console.error('CFC payment admin push error:', err))
    }

    await completeIdempotent(idemRecord, 201, paymentRequest)
    return NextResponse.json(paymentRequest, { status: 201 })
  } catch (error) {
    console.error('Error creating payment request:', error)
    // Free the key so the client can safely retry after a failure.
    await releaseIdempotent(idemRecord)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// GET - Get user's own payment requests
export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const requests = await prisma.cfcPaymentRequest.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching payment requests:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
