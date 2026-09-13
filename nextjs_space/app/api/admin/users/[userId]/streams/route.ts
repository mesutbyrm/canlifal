export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { isAdminRole } from '@/lib/admin-utils'

/**
 * GET /api/admin/users/{userId}/streams
 * Kullanıcının yayın geçmişi.
 */
export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const actor = await resolveUser(req)
  if (!actor) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  if (!isAdminRole(actor.role)) return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const skip = (page - 1) * limit

  try {
    const [streams, total, agg] = await Promise.all([
      prisma.videoStream.findMany({
        where: { userId: params.userId },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, title: true, status: true, viewerCount: true, likeCount: true,
          startedAt: true, endedAt: true, category: true,
        },
      }),
      prisma.videoStream.count({ where: { userId: params.userId } }),
      prisma.videoStream.aggregate({
        where: { userId: params.userId },
        _sum: { viewerCount: true, likeCount: true },
        _count: true,
      }),
    ])

    const items = streams.map((s) => ({
      ...s,
      duration_minutes: s.endedAt && s.startedAt
        ? Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000)
        : null,
    }))

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      summary: {
        total_streams: agg._count ?? 0,
        total_viewers: agg._sum?.viewerCount ?? 0,
        total_likes: agg._sum?.likeCount ?? 0,
      },
    })
  } catch (e) {
    console.error('[admin user streams]', e)
    return NextResponse.json({ error: 'Yayın geçmişi yüklenemedi' }, { status: 500 })
  }
}
