import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { presenceCutoff } from '@/lib/presence'

export const dynamic = 'force-dynamic'

/**
 * GET /api/live/rooms
 * Unified room discovery for Flutter — returns both live streams and voice rooms
 * in a single paginated response.
 *
 * Query params:
 *  - type: 'all' | 'stream' | 'voice' (default: 'all')
 *  - page: number (default: 1)
 *  - limit: number (default: 30, max: 100)
 *  - search: string (optional, search by name/title)
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

    const { searchParams } = request.nextUrl
    const type = searchParams.get('type') || 'all'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30') || 30))
    const search = searchParams.get('search')?.trim() || null
    const skip = (page - 1) * limit

    const rooms: any[] = []
    let totalStreams = 0
    let totalVoice = 0

    // ── Live Streams ──
    if (type === 'all' || type === 'stream') {
      const streamWhere: any = { status: 'live' }
      if (search) {
        streamWhere.title = { contains: search, mode: 'insensitive' }
      }

      const [streams, streamCount] = await Promise.all([
        prisma.videoStream.findMany({
          where: streamWhere,
          orderBy: { startedAt: 'desc' },
          skip: type === 'stream' ? skip : 0,
          take: type === 'stream' ? limit : Math.ceil(limit / 2),
          include: {
            user: { select: { id: true, name: true, image: true } },
            _count: { select: { comments: true, likes: true } }
          }
        }),
        prisma.videoStream.count({ where: streamWhere })
      ])
      totalStreams = streamCount

      // Get viewer counts
      const streamIds = streams.map((s: any) => s.id)
      const viewerCounts = streamIds.length > 0
        ? await prisma.videoStreamViewer.groupBy({
            by: ['streamId'],
            where: { streamId: { in: streamIds }, leftAt: null },
            _count: { id: true }
          })
        : []
      const vcMap = new Map(viewerCounts.map((v: any) => [v.streamId, v._count.id]))

      for (const s of streams) {
        const vc = vcMap.get(s.id) || 0
        rooms.push({
          id: s.id || '',
          roomType: 'stream',
          slug: '',
          title: s.title || 'Canlı Yayın',
          titleEn: '',
          description: '',
          descriptionEn: '',
          icon: '',
          hostId: s.userId || '',
          hostName: s.user?.name || 'Anonim',
          hostImage: s.user?.image || '',
          thumbnailUrl: s.thumbnailUrl || (s as any).broadcastImage || '',
          backgroundImage: '',
          bannerImage: '',
          roomAccessType: '',
          tags: [] as string[],
          viewerCount: vc,
          likeCount: (s as any)._count?.likes || 0,
          commentCount: (s as any)._count?.comments || 0,
          isLive: true,
          startedAt: s.startedAt?.toISOString?.() || s.startedAt || '',
          createdAt: s.createdAt?.toISOString?.() || s.createdAt || '',
        })
      }
    }

    // ── Voice Rooms ──
    if (type === 'all' || type === 'voice') {
      const voiceWhere: any = { isActive: true }
      if (search) {
        voiceWhere.OR = [
          { nameTr: { contains: search, mode: 'insensitive' } },
          { nameEn: { contains: search, mode: 'insensitive' } }
        ]
      }

      const [chatRooms, voiceCount] = await Promise.all([
        prisma.chatRoom.findMany({
          where: voiceWhere,
          orderBy: { createdAt: 'desc' },
          skip: type === 'voice' ? skip : 0,
          take: type === 'voice' ? limit : Math.ceil(limit / 2),
          select: {
            id: true,
            slug: true,
            nameTr: true,
            nameEn: true,
            descTr: true,
            descEn: true,
            icon: true,
            backgroundImage: true,
            bannerImage: true,
            ownerId: true,
            roomType: true,
            tags: true,
            owner: { select: { id: true, name: true, image: true } }
          }
        }),
        prisma.chatRoom.count({ where: voiceWhere })
      ])
      totalVoice = voiceCount

      // Get online counts for voice rooms
      const presenceTimeout = presenceCutoff()
      const voiceRoomIds = chatRooms.map((r: any) => r.id)
      const onlineCounts = voiceRoomIds.length > 0
        ? await prisma.chatPresence.groupBy({
            by: ['roomId'],
            where: { roomId: { in: voiceRoomIds }, lastSeen: { gte: presenceTimeout } },
            _count: { id: true }
          })
        : []
      const ocMap = new Map(onlineCounts.map((o: any) => [o.roomId, o._count.id]))

      for (const r of chatRooms) {
        rooms.push({
          id: r.id || '',
          roomType: 'voice',
          slug: r.slug || '',
          title: r.nameTr || r.nameEn || '',
          titleEn: r.nameEn || '',
          description: r.descTr || r.descEn || '',
          descriptionEn: r.descEn || '',
          icon: r.icon || '',
          hostId: r.ownerId || '',
          hostName: r.owner?.name || '',
          hostImage: r.owner?.image || '',
          thumbnailUrl: r.backgroundImage || '',
          backgroundImage: r.backgroundImage || '',
          bannerImage: r.bannerImage || '',
          roomAccessType: r.roomType || 'FREE',
          tags: r.tags ? r.tags.split(',').map((t: string) => t.trim()) : [],
          viewerCount: ocMap.get(r.id) || 0,
          likeCount: 0,
          commentCount: 0,
          isLive: (ocMap.get(r.id) || 0) > 0,
          startedAt: '',
          createdAt: '',
        })
      }
    }

    // Sort: rooms with more viewers first
    rooms.sort((a, b) => (b.viewerCount || 0) - (a.viewerCount || 0))

    return NextResponse.json({
      success: true,
      data: {
        rooms,
        pagination: {
          page,
          limit,
          totalStreams,
          totalVoice,
          total: totalStreams + totalVoice
        }
      }
    })
  } catch (error) {
    console.error('Error in GET /api/live/rooms:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Oda listesi alınamadı' } },
      { status: 500 }
    )
  }
}
