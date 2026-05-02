import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { ROLE_HIERARCHY } from '@/lib/chat-permissions'

export const dynamic = 'force-dynamic'

// PATCH - Move a user to a different seat (admin/owner only) or claim a seat for self
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { roomId } = await params
    const body = await request.json()
    const { targetUserId, seatIndex } = body

    if (typeof seatIndex !== 'number' || seatIndex < -1 || seatIndex >= 15) {
      return NextResponse.json({ error: 'Geçersiz koltuk numarası' }, { status: 400 })
    }

    const isSelfAction = targetUserId === session.user.id || !targetUserId
    const actualTargetId = targetUserId || session.user.id

    // If moving someone else, check admin/owner permission
    if (!isSelfAction) {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      })
      const isGlobalAdmin = ['admin', 'moderator', 'site_manager'].includes(currentUser?.role || '')

      const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: { ownerId: true }
      })
      const isOwner = room?.ownerId === session.user.id

      let myRoleLevel = 0
      if (!isGlobalAdmin && !isOwner) {
        const myRole = await prisma.chatUserRole.findUnique({
          where: { roomId_userId: { roomId, userId: session.user.id } }
        })
        myRoleLevel = myRole ? (ROLE_HIERARCHY[myRole.role as keyof typeof ROLE_HIERARCHY] || 0) : 0
      }

      // Need at least sop/owner/superadmin level to move others
      if (!isGlobalAdmin && !isOwner && myRoleLevel < ROLE_HIERARCHY['sop']) {
        return NextResponse.json({ error: 'Kullanıcıları taşıma yetkiniz yok' }, { status: 403 })
      }
    }

    // Check the seat is available (if claiming a seat, not vacating)
    if (seatIndex >= 0) {
      const presenceTimeout = new Date(Date.now() - 300000)
      const seatTaken = await prisma.chatPresence.findFirst({
        where: {
          roomId,
          seatIndex,
          lastSeen: { gte: presenceTimeout },
          userId: { not: actualTargetId }
        }
      })
      if (seatTaken) {
        return NextResponse.json({ error: 'Bu koltuk zaten dolu' }, { status: 409 })
      }
    }

    // Update the target user's seat
    await prisma.chatPresence.update({
      where: { roomId_userId: { roomId, userId: actualTargetId } },
      data: { seatIndex }
    })

    return NextResponse.json({ success: true, seatIndex })
  } catch (error) {
    console.error('Error updating seat:', error)
    return NextResponse.json({ error: 'Koltuk güncellenemedi' }, { status: 500 })
  }
}
