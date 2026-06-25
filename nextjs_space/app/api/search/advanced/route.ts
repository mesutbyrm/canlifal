import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all' // all, teller, room, fortune
    const specialty = searchParams.get('specialty') || ''
    const minRating = parseFloat(searchParams.get('minRating') || '0')
    const onlineOnly = searchParams.get('onlineOnly') === 'true'
    const sortBy = searchParams.get('sortBy') || 'rating'

    const results: any = { tellers: [], rooms: [], fortunes: [] }

    // Falcı arama
    if (type === 'all' || type === 'teller') {
      const tellerWhere: any = { isActive: true, applicationStatus: 'approved' }
      if (q) {
        tellerWhere.OR = [
          { displayName: { contains: q, mode: 'insensitive' } },
          { specialties: { has: q } },
        ]
      }
      if (specialty) tellerWhere.specialties = { has: specialty }
      if (minRating > 0) tellerWhere.rating = { gte: minRating }
      if (onlineOnly) tellerWhere.isOnline = true

      results.tellers = await prisma.liveFortuneTeller.findMany({
        where: tellerWhere,
        include: { user: { select: { id: true, name: true, username: true, image: true } } },
        orderBy: sortBy === 'rating' ? { rating: 'desc' } : sortBy === 'sessions' ? { totalSessions: 'desc' } : { levelPoints: 'desc' },
        take: 20,
      }).then(tellers => tellers.map(t => ({
        type: 'teller',
        id: t.id,
        userId: t.userId,
        name: t.displayName,
        avatar: t.avatar || t.user?.image,
        username: t.user?.username,
        rating: t.rating,
        isOnline: t.isOnline,
        specialties: t.specialties,
        totalSessions: t.totalSessions,
        tellerLevel: t.tellerLevel,
        pricePerSession: t.pricePerSession,
      })))
    }

    // Sohbet odası arama
    if (type === 'all' || type === 'room') {
      const roomWhere: any = { isActive: true }
      if (q) {
        roomWhere.OR = [
          { nameTr: { contains: q, mode: 'insensitive' } },
          { descTr: { contains: q, mode: 'insensitive' } },
        ]
      }

      results.rooms = await prisma.chatRoom.findMany({
        where: roomWhere,
        include: { owner: { select: { id: true, name: true, username: true, image: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }).then(rooms => rooms.map(r => ({
        type: 'room',
        id: r.id,
        name: r.nameTr,
        description: r.descTr,
        slug: r.slug,
        owner: r.owner?.name,
        avatar: r.icon,
      })))
    }

    // Fal türleri arama
    if (type === 'all' || type === 'fortune') {
      const fortuneWhere: any = { isActive: true }
      if (q) {
        fortuneWhere.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { nameEn: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ]
      }

      results.fortunes = await prisma.fortuneRequestType.findMany({
        where: fortuneWhere,
        orderBy: { sortOrder: 'asc' },
        take: 20,
      }).then(types => types.map(t => ({
        type: 'fortune',
        id: t.id,
        name: t.name,
        nameEn: t.nameEn,
        description: t.description,
        icon: t.icon,
        jetonCost: t.jetonCost,
      })))
    }

    // Specialty listesi
    const specialties = await prisma.liveFortuneTeller.findMany({
      where: { isActive: true, applicationStatus: 'approved' },
      select: { specialties: true },
    }).then(tellers => {
      const allSpecs = tellers.flatMap(t => t.specialties)
      const counts: Record<string, number> = {}
      allSpecs.forEach(s => { counts[s] = (counts[s] || 0) + 1 })
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name, count]) => ({ name, count }))
    })

    return NextResponse.json({ ...results, specialties })
  } catch (error) {
    console.error('Advanced search error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
