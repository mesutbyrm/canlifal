import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// GET user's interaction status for a post (liked, favorited)
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    const { searchParams } = new URL(req.url)
    const postId = searchParams.get('postId')
    if (!postId) return NextResponse.json({ error: 'postId gerekli' }, { status: 400 })

    if (!authUser) {
      return NextResponse.json({ liked: false, favorited: false, likesCount: 0 })
    }

    const userId = authUser.id

    const [like, favorite, post] = await Promise.all([
      prisma.blogLike.findUnique({ where: { postId_userId: { postId, userId } } }),
      prisma.blogFavorite.findUnique({ where: { postId_userId: { postId, userId } } }),
      prisma.blogPost.findUnique({ where: { id: postId }, select: { likes: true } }),
    ])

    return NextResponse.json({
      liked: !!like,
      favorited: !!favorite,
      likesCount: post?.likes || 0,
    })
  } catch (error) {
    console.error('Interactions fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
