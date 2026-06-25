import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const postId = searchParams.get('postId')
    if (!postId) {
      return NextResponse.json({ error: 'postId gerekli' }, { status: 400 })
    }

    const comments = await prisma.celebrityPostComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    })

    return NextResponse.json({ comments })
  } catch (err) {
    console.error('Celebrity post comments GET error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const { postId, content } = await req.json()
    if (!postId || !content?.trim()) {
      return NextResponse.json({ error: 'postId ve içerik gerekli' }, { status: 400 })
    }

    const comment = await prisma.celebrityPostComment.create({
      data: {
        postId,
        userId: authUser.id,
        content: content.trim(),
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    })

    await prisma.celebrityPost.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    })

    return NextResponse.json({ comment })
  } catch (err) {
    console.error('Celebrity post comment POST error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
