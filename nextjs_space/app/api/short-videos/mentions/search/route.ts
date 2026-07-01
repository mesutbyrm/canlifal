export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { mapAuthor } from '@/lib/short-videos'

/**
 * GET /api/short-videos/mentions/search?q=
 * @mention için gerçek kullanıcı araması (username / name).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim().replace(/^@/, '')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10') || 10, 20)

    if (q.length < 1) {
      return NextResponse.json({ success: true, data: { users: [] } })
    }

    const users = await prisma.user.findMany({
      where: {
        isBot: false,
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, username: true, name: true, image: true },
      take: limit,
      orderBy: { username: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: { users: users.map((u) => mapAuthor(u)) },
    })
  } catch (error: any) {
    console.error('[short-videos] mention search error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Kullanıcı araması başarısız' } },
      { status: 500 }
    )
  }
}
