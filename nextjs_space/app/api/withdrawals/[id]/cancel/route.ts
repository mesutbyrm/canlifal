import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// Admin onayında (approve) bakiye düşülür; bu aşamadan sonra iptal edilemez.
// Onaydan önceki durumlarda bakiye hareketi yoktur, bu yüzden iptal yalnızca durum değiştirir
// (admin reddiyle aynı davranış).
const CANCELLABLE = ['pending', 'agency_approved']

// POST /api/withdrawals/{id}/cancel — kullanıcı kendi çekim talebini iptal eder.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const id = params.id
    const result = await prisma.withdrawalRequest.updateMany({
      where: { id, userId: authUser.id, status: { in: CANCELLABLE } },
      data: { status: 'cancelled', processedAt: new Date() },
    })

    if (result.count === 0) {
      const existing = await prisma.withdrawalRequest.findUnique({
        where: { id },
        select: { userId: true, status: true },
      })
      if (!existing || existing.userId !== authUser.id) {
        return NextResponse.json({ error: 'Talep bulunamadı' }, { status: 404 })
      }
      return NextResponse.json(
        { error: 'Bu talep artık iptal edilemez' },
        { status: 409 }
      )
    }

    return NextResponse.json({ success: true, id, status: 'cancelled' })
  } catch (error: any) {
    console.error('[Withdrawal Cancel] Error:', error)
    return NextResponse.json({ error: 'Çekim talebi iptal edilemedi' }, { status: 500 })
  }
}
