import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const { postId } = await req.json()
    if (!postId) {
      return NextResponse.json({ error: 'postId gerekli' }, { status: 400 })
    }

    const existing = await prisma.celebrityPostLike.findUnique({
      where: { postId_userId: { postId, userId: authUser.id } },
    })

    if (existing) {
      await prisma.celebrityPostLike.delete({ where: { id: existing.id } })
      await prisma.celebrityPost.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      })
      return NextResponse.json({ liked: false })
    } else {
      await prisma.celebrityPostLike.create({
        data: { postId, userId: authUser.id },
      })
      await prisma.celebrityPost.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      })
      return NextResponse.json({ liked: true })
    }
  } catch (err) {
    console.error('Celebrity post like error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
