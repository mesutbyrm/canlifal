import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST - Record a view for a post's fortune
export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const post = await prisma.socialPost.findUnique({
      where: { id: params.postId },
      select: { fortuneId: true }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (!post.fortuneId) {
      return NextResponse.json({ viewCount: 0 })
    }

    // Increment view count for the fortune
    const fortune = await prisma.fortune.update({
      where: { id: post.fortuneId },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true }
    })

    return NextResponse.json({ viewCount: fortune.viewCount })
  } catch (error) {
    console.error('View tracking error:', error)
    return NextResponse.json({ error: 'Görüntülenme kaydedilemedi' }, { status: 500 })
  }
}
