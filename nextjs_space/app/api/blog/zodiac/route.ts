import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sign = searchParams.get('sign')
    const limit = parseInt(searchParams.get('limit') || '12')

    if (!sign) {
      // Return all signs with latest post for each
      const signs = ['koc', 'boga', 'ikizler', 'yengec', 'aslan', 'basak', 'terazi', 'akrep', 'yay', 'oglak', 'kova', 'balik']
      const signData = await Promise.all(
        signs.map(async (s) => {
          const latest = await prisma.blogPost.findFirst({
            where: { zodiacSign: s, isPublished: true },
            orderBy: { publishedAt: 'desc' },
            select: { id: true, slug: true, titleTr: true, publishedAt: true },
          })
          const count = await prisma.blogPost.count({ where: { zodiacSign: s, isPublished: true } })
          return { sign: s, latestPost: latest, totalPosts: count }
        })
      )
      return NextResponse.json({ signs: signData })
    }

    // Posts for a specific sign
    const posts = await prisma.blogPost.findMany({
      where: { zodiacSign: sign, isPublished: true },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        id: true, slug: true, titleTr: true, descTr: true, coverImage: true,
        readTime: true, views: true, likes: true, publishedAt: true, createdAt: true, category: true,
      },
    })

    return NextResponse.json({ posts, sign })
  } catch (error) {
    console.error('Zodiac blog error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
