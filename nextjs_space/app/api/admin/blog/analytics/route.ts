import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(await staffCan(((session.user as any).role || '').toLowerCase(), (session.user as any).id, 'content.announcement.manage', ['admin']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    // Aggregate stats
    const [totalPosts, publishedPosts, draftPosts, aiPosts, premiumPosts] = await Promise.all([
      prisma.blogPost.count(),
      prisma.blogPost.count({ where: { isPublished: true } }),
      prisma.blogPost.count({ where: { isPublished: false } }),
      prisma.blogPost.count({ where: { isAiGenerated: true } }),
      prisma.blogPost.count({ where: { isPremium: true } }),
    ])

    const [totalViews, totalLikes, totalComments, totalFavorites] = await Promise.all([
      prisma.blogPost.aggregate({ _sum: { views: true } }),
      prisma.blogPost.aggregate({ _sum: { likes: true } }),
      prisma.blogComment.count(),
      prisma.blogFavorite.count(),
    ])

    // Top posts by views
    const topByViews = await prisma.blogPost.findMany({
      orderBy: { views: 'desc' },
      take: 10,
      select: { id: true, slug: true, titleTr: true, views: true, likes: true, category: true, isPublished: true, createdAt: true },
    })

    // Top posts by likes
    const topByLikes = await prisma.blogPost.findMany({
      orderBy: { likes: 'desc' },
      take: 10,
      select: { id: true, slug: true, titleTr: true, views: true, likes: true, category: true, isPublished: true, createdAt: true },
    })

    // Category distribution
    const categories = await prisma.blogCategory.findMany({ orderBy: { sortOrder: 'asc' } })
    const categoryStats = await Promise.all(
      categories.map(async (cat: any) => {
        const count = await prisma.blogPost.count({ where: { category: cat.slug } })
        const viewsAgg = await prisma.blogPost.aggregate({ where: { category: cat.slug }, _sum: { views: true } })
        return { slug: cat.slug, nameTr: cat.nameTr, postCount: count, totalViews: viewsAgg._sum.views || 0 }
      })
    )

    // Recent comments
    const recentComments = await prisma.blogComment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, postId: true, userName: true, content: true, isApproved: true, createdAt: true },
    })

    // Scheduled posts
    const scheduledPosts = await prisma.blogPost.findMany({
      where: { isPublished: false, scheduledAt: { not: null } },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
      select: { id: true, slug: true, titleTr: true, scheduledAt: true, category: true },
    })

    return NextResponse.json({
      overview: {
        totalPosts, publishedPosts, draftPosts, aiPosts, premiumPosts,
        totalViews: totalViews._sum.views || 0,
        totalLikes: totalLikes._sum.likes || 0,
        totalComments, totalFavorites,
      },
      topByViews,
      topByLikes,
      categoryStats,
      recentComments,
      scheduledPosts,
    })
  } catch (error) {
    console.error('Blog analytics error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
