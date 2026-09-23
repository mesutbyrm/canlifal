import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
export const dynamic = 'force-dynamic'

interface FortuneGroup {
  fortuneType: string
  _count: number
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        zodiacSign: true,
        risingSign: true,
        totalTimeSpentMinutes: true,
        lastActiveAt: true,
        credits: true,
        membership: true,
        _count: {
          select: {
            fortunes: true,
            socialPosts: true,
            followers: true,
            following: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Get fortune breakdown by type
    const fortunesByType = await prisma.fortune.groupBy({
      by: ['fortuneType'],
      where: { userId: auth.id },
      _count: true
    }) as unknown as FortuneGroup[]

    // Get total likes received
    const likesReceived = await prisma.socialLike.count({
      where: {
        post: { userId: auth.id }
      }
    })

    // Get total views
    const totalViews = await prisma.fortune.aggregate({
      where: { userId: auth.id },
      _sum: { viewCount: true }
    })

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        joinedAt: user.createdAt,
        zodiacSign: user.zodiacSign,
        risingSign: user.risingSign,
        totalTimeSpentMinutes: user.totalTimeSpentMinutes,
        lastActiveAt: user.lastActiveAt,
        credits: user.credits,
        membership: user.membership
      },
      stats: {
        totalFortunes: user._count.fortunes,
        totalPosts: user._count.socialPosts,
        followersCount: user._count.followers,
        followingCount: user._count.following,
        likesReceived,
        totalViews: totalViews._sum.viewCount || 0,
        fortunesByType: fortunesByType.map((f: FortuneGroup) => ({
          type: f.fortuneType,
          count: f._count
        }))
      }
    })
  } catch (error) {
    console.error('Stats fetch error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Update time spent
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const { minutesToAdd } = body

    if (typeof minutesToAdd !== 'number' || minutesToAdd < 0) {
      return NextResponse.json({ error: 'Invalid minutes' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: auth.id },
      data: {
        totalTimeSpentMinutes: { increment: minutesToAdd },
        lastActiveAt: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Time update error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
