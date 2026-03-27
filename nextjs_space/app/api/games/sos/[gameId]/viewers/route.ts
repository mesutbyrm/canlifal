import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET: Get viewer count for a game
export async function GET(req: NextRequest, { params }: { params: { gameId: string } }) {
  try {
    const count = await prisma.sosGameViewer.count({ where: { gameId: params.gameId } })
    return NextResponse.json({ viewerCount: count })
  } catch (error: any) {
    console.error('SOS viewer count error:', error)
    return NextResponse.json({ error: 'Hata oluştu' }, { status: 500 })
  }
}

// POST: Join as a viewer (spectator)
export async function POST(req: NextRequest, { params }: { params: { gameId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const game = await prisma.sosGame.findUnique({ where: { id: params.gameId } })
    if (!game) return NextResponse.json({ error: 'Oyun bulunamadı' }, { status: 404 })
    if (game.status !== 'active') return NextResponse.json({ error: 'Bu oyun aktif değil' }, { status: 400 })

    // Can't spectate your own game
    if (game.player1Id === session.user.id || game.player2Id === session.user.id) {
      return NextResponse.json({ error: 'Kendi oyununuzu izleyemezsiniz' }, { status: 400 })
    }

    const userName = (session.user as any)?.name || 'İzleyici'

    const viewer = await prisma.sosGameViewer.upsert({
      where: { gameId_userId: { gameId: params.gameId, userId: session.user.id } },
      update: { joinedAt: new Date() },
      create: {
        gameId: params.gameId,
        userId: session.user.id,
        userName,
      },
    })

    return NextResponse.json({ success: true, viewer })
  } catch (error: any) {
    console.error('SOS viewer join error:', error)
    return NextResponse.json({ error: 'İzleyici olarak katılınamadı' }, { status: 500 })
  }
}

// DELETE: Leave as a viewer
export async function DELETE(req: NextRequest, { params }: { params: { gameId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    await prisma.sosGameViewer.deleteMany({
      where: { gameId: params.gameId, userId: session.user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('SOS viewer leave error:', error)
    return NextResponse.json({ error: 'Çıkış yapılamadı' }, { status: 500 })
  }
}
