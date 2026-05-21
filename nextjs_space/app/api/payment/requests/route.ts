import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST - Create a new CFC payment request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

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
        userId: session.user.id,
        status: 'pending',
      },
    })

    if (pendingRequest) {
      return NextResponse.json({ error: 'Zaten bekleyen bir ödeme talebiniz var' }, { status: 400 })
    }

    // Create the payment request
    const paymentRequest = await prisma.cfcPaymentRequest.create({
      data: {
        userId: session.user.id,
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
      where: { id: session.user.id },
      select: { name: true, username: true },
    })
    const userName = user?.name || user?.username || 'Kullanıcı'

    if (adminUsers.length > 0) {
      await prisma.notification.createMany({
        data: adminUsers.map((admin) => ({
          userId: admin.id,
          type: 'cfc_payment_request',
          title: 'Yeni CFC Ödeme Talebi',
          message: `${userName} ${amount} CFC yükleme talebi oluşturdu (${method === 'whatsapp' ? 'WhatsApp' : method === 'papara' ? 'Papara' : 'Banka Transferi'})`,
          data: JSON.stringify({ paymentRequestId: paymentRequest.id, amount, method }),
        })),
      })
    }

    return NextResponse.json(paymentRequest, { status: 201 })
  } catch (error) {
    console.error('Error creating payment request:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// GET - Get user's own payment requests
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const requests = await prisma.cfcPaymentRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching payment requests:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
