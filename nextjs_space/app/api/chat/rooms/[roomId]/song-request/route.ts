import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const SONG_REQUEST_COST = 10

// GET: Get pending song requests (queue) for a room
export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    // Find messages with song request prefix that are pending
    const requests = await prisma.chatMessage.findMany({
      where: {
        roomId: params.roomId,
        content: { startsWith: '[SONG_REQUEST' },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
      include: {
        user: { select: { id: true, name: true, username: true } }
      }
    })

    // Parse requests and separate paid vs free
    const queue = requests.map(msg => {
      const isPaid = msg.content.startsWith('[SONG_REQUEST_PAID]')
      const isPlayed = msg.content.includes('[PLAYED]')
      if (isPlayed) return null

      // Parse: [SONG_REQUEST_PAID] videoId|title|dedication|note
      // or:    [SONG_REQUEST_FREE] videoId|title
      const prefix = isPaid ? '[SONG_REQUEST_PAID] ' : '[SONG_REQUEST_FREE] '
      const data = msg.content.replace(prefix, '')
      const parts = data.split('|')

      return {
        id: msg.id,
        videoId: parts[0] || '',
        title: parts[1] || '',
        dedication: isPaid ? (parts[2] || '') : '',
        note: isPaid ? (parts[3] || '') : '',
        isPaid,
        userId: msg.userId,
        userName: msg.user?.name || msg.user?.username || 'Anonim',
        createdAt: msg.createdAt,
      }
    }).filter(Boolean)

    // Sort: paid first, then by createdAt
    queue.sort((a: any, b: any) => {
      if (a.isPaid && !b.isPaid) return -1
      if (!a.isPaid && b.isPaid) return 1
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

    return NextResponse.json({ queue })
  } catch (error) {
    console.error('Get song queue error:', error)
    return NextResponse.json({ queue: [] })
  }
}

// POST: Submit a paid song request (costs jetons)
export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { videoId, title, dedication, note } = await req.json()
    if (!videoId || !title) {
      return NextResponse.json({ error: 'Şarkı bilgisi eksik' }, { status: 400 })
    }

    // Check jeton balance
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { jetonBalance: true, name: true, username: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    const isStaff = user.role === 'admin' || user.role === 'yonetici'

    if (!isStaff && user.jetonBalance < SONG_REQUEST_COST) {
      return NextResponse.json({ error: `Yetersiz jeton. ${SONG_REQUEST_COST} jeton gerekiyor.` }, { status: 400 })
    }

    // Deduct jetons (staff skip)
    if (!isStaff) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { jetonBalance: { decrement: SONG_REQUEST_COST } }
      })
      await prisma.jetonTransaction.create({
        data: {
          userId: session.user.id,
          amount: -SONG_REQUEST_COST,
          type: 'spend',
          description: `Şarkı isteği: ${title}`,
          balanceBefore: user.jetonBalance,
          balanceAfter: user.jetonBalance - SONG_REQUEST_COST,
        }
      })
    }

    const dedText = dedication ? dedication.trim() : ''
    const noteText = note ? note.trim() : ''

    // Create song request message (hidden format - parsed by queue)
    await prisma.chatMessage.create({
      data: {
        roomId: params.roomId,
        userId: session.user.id,
        content: `[SONG_REQUEST_PAID] ${videoId}|${title}|${dedText}|${noteText}`,
      }
    })

    // Create visible system message
    const userName = user.name || user.username || 'Biri'
    let visibleMsg = `🎵 ${userName} şarkı isteği gönderdi: ${title}`
    if (dedText) visibleMsg += ` (${dedText} için)`
    if (noteText) visibleMsg += ` — "${noteText}"`
    visibleMsg += ` [10 💎]`

    await prisma.chatMessage.create({
      data: {
        roomId: params.roomId,
        userId: session.user.id,
        content: visibleMsg,
      }
    })

    // If no music is currently playing, start this song immediately
    const room = await prisma.chatRoom.findUnique({
      where: { id: params.roomId },
      select: { currentMusicVideoId: true }
    })
    if (!room?.currentMusicVideoId) {
      await prisma.chatRoom.update({
        where: { id: params.roomId },
        data: {
          currentMusicVideoId: videoId,
          currentMusicTitle: title,
          currentMusicStartedAt: new Date(),
        }
      })
      // Mark request message as played
      const reqMsg = await prisma.chatMessage.findFirst({
        where: {
          roomId: params.roomId,
          userId: session.user.id,
          content: { startsWith: `[SONG_REQUEST_PAID] ${videoId}` },
        },
        orderBy: { createdAt: 'desc' }
      })
      if (reqMsg) {
        await prisma.chatMessage.update({
          where: { id: reqMsg.id },
          data: { content: reqMsg.content + '[PLAYED]' }
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      newBalance: isStaff ? user.jetonBalance : user.jetonBalance - SONG_REQUEST_COST 
    })
  } catch (error) {
    console.error('Song request error:', error)
    return NextResponse.json({ error: 'Şarkı isteği gönderilemedi' }, { status: 500 })
  }
}

// PATCH: Play next from queue (mark as played + set music)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { requestId } = await req.json()
    if (!requestId) {
      return NextResponse.json({ error: 'İstek ID eksik' }, { status: 400 })
    }

    // Mark as played by appending [PLAYED]
    const msg = await prisma.chatMessage.findUnique({ where: { id: requestId } })
    if (msg && msg.content.startsWith('[SONG_REQUEST') && !msg.content.includes('[PLAYED]')) {
      await prisma.chatMessage.update({
        where: { id: requestId },
        data: { content: msg.content + '[PLAYED]' }
      })

      // Parse videoId and title from message
      const isPaid = msg.content.startsWith('[SONG_REQUEST_PAID]')
      const prefix = isPaid ? '[SONG_REQUEST_PAID] ' : '[SONG_REQUEST_FREE] '
      const data = msg.content.replace(prefix, '')
      const parts = data.split('|')
      const videoId = parts[0]
      const title = parts[1]

      if (videoId && title) {
        // Set as currently playing music
        await prisma.chatRoom.update({
          where: { id: params.roomId },
          data: {
            currentMusicVideoId: videoId,
            currentMusicTitle: title,
            currentMusicStartedAt: new Date(),
          }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark played error:', error)
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 })
  }
}
