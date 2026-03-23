import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim()

    if (!q || q.length < 1) {
      return NextResponse.json([])
    }

    // Search users by name, username, or email (contains search for better results)
    const users = await prisma.user.findMany({
      where: {
        AND: [
          // Exclude current user from search results
          { id: { not: session.user.id } },
          {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { username: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true
      },
      take: 15,
      orderBy: { name: 'asc' }
    })

    // Return array directly for gifts page compatibility
    return NextResponse.json(users)
  } catch (error) {
    console.error('User search error:', error)
    return NextResponse.json([], { status: 500 })
  }
}
