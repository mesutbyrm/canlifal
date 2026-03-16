import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const targetUserId = params.userId

    // Get follower count
    const followersCount = await prisma.follow.count({
      where: { followingId: targetUserId }
    })

    // Check if current user is following
    let isFollowing = false
    if (session?.user?.id) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: targetUserId
          }
        }
      })
      isFollowing = !!follow
    }

    return NextResponse.json({
      followersCount,
      isFollowing
    })
  } catch (error) {
    console.error('Error fetching follow status:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
