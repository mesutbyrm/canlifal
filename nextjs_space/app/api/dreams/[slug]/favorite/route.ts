import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET favorite status
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ isFavorited: false, count: 0 })
    }

    const dream = await prisma.dreamInterpretation.findUnique({
      where: { slug: params.slug, isPublished: true },
      select: { id: true },
    })
    if (!dream) {
      return NextResponse.json({ isFavorited: false, count: 0 })
    }

    const userId = (session.user as any).id
    const [fav, count] = await Promise.all([
      prisma.dreamFavorite.findUnique({
        where: { userId_dreamId: { userId, dreamId: dream.id } },
      }),
      prisma.dreamFavorite.count({ where: { dreamId: dream.id } }),
    ])

    return NextResponse.json({ isFavorited: !!fav, count })
  } catch (error) {
    console.error('Dream favorite status error:', error)
    return NextResponse.json({ isFavorited: false, count: 0 })
  }
}

// POST toggle favorite
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

    const userId = (session.user as any).id
    const existing = await prisma.dreamFavorite.findUnique({
      where: { userId_dreamId: { userId, dreamId: dream.id } },
    })

    if (existing) {
      await prisma.dreamFavorite.delete({ where: { id: existing.id } })
      const count = await prisma.dreamFavorite.count({ where: { dreamId: dream.id } })
      return NextResponse.json({ isFavorited: false, count })
    } else {
      await prisma.dreamFavorite.create({
        data: { userId, dreamId: dream.id },
      })
      const count = await prisma.dreamFavorite.count({ where: { dreamId: dream.id } })
      return NextResponse.json({ isFavorited: true, count })
    }
  } catch (error) {
    console.error('Dream favorite toggle error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
