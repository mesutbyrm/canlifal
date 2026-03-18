import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('slug')
    const category = searchParams.get('category')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const featured = searchParams.get('featured')
    const trending = searchParams.get('trending')
    const editorPick = searchParams.get('editorPick')
    const search = searchParams.get('search')
    const zodiacSign = searchParams.get('zodiacSign')

    // Single post by slug
    if (slug) {
      const post = await prisma.blogPost.findFirst({
        where: { slug, isPublished: true },
      })
      if (!post) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      // Increment views
      await prisma.blogPost.update({
        where: { id: post.id },
        data: { views: { increment: 1 } },
      }).catch(() => {})
      return NextResponse.json({ post })
    }

    // Build where clause
    const where: any = { isPublished: true }
    if (category) where.category = category
    if (featured === 'true') where.isFeatured = true
    if (trending === 'true') where.isTrending = true
    if (editorPick === 'true') where.isEditorPick = true
    if (zodiacSign) where.zodiacSign = zodiacSign
    if (search) {
      where.OR = [
        { titleTr: { contains: search, mode: 'insensitive' } },
        { descTr: { contains: search, mode: 'insensitive' } },
        { keywords: { hasSome: [search.toLowerCase()] } },
      ]
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          slug: true,
          titleTr: true,
          titleEn: true,
          descTr: true,
          descEn: true,
          category: true,
          keywords: true,
          coverImage: true,
          readTime: true,
          views: true,
          likes: true,
          isFeatured: true,
          isTrending: true,
          isEditorPick: true,
          isPremium: true,
          zodiacSign: true,
          authorName: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
      prisma.blogPost.count({ where }),
    ])

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Public blog fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
