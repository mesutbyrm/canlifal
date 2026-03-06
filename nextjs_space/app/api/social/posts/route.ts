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
            select: { id: true, name: true, image: true }
          },
          _count: {
            select: { comments: true, likes: true }
          },
          likes: {
            select: { userId: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.socialPost.count({ where })
    ])

    return NextResponse.json({
      posts,
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

    const { content, postType, fortuneType, fortuneId, imageUrl, isPublic = true } = await request.json()

    if (!content || !postType) {
      return NextResponse.json({ error: 'Content and postType are required' }, { status: 400 })
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
        content,
        postType,
        fortuneType: fortuneType || null,
        fortuneId: fortuneId || null,
        imageUrl: imageUrl || null,
        isPublic
      },
      include: {
        user: {
          select: { id: true, name: true, image: true }
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
