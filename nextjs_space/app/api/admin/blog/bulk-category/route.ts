import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(await staffCan(((session.user as any).role || '').toLowerCase(), (session.user as any).id, 'content.announcement.manage', ['admin']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { postIds, category } = await req.json()
    if (!postIds || !Array.isArray(postIds) || postIds.length === 0 || !category) {
      return NextResponse.json({ error: 'postIds ve category gerekli' }, { status: 400 })
    }

    const result = await prisma.blogPost.updateMany({
      where: { id: { in: postIds } },
      data: { category },
    })

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    console.error('Blog bulk category error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
