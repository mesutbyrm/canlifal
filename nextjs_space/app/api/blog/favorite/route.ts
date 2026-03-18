import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST toggle favorite
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const { postId } = await req.json()
    if (!postId) return NextResponse.json({ error: 'postId gerekli' }, { status: 400 })

    const userId = (session.user as any).id

    const existing = await prisma.blogFavorite.findUnique({
      where: { postId_userId: { postId, userId } },
    })

    if (existing) {
      await prisma.blogFavorite.delete({ where: { id: existing.id } })
      return NextResponse.json({ favorited: false })
    } else {
      await prisma.blogFavorite.create({ data: { postId, userId } })
      return NextResponse.json({ favorited: true })
    }
  } catch (error) {
    console.error('Favorite toggle error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
