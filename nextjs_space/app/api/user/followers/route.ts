import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { isCursorMode, parseCursorParams, fetchCursorPage } from '@/lib/pagination'
import { apiPaginated } from '@/lib/api-response'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || auth.id

    const followerInclude = {
      follower: {
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
        { where: { followingId: userId }, include: followerInclude, orderBy: { createdAt: 'desc' } }
      )
      return apiPaginated(items.map((f: any) => f.follower), meta)
    }

    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
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

    return NextResponse.json({ 
      followers: followers.map((f: { follower: { id: string; name: string; username: string | null; image: string | null } }) => f.follower) 
    })
  } catch (error) {
    console.error('Followers fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
