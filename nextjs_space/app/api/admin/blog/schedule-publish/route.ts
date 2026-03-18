import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// Check and publish scheduled posts
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || ((session.user as any).role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const scheduled = await prisma.blogPost.findMany({
      where: {
        isPublished: false,
        scheduledAt: { not: null, lte: now },
      },
    })

    let published = 0
    for (const post of scheduled) {
      await prisma.blogPost.update({
        where: { id: post.id },
        data: { isPublished: true, publishedAt: post.scheduledAt || now },
      })
      published++
    }

    return NextResponse.json({ published, total: scheduled.length })
  } catch (error) {
    console.error('Schedule publish error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
