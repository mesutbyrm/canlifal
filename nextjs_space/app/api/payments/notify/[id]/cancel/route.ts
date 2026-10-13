import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// POST /api/payments/notify/{id}/cancel — kullanıcı kendi BEKLEYEN ödeme bildirimini iptal eder.
// Para hareketi yoktur; yalnızca durum pending → cancelled olur.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const id = params.id
    const result = await prisma.paymentNotification.updateMany({
      where: { id, userId: authUser.id, status: 'pending' },
      data: { status: 'cancelled' },
    })

    if (result.count === 0) {
      const existing = await prisma.paymentNotification.findUnique({
        where: { id },
        select: { userId: true, status: true },
      })
      if (!existing || existing.userId !== authUser.id) {
        return NextResponse.json({ error: 'Bildirim bulunamadı' }, { status: 404 })
      }
      return NextResponse.json(
        { error: 'Yalnızca bekleyen bildirimler iptal edilebilir' },
        { status: 409 }
      )
    }

    return NextResponse.json({ success: true, id, status: 'cancelled' })
  } catch (error: any) {
    console.error('[Payment Notify Cancel] Error:', error)
    return NextResponse.json({ error: 'Bildirim iptal edilemedi' }, { status: 500 })
  }
}
