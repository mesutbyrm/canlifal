import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET: Fetch chat messages for a game
export async function GET(req: NextRequest, { params }: { params: { gameId: string } }) {
  try {
    const url = new URL(req.url)
    const after = url.searchParams.get('after') // ISO date string for polling

    const messages = await prisma.sosGameChat.findMany({
      where: {
        gameId: params.gameId,
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })

    return NextResponse.json(messages)
  } catch (error: any) {
    console.error('SOS chat get error:', error)
    return NextResponse.json({ error: 'Mesajlar yüklenemedi' }, { status: 500 })
  }
}

// POST: Send a chat message
export async function POST(req: NextRequest, { params }: { params: { gameId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const { message } = await req.json()
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Mesaj boş olamaz' }, { status: 400 })
    }
    if (message.length > 200) {
      return NextResponse.json({ error: 'Mesaj çok uzun' }, { status: 400 })
    }

    // Check game exists and chat is enabled
    const game = await prisma.sosGame.findUnique({ where: { id: params.gameId } })
    if (!game) return NextResponse.json({ error: 'Oyun bulunamadı' }, { status: 404 })
    if (!game.chatEnabled) return NextResponse.json({ error: 'Sohbet kapalı' }, { status: 403 })

    // Only players and viewers can chat
    const isPlayer = game.player1Id === session.user.id || game.player2Id === session.user.id
    const viewer = isPlayer ? null : await prisma.sosGameViewer.findUnique({
      where: { gameId_userId: { gameId: params.gameId, userId: session.user.id } },
    })

    if (!isPlayer && !viewer) {
      return NextResponse.json({ error: 'Bu sohbete erişiminiz yok' }, { status: 403 })
    }

    const userName = (session.user as any)?.name || 'Anonim'
    const chatMsg = await prisma.sosGameChat.create({
      data: {
        gameId: params.gameId,
        userId: session.user.id,
        userName,
        message: message.trim().slice(0, 200),
      },
    })

    return NextResponse.json(chatMsg)
  } catch (error: any) {
    console.error('SOS chat send error:', error)
    return NextResponse.json({ error: 'Mesaj gönderilemedi' }, { status: 500 })
  }
}

// PATCH: Toggle chat enabled/disabled (room owner only)
export async function PATCH(req: NextRequest, { params }: { params: { gameId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const game = await prisma.sosGame.findUnique({ where: { id: params.gameId } })
    if (!game) return NextResponse.json({ error: 'Oyun bulunamadı' }, { status: 404 })
    if (game.player1Id !== session.user.id) {
      return NextResponse.json({ error: 'Sadece oda sahibi sohbeti yönetebilir' }, { status: 403 })
    }

    const { chatEnabled } = await req.json()
    const updated = await prisma.sosGame.update({
      where: { id: params.gameId },
      data: { chatEnabled: !!chatEnabled },
    })

    return NextResponse.json({ chatEnabled: updated.chatEnabled })
  } catch (error: any) {
    console.error('SOS chat toggle error:', error)
    return NextResponse.json({ error: 'Sohbet ayarı değiştirilemedi' }, { status: 500 })
  }
}
