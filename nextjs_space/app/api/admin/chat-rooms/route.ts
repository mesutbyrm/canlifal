import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { emitRoomClosed } from '@/lib/voice-room-events'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// GET - List all rooms (including inactive) for admin
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (!(await staffCan(user?.role, (session?.user as any)?.id, 'moderation.room.manage', ['admin','yonetici','moderator','finans']))) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }

    const rooms = await prisma.chatRoom.findMany({
      include: {
        owner: { select: { id: true, name: true, username: true } },
        _count: { select: { messages: true, chatGifts: true, presences: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(rooms)
  } catch (error) {
    console.error('Admin chat rooms error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// POST - Create room (admin, free)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (!(await staffCan(user?.role, (session?.user as any)?.id, 'moderation.room.manage', ['admin','yonetici','moderator','finans']))) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }

    const { name, description, icon, roomType: reqRoomType } = await req.json()
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    let baseSlug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 50)
    if (!baseSlug) baseSlug = 'oda'
    let slug = baseSlug
    let counter = 1
    while (await prisma.chatRoom.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const room = await prisma.chatRoom.create({
      data: {
        slug,
        nameEn: name,
        nameTr: name,
        descEn: description || '',
        descTr: description || '',
        icon: icon || '💬',
        isActive: true,
        roomType: ['FREE', 'NORMAL', 'VIP'].includes(reqRoomType) ? reqRoomType : 'FREE'
      }
    })

    return NextResponse.json({ success: true, room })
  } catch (error) {
    console.error('Admin create room error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// PUT - Update room (including owner assignment)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (!(await staffCan(user?.role, (session?.user as any)?.id, 'moderation.room.manage', ['admin','yonetici','moderator','finans']))) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }

    const { roomId, nameTr, nameEn, descTr, descEn, icon, isActive, ownerId, giftCommissionPercent, isMuted, backgroundImage, roomType } = await req.json()
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (nameTr !== undefined) updateData.nameTr = nameTr
    if (nameEn !== undefined) updateData.nameEn = nameEn
    if (descTr !== undefined) updateData.descTr = descTr
    if (descEn !== undefined) updateData.descEn = descEn
    if (icon !== undefined) updateData.icon = icon
    if (isActive !== undefined) updateData.isActive = isActive
    if (typeof isMuted === 'boolean') updateData.isMuted = isMuted
    if (backgroundImage !== undefined) updateData.backgroundImage = backgroundImage || null
    if (roomType !== undefined && ['FREE', 'NORMAL', 'VIP'].includes(roomType)) {
      updateData.roomType = roomType
    }
    if (giftCommissionPercent !== undefined) {
      const pct = Math.max(0, Math.min(100, parseInt(giftCommissionPercent) || 0))
      updateData.giftCommissionPercent = pct
    }
    
    // Handle owner assignment
    if (ownerId !== undefined) {
      if (ownerId === null || ownerId === '') {
        updateData.ownerId = null
      } else {
        // Verify the user exists
        const ownerUser = await prisma.user.findUnique({ where: { id: ownerId } })
        if (!ownerUser) {
          return NextResponse.json({ error: 'Owner user not found' }, { status: 400 })
        }
        updateData.ownerId = ownerId
        
        // Also give them founder role in the room
        await prisma.chatUserRole.upsert({
          where: { roomId_userId: { roomId, userId: ownerId } },
          update: { role: 'founder' },
          create: { roomId, userId: ownerId, role: 'founder' }
        })
      }
    }

    const room = await prisma.chatRoom.update({
      where: { id: roomId },
      data: updateData,
      include: {
        owner: { select: { id: true, name: true, username: true } }
      }
    })

    // If the room was just deactivated, tell everyone it closed (web + Flutter)
    if (isActive === false) {
      emitRoomClosed(roomId)
    }

    return NextResponse.json({ success: true, room })
  } catch (error) {
    console.error('Admin update room error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// DELETE - Delete room
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (!(await staffCan(user?.role, (session?.user as any)?.id, 'moderation.room.manage', ['admin','yonetici','moderator','finans']))) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }

    let roomId: string | null = null
    try {
      const body = await req.json()
      roomId = body.roomId
    } catch {
      const { searchParams } = new URL(req.url)
      roomId = searchParams.get('roomId')
    }
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID required' }, { status: 400 })
    }

    // Tell everyone the room is closing before we tear it down (web + Flutter)
    emitRoomClosed(roomId)

    // Delete related records first
    await prisma.chatRoomGift.deleteMany({ where: { roomId } })
    await prisma.chatMessage.deleteMany({ where: { roomId } })
    await prisma.chatPresence.deleteMany({ where: { roomId } })
    await prisma.chatUserRole.deleteMany({ where: { roomId } })
    await prisma.chatMute.deleteMany({ where: { roomId } })
    await prisma.chatBan.deleteMany({ where: { roomId } })
    await prisma.chatRoom.delete({ where: { id: roomId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin delete room error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
