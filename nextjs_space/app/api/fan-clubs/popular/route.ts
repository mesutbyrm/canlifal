import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const fanClubs = await prisma.fanClub.findMany({
      where: { isActive: true },
      orderBy: [{ memberCount: 'desc' }],
      take: 10,
      include: {
        celebrity: {
          select: { name: true, slug: true, profileImage: true, category: true },
        },
        _count: { select: { posts: true, members: true } },
      },
    })

    return NextResponse.json({
      fanClubs: fanClubs.map(fc => ({
        id: fc.id,
        celebrityId: fc.celebrityId,
        memberCount: fc.memberCount,
        postCount: fc._count.posts,
        coverImage: fc.coverImage,
        celebrity: fc.celebrity,
      })),
    })
  } catch (err) {
    console.error('Popular fan clubs error:', err)
    return NextResponse.json({ fanClubs: [] })
  }
}
