import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - public listing of trend videos (optionally filter by category)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const categorySlug = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = { isActive: true }
    if (categorySlug) {
      where.category = { slug: categorySlug, isActive: true }
    } else {
      where.category = { isActive: true }
    }

    const videos = await prisma.trendVideo.findMany({
      where,
      include: {
        category: { select: { id: true, title: true, slug: true } }
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: limit,
    })

    const categories = await prisma.trendVideoCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, title: true, slug: true, description: true },
    })

    return NextResponse.json({ videos, categories })
  } catch (error) {
    console.error('Trend videos fetch error:', error)
    return NextResponse.json({ error: 'Videolar yüklenemedi' }, { status: 500 })
  }
}
