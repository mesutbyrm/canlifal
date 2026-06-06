import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCached, CACHE_TTL } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const enriched = await getCached('blog:categories', CACHE_TTL.HOMEPAGE_CARDS, async () => {
      const categories = await prisma.blogCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      })

      const counts = await prisma.blogPost.groupBy({
        by: ['category'],
        where: { isPublished: true },
        _count: { id: true },
      })
      const countMap: Record<string, number> = {}
      counts.forEach((c: any) => { countMap[c.category] = c._count.id })

      return categories.map((cat: any) => ({
        ...cat,
        postCount: countMap[cat.slug] || 0,
      }))
    })

    return NextResponse.json({ categories: enriched })
  } catch (error) {
    console.error('Blog categories fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
