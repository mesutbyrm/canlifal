import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// POST /api/payments/requests/{id}/cancel — kullanıcı kendi BEKLEYEN CFC talebini iptal eder.
// Para hareketi yoktur; yalnızca durum pending → cancelled olur. Sahiplik ve durum tek
// updateMany koşuluyla denetlenir (yarış durumuna karşı).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const id = params.id
    const result = await prisma.cfcPaymentRequest.updateMany({
      where: { id, userId: authUser.id, status: 'pending' },
      data: { status: 'cancelled' },
    })

    if (result.count === 0) {
      const existing = await prisma.cfcPaymentRequest.findUnique({
        where: { id },
        select: { userId: true, status: true },
      })
      if (!existing || existing.userId !== authUser.id) {
        return NextResponse.json({ error: 'Talep bulunamadı' }, { status: 404 })
      }
      return NextResponse.json(
        { error: 'Yalnızca bekleyen talepler iptal edilebilir' },
        { status: 409 }
      )
    }

    return NextResponse.json({ success: true, id, status: 'cancelled' })
  } catch (error: any) {
    console.error('[CFC Request Cancel] Error:', error)
    return NextResponse.json({ error: 'Talep iptal edilemedi' }, { status: 500 })
  }
}
