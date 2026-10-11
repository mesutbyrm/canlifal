export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { isAdminRole } from '@/lib/admin-utils'

/**
 * GET /api/admin/users/{userId}/rooms
 * Kullanıcının sahip olduğu odalar + ziyaret geçmişi.
 */
export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const actor = await resolveUser(req)
  if (!actor) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  if (!isAdminRole(actor.role)) return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const userId = params.userId

  try {
    const [owned, visits] = await Promise.all([
      prisma.chatRoom.findMany({
        where: { ownerId: userId },
        select: { id: true, slug: true, nameTr: true, nameEn: true, roomType: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      (prisma as any).voiceSession.findMany({
        where: { userId },
        orderBy: { joinedAt: 'desc' },
        take: limit,
        include: { room: { select: { id: true, slug: true, nameTr: true } } },
      }),
    ])

    const history = visits.map((v: any) => ({
      ...v,
      minutes: Math.max(0, Math.round((new Date(v.lastPing).getTime() - new Date(v.joinedAt).getTime()) / 60000)),
    }))

    return NextResponse.json({ owned_rooms: owned, history })
  } catch (e) {
    console.error('[admin user rooms]', e)
    return NextResponse.json({ error: 'Oda geçmişi yüklenemedi' }, { status: 500 })
  }
}
