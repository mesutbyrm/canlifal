import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic'

// Toggle like on a fan club post
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const body = await req.json()
    const { postId } = body
    if (!postId) {
      return NextResponse.json({ error: 'Post ID gerekli' }, { status: 400 })
    }

    const post = await prisma.fanClubPost.findUnique({ where: { id: postId } })
    if (!post) {
      return NextResponse.json({ error: 'Post bulunamadı' }, { status: 404 })
    }

    const existing = await prisma.fanClubPostLike.findUnique({
      where: { postId_userId: { postId, userId: session.user.id } },
    })

    if (existing) {
      await prisma.$transaction([
        prisma.fanClubPostLike.delete({ where: { id: existing.id } }),
        prisma.fanClubPost.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
      ])
      return NextResponse.json({ liked: false, likeCount: Math.max(0, post.likeCount - 1) })
    } else {
      await prisma.$transaction([
        prisma.fanClubPostLike.create({ data: { postId, userId: session.user.id } }),
        prisma.fanClubPost.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
      ])
      return NextResponse.json({ liked: true, likeCount: post.likeCount + 1 })
    }
  } catch (error) {
    console.error('Fan club post like error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
