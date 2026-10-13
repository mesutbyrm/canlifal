import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// GET /api/payments/requests/pending — kullanıcının bekleyen en güncel CFC talebi.
// Yanıt: { hasPending: boolean, request: {...} | null }
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const pending = await prisma.cfcPaymentRequest.findFirst({
      where: { userId: authUser.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        method: true,
        status: true,
        senderInfo: true,
        notes: true,
        reviewNote: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      hasPending: !!pending,
      request: pending
        ? { ...pending, requestType: 'cfc', reviewNote: pending.reviewNote ?? null }
        : null,
    })
  } catch (error: any) {
    console.error('[CFC Requests Pending] Error:', error)
    return NextResponse.json({ error: 'Bekleyen talep alınamadı' }, { status: 500 })
  }
}
