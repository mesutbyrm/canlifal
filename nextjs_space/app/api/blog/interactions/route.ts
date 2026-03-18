import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET user's interaction status for a post (liked, favorited)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(req.url)
    const postId = searchParams.get('postId')
    if (!postId) return NextResponse.json({ error: 'postId gerekli' }, { status: 400 })

    if (!session?.user) {
      return NextResponse.json({ liked: false, favorited: false, likesCount: 0 })
    }

    const userId = (session.user as any).id

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
