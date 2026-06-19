import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { emitDjUpdate, buildDjPayload } from '@/lib/chat-dj-events'

export const dynamic = 'force-dynamic'

const SONG_REQUEST_COST = 10

/** Helper: parse queue from DB messages */
async function parseQueue(roomId: string) {
  const requests = await prisma.chatMessage.findMany({
    where: {
      roomId,
      content: { startsWith: '[SONG_REQUEST' },
    },
    orderBy: { createdAt: 'asc' },
    take: 30,
    include: {
      user: { select: { id: true, name: true, username: true } }
    }
  })

  const queue = requests.map(msg => {
    const isPaid = msg.content.startsWith('[SONG_REQUEST_PAID]')
    const isPlayed = msg.content.includes('[PLAYED]')
    if (isPlayed) return null

    const prefix = isPaid ? '[SONG_REQUEST_PAID] ' : '[SONG_REQUEST_FREE] '
    const data = msg.content.replace(prefix, '')
    const parts = data.split('|')

    return {
      id: msg.id,
      videoId: parts[0] || '',
      title: parts[1] || '',
      dedication: isPaid ? (parts[2] || '') : '',
      note: isPaid ? (parts[3] || '') : '',
      duration: isPaid ? (parts[4] || '') : (parts[2] || ''),
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

  return queue
}

// GET: Get pending song requests (queue) for a room
export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const queue = await parseQueue(params.roomId)

    // Also get current playing info for Flutter compatibility
    const room = await prisma.chatRoom.findUnique({
      where: { id: params.roomId },
      select: {
        currentMusicVideoId: true,
        currentMusicTitle: true,
        currentMusicStartedAt: true,
        currentMusicDuration: true,
      }
    })

    const playing = !!room?.currentMusicVideoId
    const nowPlaying = room?.currentMusicVideoId ? {
      videoId: room.currentMusicVideoId,
      title: room.currentMusicTitle || '',
      startedAt: room.currentMusicStartedAt,
      duration: room.currentMusicDuration || '',
    } : null

    return NextResponse.json({
      queue,
      playing,
      nowPlaying,
      musicUrl: room?.currentMusicVideoId
        ? `https://www.youtube.com/watch?v=${room.currentMusicVideoId}`
        : null,
      musicQueue: queue,
    })
  } catch (error) {
    console.error('Get song queue error:', error)
    return NextResponse.json({ queue: [], playing: false, nowPlaying: null, musicUrl: null, musicQueue: [] })
  }
}

// POST: Submit a song request
// body: { videoId, title, duration?, dedication?, note?, priority?, skipPayment? }
export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    // Dual auth: web session OR mobile JWT
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await req.json()
    const { videoId, title, dedication, note, duration, priority } = body
    if (!videoId || !title) {
      return NextResponse.json({ error: 'Şarkı bilgisi eksik' }, { status: 400 })
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { jetonBalance: true, name: true, username: true, role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    const isStaff = user.role === 'admin' || user.role === 'yonetici'
    // Staff always skip payment — client skipPayment param removed for security
    const shouldSkipPayment = isStaff

    // Deduct jetons only if not skipping payment
    if (!shouldSkipPayment) {
      if (user.jetonBalance < SONG_REQUEST_COST) {
        return NextResponse.json({ error: `Yetersiz jeton. ${SONG_REQUEST_COST} jeton gerekiyor.` }, { status: 400 })
      }

      await prisma.user.update({
        where: { id: userId },
        data: { jetonBalance: { decrement: SONG_REQUEST_COST } }
      })
      await prisma.jetonTransaction.create({
        data: {
          userId,
          amount: -SONG_REQUEST_COST,
          type: 'spend',
          description: `Şarkı isteği: ${title}`,
          balanceBefore: user.jetonBalance,
          balanceAfter: user.jetonBalance - SONG_REQUEST_COST,
        }
      })
    }

    const dedText = dedication ? String(dedication).trim() : ''
    const noteText = note ? String(note).trim() : ''
    const durText = duration ? String(duration).trim() : ''
    const isPaidRequest = !shouldSkipPayment
    const prefix = isPaidRequest ? '[SONG_REQUEST_PAID]' : '[SONG_REQUEST_FREE]'

    // Create song request message
    await prisma.chatMessage.create({
      data: {
        roomId: params.roomId,
        userId,
        content: `${prefix} ${videoId}|${title}|${dedText}|${noteText}|${durText}`,
      }
    })

    // Create visible system message
    const userName = user.name || user.username || 'Biri'
    let visibleMsg = shouldSkipPayment
      ? `🎵 ${userName} şarkı isteği gönderdi: ${title}`
      : `🎵 ${userName} şarkı isteği gönderdi: ${title}`
    if (dedText) visibleMsg += ` (${dedText} için)`
    if (noteText) visibleMsg += ` — "${noteText}"`
    if (!shouldSkipPayment) visibleMsg += ` [${SONG_REQUEST_COST} 💎]`

    await prisma.chatMessage.create({
      data: {
        roomId: params.roomId,
        userId,
        content: visibleMsg,
      }
    })

    // Check current music state
    const room = await prisma.chatRoom.findUnique({
      where: { id: params.roomId },
      select: { currentMusicVideoId: true }
    })

    const shouldPlayNow = !room?.currentMusicVideoId || (priority === true)

    if (shouldPlayNow) {
      // If priority: stop current + play this. If no music: play this.
      await prisma.chatRoom.update({
        where: { id: params.roomId },
        data: {
          currentMusicVideoId: videoId,
          currentMusicTitle: title,
          currentMusicStartedAt: new Date(),
          currentMusicDuration: durText || null,
        }
      })
      // Mark request as played
      const reqMsg = await prisma.chatMessage.findFirst({
        where: {
          roomId: params.roomId,
          userId,
          content: { startsWith: `${prefix} ${videoId}` },
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

    // Emit DJ update event for SSE listeners (web + Flutter)
    await emitDjUpdate(params.roomId)

    // Build full response with queue + nowPlaying for Flutter parity
    const djPayload = await buildDjPayload(params.roomId)
    const updatedQueue = await parseQueue(params.roomId)
    const queuePosition = updatedQueue.findIndex((q: any) => q?.videoId === videoId) + 1

    return NextResponse.json({
      success: true,
      newBalance: shouldSkipPayment ? user.jetonBalance : user.jetonBalance - SONG_REQUEST_COST,
      queued: !shouldPlayNow,
      startedImmediately: shouldPlayNow,
      queuePosition: shouldPlayNow ? 0 : queuePosition,
      playing: djPayload.playing,
      nowPlaying: djPayload.nowPlaying,
      musicUrl: djPayload.musicUrl,
      queue: updatedQueue,
      musicQueue: updatedQueue,
      queueLength: updatedQueue.length,
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
    // Dual auth
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { requestId } = await req.json()
    if (!requestId) {
      return NextResponse.json({ error: 'İstek ID eksik' }, { status: 400 })
    }

    // Mark as played
    const msg = await prisma.chatMessage.findUnique({ where: { id: requestId } })
    if (msg && msg.content.startsWith('[SONG_REQUEST') && !msg.content.includes('[PLAYED]')) {
      await prisma.chatMessage.update({
        where: { id: requestId },
        data: { content: msg.content + '[PLAYED]' }
      })

      const isPaid = msg.content.startsWith('[SONG_REQUEST_PAID]')
      const prefix = isPaid ? '[SONG_REQUEST_PAID] ' : '[SONG_REQUEST_FREE] '
      const data = msg.content.replace(prefix, '')
      const parts = data.split('|')
      const videoId = parts[0]
      const title = parts[1]
      const duration = isPaid ? (parts[4] || '') : (parts[2] || '')

      if (videoId && title) {
        await prisma.chatRoom.update({
          where: { id: params.roomId },
          data: {
            currentMusicVideoId: videoId,
            currentMusicTitle: title,
            currentMusicStartedAt: new Date(),
            currentMusicDuration: duration || null,
          }
        })
      }
    }

    // Emit DJ update
    await emitDjUpdate(params.roomId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark played error:', error)
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 })
  }
}
