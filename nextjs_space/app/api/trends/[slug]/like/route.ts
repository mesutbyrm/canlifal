import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
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
