import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const skip = (page - 1) * limit

    const where: any = { isActive: true }
    if (category && category !== 'hepsi') {
      where.category = category
    }
    // Only show trends that haven't expired
    where.OR = [
      { endDate: null },
      { endDate: { gte: new Date() } }
    ]

    const [trends, total] = await Promise.all([
      prisma.trendingTopic.findMany({
        where,
        orderBy: [
          { isPinned: 'desc' },
          { trendScore: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip
      }),
      prisma.trendingTopic.count({ where })
    ])

    return NextResponse.json({ trends, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Error fetching trends:', error)
    return NextResponse.json({ trends: [], total: 0 }, { status: 500 })
  }
}
