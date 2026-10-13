import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { isCursorMode, parseCursorParams, fetchCursorPage } from '@/lib/pagination'
import { apiPaginated } from '@/lib/api-response'
import { withCachePolicy } from '@/lib/perf'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || auth.id

    const followingInclude = {
      following: {
        select: { id: true, name: true, username: true, image: true },
      },
    }

    // Opt-in imleç sayfalama (yalnızca ?cursor= / ?paginate=cursor ile)
    if (isCursorMode(req)) {
      const { cursor, limit } = parseCursorParams(req, 30, 100)
      const { items, meta } = await fetchCursorPage(
        (args) => prisma.follow.findMany(args),
        cursor,
        limit,
        { where: { followerId: userId }, include: followingInclude, orderBy: { createdAt: 'desc' } }
      )
      return apiPaginated(items.map((f: any) => f.following), meta)
    }

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return withCachePolicy(NextResponse.json({ 
      following: following.map((f: { following: { id: string; name: string; username: string | null; image: string | null } }) => f.following) 
    }), 'private-5m')
  } catch (error) {
    console.error('Following fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
