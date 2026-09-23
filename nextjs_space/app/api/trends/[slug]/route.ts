import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const trend = await prisma.trendingTopic.findUnique({
      where: { slug: params.slug }
    })

    if (!trend || !trend.isActive) {
      return NextResponse.json({ error: 'Trend bulunamadı' }, { status: 404 })
    }

    // Increment view count
    await prisma.trendingTopic.update({
      where: { slug: params.slug },
      data: { viewCount: { increment: 1 } }
    })

    return NextResponse.json(trend)
  } catch (error) {
    console.error('Error fetching trend:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
