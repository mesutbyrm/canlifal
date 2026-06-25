import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const celebrity = await prisma.celebrity.findUnique({
      where: { slug: params.slug },
      select: { id: true }
    })
    if (!celebrity) {
      return NextResponse.json({ error: 'Ünlü bulunamadı' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const platform = searchParams.get('platform')
    const postType = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {
      celebrityId: celebrity.id,
      isActive: true,
    }
    if (platform) where.platform = platform
    if (postType) where.postType = postType

    const [posts, total] = await Promise.all([
      prisma.celebrityPost.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          celebrity: { select: { name: true, slug: true, profileImage: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.celebrityPost.count({ where }),
    ])

    // Check user likes
    const authUser = await authenticateRequest(req)
    let likedPostIds: string[] = []
    if (authUser?.id && posts.length > 0) {
      const likes = await prisma.celebrityPostLike.findMany({
        where: {
          userId: authUser.id,
          postId: { in: posts.map(p => p.id) },
        },
        select: { postId: true },
      })
      likedPostIds = likes.map(l => l.postId)
    }

    return NextResponse.json({
      posts: posts.map(p => ({
        ...p,
        likeCount: p._count.likes,
        commentCount: p._count.comments,
        isLiked: likedPostIds.includes(p.id),
        _count: undefined,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    console.error('Celebrity posts GET error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
