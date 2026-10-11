import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/payments/requests/pending
 * Kullanıcının aktif bekleyen CFC ödeme talebini döndürür.
 * Flutter uygulaması bu endpoint ile engellenen talebi görüntüler ve iptal seçeneği sunar.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // TTL: 24 saatten eski bekleyen talepleri otomatik iptal et
    const PENDING_TTL_MS = 24 * 60 * 60 * 1000
    const ttlCutoff = new Date(Date.now() - PENDING_TTL_MS)
    await prisma.cfcPaymentRequest.updateMany({
      where: {
        userId: authUser.id,
        status: 'pending',
        createdAt: { lt: ttlCutoff },
      },
      data: {
        status: 'expired',
        reviewNote: '[Otomatik] 24 saat içinde işlenmediği için süresi doldu',
      },
    })

    const pending = await prisma.cfcPaymentRequest.findFirst({
      where: {
        userId: authUser.id,
        status: 'pending',
      },
      select: {
        id: true,
        amount: true,
        method: true,
        createdAt: true,
        senderInfo: true,
        notes: true,
      },
    })

    if (!pending) {
      return NextResponse.json({ hasPending: false, request: null })
    }

    return NextResponse.json({
      hasPending: true,
      request: {
        ...pending,
        cancelUrl: `/api/payments/requests/${pending.id}/cancel`,
        ageMinutes: Math.floor((Date.now() - new Date(pending.createdAt).getTime()) / 60000),
      },
    })
  } catch (error) {
    console.error('Error checking pending CFC request:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
