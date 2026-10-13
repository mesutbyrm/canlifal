export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { isAdminRole } from '@/lib/admin-utils'
import { hasPermission } from '@/lib/permissions'

/**
 * GET /api/admin/voice-room-finance-audit
 * Sesli oda finansal denetim raporu.
 * ?period=today|7d|30d|all  ?roomId=  ?page=  ?limit=
 */
export async function GET(req: NextRequest) {
  const actor = await resolveUser(req)
  if (!actor) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  if (!isAdminRole(actor.role)) return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
  if (!(await hasPermission(actor.role, 'finance.view', actor.id)))
    return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || '30d'
  const roomId = searchParams.get('roomId')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const skip = (page - 1) * limit

  const now = Date.now()
  let from: Date | null = null
  switch (period) {
    case 'today': { const d = new Date(); d.setHours(0, 0, 0, 0); from = d; break }
    case '7d': from = new Date(now - 7 * 864e5); break
    case '30d': from = new Date(now - 30 * 864e5); break
    case '90d': from = new Date(now - 90 * 864e5); break
    default: from = null
  }

  try {
    const giftWhere: any = {}
    if (roomId) giftWhere.roomId = roomId
    if (from) giftWhere.createdAt = { gte: from }

    const [gifts, totalGifts, giftAgg, revenueAgg] = await Promise.all([
      prisma.chatRoomGift.findMany({
        where: giftWhere,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          sender: { select: { id: true, name: true, username: true } },
          recipient: { select: { id: true, name: true, username: true } },
          room: { select: { id: true, slug: true, nameTr: true } },
          giftType: { select: { id: true, name: true, price: true } },
        },
      }),
      prisma.chatRoomGift.count({ where: giftWhere }),
      prisma.chatRoomGift.aggregate({
        where: giftWhere,
        _sum: { totalPrice: true, commissionAmount: true },
        _count: true,
      }),
      // RoomRevenueLog varsa onu da dönelim
      (prisma as any).roomRevenueLog?.aggregate?.({
        where: { ...(roomId ? { roomId } : {}), ...(from ? { createdAt: { gte: from } } : {}) },
        _sum: { amount: true, siteAmount: true },
        _count: true,
      }).catch(() => null),
    ])

    return NextResponse.json({
      gifts,
      total: totalGifts,
      page,
      limit,
      summary: {
        total_transactions: giftAgg._count ?? 0,
        total_volume: giftAgg._sum?.totalPrice ?? 0,
        total_commission: giftAgg._sum?.commissionAmount ?? 0,
        revenue_logs: revenueAgg ? {
          count: revenueAgg._count ?? 0,
          total_amount: revenueAgg._sum?.amount ?? 0,
          site_amount: revenueAgg._sum?.siteAmount ?? 0,
        } : null,
      },
    })
  } catch (e) {
    console.error('[voice-room-finance-audit]', e)
    return NextResponse.json({ error: 'Finansal denetim yüklenemedi' }, { status: 500 })
  }
}
