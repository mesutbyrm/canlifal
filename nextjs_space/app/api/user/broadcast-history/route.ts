import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { isCursorMode, parseCursorParams, fetchCursorPage } from '@/lib/pagination'
import { apiPaginated } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET /api/user/broadcast-history - Get authenticated user's broadcast history
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const status = searchParams.get('status') // 'live', 'ended', or null for all

    const where: any = { userId: auth.id }
    if (status) {
      where.status = status
    }

    const broadcastSelect = {
      id: true,
      title: true,
      description: true,
      status: true,
      viewerCount: true,
      likeCount: true,
      roomId: true,
      category: true,
      thumbnailUrl: true,
      broadcastImage: true,
      isImageMode: true,
      startedAt: true,
      endedAt: true,
      createdAt: true,
      _count: { select: { comments: true, gifts: true } },
    }

    const mapBroadcast = (b: any) => ({
      ...b,
      commentCount: b._count.comments,
      giftCount: b._count.gifts,
      _count: undefined,
    })

    // Opt-in imleç sayfalama (yalnızca ?cursor= / ?paginate=cursor ile)
    if (isCursorMode(request)) {
      const { cursor, limit: cLimit } = parseCursorParams(request, 20, 50)
      const { items, meta } = await fetchCursorPage(
        (args) => prisma.videoStream.findMany(args),
        cursor,
        cLimit,
        { where, orderBy: { createdAt: 'desc' }, select: broadcastSelect }
      )
      return apiPaginated(items.map(mapBroadcast), meta)
    }

    const [broadcasts, total] = await Promise.all([
      prisma.videoStream.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          viewerCount: true,
          likeCount: true,
          roomId: true,
          category: true,
          thumbnailUrl: true,
          broadcastImage: true,
          isImageMode: true,
          startedAt: true,
          endedAt: true,
          createdAt: true,
          _count: {
            select: {
              comments: true,
              gifts: true
            }
          }
        }
      }),
      prisma.videoStream.count({ where })
    ])

    return NextResponse.json({
      broadcasts: broadcasts.map(b => ({
        ...b,
        commentCount: b._count.comments,
        giftCount: b._count.gifts,
        _count: undefined
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('Broadcast history error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
