export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { buildDjPayload } from '@/lib/chat-dj-events'

/**
 * Flutter-friendly music queue alias.
 * GET /api/chat/rooms/{roomId}/music-queue
 * Returns the same song request queue as the song-request route.
 */

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

  queue.sort((a: any, b: any) => {
    if (a.isPaid && !b.isPaid) return -1
    if (!a.isPaid && b.isPaid) return 1
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  return queue
}

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const mobileUser = await authenticateRequest(request)
    const webSession = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || webSession?.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const queue = await parseQueue(params.roomId)
    const djPayload = await buildDjPayload(params.roomId)

    return NextResponse.json({
      queue,
      total: queue.length,
      playing: djPayload.playing,
      nowPlaying: djPayload.nowPlaying,
      musicUrl: djPayload.musicUrl,
      musicQueue: queue,
      queueLength: queue.length,
    })
  } catch (error) {
    console.error('Music-queue GET error:', error)
    return NextResponse.json({ queue: [], total: 0 })
  }
}
