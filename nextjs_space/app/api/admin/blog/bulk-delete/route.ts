import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getHybridSession(req)
    if (!session?.user || !(await staffCan(((session.user as any).role || '').toLowerCase(), (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { postIds } = await req.json()
    if (!Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json({ error: 'postIds dizisi gerekli' }, { status: 400 })
    }

    const result = await prisma.blogPost.deleteMany({
      where: { id: { in: postIds } },
    })

    return NextResponse.json({ success: true, deletedCount: result.count })
  } catch (error) {
    console.error('Bulk blog delete error:', error)
    return NextResponse.json({ error: 'Toplu silme hatası' }, { status: 500 })
  }
}
