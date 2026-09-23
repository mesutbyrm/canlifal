export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

/**
 * GET /api/fan-clubs
 * Auth: opsiyonel
 * Tüm aktif fan kulüplerini üye sayısına göre döndürür.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req).catch(() => null)
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 50)
    const cursor = searchParams.get('cursor') || undefined

    const clubs = await prisma.fanClub.findMany({
      where: { isActive: true },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ memberCount: 'desc' }, { createdAt: 'desc' }],
      include: {
        celebrity: { select: { id: true, name: true, slug: true, profileImage: true, isVerified: true } },
        ...(authUser
          ? { members: { where: { userId: authUser.id }, select: { id: true, role: true }, take: 1 } }
          : {}),
      },
    })

    const hasMore = clubs.length > limit
    const items = hasMore ? clubs.slice(0, limit) : clubs
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null

    const mapped = items.map((c: any) => ({
      id: c.id,
      celebrity: c.celebrity,
      description: c.description,
      coverImage: c.coverImage,
      memberCount: c.memberCount,
      isMember: authUser ? (c.members?.length ?? 0) > 0 : false,
      role: authUser ? c.members?.[0]?.role ?? null : null,
    }))

    return NextResponse.json({
      success: true,
      data: { fanClubs: mapped, clubs: mapped, items: mapped, nextCursor, hasMore },
    })
  } catch (error: any) {
    console.error('[fan-clubs] list error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Fan kulüpleri alınamadı' } },
      { status: 500 }
    )
  }
}
