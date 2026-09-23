export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET - public endpoint to fetch active TikTok videos
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const categoryId = searchParams.get('categoryId')

    const where: any = { isActive: true }
    if (categoryId) {
      where.categoryId = categoryId
    }

    const videos = await prisma.tikTokVideo.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: limit,
      include: { category: { select: { id: true, title: true, slug: true } } },
    })

    // Also fetch active categories for filtering
    const categories = await prisma.tikTokCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: { id: true, title: true, slug: true },
    })

    return NextResponse.json({ videos, categories })
  } catch (error) {
    console.error('TikTok videos fetch error:', error)
    return NextResponse.json({ videos: [], categories: [] })
  }
}
