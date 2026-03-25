import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { createNotificationWithPush } from '@/lib/notify'
import { logActivity } from '@/lib/activity-logger'

// Follow or unfollow a user
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { userId } = params
    const currentUserId = session.user.id

    // Find target user by ID or username
    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { username: userId.toLowerCase() }
        ]
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    if (currentUserId === targetUser.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUser.id
        }
      }
    })

    if (existingFollow) {
      // Unfollow
      await prisma.follow.delete({
        where: { id: existingFollow.id }
      })

      // Notify the unfollowed user
      createNotificationWithPush({
        userId: targetUser.id,
        type: 'unfollow',
        message: 'seni takipten çıktı',
        fromUserId: currentUserId,
        fromUserName: session.user.name || 'Birisi',
        data: JSON.stringify({
          followerId: currentUserId,
          followerName: session.user.name,
          followerImage: session.user.image
        })
      }).catch((err: any) => console.error('Unfollow notification error:', err))

      return NextResponse.json({ 
        success: true, 
        action: 'unfollowed',
        isFollowing: false 
      })
    } else {
      // Follow
      await prisma.follow.create({
        data: {
          followerId: currentUserId,
          followingId: targetUser.id
        }
      })

      // Log follow activity
      logActivity({
        userId: currentUserId,
        userName: session.user.name || 'Kullanıcı',
        userAvatar: (session.user as any)?.image || null,
        activityType: 'follow',
        detail: `${targetUser.name || 'bir kullanıcıyı'} takip etti`,
        targetUrl: `/profil/${targetUser.username || targetUser.id}`,
      })

      // Create notification + push for the followed user
      createNotificationWithPush({
        userId: targetUser.id,
        type: 'follow',
        message: 'seni takip etmeye başladı',
        fromUserId: currentUserId,
        fromUserName: session.user.name || 'Birisi',
        data: JSON.stringify({
          followerId: currentUserId,
          followerName: session.user.name,
          followerImage: session.user.image
        })
      }).catch((err: any) => console.error('Follow notification error:', err))

      return NextResponse.json({ 
        success: true, 
        action: 'followed',
        isFollowing: true 
      })
    }
  } catch (error) {
    console.error('Error following/unfollowing user:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Get followers or following list
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'followers' // followers or following

    // Find user by ID or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { username: userId.toLowerCase() }
        ]
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    if (type === 'followers') {
      const followers = await prisma.follow.findMany({
        where: { followingId: user.id },
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

      return NextResponse.json(
        followers.map((f: { follower: { id: string; name: string; username: string | null; image: string | null } }) => f.follower)
      )
    } else {
      const following = await prisma.follow.findMany({
        where: { followerId: user.id },
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

      return NextResponse.json(
        following.map((f: { following: { id: string; name: string; username: string | null; image: string | null } }) => f.following)
      )
    }
  } catch (error) {
    console.error('Error fetching follow list:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
