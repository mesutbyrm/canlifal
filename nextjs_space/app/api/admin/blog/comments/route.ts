import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET all comments (admin)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || ((session.user as any).role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') // 'approved', 'pending', 'all'

    const where: any = {}
    if (status === 'approved') where.isApproved = true
    else if (status === 'pending') where.isApproved = false

    const [comments, total] = await Promise.all([
      prisma.blogComment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.blogComment.count({ where }),
    ])

    // Fetch post titles for context
    const postIds = [...new Set(comments.map((c: any) => c.postId))]
    const posts = postIds.length > 0 ? await prisma.blogPost.findMany({
      where: { id: { in: postIds } },
      select: { id: true, titleTr: true, slug: true },
    }) : []
    const postMap = Object.fromEntries(posts.map((p: any) => [p.id, p]))

    const enriched = comments.map((c: any) => ({
      ...c,
      postTitle: postMap[c.postId]?.titleTr || 'Silinen yazı',
      postSlug: postMap[c.postId]?.slug || '',
    }))

    return NextResponse.json({ comments: enriched, total, page, limit })
  } catch (error) {
    console.error('Admin comments error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PATCH: approve/reject/delete comment
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || ((session.user as any).role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { commentId, action } = await req.json()
    if (!commentId || !action) return NextResponse.json({ error: 'commentId ve action gerekli' }, { status: 400 })

    if (action === 'approve') {
      await prisma.blogComment.update({ where: { id: commentId }, data: { isApproved: true } })
    } else if (action === 'reject') {
      await prisma.blogComment.update({ where: { id: commentId }, data: { isApproved: false } })
    } else if (action === 'delete') {
      await prisma.blogComment.deleteMany({ where: { parentId: commentId } })
      await prisma.blogComment.delete({ where: { id: commentId } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin comment action error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
