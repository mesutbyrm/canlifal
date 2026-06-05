import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { buildDjPayload, emitDjUpdate } from '@/lib/chat-dj-events'

export const dynamic = 'force-dynamic'

const MAX_DJS = 5

// GET: Get DJ list, active DJ, and whether current user can play music
export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null

    const room = await prisma.chatRoom.findUnique({
      where: { id: params.roomId },
      select: {
        ownerId: true,
        djUserIds: true,
        activeDjId: true,
      }
    })
    if (!room) {
      return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
    }

    let djUserIds: string[] = []
    try { djUserIds = room.djUserIds ? JSON.parse(room.djUserIds) : [] } catch {}
    if (!Array.isArray(djUserIds)) djUserIds = []

    // Fetch DJ user info
    const djUsers = djUserIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: djUserIds } },
      select: { id: true, name: true, username: true, image: true }
    }) : []

    // Check who is present in the room right now
    const presences = await prisma.chatPresence.findMany({
      where: { roomId: params.roomId },
      select: { userId: true }
    })
    const presentUserIds = new Set(presences.map(p => p.userId))
    const ownerPresent = room.ownerId ? presentUserIds.has(room.ownerId) : false

    // Determine who can play music right now
    let canPlayMusic = false
    let currentActiveDjId = room.activeDjId

    if (userId) {
      // Check if user is global admin
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
      const isGlobalAdmin = user?.role === 'admin' || user?.role === 'yonetici'
      const isOwner = room.ownerId === userId
      const isDj = djUserIds.includes(userId)

      if (isGlobalAdmin || isOwner) {
        // Owner and global admins can always play
        canPlayMusic = true
      } else if (isDj) {
        if (ownerPresent) {
          // Owner is in the room - only the activeDjId can play
          canPlayMusic = currentActiveDjId === userId
        } else {
          // Owner is NOT in the room - hierarchical order
          // Find the highest-priority DJ who is present
          const presentDjs = djUserIds.filter(id => presentUserIds.has(id))
          if (presentDjs.length > 0) {
            // First DJ in the list who is present gets priority
            canPlayMusic = presentDjs[0] === userId
          }
        }
      }
    }

    // Build DJ music payload for Flutter compatibility
    const djPayload = await buildDjPayload(params.roomId)

    return NextResponse.json({
      djUsers: djUsers.map(u => ({
        id: u.id,
        name: u.name || u.username || 'Anonim',
        image: u.image,
        isPresent: presentUserIds.has(u.id),
      })),
      activeDjId: currentActiveDjId,
      ownerPresent,
      canPlayMusic,
      isOwner: room.ownerId === userId,
      // Flutter-compatible music state
      playing: djPayload.playing,
      nowPlaying: djPayload.nowPlaying,
      musicUrl: djPayload.musicUrl,
      musicQueue: djPayload.musicQueue,
    })
  } catch (error) {
    console.error('Get DJ list error:', error)
    return NextResponse.json({ error: 'DJ listesi alınamadı' }, { status: 500 })
  }
}

// POST: Add/remove DJ, set active DJ
export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const room = await prisma.chatRoom.findUnique({
      where: { id: params.roomId },
      select: { ownerId: true, djUserIds: true }
    })
    if (!room) {
      return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
    }

    // Only room owner and global admins can manage DJs
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    const isGlobalAdmin = user?.role === 'admin' || user?.role === 'yonetici'
    const isOwner = room.ownerId === session.user.id

    if (!isOwner && !isGlobalAdmin) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    const { action, userId: targetUserId } = await req.json()

    let djUserIds: string[] = []
    try { djUserIds = room.djUserIds ? JSON.parse(room.djUserIds) : [] } catch {}
    if (!Array.isArray(djUserIds)) djUserIds = []

    if (action === 'add_dj') {
      if (!targetUserId) return NextResponse.json({ error: 'Kullanıcı ID gerekli' }, { status: 400 })
      if (djUserIds.length >= MAX_DJS) return NextResponse.json({ error: `En fazla ${MAX_DJS} DJ ekleyebilirsiniz` }, { status: 400 })
      if (djUserIds.includes(targetUserId)) return NextResponse.json({ error: 'Bu kullanıcı zaten DJ' }, { status: 400 })
      
      djUserIds.push(targetUserId)
      await prisma.chatRoom.update({
        where: { id: params.roomId },
        data: { djUserIds: JSON.stringify(djUserIds) }
      })

      return NextResponse.json({ success: true, djUserIds })

    } else if (action === 'remove_dj') {
      if (!targetUserId) return NextResponse.json({ error: 'Kullanıcı ID gerekli' }, { status: 400 })
      djUserIds = djUserIds.filter(id => id !== targetUserId)
      
      // Also clear activeDj if it was this user
      const updateData: any = { djUserIds: djUserIds.length > 0 ? JSON.stringify(djUserIds) : null }
      const currentRoom = await prisma.chatRoom.findUnique({ where: { id: params.roomId }, select: { activeDjId: true } })
      if (currentRoom?.activeDjId === targetUserId) {
        updateData.activeDjId = null
      }

      await prisma.chatRoom.update({ where: { id: params.roomId }, data: updateData })
      return NextResponse.json({ success: true, djUserIds })

    } else if (action === 'set_active_dj') {
      // Owner sets which DJ can currently play
      if (!targetUserId) {
        // Clear active DJ (no one has permission)
        await prisma.chatRoom.update({ where: { id: params.roomId }, data: { activeDjId: null } })
        return NextResponse.json({ success: true, activeDjId: null })
      }
      if (!djUserIds.includes(targetUserId)) {
        return NextResponse.json({ error: 'Bu kullanıcı DJ listesinde değil' }, { status: 400 })
      }
      await prisma.chatRoom.update({ where: { id: params.roomId }, data: { activeDjId: targetUserId } })
      await emitDjUpdate(params.roomId)
      return NextResponse.json({ success: true, activeDjId: targetUserId })

    } else {
      return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
    }
  } catch (error) {
    console.error('DJ management error:', error)
    return NextResponse.json({ error: 'DJ yönetimi hatası' }, { status: 500 })
  }
}
