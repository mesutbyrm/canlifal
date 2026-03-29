import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST: Replace AI player with a real player in an active AI game
export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })

    const room = await prisma.gameRoom.findUnique({ where: { id: params.roomId } })
    if (!room) return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
    if (!room.isAI) return NextResponse.json({ error: 'Bu oda yapay zeka oyunu değil' }, { status: 400 })
    if (room.status !== 'active') return NextResponse.json({ error: 'Oyun aktif değil' }, { status: 400 })

    // Allow reconnection: if this user is the disconnected player, let them rejoin
    const isReconnecting = room.disconnectedPlayerId === session.user.id
    if (!isReconnecting && room.player1Id === session.user.id) {
      return NextResponse.json({ error: 'Kendi oyununuza katılamazsınız' }, { status: 400 })
    }

    const userName = (session.user as any)?.name || 'Oyuncu 2'

    if (isReconnecting) {
      // Reconnecting: restore original player, clear disconnect flag
      const isP1 = room.player1Id === session.user.id
      const updated = await prisma.gameRoom.update({
        where: { id: params.roomId },
        data: {
          isAI: false,
          disconnectedPlayerId: null,
          lastMoveAt: new Date(),
          ...(isP1 ? { player1LastSeen: new Date() } : { player2LastSeen: new Date() }),
        },
      })
      return NextResponse.json({ success: true, room: updated, reconnected: true })
    }

    // New player replacing AI
    const updated = await prisma.gameRoom.update({
      where: { id: params.roomId },
      data: {
        player2Id: session.user.id,
        player2Name: userName,
        isAI: false,
        disconnectedPlayerId: null,
        lastMoveAt: new Date(),
        player2LastSeen: new Date(),
      },
    })

    return NextResponse.json({ success: true, room: updated })
  } catch (error: any) {
    console.error('Replace AI error:', error)
    return NextResponse.json({ error: 'AI değiştirilemedi' }, { status: 500 })
  }
}
