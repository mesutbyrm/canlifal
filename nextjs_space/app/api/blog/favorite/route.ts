import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// POST toggle favorite
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const { postId } = await req.json()
    if (!postId) return NextResponse.json({ error: 'postId gerekli' }, { status: 400 })

    const userId = authUser.id

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
