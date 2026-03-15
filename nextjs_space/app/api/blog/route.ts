import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// Public blog API - returns only published posts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('slug')

    if (slug) {
      const post = await prisma.blogPost.findFirst({
        where: { slug, isPublished: true },
      })
      if (!post) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json({ post })
    }

    const posts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        titleTr: true,
        titleEn: true,
        descTr: true,
        descEn: true,
        category: true,
        keywords: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ posts })
  } catch (error) {
    console.error('Public blog fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
