import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    const dream = await prisma.dreamInterpretation.findUnique({
      where: { slug, isPublished: true },
    })

    if (!dream) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Increment views
    await prisma.dreamInterpretation.update({
      where: { id: dream.id },
      data: { views: { increment: 1 } },
    }).catch(() => {})

    // Get similar dreams based on keywords
    const similar = await prisma.dreamInterpretation.findMany({
      where: {
        isPublished: true,
        id: { not: dream.id },
        OR: dream.keywords.length > 0
          ? [
              { keywords: { hasSome: dream.keywords } },
            ]
          : [{ views: { gte: 0 } }],
      },
      orderBy: { views: 'desc' },
      take: 6,
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        views: true,
      },
    })

    return NextResponse.json({ dream, similar })
  } catch (error) {
    console.error('Dream detail error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
