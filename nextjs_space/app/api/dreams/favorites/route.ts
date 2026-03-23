import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET user's favorite dreams
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const userId = (session.user as any).id
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
