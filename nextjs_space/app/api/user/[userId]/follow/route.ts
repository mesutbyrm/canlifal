import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
export const dynamic = 'force-dynamic'

// POST - Follow a user
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const targetUserId = params.userId
    
    // Can't follow yourself
    if (auth.id === targetUserId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: auth.id,
          followingId: targetUserId
        }
      }
    })

    if (existingFollow) {
      return NextResponse.json({ error: 'Already following' }, { status: 400 })
    }

    // Create follow
    await prisma.follow.create({
      data: {
        followerId: auth.id,
        followingId: targetUserId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error following user:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE - Unfollow a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const targetUserId = params.userId

    await prisma.follow.deleteMany({
      where: {
        followerId: auth.id,
        followingId: targetUserId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unfollowing user:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
