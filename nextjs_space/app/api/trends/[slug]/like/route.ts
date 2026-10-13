import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const trend = await prisma.trendingTopic.update({
      where: { slug: params.slug },
      data: {
        likeCount: { increment: 1 },
        trendScore: { increment: 1 }
      }
    })

    return NextResponse.json({ likeCount: trend.likeCount })
  } catch (error) {
    console.error('Error liking trend:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
