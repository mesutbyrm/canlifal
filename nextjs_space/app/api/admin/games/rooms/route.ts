import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'all'
    const gameType = searchParams.get('gameType') || 'all'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}
    if (status !== 'all') where.status = status
    if (gameType !== 'all') where.gameType = gameType

    const [rooms, total, stats] = await Promise.all([
      prisma.gameRoom.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { viewers: true, chatMessages: true } } },
      }),
      prisma.gameRoom.count({ where }),
      prisma.gameRoom.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ])

    const statusCounts: Record<string, number> = {}
    stats.forEach((s: any) => { statusCounts[s.status] = s._count.id })

    // Game type counts
    const typeCounts = await prisma.gameRoom.groupBy({
      by: ['gameType'],
      _count: { id: true },
      where: { status: { in: ['active', 'waiting'] } },
    })
    const typeCountMap: Record<string, number> = {}
    typeCounts.forEach((t: any) => { typeCountMap[t.gameType] = t._count.id })

    return NextResponse.json({
      rooms: rooms.map((r: any) => ({
        ...r,
        viewerCount: r._count.viewers,
        chatCount: r._count.chatMessages,
      })),
      total,
      totalPages: Math.ceil(total / limit),
      page,
      statusCounts,
      typeCountMap,
    })
  } catch (error: any) {
    console.error('Admin game rooms error:', error)
    return NextResponse.json({ error: 'Odalar yüklenemedi' }, { status: 500 })
  }
}

// DELETE: Force close a room
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const { roomId } = await req.json()
    if (!roomId) return NextResponse.json({ error: 'Room ID gerekli' }, { status: 400 })

    const room = await prisma.gameRoom.findUnique({ where: { id: roomId } })
    if (!room) return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })

    // Refund bets if room is active/waiting
    if (['active', 'waiting'].includes(room.status) && room.betAmount > 0) {
      const field = room.betCurrency === 'CFC' ? 'credits' : 'jetonBalance'
      const txns = [prisma.user.update({ where: { id: room.player1Id }, data: { [field]: { increment: room.betAmount } } })]
      if (room.player2Id && room.player2Id !== 'AI') {
        txns.push(prisma.user.update({ where: { id: room.player2Id }, data: { [field]: { increment: room.betAmount } } }))
      }
      await prisma.$transaction(txns)
    }

    await prisma.gameRoom.update({
      where: { id: roomId },
      data: { status: 'cancelled' },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Admin force close room error:', error)
    return NextResponse.json({ error: 'Oda kapatılamadı' }, { status: 500 })
  }
}
