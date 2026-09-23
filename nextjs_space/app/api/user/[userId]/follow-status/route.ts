import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const auth = await authenticateRequest(request)
    const targetUserId = params.userId

    // Get follower count
    const followersCount = await prisma.follow.count({
      where: { followingId: targetUserId }
    })

    // Check if current user is following
    let isFollowing = false
    if (auth?.id) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: auth.id,
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
