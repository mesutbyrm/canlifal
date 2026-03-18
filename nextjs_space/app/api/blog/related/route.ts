import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('slug')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '4')

    if (!slug) {
      return NextResponse.json({ error: 'slug required' }, { status: 400 })
    }

    // Get the current post's keywords
    const currentPost = await prisma.blogPost.findFirst({
      where: { slug },
      select: { id: true, keywords: true, category: true },
    })

    const postCategory = category || currentPost?.category || 'genel'

    // Find related posts: same category first, then by keywords overlap
    const relatedPosts = await prisma.blogPost.findMany({
      where: {
        isPublished: true,
        slug: { not: slug },
        OR: [
          { category: postCategory },
          ...(currentPost?.keywords?.length ? [{ keywords: { hasSome: currentPost.keywords } }] : []),
        ],
      },
      orderBy: [{ views: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        slug: true,
        titleTr: true,
        descTr: true,
        category: true,
        coverImage: true,
        readTime: true,
        views: true,
        publishedAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ posts: relatedPosts })
  } catch (error) {
    console.error('Related posts fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
