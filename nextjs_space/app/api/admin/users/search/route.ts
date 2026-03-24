export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

// GET: Search users by name, username, or email for admin autocomplete
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20)

    if (q.length < 1) {
      return NextResponse.json({ users: [] })
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { username: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ]
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        role: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error('Admin user search error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
