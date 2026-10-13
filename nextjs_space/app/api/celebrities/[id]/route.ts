export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

/**
 * GET /api/celebrities/:id
 * Auth: opsiyonel
 * Tek ünlü detayı (profil, takipçi sayısı, fan kulübü, son gönderiler).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await authenticateRequest(req).catch(() => null)
    const { id } = await params

    const celeb = await prisma.celebrity.findFirst({
      where: { OR: [{ id }, { slug: id }], isActive: true },
      include: {
        fanClub: { select: { id: true, memberCount: true, description: true, rules: true, coverImage: true } },
        posts: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { likes: true, comments: true } },
          },
        },
        ...(authUser
          ? { followers: { where: { userId: authUser.id }, select: { id: true }, take: 1 } }
          : {}),
      },
    })

    if (!celeb) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Ünlü bulunamadı' } },
        { status: 404 }
      )
    }

    let socialLinks: any = null
    try { socialLinks = celeb.socialLinks ? JSON.parse(celeb.socialLinks) : null } catch {}
    let achievements: any = null
    try { achievements = celeb.achievements ? JSON.parse(celeb.achievements) : null } catch {}

    return NextResponse.json({
      success: true,
      data: {
        id: celeb.id,
        name: celeb.name,
        slug: celeb.slug,
        category: celeb.category,
        bio: celeb.bio,
        profileImage: celeb.profileImage,
        coverImage: celeb.coverImage,
        isVerified: celeb.isVerified,
        followerCount: celeb.followerCount,
        birthDate: celeb.birthDate,
        birthPlace: celeb.birthPlace,
        zodiacSign: celeb.zodiacSign,
        socialLinks,
        achievements,
        isFollowing: authUser ? ((celeb as any).followers?.length ?? 0) > 0 : false,
        fanClub: celeb.fanClub,
        recentPosts: (celeb.posts || []).map((p: any) => ({
          id: p.id,
          content: p.content,
          image: p.image,
          likeCount: p._count?.likes ?? 0,
          commentCount: p._count?.comments ?? 0,
          createdAt: p.createdAt,
        })),
      },
    })
  } catch (error: any) {
    console.error('[celebrities] detail error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Ünlü bilgisi alınamadı' } },
      { status: 500 }
    )
  }
}
