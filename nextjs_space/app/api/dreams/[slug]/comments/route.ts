import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET comments for a dream
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const dream = await prisma.dreamInterpretation.findUnique({
      where: { slug: params.slug, isPublished: true },
      select: { id: true },
    })
    if (!dream) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const page = Math.max(1, parseInt(new URL(req.url).searchParams.get('page') || '1'))
    const limit = 20
    const skip = (page - 1) * limit

    const [comments, total] = await Promise.all([
      prisma.dreamComment.findMany({
        where: { dreamId: dream.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, image: true, username: true },
          },
        },
      }),
      prisma.dreamComment.count({ where: { dreamId: dream.id } }),
    ])

    return NextResponse.json({ comments, total, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Dream comments fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST a new comment
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Giri\u015f yapman\u0131z gerekiyor' }, { status: 401 })
    }

    const dream = await prisma.dreamInterpretation.findUnique({
      where: { slug: params.slug, isPublished: true },
      select: { id: true },
    })
    if (!dream) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { content } = await req.json()
    if (!content || typeof content !== 'string' || content.trim().length < 3) {
      return NextResponse.json({ error: 'Yorum en az 3 karakter olmal\u0131' }, { status: 400 })
    }
    if (content.length > 1000) {
      return NextResponse.json({ error: 'Yorum en fazla 1000 karakter olabilir' }, { status: 400 })
    }

    const comment = await prisma.dreamComment.create({
      data: {
        content: content.trim(),
        userId: (session.user as any).id,
        dreamId: dream.id,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: { id: true, name: true, image: true, username: true },
        },
      },
    })

    return NextResponse.json({ comment })
  } catch (error) {
    console.error('Dream comment create error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE a comment (own comment or admin)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { commentId } = await req.json()
    if (!commentId) {
      return NextResponse.json({ error: 'commentId required' }, { status: 400 })
    }

    const comment = await prisma.dreamComment.findUnique({ where: { id: commentId } })
    if (!comment) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const userId = (session.user as any).id
    const isAdmin = (session.user as any).role === 'admin'
    if (comment.userId !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.dreamComment.delete({ where: { id: commentId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Dream comment delete error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
