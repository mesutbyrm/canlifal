import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || ((session.user as any).role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Yetki yok' }, { status: 401 })
    }

    const { postIds, isPublished } = await req.json()
    if (!postIds || !Array.isArray(postIds) || postIds.length === 0 || typeof isPublished !== 'boolean') {
      return NextResponse.json({ error: 'postIds ve isPublished gerekli' }, { status: 400 })
    }

    const data: any = { isPublished }
    if (isPublished) {
      data.publishedAt = new Date()
    }

    const result = await prisma.blogPost.updateMany({
      where: { id: { in: postIds } },
      data,
    })

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    console.error('Blog bulk publish error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
