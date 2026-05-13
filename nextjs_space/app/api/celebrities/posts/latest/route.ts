import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// Get latest celebrity posts across all celebrities (for homepage Son Paylaşımlar)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const posts = await prisma.celebrityPost.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        celebrity: { select: { name: true, slug: true, profileImage: true, category: true } },
      },
    })

    return NextResponse.json({ posts })
  } catch (err) {
    console.error('Latest celebrity posts error:', err)
    return NextResponse.json({ posts: [] })
  }
}
