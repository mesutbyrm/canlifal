import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { guardGatedRoom } from '@/lib/room-access-guard'

export const dynamic = 'force-dynamic'

// GET typing users in the room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params

    // Get users who are typing (lastTyping within last 3 seconds)
    const threeSecondsAgo = new Date(Date.now() - 3000)
    
    const typingPresences = await prisma.chatPresence.findMany({
      where: {
        roomId,
        isTyping: true,
        lastTyping: { gte: threeSecondsAgo }
      },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    })

    const typingUsers = typingPresences.map((p: any) => ({
      id: p.user.id,
      name: p.user.username || p.user.name || 'Misafir'
    }))

    return NextResponse.json({ typingUsers })
  } catch (error) {
    console.error('Error getting typing users:', error)
    return NextResponse.json({ typingUsers: [] })
  }
}

// POST typing status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const mobileUser = await authenticateRequest(request)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const typingUserId = mobileUser?.id || session?.user?.id
    
    if (!typingUserId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { roomId } = await params
    const gateDenied = await guardGatedRoom(roomId, { id: typingUserId, role: mobileUser?.role || (session?.user as any)?.role })
    if (gateDenied) return gateDenied
    const { isTyping } = await request.json()

    await prisma.chatPresence.upsert({
      where: {
        roomId_userId: {
          roomId,
          userId: typingUserId
        }
      },
      update: {
        isTyping: isTyping,
        lastTyping: isTyping ? new Date() : null,
        lastSeen: new Date()
      },
      create: {
        roomId,
        userId: typingUserId,
        isTyping: isTyping,
        lastTyping: isTyping ? new Date() : null
      }
    })

    // Emit typing event to in-memory bus for SSE consumers
    if (isTyping) {
      try {
        const { emitChatEvent } = await import('@/lib/chat-events')
        const userName = mobileUser?.name || session?.user?.name || 'User'
        emitChatEvent(roomId, 'typing', { userId: typingUserId, nickname: userName })
      } catch {}
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating typing status:', error)
    return NextResponse.json({ error: 'Failed to update typing status' }, { status: 500 })
  }
}
