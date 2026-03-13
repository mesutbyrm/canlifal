import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// Store voice signals in memory (for simplicity - in production use Redis)
const voiceSignals: Map<string, Array<{
  id: string
  fromUserId: string
  fromUserName: string
  toUserId: string | null // null means broadcast to all
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave'
  data: string
  createdAt: number
}>> = new Map()

// Active voice users per room
const activeVoiceUsers: Map<string, Map<string, { name: string, joinedAt: number }>> = new Map()

// Cleanup old signals (older than 30 seconds)
function cleanupOldSignals(roomId: string) {
  const signals = voiceSignals.get(roomId) || []
  const now = Date.now()
  const filtered = signals.filter(s => now - s.createdAt < 30000)
  voiceSignals.set(roomId, filtered)
}

// GET - Get pending signals for current user
export async function GET(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomId } = await params
    const { searchParams } = new URL(request.url)
    const since = parseInt(searchParams.get('since') || '0')

    cleanupOldSignals(roomId)

    const signals = voiceSignals.get(roomId) || []
    
    // Get signals for this user (either targeted to them or broadcast)
    const userSignals = signals.filter(s => 
      s.fromUserId !== session.user!.id && 
      s.createdAt > since &&
      (s.toUserId === null || s.toUserId === session.user!.id)
    )

    // Get active voice users
    const roomVoiceUsers = activeVoiceUsers.get(roomId) || new Map()
    const voiceUsers = Array.from(roomVoiceUsers.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      joinedAt: data.joinedAt
    }))

    return NextResponse.json({
      signals: userSignals,
      voiceUsers,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('Voice GET error:', error)
    return NextResponse.json({ error: 'Failed to get signals' }, { status: 500 })
  }
}

// POST - Send a signal
export async function POST(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Handle join/leave
    if (type === 'join') {
      if (!activeVoiceUsers.has(roomId)) {
        activeVoiceUsers.set(roomId, new Map())
      }
      activeVoiceUsers.get(roomId)!.set(session.user.id, {
        name: user?.name || 'Anonymous',
        joinedAt: Date.now()
      })
    } else if (type === 'leave') {
      activeVoiceUsers.get(roomId)?.delete(session.user.id)
    }

    // Store signal
    if (!voiceSignals.has(roomId)) {
      voiceSignals.set(roomId, [])
    }

    const signal = {
      id: `${session.user.id}-${Date.now()}`,
      fromUserId: session.user.id,
      fromUserName: user?.name || 'Anonymous',
      toUserId: toUserId || null,
      type,
      data: typeof data === 'string' ? data : JSON.stringify(data),
      createdAt: Date.now()
    }

    voiceSignals.get(roomId)!.push(signal)

    // Cleanup old signals
    cleanupOldSignals(roomId)

    return NextResponse.json({ success: true, timestamp: Date.now() })
  } catch (error) {
    console.error('Voice POST error:', error)
    return NextResponse.json({ error: 'Failed to send signal' }, { status: 500 })
  }
}
