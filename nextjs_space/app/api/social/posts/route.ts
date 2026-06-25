import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { triggerEventAnnouncement } from '@/lib/event-announcement'

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
    return NextResponse.json({ error: 'Gönderiler alınamadı' }, { status: 500 })
  }
}

// POST - Create new post
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const userId = authUser.id

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
      return NextResponse.json({ error: 'Geçersiz gönderi türü' }, { status: 400 })
    }

    // If fortune post, verify the fortune belongs to the user
    if (fortuneId) {
      const fortune = await prisma.fortune.findFirst({
        where: { id: fortuneId, userId: userId }
      })
      if (!fortune) {
        return NextResponse.json({ error: 'Fortune not found' }, { status: 404 })
      }
    }

    const post = await prisma.socialPost.create({
      data: {
        userId: userId,
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

    // Trigger social post event announcement
    const posterName = post.user?.name || authUser.name || 'Bir kullanıcı'
    triggerEventAnnouncement('social_post', { user: posterName }, userId, posterName, post.user?.role || 'free').catch(() => {})

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('Social post create error:', error)
    return NextResponse.json({ error: 'Gönderi oluşturulamadı' }, { status: 500 })
  }
}
