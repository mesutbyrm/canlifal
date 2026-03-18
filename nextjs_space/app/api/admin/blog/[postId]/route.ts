import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || ((session.user as any).role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { slug, titleTr, titleEn, descTr, descEn, contentTr, contentEn, category, keywords, isPublished } = body

    const post = await prisma.blogPost.update({
      where: { id: params.postId },
      data: {
        ...(slug !== undefined && { slug }),
        ...(titleTr !== undefined && { titleTr }),
        ...(titleEn !== undefined && { titleEn }),
        ...(descTr !== undefined && { descTr }),
        ...(descEn !== undefined && { descEn }),
        ...(contentTr !== undefined && { contentTr }),
        ...(contentEn !== undefined && { contentEn }),
        ...(category !== undefined && { category }),
        ...(keywords !== undefined && { keywords }),
        ...(isPublished !== undefined && { isPublished }),
      },
    })

    return NextResponse.json({ post })
  } catch (error: any) {
    console.error('Blog update error:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Bu slug zaten kullanılıyor' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || ((session.user as any).role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.blogPost.delete({ where: { id: params.postId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Blog delete error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
