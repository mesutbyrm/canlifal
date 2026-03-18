import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - generate share card data for a fortune or social post
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fortuneId = searchParams.get('fortuneId')
    const postId = searchParams.get('postId')

    if (!fortuneId && !postId) {
      return NextResponse.json({ error: 'Missing fortuneId or postId' }, { status: 400 })
    }

    let cardData: any = null

    if (fortuneId) {
      const fortune = await prisma.fortune.findUnique({
        where: { id: fortuneId },
        include: { user: { select: { name: true, username: true, image: true } } }
      })
      if (!fortune) {
        return NextResponse.json({ error: 'Fortune not found' }, { status: 404 })
      }

      let summary = ''
      try {
        const response = fortune.aiResponse
        summary = response.substring(0, 200) + (response.length > 200 ? '...' : '')
      } catch (e) {
        summary = 'Fal yorumu'
      }

      const fortuneTypeLabels: Record<string, string> = {
        dream: 'Ruya Tabiri',
        coffee: 'Kahve Fali',
        tarot: 'Tarot Fali',
        horoscope: 'Burc Yorumu',
        palm: 'El Fali',
        love: 'Ask Fali',
        numerology: 'Numeroloji',
        angel: 'Melek Karti',
        aura: 'Aura Analizi',
        birthchart: 'Dogum Haritasi'
      }

      cardData = {
        type: 'fortune',
        fortuneType: fortune.fortuneType,
        typeLabel: fortuneTypeLabels[fortune.fortuneType] || 'Fal',
        userName: fortune.user?.name || 'Anonim',
        userImage: fortune.user?.image || null,
        summary,
        date: fortune.createdAt,
        shareUrl: (process.env.NEXTAUTH_URL || 'https://canlifal.com') + '/social'
      }
    }

    if (postId) {
      const post = await prisma.socialPost.findUnique({
        where: { id: postId },
        include: {
          user: { select: { name: true, username: true, image: true } },
          _count: { select: { likes: true, comments: true } }
        }
      })
      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }

      cardData = {
        type: 'social_post',
        content: post.content.substring(0, 300),
        userName: post.user?.name || 'Anonim',
        userImage: post.user?.image || null,
        likes: post._count?.likes || 0,
        comments: post._count?.comments || 0,
        date: post.createdAt,
        shareUrl: (process.env.NEXTAUTH_URL || 'https://canlifal.com') + '/social'
      }
    }

    return NextResponse.json({ card: cardData })
  } catch (error) {
    console.error('Share card error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
