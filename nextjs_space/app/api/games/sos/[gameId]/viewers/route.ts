import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

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
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const game = await prisma.sosGame.findUnique({ where: { id: params.gameId } })
    if (!game) return NextResponse.json({ error: 'Oyun bulunamadı' }, { status: 404 })
    if (game.status !== 'active') return NextResponse.json({ error: 'Bu oyun aktif değil' }, { status: 400 })

    // Can't spectate your own game
    if (game.player1Id === authUser.id || game.player2Id === authUser.id) {
      return NextResponse.json({ error: 'Kendi oyununuzu izleyemezsiniz' }, { status: 400 })
    }

    const userName = (authUser as any)?.name || 'İzleyici'

    const viewer = await prisma.sosGameViewer.upsert({
      where: { gameId_userId: { gameId: params.gameId, userId: authUser.id } },
      update: { joinedAt: new Date() },
      create: {
        gameId: params.gameId,
        userId: authUser.id,
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
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    await prisma.sosGameViewer.deleteMany({
      where: { gameId: params.gameId, userId: authUser.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('SOS viewer leave error:', error)
    return NextResponse.json({ error: 'Çıkış yapılamadı' }, { status: 500 })
  }
}
