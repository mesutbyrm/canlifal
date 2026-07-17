import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { getCached, redisCache, CACHE_TTL } from '@/lib/cache'

export const dynamic = 'force-dynamic'

/**
 * GET /api/live/online-users?roomId=xxx&roomType=stream|voice
 * Returns online/active users for a given room.
 *
 * For streams: returns active viewers from VideoStreamViewer
 * For voice rooms: returns active presences from ChatPresence
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

    const roomId = request.nextUrl.searchParams.get('roomId')
    const roomType = request.nextUrl.searchParams.get('roomType') || 'voice'
    const limitParam = parseInt(request.nextUrl.searchParams.get('limit') || '100') || 100
    const limit = Math.min(limitParam, 500)

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PARAMS', message: 'roomId gerekli' } },
        { status: 400 }
      )
    }

    let users: any[] = []
    let totalCount = 0

    if (roomType === 'stream') {
      // ── Stream viewers ──
      const [viewers, count] = await Promise.all([
        prisma.videoStreamViewer.findMany({
          where: { streamId: roomId, leftAt: null },
          take: limit,
          orderBy: { joinedAt: 'desc' },
          select: {
            viewerId: true,
            viewerName: true,
            joinedAt: true
          }
        }),
        prisma.videoStreamViewer.count({ where: { streamId: roomId, leftAt: null } })
      ])
      totalCount = count
      // Get user details for viewers
      const viewerIds = viewers.map((v: any) => v.viewerId)
      const viewerUsers = viewerIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: viewerIds } },
            select: { id: true, name: true, image: true }
          })
        : []
      const userMap = new Map(viewerUsers.map((u: any) => [u.id, u]))

      users = viewers.map((v: any) => {
        const u = userMap.get(v.viewerId)
        return {
          userId: v.viewerId || '',
          userName: v.viewerName || u?.name || 'Anonim',
          userImage: u?.image || '',
          joinedAt: v.joinedAt?.toISOString?.() || v.joinedAt || '',
          seatIndex: -1,
          isMicOn: false,
          nickname: '',
        }
      })
    } else {
      // ── Voice room presences ──
      const presenceTimeout = new Date(Date.now() - 300000)
      const [presences, count] = await Promise.all([
        prisma.chatPresence.findMany({
          where: { roomId, lastSeen: { gte: presenceTimeout } },
          take: limit,
          orderBy: { lastSeen: 'desc' },
          select: {
            userId: true,
            seatIndex: true,
            nickname: true,
            lastSeen: true,
            user: { select: { id: true, name: true, image: true } }
          }
        }),
        prisma.chatPresence.count({ where: { roomId, lastSeen: { gte: presenceTimeout } } })
      ])
      totalCount = count
      users = presences.map((p: any) => ({
        userId: p.userId || '',
        userName: p.nickname || p.user?.name || 'Anonim',
        userImage: p.user?.image || '',
        joinedAt: p.lastSeen?.toISOString?.() || p.lastSeen || '',
        seatIndex: typeof p.seatIndex === 'number' ? p.seatIndex : -1,
        isMicOn: false,
        nickname: p.nickname || '',
      }))
    }

    return NextResponse.json({
      success: true,
      data: {
        roomId,
        roomType,
        users,
        totalCount
      }
    })
  } catch (error) {
    console.error('Error in GET /api/live/online-users:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Çevrimiçi kullanıcılar alınamadı' } },
      { status: 500 }
    )
  }
}
