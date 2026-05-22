import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { createNotificationWithPush } from '@/lib/notify'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['admin', 'yonetici', 'moderator', 'destek', 'yardim']

// GET - List all CFC payment requests (admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !ALLOWED_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}
    if (status !== 'all') {
      where.status = status
    }

    const [requests, total] = await Promise.all([
      prisma.cfcPaymentRequest.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, username: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.cfcPaymentRequest.count({ where }),
    ])

    return NextResponse.json({
      requests,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching CFC payment requests:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH - Approve or reject a CFC payment request
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !ALLOWED_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const body = await request.json()
    const { requestId, action, reviewNote } = body

    if (!requestId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
    }

    const paymentRequest = await prisma.cfcPaymentRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { id: true, name: true, cfcBalance: true } } },
    })

    if (!paymentRequest) {
      return NextResponse.json({ error: 'Talep bulunamadı' }, { status: 404 })
    }

    if (paymentRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Bu talep zaten işlenmiş' }, { status: 400 })
    }

    if (action === 'approve') {
      // Update request status and add CFC balance in a transaction
      const [updatedRequest] = await prisma.$transaction([
        prisma.cfcPaymentRequest.update({
          where: { id: requestId },
          data: {
            status: 'approved',
            reviewedBy: session.user.id,
            reviewNote: reviewNote || null,
          },
        }),
        prisma.user.update({
          where: { id: paymentRequest.userId },
          data: {
            cfcBalance: { increment: paymentRequest.amount },
          },
        }),
      ])

      // Notify the user with push
      createNotificationWithPush({
        userId: paymentRequest.userId,
        type: 'cfc_payment_approved',
        title: '✅ CFC Yükleme Onaylandı',
        message: `${paymentRequest.amount} CFC hesabınıza yüklendi! Yeni bakiyeniz: ${(paymentRequest.user.cfcBalance || 0) + paymentRequest.amount} CFC`,
        data: JSON.stringify({ amount: paymentRequest.amount, requestId }),
        targetPath: '/cfc-store',
        targetId: requestId,
        urgent: true,
      }).catch(err => console.error('CFC approve push error:', err))

      return NextResponse.json(updatedRequest)
    } else {
      // Reject
      const updatedRequest = await prisma.cfcPaymentRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          reviewedBy: session.user.id,
          reviewNote: reviewNote || null,
        },
      })

      // Notify the user with push
      createNotificationWithPush({
        userId: paymentRequest.userId,
        type: 'cfc_payment_rejected',
        title: '❌ CFC Yükleme Reddedildi',
        message: `${paymentRequest.amount} CFC yükleme talebiniz reddedildi.${reviewNote ? ' Sebep: ' + reviewNote : ''}`,
        data: JSON.stringify({ amount: paymentRequest.amount, requestId }),
        targetPath: '/cfc-store',
        targetId: requestId,
        urgent: true,
      }).catch(err => console.error('CFC reject push error:', err))

      return NextResponse.json(updatedRequest)
    }
  } catch (error) {
    console.error('Error processing CFC payment request:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
