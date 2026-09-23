import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { isCursorMode, parseCursorParams, fetchCursorPage } from '@/lib/pagination'
import { apiPaginated } from '@/lib/api-response'
export const dynamic = 'force-dynamic'

interface LikeUser {
  id: string
  name: string
  username: string | null
  image: string | null
}

interface LikeWithUser {
  user: LikeUser
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || auth.id

    // Get all posts by this user
    const userPosts = await prisma.socialPost.findMany({
      where: { userId },
      select: { id: true }
    })

    const postIds = userPosts.map((p: { id: string }) => p.id)

    const likerInclude = {
      user: { select: { id: true, name: true, username: true, image: true } },
    }

    // Opt-in imleç sayfalama (yalnızca ?cursor= / ?paginate=cursor ile)
    if (isCursorMode(req)) {
      const { cursor, limit } = parseCursorParams(req, 30, 100)
      const { items, meta } = await fetchCursorPage(
        (args) => prisma.socialLike.findMany(args),
        cursor,
        limit,
        { where: { postId: { in: postIds } }, include: likerInclude, orderBy: { createdAt: 'desc' } }
      )
      // Sayfa içinde yinelenen kullanıcıları ayıkla (sayfa sınırı korunur)
      const seen = new Set<string>()
      const page: LikeUser[] = []
      for (const l of items as unknown as LikeWithUser[]) {
        if (!seen.has(l.user.id)) {
          seen.add(l.user.id)
          page.push(l.user)
        }
      }
      return apiPaginated(page, meta)
    }

    // Get unique users who liked these posts
    const likes = await prisma.socialLike.findMany({
      where: { postId: { in: postIds } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }) as LikeWithUser[]

    // Remove duplicates - keep only unique users
    const uniqueUsers = new Map<string, LikeUser>()
    likes.forEach((like: LikeWithUser) => {
      if (!uniqueUsers.has(like.user.id)) {
        uniqueUsers.set(like.user.id, like.user)
      }
    })

    return NextResponse.json({ 
      likers: Array.from(uniqueUsers.values()) 
    })
  } catch (error) {
    console.error('Likers fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
