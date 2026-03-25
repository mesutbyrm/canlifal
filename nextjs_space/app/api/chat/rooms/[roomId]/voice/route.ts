import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// Cleanup old signals and inactive voice sessions
async function cleanupOldData(roomId: string) {
  const oneMinuteAgo = new Date(Date.now() - 60000)
  const thirtySecondsAgo = new Date(Date.now() - 30000)
  
  // Delete old signals
  await prisma.voiceSignal.deleteMany({
    where: {
      roomId,
      createdAt: { lt: oneMinuteAgo }
    }
  })
  
  // Mark inactive sessions (no ping in 30 seconds — gives enough buffer for network jitter)
  await prisma.voiceSession.updateMany({
    where: {
      roomId,
      lastPing: { lt: thirtySecondsAgo },
      isActive: true
    },
    data: { isActive: false }
  })
}

// GET - Get pending signals for current user and voice users list
export async function GET(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    const { roomId } = await params
    const { searchParams } = new URL(request.url)
    const since = parseInt(searchParams.get('since') || '0')
    const sinceDate = new Date(since)

    // Cleanup old data
    await cleanupOldData(roomId)

    // Get active voice users from database
    const voiceSessions = await prisma.voiceSession.findMany({
      where: {
        roomId,
        isActive: true
      },
      select: {
        userId: true,
        userName: true,
        joinedAt: true
      }
    })

    const voiceUsers = voiceSessions.map((s: any) => ({
      id: s.userId,
      name: s.userName,
      joinedAt: s.joinedAt.getTime()
    }))

    // If user is logged in, get their signals
    let userSignals: Array<{
      id: string
      fromUserId: string
      fromUserName: string
      toUserId: string | null
      type: string
      data: string | null
      createdAt: number
    }> = []
    
    if (session?.user?.id) {
      const signals = await prisma.voiceSignal.findMany({
        where: {
          roomId,
          fromUserId: { not: session.user.id },
          createdAt: { gt: sinceDate },
          OR: [
            { toUserId: null },
            { toUserId: session.user.id }
          ]
        },
        orderBy: { createdAt: 'asc' }
      })

      userSignals = signals.map((s: any) => ({
        id: s.id,
        fromUserId: s.fromUserId,
        fromUserName: s.fromUserName,
        toUserId: s.toUserId,
        type: s.type,
        data: s.data,
        createdAt: s.createdAt.getTime()
      }))

      // Mark signals as processed
      if (signals.length > 0) {
        await prisma.voiceSignal.updateMany({
          where: {
            id: { in: signals.map((s: any) => s.id) }
          },
          data: { processed: true }
        })
      }

      // Update user's ping if they're in voice
      await prisma.voiceSession.updateMany({
        where: {
          roomId,
          userId: session.user.id,
          isActive: true
        },
        data: { lastPing: new Date() }
      })
    }

    return NextResponse.json({
      signals: userSignals,
      voiceUsers,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('Voice GET error:', error)
    return NextResponse.json({ error: 'Sinyaller alınamadı' }, { status: 500 })
  }
}

// POST - Send a signal
export async function POST(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { roomId } = await params
    const { type, data, toUserId } = await request.json()

    // Verify user has voice permission (check role)
    const userRole = await prisma.chatUserRole.findUnique({
      where: { roomId_userId: { roomId, userId: session.user.id } }
    })
    
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { ownerId: true }
    })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true }
    })

    const isOwner = room?.ownerId === session.user.id
    const isAdmin = user?.role === 'admin'
    const hasVoiceRole = userRole?.role && ['voice', 'op', 'admin', 'founder'].includes(userRole.role)

    if (!isOwner && !isAdmin && !hasVoiceRole) {
      return NextResponse.json({ error: 'No voice permission' }, { status: 403 })
    }

    const userName = user?.name || 'Anonymous'

    // Handle join/leave with database
    if (type === 'join') {
      // Upsert voice session
      await prisma.voiceSession.upsert({
        where: {
          roomId_userId: { roomId, userId: session.user.id }
        },
        create: {
          roomId,
          userId: session.user.id,
          userName,
          isActive: true
        },
        update: {
          userName,
          isActive: true,
          lastPing: new Date(),
          joinedAt: new Date()
        }
      })
    } else if (type === 'leave') {
      // Mark session as inactive
      await prisma.voiceSession.updateMany({
        where: {
          roomId,
          userId: session.user.id
        },
        data: { isActive: false }
      })
    }

    // Store signal in database
    await prisma.voiceSignal.create({
      data: {
        roomId,
        fromUserId: session.user.id,
        fromUserName: userName,
        toUserId: toUserId || null,
        type,
        data: typeof data === 'string' ? data : (data ? JSON.stringify(data) : null)
      }
    })

    // Cleanup old data
    await cleanupOldData(roomId)

    return NextResponse.json({ success: true, timestamp: Date.now() })
  } catch (error) {
    console.error('Voice POST error:', error)
    return NextResponse.json({ error: 'Sinyal gönderilemedi' }, { status: 500 })
  }
}
