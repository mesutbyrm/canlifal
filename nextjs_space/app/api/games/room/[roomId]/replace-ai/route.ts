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
    if (room.player1Id === session.user.id) return NextResponse.json({ error: 'Kendi oyununuza katılamazsınız' }, { status: 400 })

    const userName = (session.user as any)?.name || 'Oyuncu 2'

    // Replace AI with the real player
    const updated = await prisma.gameRoom.update({
      where: { id: params.roomId },
      data: {
        player2Id: session.user.id,
        player2Name: userName,
        isAI: false,
        lastMoveAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, room: updated })
  } catch (error: any) {
    console.error('Replace AI error:', error)
    return NextResponse.json({ error: 'AI değiştirilemedi' }, { status: 500 })
  }
}
