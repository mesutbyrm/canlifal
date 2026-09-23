import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim() || ''
    const category = searchParams.get('category')?.trim() || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const sort = searchParams.get('sort') || 'popular'
    const skip = (page - 1) * limit

    const where: any = { isPublished: true }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { keywords: { hasSome: [search.toLowerCase()] } },
      ]
    }
    if (category && category !== 'tumu') {
      where.category = category
    }

    const orderBy = sort === 'newest'
      ? { createdAt: 'desc' as const }
      : { views: 'desc' as const }

    const [dreams, total, categories] = await Promise.all([
      prisma.dreamInterpretation.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          keywords: true,
          category: true,
          views: true,
          createdAt: true,
        },
      }),
      prisma.dreamInterpretation.count({ where }),
      // Get category counts
      prisma.$queryRaw`
        SELECT category, COUNT(*)::int as count 
        FROM dream_interpretations 
        WHERE "isPublished" = true 
        GROUP BY category 
        ORDER BY count DESC
      ` as Promise<Array<{ category: string; count: number }>>,
    ])

    return NextResponse.json({
      dreams,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      categories,
    })
  } catch (error) {
    console.error('Dreams fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
