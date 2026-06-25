import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { createBulkNotificationsWithPush } from '@/lib/notify'

export const dynamic = 'force-dynamic'

// POST - Create a new CFC payment request
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const userId = authUser.id

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

    return NextResponse.json(paymentRequest, { status: 201 })
  } catch (error) {
    console.error('Error creating payment request:', error)
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
