import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { emitDjUpdate, buildDjPayload } from '@/lib/chat-dj-events'

export const dynamic = 'force-dynamic'

// Helper to check if user can control music (DJ system)
async function canControlMusic(roomId: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  const isGlobalAdmin = user?.role === 'admin' || user?.role === 'yonetici'
  
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { ownerId: true, djUserIds: true, activeDjId: true }
  })
  if (!room) return false
  const isOwner = room.ownerId === userId

  // Owner and global admins always can
  if (isGlobalAdmin || isOwner) return true

  // Check if user is a DJ
  let djUserIds: string[] = []
  try { djUserIds = room.djUserIds ? JSON.parse(room.djUserIds) : [] } catch {}
  if (!Array.isArray(djUserIds)) djUserIds = []
  
  const isDj = djUserIds.includes(userId)
  if (!isDj) return false

  // Check if owner is present
  const presences = await prisma.chatPresence.findMany({
    where: { roomId },
    select: { userId: true }
  })
  const presentUserIds = new Set(presences.map(p => p.userId))
  const ownerPresent = room.ownerId ? presentUserIds.has(room.ownerId) : false

  if (ownerPresent) {
    // Owner is present - only the activeDjId can play
    return room.activeDjId === userId
  } else {
    // Owner absent - hierarchical order (first present DJ in list)
    const presentDjs = djUserIds.filter(id => presentUserIds.has(id))
    return presentDjs.length > 0 && presentDjs[0] === userId
  }
}

// Helper: parse duration string "3:45" or "1:02:30" to seconds
function parseDurationToSeconds(dur: string | null | undefined): number {
  if (!dur) return 0
  const parts = dur.split(':').map(Number)
  if (parts.some(isNaN)) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] || 0
}

// Max duration if unknown: 6 minutes
const DEFAULT_MAX_DURATION_SECONDS = 360

// GET: Get currently playing music for a room
export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const room = await prisma.chatRoom.findUnique({
      where: { id: params.roomId },
      select: {
        currentMusicVideoId: true,
        currentMusicTitle: true,
        currentMusicStartedAt: true,
        currentMusicDuration: true,
      }
    })
    if (!room) {
      return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
    }

    // ── Server-side auto-cleanup: if song has been playing longer than its duration, auto-advance ──
    if (room.currentMusicVideoId && room.currentMusicStartedAt) {
      const durationSec = parseDurationToSeconds(room.currentMusicDuration) || DEFAULT_MAX_DURATION_SECONDS
      const elapsedSec = (Date.now() - new Date(room.currentMusicStartedAt).getTime()) / 1000
      
      if (elapsedSec > durationSec + 5) { // +5s buffer
        // Song expired — try to play next from queue
        const nextInQueue = await prisma.chatMessage.findFirst({
          where: {
            roomId: params.roomId,
            content: { startsWith: '[SONG_REQUEST' },
            NOT: { content: { contains: '[PLAYED]' } },
          },
          orderBy: { createdAt: 'asc' },
        })

        if (nextInQueue) {
          const isPaid = nextInQueue.content.startsWith('[SONG_REQUEST_PAID]')
          const prefix = isPaid ? '[SONG_REQUEST_PAID] ' : '[SONG_REQUEST_FREE] '
          const data = nextInQueue.content.replace(prefix, '')
          const parts = data.split('|')
          const nextVideoId = parts[0]
          const nextTitle = parts[1]
          const nextDuration = isPaid ? (parts[4] || '') : (parts[2] || '')

          // Mark as played
          await prisma.chatMessage.update({
            where: { id: nextInQueue.id },
            data: { content: nextInQueue.content + '[PLAYED]' }
          })

          // Set new song
          await prisma.chatRoom.update({
            where: { id: params.roomId },
            data: {
              currentMusicVideoId: nextVideoId || null,
              currentMusicTitle: nextTitle || null,
              currentMusicStartedAt: new Date(),
              currentMusicDuration: nextDuration || null,
            }
          })

          await emitDjUpdate(params.roomId)

          // Return updated state
          const djPayload = await buildDjPayload(params.roomId)
          return NextResponse.json({
            videoId: nextVideoId || null,
            title: nextTitle || null,
            startedAt: new Date(),
            duration: nextDuration || null,
            playing: djPayload.playing,
            nowPlaying: djPayload.nowPlaying,
            musicUrl: djPayload.musicUrl,
            musicQueue: djPayload.musicQueue,
          })
        } else {
          // No queue — stop music
          await prisma.chatRoom.update({
            where: { id: params.roomId },
            data: {
              currentMusicVideoId: null,
              currentMusicTitle: null,
              currentMusicStartedAt: null,
              currentMusicDuration: null,
            }
          })
          await emitDjUpdate(params.roomId)

          const djPayload = await buildDjPayload(params.roomId)
          return NextResponse.json({
            videoId: null,
            title: null,
            startedAt: null,
            duration: null,
            playing: false,
            nowPlaying: null,
            musicUrl: null,
            musicQueue: djPayload.musicQueue,
          })
        }
      }
    }

    // Build full DJ payload for Flutter compatibility
    const djPayload = await buildDjPayload(params.roomId)

    return NextResponse.json({
      videoId: room.currentMusicVideoId,
      title: room.currentMusicTitle,
      startedAt: room.currentMusicStartedAt,
      duration: room.currentMusicDuration,
      // Flutter-compatible fields
      playing: djPayload.playing,
      nowPlaying: djPayload.nowPlaying,
      musicUrl: djPayload.musicUrl,
      musicQueue: djPayload.musicQueue,
    })
  } catch (error) {
    console.error('Get music error:', error)
    return NextResponse.json({ error: 'Müzik bilgisi alınamadı' }, { status: 500 })
  }
}

