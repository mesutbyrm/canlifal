export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { isAdminRole } from '@/lib/admin-utils'

/**
 * GET /api/admin/users/{userId}/gifts
 * Hediye geçmişi (gönderilen + alınan) özeti.
 */
export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const actor = await resolveUser(req)
  if (!actor) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  if (!isAdminRole(actor.role)) return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const userId = params.userId

  try {
    const [sent, received, sentAgg, recvAgg] = await Promise.all([
      (prisma as any).giftHistory.findMany({
        where: { senderId: userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { receiver: { select: { id: true, name: true, username: true, image: true } } },
      }),
      (prisma as any).giftHistory.findMany({
        where: { receiverId: userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { sender: { select: { id: true, name: true, username: true, image: true } } },
      }),
      prisma.giftHistory.aggregate({
        where: { senderId: userId },
        _sum: { coinAmount: true },
        _count: true,
      }),
      prisma.giftHistory.aggregate({
        where: { receiverId: userId },
        _sum: { coinAmount: true },
        _count: true,
      }),
    ])

    return NextResponse.json({
      sent,
      received,
      summary: {
        sent_count: sentAgg._count ?? 0,
        sent_jeton: sentAgg._sum?.coinAmount ?? 0,
        received_count: recvAgg._count ?? 0,
        received_jeton: recvAgg._sum?.coinAmount ?? 0,
      },
    })
  } catch (e) {
    console.error('[admin user gifts]', e)
    return NextResponse.json({ error: 'Hediye geçmişi yüklenemedi' }, { status: 500 })
  }
}
