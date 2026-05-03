import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST: Transfer room ownership to another user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { roomId } = await params
    const { newOwnerId } = await request.json()

    if (!newOwnerId || typeof newOwnerId !== 'string') {
      return NextResponse.json({ error: 'Yeni sahip belirtilmedi' }, { status: 400 })
    }

    // Get the room
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { id: true, ownerId: true, nameTr: true }
    })

    if (!room) {
      return NextResponse.json({ error: 'Oda bulunamadı' }, { status: 404 })
    }

    // Check if the user is the current owner or a global admin
    const isOwner = room.ownerId === session.user.id
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })
    const isGlobalAdmin = user?.role === 'admin' || user?.role === 'superadmin'

    if (!isOwner && !isGlobalAdmin) {
      return NextResponse.json({ error: 'Sadece oda sahibi sahipliği devredebilir' }, { status: 403 })
    }

    // Verify new owner exists
    const newOwner = await prisma.user.findUnique({
      where: { id: newOwnerId },
      select: { id: true, name: true, username: true }
    })

    if (!newOwner) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Cannot transfer to yourself
    if (newOwnerId === room.ownerId) {
      return NextResponse.json({ error: 'Zaten bu kullanıcı oda sahibi' }, { status: 400 })
    }

    // Transfer ownership
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { ownerId: newOwnerId }
    })

    // Set the new owner as founder role in the room
    await prisma.chatUserRole.upsert({
      where: {
        roomId_userId: { roomId, userId: newOwnerId }
      },
      create: {
        roomId,
        userId: newOwnerId,
        role: 'founder',
        grantedBy: session.user.id
      },
      update: {
        role: 'founder',
        grantedBy: session.user.id
      }
    })

    return NextResponse.json({
      success: true,
      message: `Oda sahipliği ${newOwner.name || newOwner.username} kullanıcısına devredildi`
    })
  } catch (error) {
    console.error('Error transferring room ownership:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
