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
    const { targetUserId, seatIndex, forceThrone, forceAssign } = body

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
        // If forceThrone and seat 0, displace the current occupant to next available seat
        if ((forceThrone && seatIndex === 0) || forceAssign) {
          // Find next empty seat for displaced user
          const allPresences = await prisma.chatPresence.findMany({
            where: { roomId, lastSeen: { gte: presenceTimeout }, seatIndex: { gte: 0, lt: 15 } },
            select: { seatIndex: true }
          })
          const occupiedSet = new Set(allPresences.map(p => p.seatIndex))
          let nextSeat = -1
          for (let i = 1; i < 15; i++) {
            if (!occupiedSet.has(i)) { nextSeat = i; break }
          }
          // Move displaced user to next seat (or -1 if all full)
          await prisma.chatPresence.update({
            where: { roomId_userId: { roomId, userId: seatTaken.userId } },
            data: { seatIndex: nextSeat }
          })
        } else {
          return NextResponse.json({ error: 'Bu koltuk zaten dolu' }, { status: 409 })
        }
      }
    }

    // Update the target user's seat (upsert in case no presence record yet)
    await prisma.chatPresence.upsert({
      where: { roomId_userId: { roomId, userId: actualTargetId } },
      update: { seatIndex, lastSeen: new Date() },
      create: { roomId, userId: actualTargetId, seatIndex, lastSeen: new Date() }
    })

    return NextResponse.json({ success: true, seatIndex })
  } catch (error) {
    console.error('Error updating seat:', error)
    return NextResponse.json({ error: 'Koltuk güncellenemedi' }, { status: 500 })
  }
}
