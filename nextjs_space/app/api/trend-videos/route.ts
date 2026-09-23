import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - public listing of trend videos
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const categorySlug = searchParams.get('category')
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam) : undefined
    const sortBy = searchParams.get('sort') || 'order' // order | views

    const where: any = { isActive: true }
    if (categorySlug) {
      where.category = { slug: categorySlug, isActive: true }
    } else {
      where.category = { isActive: true }
    }

    const orderBy = sortBy === 'views'
      ? [{ viewCount: 'desc' as const }, { createdAt: 'desc' as const }]
      : [{ sortOrder: 'asc' as const }, { createdAt: 'desc' as const }]

    const videos = await prisma.trendVideo.findMany({
      where,
      include: {
        category: { select: { id: true, title: true, slug: true } }
      },
      orderBy,
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

// POST - increment view count
export async function POST(req: NextRequest) {
  try {
    let body: any
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 }) }
    const { videoId } = body || {}
    if (!videoId) return NextResponse.json({ error: 'Video ID gerekli' }, { status: 400 })

    await prisma.trendVideo.update({
      where: { id: videoId },
      data: { viewCount: { increment: 1 } }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('View count error:', error)
    return NextResponse.json({ error: 'Hata' }, { status: 500 })
  }
}
