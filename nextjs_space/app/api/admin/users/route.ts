import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// GET - List all users with pagination and filtering
export async function GET(request: NextRequest) {
  // Dual auth: session cookie or Bearer token
  let userRole: string | undefined
  const session = await getServerSession(authOptions)
  if (session?.user) {
    userRole = (session.user as any).role
  } else {
    const auth = await authenticateRequest(request)
    if (!auth) return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 })
    userRole = auth.role
  }
  if (!userRole || !(await staffCan(userRole, (session?.user as any)?.id, 'moderation.user.view', ['admin','yonetici','moderator','finans']))) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role')
    const membership = searchParams.get('membership')
    const segment = searchParams.get('segment') || 'all'
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortDir = searchParams.get('sortDir') || 'desc'

    // §53 Gelişmiş filtreler
    const advFilter = searchParams.get('adv') || '' // online,offline,broadcasting,inRoom,fortuneTeller,hasAgency,noAgency
    const advFilters = advFilter ? advFilter.split(',').filter(Boolean) : []

    const now = new Date()
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Build AND conditions array for composable filters
    const andConditions: any[] = []

    // Text search
    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ]
      })
    }

    // Role filter
    if (role && role !== 'all') {
      andConditions.push({ role })
    }

    // Membership filter
    if (membership && membership !== 'all') {
      andConditions.push({ membership })
    }

    // Segment filters
    if (segment === 'active') {
      andConditions.push({ lastActiveAt: { gte: weekAgo } })
    } else if (segment === 'passive') {
      andConditions.push({ OR: [{ lastActiveAt: { lt: monthAgo } }, { lastActiveAt: null }] })
    } else if (segment === 'vip') {
      andConditions.push({ membership: { in: ['gold', 'premium', 'diamond', 'svip'] } })
    } else if (segment === 'new') {
      andConditions.push({ createdAt: { gte: weekAgo } })
    } else if (segment === 'spender') {
      andConditions.push({ jetonBalance: { gte: 1000 } })
    }

    // §53 Advanced filters — resolve user IDs for relational filters
    if (advFilters.includes('online')) {
      andConditions.push({ lastActiveAt: { gte: fiveMinAgo } })
    }
    if (advFilters.includes('offline')) {
      andConditions.push({ OR: [{ lastActiveAt: { lt: fiveMinAgo } }, { lastActiveAt: null }] })
    }
    if (advFilters.includes('broadcasting')) {
      const liveStreamers = await prisma.videoStream.findMany({
        where: { status: 'live', endedAt: null },
        select: { userId: true },
        distinct: ['userId'],
      })
      const ids = liveStreamers.map(s => s.userId)
      andConditions.push({ id: { in: ids.length > 0 ? ids : ['__none__'] } })
    }
    if (advFilters.includes('inRoom')) {
      const inRoom = await prisma.chatPresence.findMany({
        where: { lastSeen: { gte: fiveMinAgo } },
        select: { userId: true },
        distinct: ['userId'],
      })
      const ids = inRoom.map(p => p.userId)
      andConditions.push({ id: { in: ids.length > 0 ? ids : ['__none__'] } })
    }
    if (advFilters.includes('fortuneTeller')) {
      andConditions.push({ fortuneTellerProfile: { isNot: null } })
    }
    if (advFilters.includes('hasAgency')) {
      andConditions.push({ agencyMembership: { isNot: null } })
    }
    if (advFilters.includes('noAgency')) {
      andConditions.push({ agencyMembership: null })
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          image: true,
          credits: true,
          jetonBalance: true,
          role: true,
          membership: true,
          level: true,
          lastActiveAt: true,
          createdAt: true,
          isFrozen: true,
          _count: {
            select: {
              fortunes: true,
            }
          }
        },
        orderBy: { [sortBy]: sortDir === 'asc' ? 'asc' : 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where })
    ])

    // Segment + advanced filter counts (cached per request)
    const [totalAll, activeCount, newCount, vipCount, broadcastingCount, inRoomCount, fortuneTellerCount, hasAgencyCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastActiveAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { membership: { in: ['gold', 'premium', 'diamond', 'svip'] } } }),
      prisma.videoStream.count({ where: { status: 'live', endedAt: null } }),
      prisma.chatPresence.count({ where: { lastSeen: { gte: fiveMinAgo } } }),
      prisma.liveFortuneTeller.count(),
      prisma.agencyUser.count({ where: { isActive: true } }),
    ])

    return NextResponse.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      segmentCounts: {
        all: totalAll,
        active: activeCount,
        new: newCount,
        vip: vipCount,
        passive: totalAll - activeCount,
      },
      advancedCounts: {
        online: activeCount, // approximation via lastActiveAt
        broadcasting: broadcastingCount,
        inRoom: inRoomCount,
        fortuneTeller: fortuneTellerCount,
        hasAgency: hasAgencyCount,
        noAgency: totalAll - hasAgencyCount,
      },
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
