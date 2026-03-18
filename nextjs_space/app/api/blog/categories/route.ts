import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const categories = await prisma.blogCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    // Get post counts per category
    const counts = await prisma.blogPost.groupBy({
      by: ['category'],
      where: { isPublished: true },
      _count: { id: true },
    })
    const countMap: Record<string, number> = {}
    counts.forEach((c: any) => { countMap[c.category] = c._count.id })

    const enriched = categories.map(cat => ({
      ...cat,
      postCount: countMap[cat.slug] || 0,
    }))

    return NextResponse.json({ categories: enriched })
  } catch (error) {
    console.error('Blog categories fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
