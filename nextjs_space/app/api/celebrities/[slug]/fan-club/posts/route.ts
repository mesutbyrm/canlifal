import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// Get posts for a fan club
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const celebrity = await prisma.celebrity.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    })
    if (!celebrity) {
      return NextResponse.json({ error: 'Ünlü bulunamadı' }, { status: 404 })
    }

    const fanClub = await prisma.fanClub.findUnique({
      where: { celebrityId: celebrity.id },
    })
    if (!fanClub) {
      return NextResponse.json({ posts: [], total: 0, page, totalPages: 0 })
    }

    const authUser = await authenticateRequest(req)

    const [posts, total] = await Promise.all([
      prisma.fanClubPost.findMany({
        where: { fanClubId: fanClub.id },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, image: true, username: true, membership: true } },
          _count: { select: { likes: true } },
        },
      }),
      prisma.fanClubPost.count({ where: { fanClubId: fanClub.id } }),
    ])

    // Check which posts current user liked
    let likedPostIds: string[] = []
    if (authUser?.id) {
      const likes = await prisma.fanClubPostLike.findMany({
        where: { userId: authUser.id, postId: { in: posts.map(p => p.id) } },
        select: { postId: true },
      })
      likedPostIds = likes.map(l => l.postId)
    }

    const enriched = posts.map(p => ({
      ...p,
      isLiked: likedPostIds.includes(p.id),
      likeCount: p._count.likes,
    }))

    return NextResponse.json({
      posts: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Fan club posts GET error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// Create a new post
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const celebrity = await prisma.celebrity.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    })
    if (!celebrity) {
      return NextResponse.json({ error: 'Ünlü bulunamadı' }, { status: 404 })
    }

    const fanClub = await prisma.fanClub.findUnique({
      where: { celebrityId: celebrity.id },
    })
    if (!fanClub) {
      return NextResponse.json({ error: 'Fan kulübü bulunamadı' }, { status: 404 })
    }

    // Check membership
    const membership = await prisma.fanClubMember.findUnique({
      where: { fanClubId_userId: { fanClubId: fanClub.id, userId: authUser.id } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Önce fan kulübüne katılmalısınız' }, { status: 403 })
    }

    const body = await req.json()
    const { content, image } = body
    if (!content?.trim()) {
      return NextResponse.json({ error: 'İçerik gerekli' }, { status: 400 })
    }

    const post = await prisma.fanClubPost.create({
      data: {
        fanClubId: fanClub.id,
        userId: authUser.id,
        content: content.trim(),
        image: image || null,
      },
      include: {
        user: { select: { id: true, name: true, image: true, username: true, membership: true } },
        _count: { select: { likes: true } },
      },
    })

    // Award XP for posting
    await prisma.fanClubMember.updateMany({
      where: { fanClubId: fanClub.id, userId: authUser.id },
      data: { xp: { increment: 10 } },
    })

    return NextResponse.json({ post: { ...post, isLiked: false, likeCount: 0 } }, { status: 201 })
  } catch (error) {
    console.error('Fan club post CREATE error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// Delete a post
export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const postId = searchParams.get('postId')
    if (!postId) {
      return NextResponse.json({ error: 'Post ID gerekli' }, { status: 400 })
    }

    const post = await prisma.fanClubPost.findUnique({ where: { id: postId } })
    if (!post) {
      return NextResponse.json({ error: 'Post bulunamadı' }, { status: 404 })
    }

    const isAdmin = ['admin', 'yonetici', 'moderator'].includes(authUser.role)
    if (post.userId !== authUser.id && !isAdmin) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    await prisma.fanClubPost.delete({ where: { id: postId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fan club post DELETE error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
