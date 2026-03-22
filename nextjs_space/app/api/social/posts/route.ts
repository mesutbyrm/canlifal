import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - List all public posts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const postType = searchParams.get('type') // fortune, text, horoscope
    const skip = (page - 1) * limit

    const where: any = { isPublic: true }
    if (postType) {
      where.postType = postType
    }

    const [posts, total] = await Promise.all([
      prisma.socialPost.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, image: true, role: true, membership: true, profileFrame: { select: { imageUrl: true } }, adminAssignedFrame: { select: { imageUrl: true } } }
          },
          fortune: {
            select: { viewCount: true }
          },
          _count: {
            select: { comments: true, likes: true }
          },
          likes: {
            select: { userId: true }
          },
          comments: {
            include: {
              user: {
                select: { id: true, name: true, image: true, role: true, membership: true, profileFrame: { select: { imageUrl: true } }, adminAssignedFrame: { select: { imageUrl: true } } }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.socialPost.count({ where })
    ])

    // Add fortune count for auto-shared posts and flatten viewCount
    const postsWithStats = await Promise.all(posts.map(async (post: any) => {
      const viewCount = post.fortune?.viewCount || 0
      if (post.isAuto && post.fortuneType) {
        const fortuneCount = await prisma.fortune.count({
          where: { fortuneType: post.fortuneType }
        })
        return { ...post, fortuneCount, viewCount }
      }
      return { ...post, viewCount }
    }))

    return NextResponse.json({
      posts: postsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Social posts fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

// POST - Create new post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, postType, fortuneType, fortuneId, imageUrl, youtubeUrl, isPublic = true } = await request.json()

    // Allow posting if there's content, YouTube video, or image
    if (!content && !youtubeUrl && !imageUrl) {
      return NextResponse.json({ error: 'Content, image, or video is required' }, { status: 400 })
    }
    
    if (!postType) {
      return NextResponse.json({ error: 'postType is required' }, { status: 400 })
    }

    // Validate postType
    if (!['fortune', 'text', 'horoscope'].includes(postType)) {
      return NextResponse.json({ error: 'Invalid postType' }, { status: 400 })
    }

    // If fortune post, verify the fortune belongs to the user
    if (fortuneId) {
      const fortune = await prisma.fortune.findFirst({
        where: { id: fortuneId, userId: session.user.id }
      })
      if (!fortune) {
        return NextResponse.json({ error: 'Fortune not found' }, { status: 404 })
      }
    }

    const post = await prisma.socialPost.create({
      data: {
        userId: session.user.id,
        content: content || '',
        postType,
        fortuneType: fortuneType || null,
        fortuneId: fortuneId || null,
        imageUrl: imageUrl || null,
        youtubeUrl: youtubeUrl || null,
        isPublic
      },
      include: {
        user: {
          select: { id: true, name: true, image: true, role: true, membership: true, profileFrame: { select: { imageUrl: true } }, adminAssignedFrame: { select: { imageUrl: true } } }
        },
        _count: {
          select: { comments: true, likes: true }
        }
      }
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('Social post create error:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
