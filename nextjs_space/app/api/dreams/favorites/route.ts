import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// GET user's favorite dreams
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const userId = authUser.id
    const favorites = await prisma.dreamFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        dream: {
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            views: true,
            keywords: true,
          },
        },
      },
    })

    return NextResponse.json({ favorites })
  } catch (error) {
    console.error('Dream favorites fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
