import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - generate share card data for a fortune
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
        include: { user: { select: { name: true, username: true, avatar: true } } }
      })
      if (!fortune) {
        return NextResponse.json({ error: 'Fortune not found' }, { status: 404 })
      }

      let summary = ''
      try {
        const response = fortune.aiResponse
        summary = response.substring(0, 200) + (response.length > 200 ? '...' : '')
      } catch (e) {
        summary = 'R\u00fcya yorumu'
      }

      const fortuneTypeLabels: Record<string, string> = {
        dream: '\ud83c\udf19 R\u00fcya Tabiri',
        coffee: '\u2615 Kahve Fal\u0131',
        tarot: '\ud83c\udccf Tarot Fal\u0131',
        horoscope: '\u2b50 Bur\u00e7 Yorumu',
        palm: '\u270b El Fal\u0131',
        love: '\u2764\ufe0f A\u015fk Fal\u0131',
        numerology: '\ud83d\udd22 N\u00fcmeroloji',
        angel: '\ud83d\ude07 Melek Kart\u0131',
        aura: '\ud83d\udcab Aura Analizi',
        birthchart: '\ud83c\udf1f Do\u011fum Haritasi'
      }

      cardData = {
        type: 'fortune',
        fortuneType: fortune.fortuneType,
        typeLabel: fortuneTypeLabels[fortune.fortuneType] || '\ud83d\udd2e Fal',
        userName: fortune.user.name || 'Anonim',
        userAvatar: fortune.user.avatar,
        summary,
        date: fortune.createdAt,
        shareUrl: `${process.env.NEXTAUTH_URL || 'https://canlifal.com'}/social`
      }
    }

    if (postId) {
      const post = await prisma.socialPost.findUnique({
        where: { id: postId },
        include: {
          user: { select: { name: true, username: true, avatar: true } },
          _count: { select: { likes: true, comments: true } }
        }
      })
      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }

      cardData = {
        type: 'social_post',
        content: post.content.substring(0, 300),
        userName: post.user.name || 'Anonim',
        userAvatar: post.user.avatar,
        likes: post._count.likes,
        comments: post._count.comments,
        date: post.createdAt,
        shareUrl: `${process.env.NEXTAUTH_URL || 'https://canlifal.com'}/social`
      }
    }

    return NextResponse.json({ card: cardData })
  } catch (error) {
    console.error('Share card error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
