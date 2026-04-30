import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sortBy = searchParams.get('sortBy') || 'levelPoints'
    const sortDir = searchParams.get('sortDir') || 'desc'
    const levelFilter = searchParams.get('level') || 'all'
    const searchQ = searchParams.get('q') || ''

    const where: any = {}
    if (levelFilter !== 'all') where.tellerLevel = levelFilter

    const tellers = await prisma.liveFortuneTeller.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, username: true, email: true, image: true, lastActiveAt: true } },
      },
      orderBy: { [sortBy]: sortDir === 'asc' ? 'asc' : 'desc' },
    })

    // Filter by search
    let filtered = tellers
    if (searchQ) {
      const q = searchQ.toLowerCase()
      filtered = tellers.filter(t => 
        t.displayName.toLowerCase().includes(q) ||
        t.user?.name?.toLowerCase().includes(q) ||
        t.user?.username?.toLowerCase().includes(q) ||
        t.user?.email?.toLowerCase().includes(q)
      )
    }

    // Level distribution stats
    const levelCounts = {
      bronze: tellers.filter(t => t.tellerLevel === 'bronze').length,
      silver: tellers.filter(t => t.tellerLevel === 'silver').length,
      gold: tellers.filter(t => t.tellerLevel === 'gold').length,
      diamond: tellers.filter(t => t.tellerLevel === 'diamond').length,
    }

    const avgRating = tellers.length > 0 ? tellers.reduce((s, t) => s + t.rating, 0) / tellers.length : 0
    const totalSessions = tellers.reduce((s, t) => s + t.totalSessions, 0)
    const totalEarnings = tellers.reduce((s, t) => s + t.totalEarnings, 0)
    const onlineCount = tellers.filter(t => t.isOnline).length

    return NextResponse.json({
      tellers: filtered.map(t => ({
        id: t.id,
        userId: t.userId,
        displayName: t.displayName,
        avatar: t.avatar || t.user?.image,
        username: t.user?.username,
        email: t.user?.email,
        tellerLevel: t.tellerLevel,
        levelPoints: t.levelPoints,
        rating: t.rating,
        totalSessions: t.totalSessions,
        totalReviews: t.totalReviews,
        totalEarnings: t.totalEarnings,
        isOnline: t.isOnline,
        isVerified: t.isVerified,
        isActive: t.isActive,
        isBanned: t.isBanned,
        isFrozen: t.isFrozen,
        specialties: t.specialties,
        createdAt: t.createdAt.toISOString(),
        lastActiveAt: t.user?.lastActiveAt?.toISOString() || null,
      })),
      stats: { levelCounts, avgRating, totalSessions, totalEarnings, onlineCount, total: tellers.length },
    })
  } catch (error) {
    console.error('Teller performance error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
