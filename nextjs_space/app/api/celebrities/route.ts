export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

/**
 * GET /api/celebrities
 * Auth: opsiyonel
 * Query: ?category=&limit=&cursor=
 * Aktif ünlüleri popülerlik sırasıyla döndürür.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req).catch(() => null)
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 50)
    const cursor = searchParams.get('cursor') || undefined
    const category = searchParams.get('category') || undefined

    const where: any = { isActive: true }
    if (category) where.category = category

    const celebs = await prisma.celebrity.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ followerCount: 'desc' }, { createdAt: 'desc' }],
      include: {
        fanClub: { select: { id: true, memberCount: true } },
        ...(authUser
          ? { followers: { where: { userId: authUser.id }, select: { id: true }, take: 1 } }
          : {}),
      },
    })

    const hasMore = celebs.length > limit
    const items = hasMore ? celebs.slice(0, limit) : celebs
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null

    return NextResponse.json({
      success: true,
      data: {
        celebrities: items.map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          category: c.category,
          bio: c.bio,
          profileImage: c.profileImage,
          coverImage: c.coverImage,
          isVerified: c.isVerified,
          followerCount: c.followerCount,
          zodiacSign: c.zodiacSign,
          isFollowing: authUser ? (c.followers?.length ?? 0) > 0 : false,
          fanClub: c.fanClub ? { id: c.fanClub.id, memberCount: c.fanClub.memberCount } : null,
        })),
        items: items.map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          category: c.category,
          profileImage: c.profileImage,
          isVerified: c.isVerified,
          followerCount: c.followerCount,
        })),
        nextCursor,
        hasMore,
      },
    })
  } catch (error: any) {
    console.error('[celebrities] list error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Ünlü listesi alınamadı' } },
      { status: 500 }
    )
  }
}
