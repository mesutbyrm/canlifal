import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// POST toggle like
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const { postId } = await req.json()
    if (!postId) return NextResponse.json({ error: 'postId gerekli' }, { status: 400 })

    const userId = authUser.id

    const existing = await prisma.blogLike.findUnique({
      where: { postId_userId: { postId, userId } },
    })

    if (existing) {
      // Unlike
      await prisma.blogLike.delete({ where: { id: existing.id } })
      await prisma.blogPost.update({
        where: { id: postId },
        data: { likes: { decrement: 1 } },
      }).catch(() => {})
      return NextResponse.json({ liked: false })
    } else {
      // Like
      await prisma.blogLike.create({ data: { postId, userId } })
      await prisma.blogPost.update({
        where: { id: postId },
        data: { likes: { increment: 1 } },
      }).catch(() => {})
      return NextResponse.json({ liked: true })
    }
  } catch (error) {
    console.error('Like toggle error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
