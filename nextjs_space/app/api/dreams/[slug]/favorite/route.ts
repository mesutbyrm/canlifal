import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// GET favorite status
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ isFavorited: false, count: 0 })
    }

    const dream = await prisma.dreamInterpretation.findUnique({
      where: { slug: params.slug, isPublished: true },
      select: { id: true },
    })
    if (!dream) {
      return NextResponse.json({ isFavorited: false, count: 0 })
    }

    const userId = authUser.id
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
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekiyor' }, { status: 401 })
    }

    const dream = await prisma.dreamInterpretation.findUnique({
      where: { slug: params.slug, isPublished: true },
      select: { id: true },
    })
    if (!dream) {
      return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 })
    }

    const userId = authUser.id
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
