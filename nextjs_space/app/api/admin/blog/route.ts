import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ posts })
  } catch (error) {
    console.error('Blog fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { slug, titleTr, titleEn, descTr, descEn, contentTr, contentEn, category, keywords, isPublished } = body

    if (!slug || !titleTr || !contentTr) {
      return NextResponse.json({ error: 'slug, titleTr, contentTr zorunlu' }, { status: 400 })
    }

    const post = await prisma.blogPost.create({
      data: {
        slug,
        titleTr,
        titleEn: titleEn || '',
        descTr: descTr || '',
        descEn: descEn || '',
        contentTr,
        contentEn: contentEn || '',
        category: category || 'genel',
        keywords: keywords || [],
        isPublished: isPublished || false,
        authorId: (session.user as any).id,
      },
    })

    return NextResponse.json({ post })
  } catch (error: any) {
    console.error('Blog create error:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Bu slug zaten kullan\u0131l\u0131yor' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
