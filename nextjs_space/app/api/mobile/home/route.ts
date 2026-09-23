import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { getCached, getCachedPlatformSetting } from '@/lib/cache'

export const dynamic = 'force-dynamic'

/**
 * GET /api/mobile/home
 * Compound endpoint — Flutter ana sayfası için tek istekte tüm veriyi döner.
 *
 * Returns:
 *  - liveStreams: Aktif canlı yayınlar (max 10)
 *  - voiceRooms: Aktif sesli odalar (max 10)
 *  - fortuneCards: Ana sayfa fal kartları
 *  - homepageButtons: Navigasyon butonları
 *  - announcements: Aktif duyurular
 *  - liveTellers: Çevrimiçi falcılar (max 10)
 *  - user: Oturum açmışsa kullanıcı özet bilgileri
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const now = new Date()
    const presenceTimeout = new Date(Date.now() - 300000)

    // Run all queries in parallel for speed
    const [
      liveStreamsRaw,
      voiceRooms,
      fortuneCards,
      homepageButtons,
      announcements,
      liveTellers,
      userData,
      unreadNotifCount,
    ] = await Promise.all([
      // 1. Live streams (cached 10s)
      getCached('mobile:home:streams', 10, async () => {
        const streams = await prisma.videoStream.findMany({
          where: { status: 'live' },
          orderBy: { startedAt: 'desc' },
          take: 10,
          include: {
            user: { select: { id: true, name: true, image: true } },
            _count: { select: { comments: true, likes: true } }
          }
        })
        const streamIds = streams.map((s: any) => s.id)
        const viewerCounts = streamIds.length > 0
          ? await prisma.videoStreamViewer.groupBy({
              by: ['streamId'],
              where: { streamId: { in: streamIds }, leftAt: null },
              _count: { id: true }
            })
          : []
        const vcMap = new Map(viewerCounts.map((v: any) => [v.streamId, v._count.id]))
        return streams.map((s: any) => ({
          id: s.id,
          title: s.title || 'Canlı Yayın',
          hostId: s.userId,
          hostName: s.user?.name || 'Anonim',
          hostImage: s.user?.image || null,
          thumbnailUrl: s.thumbnailUrl || s.broadcastImage || null,
          viewerCount: vcMap.get(s.id) || 0,
          likeCount: s._count?.likes || 0,
          startedAt: s.startedAt,
        }))
      }),

      // 2. Voice rooms (cached 15s)
      getCached('mobile:home:voicerooms', 15, async () => {
        const rooms = await prisma.chatRoom.findMany({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true, slug: true, nameTr: true, nameEn: true, icon: true,
            backgroundImage: true, bannerImage: true, ownerId: true, roomType: true,
            owner: { select: { id: true, name: true, image: true } }
          }
        })
        const roomIds = rooms.map((r: any) => r.id)
        const onlineCounts = roomIds.length > 0
          ? await prisma.chatPresence.groupBy({
              by: ['roomId'],
              where: { roomId: { in: roomIds }, lastSeen: { gte: presenceTimeout } },
              _count: { id: true }
            })
          : []
        const ocMap = new Map(onlineCounts.map((o: any) => [o.roomId, o._count.id]))
        return rooms.map((r: any) => ({
          id: r.id,
          slug: r.slug,
          title: r.nameTr || r.nameEn,
          icon: r.icon,
          hostName: r.owner?.name || null,
          hostImage: r.owner?.image || null,
          backgroundImage: r.backgroundImage || null,
          roomAccessType: r.roomType,
          onlineCount: ocMap.get(r.id) || 0,
        }))
      }),

      // 3. Fortune cards (cached 30s)
      getCached('mobile:home:fortunecards', 30, () =>
        prisma.homepageFortuneCard.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true, icon: true, image: true, href: true, sortOrder: true },
        })
      ),

      // 4. Homepage buttons (cached 60s)
      getCached('mobile:home:buttons', 60, () =>
        prisma.homepageButton.findMany({
          where: { isVisible: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, key: true, label: true, icon: true, href: true, sortOrder: true, specialBehavior: true },
        })
      ),

      // 5. Announcements (cached 30s)
      getCached('mobile:home:announcements', 30, () =>
        prisma.siteAnnouncement.findMany({
          where: { expiresAt: { gt: now } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, message: true, type: true, color: true, userName: true, expiresAt: true, maxPasses: true },
        })
      ),

      // 6. Live fortune tellers (cached 10s)
      getCached('mobile:home:tellers', 10, async () => {
        const tellers = await prisma.liveFortuneTeller.findMany({
          where: { applicationStatus: 'approved', isOnline: true, isActive: true },
          take: 10,
          orderBy: { rating: 'desc' },
          select: {
            id: true, displayName: true, avatar: true, specialties: true,
            rating: true, totalSessions: true, pricePerSession: true, isOnline: true,
            userId: true,
          }
        })
        return tellers.map((t: any) => ({
          id: t.id,
          userId: t.userId,
          displayName: t.displayName,
          avatar: t.avatar,
          specialties: t.specialties,
          rating: t.rating,
          totalSessions: t.totalSessions,
          pricePerSession: t.pricePerSession,
          isOnline: t.isOnline,
        }))
      }),

      // 7. User summary (always fresh)
      prisma.user.findUnique({
        where: { id: authUser.id },
        select: {
          id: true, name: true, image: true, username: true,
          jetonBalance: true, cfcBalance: true, credits: true,
          membership: true, membershipExpiresAt: true,
          level: true, xp: true, loginStreak: true,
          zodiacSign: true,
        },
      }),

      // 8. Unread notification count
      prisma.notification.count({
        where: { userId: authUser.id, isRead: false }
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        liveStreams: liveStreamsRaw || [],
        voiceRooms: voiceRooms || [],
        fortuneCards: fortuneCards || [],
        homepageButtons: homepageButtons || [],
        announcements: announcements || [],
        liveTellers: liveTellers || [],
        user: userData ? {
          ...userData,
          unreadNotifications: unreadNotifCount || 0,
        } : null,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/mobile/home:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Ana sayfa verisi yüklenemedi' } },
      { status: 500 }
    )
  }
}
