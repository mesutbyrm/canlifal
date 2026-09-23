export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * GET /api/blog/recent
 * Auth: yok
 * Son yayımlanan blog yazıları (öne çıkanlar + en yeniler, limit=8).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '8') || 8, 20)

    const posts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        titleTr: true,
        titleEn: true,
        slug: true,
        descTr: true,
        coverImage: true,
        category: true,
        isFeatured: true,
        readTime: true,
        views: true,
        publishedAt: true,
      },
    })

    const mapped = posts.map((p: any) => ({
      id: p.id,
      title: p.titleTr || p.titleEn,
      slug: p.slug,
      summary: p.descTr,
      coverImage: p.coverImage,
      category: p.category,
      isFeatured: p.isFeatured,
      readTime: p.readTime,
      views: p.views,
      publishedAt: p.publishedAt,
    }))

    return NextResponse.json({
      success: true,
      data: { posts: mapped, items: mapped },
    })
  } catch (error: any) {
    console.error('[blog] recent error:', error)
    return NextResponse.json({
      success: true,
      data: { posts: [], items: [] },
    })
  }
}
