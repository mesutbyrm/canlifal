import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - List all rooms (including inactive) for admin
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create room (admin, free)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, description, icon } = await req.json()
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
        isActive: true
      }
    })

    return NextResponse.json({ success: true, room })
  } catch (error) {
    console.error('Admin create room error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update room
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { roomId, nameTr, nameEn, descTr, descEn, icon, isActive } = await req.json()
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

    const room = await prisma.chatRoom.update({
      where: { id: roomId },
      data: updateData
    })

    return NextResponse.json({ success: true, room })
  } catch (error) {
    console.error('Admin update room error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete room
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