// POST: Set currently playing music
export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    // Dual auth: mobile JWT OR web session
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const allowed = await canControlMusic(params.roomId, userId)
    if (!allowed) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    const { videoId, title, duration } = await req.json()
    if (!videoId || !title) {
      return NextResponse.json({ error: 'Video bilgisi eksik' }, { status: 400 })
    }

    // Check if music is already playing
    const room = await prisma.chatRoom.findUnique({
      where: { id: params.roomId },
      select: { currentMusicVideoId: true }
    })

    if (room?.currentMusicVideoId) {
      // Music is already playing — add to queue as FREE (DJ) request instead of replacing
      const durText = duration ? duration.trim() : ''
      await prisma.chatMessage.create({
        data: {
          roomId: params.roomId,
          userId,
          content: `[SONG_REQUEST_FREE] ${videoId}|${title}|${durText}`,
        }
      })

      // Get user name for system message
      const djUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, username: true }
      })
      const djName = djUser?.name || djUser?.username || 'DJ'

      await prisma.chatMessage.create({
        data: {
          roomId: params.roomId,
          userId,
          content: `🎧 ${djName} sıraya şarkı ekledi: ${title}`,
        }
      })

      await emitDjUpdate(params.roomId)
      return NextResponse.json({ success: true, queued: true })
    }

    // No music playing — set as current
    await prisma.chatRoom.update({
      where: { id: params.roomId },
      data: {
        currentMusicVideoId: videoId,
        currentMusicTitle: title,
        currentMusicStartedAt: new Date(),
        currentMusicDuration: duration || null,
      }
    })

    // Send a system message about the music
    await prisma.chatMessage.create({
      data: {
        roomId: params.roomId,
        userId,
        content: `🎶 Şu an çalıyor: ${title}`,
      }
    })

    await emitDjUpdate(params.roomId)
    return NextResponse.json({ success: true, queued: false })
  } catch (error) {
    console.error('Set music error:', error)
    return NextResponse.json({ error: 'Müzik ayarlanamadı' }, { status: 500 })
  }
}

// DELETE: Stop music
export async function DELETE(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    // Dual auth: mobile JWT OR web session
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const allowed = await canControlMusic(params.roomId, userId)
    if (!allowed) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    await prisma.chatRoom.update({
      where: { id: params.roomId },
      data: {
        currentMusicVideoId: null,
        currentMusicTitle: null,
        currentMusicStartedAt: null,
        currentMusicDuration: null,
      }
    })

    await emitDjUpdate(params.roomId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Stop music error:', error)
    return NextResponse.json({ error: 'Müzik durdurulamadı' }, { status: 500 })
  }
}
