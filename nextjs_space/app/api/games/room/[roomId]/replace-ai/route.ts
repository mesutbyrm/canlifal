import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// POST: Replace AI player with a real player in an active AI game
export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    // Try gameRoom first, then sosGame
    const room = await prisma.gameRoom.findUnique({ where: { id: params.roomId } })
    const sosRoom = room ? null : await prisma.sosGame.findUnique({ where: { id: params.roomId } })
    const target = room || sosRoom
    const isSos = !room && !!sosRoom

    if (!target) return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
    if (!target.isAI) return NextResponse.json({ error: 'Bu oda yapay zeka oyunu değil' }, { status: 400 })
    if (target.status !== 'active') return NextResponse.json({ error: 'Oyun aktif değil' }, { status: 400 })

    // Allow reconnection: if this user is the disconnected player, let them rejoin
    const isReconnecting = target.disconnectedPlayerId === authUser.id
    if (!isReconnecting && target.player1Id === authUser.id) {
      return NextResponse.json({ error: 'Kendi oyununuza katılamazsınız' }, { status: 400 })
    }

    const userName = (authUser as any)?.name || 'Oyuncu 2'

    if (isReconnecting) {
      const isP1 = target.player1Id === authUser.id
      const updateData = {
        isAI: false,
        disconnectedPlayerId: null,
        lastMoveAt: new Date(),
        ...(isP1 ? { player1LastSeen: new Date() } : { player2LastSeen: new Date() }),
      }
      const updated = isSos
        ? await prisma.sosGame.update({ where: { id: params.roomId }, data: updateData })
        : await prisma.gameRoom.update({ where: { id: params.roomId }, data: updateData })
      return NextResponse.json({ success: true, room: updated, reconnected: true })
    }

    // New player replacing AI
    const updateData = {
      player2Id: authUser.id,
      player2Name: userName,
      isAI: false,
      disconnectedPlayerId: null,
      lastMoveAt: new Date(),
      player2LastSeen: new Date(),
    }
    const updated = isSos
      ? await prisma.sosGame.update({ where: { id: params.roomId }, data: updateData })
      : await prisma.gameRoom.update({ where: { id: params.roomId }, data: updateData })

    return NextResponse.json({ success: true, room: updated })
  } catch (error: any) {
    console.error('Replace AI error:', error)
    return NextResponse.json({ error: 'AI değiştirilemedi' }, { status: 500 })
  }
}
