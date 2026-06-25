import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'followerCount'

    const where: any = { isActive: true }
    if (category && category !== 'all') where.category = category
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
      ]
    }

    const orderBy: any = sortBy === 'newest' ? { createdAt: 'desc' } : { followerCount: 'desc' }

    const [celebrities, total] = await Promise.all([
      prisma.celebrity.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.celebrity.count({ where }),
    ])

    // Check if current user follows any of these
    const authUser = await authenticateRequest(req)
    let followedIds: string[] = []
    if (authUser?.id) {
      const follows = await prisma.celebrityFollow.findMany({
        where: {
          userId: authUser.id,
          celebrityId: { in: celebrities.map(c => c.id) },
        },
        select: { celebrityId: true },
      })
      followedIds = follows.map(f => f.celebrityId)
    }

    const enriched = celebrities.map(c => ({
      ...c,
      socialLinks: c.socialLinks ? JSON.parse(c.socialLinks) : {},
      achievements: c.achievements ? JSON.parse(c.achievements) : [],
      isFollowed: followedIds.includes(c.id),
    }))

    return NextResponse.json({
      celebrities: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching celebrities:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
