import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || session.user.id

    // Get all posts by this user
    const userPosts = await prisma.socialPost.findMany({
      where: { userId },
      select: { id: true }
    })

    const postIds = userPosts.map((p: { id: string }) => p.id)

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
