import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // all, fortunes, media
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const skip = (page - 1) * limit

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

    // Build where clause based on type filter
    const whereClause: any = {
      userId: user.id,
      isPublic: true
    }

    if (type === 'fortunes') {
      whereClause.fortuneId = { not: null }
    } else if (type === 'media') {
      whereClause.OR = [
        { imageUrl: { not: null } },
        { youtubeUrl: { not: null } }
      ]
    }

    const [posts, total] = await Promise.all([
      prisma.socialPost.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true
            }
          },
          fortune: {
            select: {
              id: true,
              fortuneType: true,
              aiResponse: true,
              viewCount: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.socialPost.count({ where: whereClause })
    ])

    return NextResponse.json({
      posts: posts.map((post: any) => ({
        ...post,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        viewCount: post.fortune?.viewCount || 0
      })),
      total,
      hasMore: skip + posts.length < total
    })
  } catch (error) {
    console.error('Error fetching user posts:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
