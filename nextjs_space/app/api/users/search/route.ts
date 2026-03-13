import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim()

    if (!q || q.length < 1) {
      return NextResponse.json({ users: [] })
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { startsWith: q, mode: 'insensitive' } },
          { username: { startsWith: q, mode: 'insensitive' } },
          { email: { startsWith: q, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        jetonBalance: true
      },
      take: 15,
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('User search error:', error)
    return NextResponse.json({ users: [] }, { status: 500 })
  }
}
