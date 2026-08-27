import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { createBulkNotificationsWithPush } from '@/lib/notify'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { beginIdempotent, completeIdempotent, releaseIdempotent } from '@/lib/idempotency'

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

    // Check if user has pending request already
    const pendingRequest = await prisma.cfcPaymentRequest.findFirst({
      where: {
        userId,
        status: 'pending',
      },
    })

    if (pendingRequest) {
      return NextResponse.json({ error: 'Zaten bekleyen bir ödeme talebiniz var' }, { status: 400 })
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
