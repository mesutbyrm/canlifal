import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

// GET - List all users with pagination and filtering
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
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

    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    if (role && role !== 'all') {
      where.role = role
    }
    
    if (membership && membership !== 'all') {
      where.membership = membership
    }

    // Segment filtreleri
    const now = new Date()
    if (segment === 'active') {
      // Son 7 günde aktif
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      where.lastActiveAt = { gte: weekAgo }
    } else if (segment === 'passive') {
      // 30 günden fazla aktif olmayan veya hiç aktif olmamış
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      where.OR = [
        ...(where.OR || []),
        { lastActiveAt: { lt: monthAgo } },
        { lastActiveAt: null },
      ]
      if (!search) delete where.OR // merge issue fix
      if (segment === 'passive') {
        where.AND = [
          ...(where.AND || []),
          { OR: [{ lastActiveAt: { lt: monthAgo } }, { lastActiveAt: null }] },
        ]
        if (search) {
          where.AND.push({ OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
          ]})
          delete where.OR
        }
      }
    } else if (segment === 'vip') {
      // VIP veya premium üyelik
      where.membership = { in: ['vip', 'premium', 'elite'] }
    } else if (segment === 'new') {
      // Son 7 günde kayıt
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      where.createdAt = { gte: weekAgo }
    } else if (segment === 'spender') {
      // Yüksek harcama yapanlar (10000+ jeton toplam harcama)
      where.jetonBalance = { gte: 1000 }
    }

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

    // Segment counts
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const [totalAll, activeCount, newCount, vipCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastActiveAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { membership: { in: ['vip', 'premium', 'elite'] } } }),
    ])

    return NextResponse.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      segmentCounts: { all: totalAll, active: activeCount, new: newCount, vip: vipCount, passive: totalAll - activeCount },
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
