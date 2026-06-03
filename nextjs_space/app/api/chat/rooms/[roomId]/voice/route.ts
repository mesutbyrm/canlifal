import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// Deterministic hash of a user ID → stable numeric UID (legacy, kept for DB compat)
function userIdToNumericUid(uid: string): number {
  let hash = 0
  for (let i = 0; i < uid.length; i++) {
    hash = ((hash << 5) - hash + uid.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 1000000000
}

// Cleanup inactive voice sessions (no ping in 30 seconds)
async function cleanupInactiveSessions(roomId: string) {
  const thirtySecondsAgo = new Date(Date.now() - 30000)
  await prisma.voiceSession.updateMany({
    where: {
      roomId,
      lastPing: { lt: thirtySecondsAgo },
      isActive: true
    },
    data: { isActive: false }
  })
}

// GET - Get active voice users list + update UID mapping
export async function GET(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const mobileUser = await authenticateRequest(request)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const currentUserId = mobileUser?.id || session?.user?.id
    const { roomId } = await params

    await cleanupInactiveSessions(roomId)

    // Get active voice users
    const voiceSessions = await prisma.voiceSession.findMany({
      where: { roomId, isActive: true },
      select: { userId: true, userName: true, agoraUid: true, joinedAt: true }
    })

    const voiceUsers = voiceSessions.map((s: any) => ({
      id: s.userId,
      name: s.userName,
      agoraUid: s.agoraUid || 0,
      joinedAt: s.joinedAt.getTime()
    }))

    // Update caller's ping if they're in voice
    if (currentUserId) {
      await prisma.voiceSession.updateMany({
        where: { roomId, userId: currentUserId, isActive: true },
        data: { lastPing: new Date() }
      })
    }

    return NextResponse.json({ voiceUsers, timestamp: Date.now() })
  } catch (error) {
    console.error('Voice GET error:', error)
    return NextResponse.json({ error: 'Ses kullanıcıları alınamadı' }, { status: 500 })
  }
}

// POST - Join or leave voice
export async function POST(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const mobileUserPost = await authenticateRequest(request)
    const sessionPost = !mobileUserPost ? await getServerSession(authOptions) : null
    const voiceUserId = mobileUserPost?.id || sessionPost?.user?.id
    
    if (!voiceUserId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { roomId } = await params
    const { type } = await request.json()

    // Verify user has voice permission (check role)
    const userRole = await prisma.chatUserRole.findUnique({
      where: { roomId_userId: { roomId, userId: voiceUserId } }
    })

    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { ownerId: true }
    })

    const user = await prisma.user.findUnique({
      where: { id: voiceUserId },
      select: { role: true, name: true }
    })

    const isOwner = room?.ownerId === voiceUserId
    const isGlobalAdmin = ['admin', 'moderator', 'site_manager'].includes(user?.role || '')
    const hasVoiceRole = userRole?.role && ['voice', 'op', 'sop', 'admin', 'founder', 'superadmin'].includes(userRole.role)

    if (!isOwner && !isGlobalAdmin && !hasVoiceRole) {
      return NextResponse.json({ error: 'No voice permission' }, { status: 403 })
    }

    const userName = user?.name || 'Anonymous'
    const numericUid = userIdToNumericUid(voiceUserId)

    if (type === 'join') {
      await prisma.voiceSession.upsert({
        where: { roomId_userId: { roomId, userId: voiceUserId } },
        create: {
          roomId,
          userId: voiceUserId,
          userName,
          agoraUid: numericUid, // Legacy field, kept for DB compat
          isActive: true
        },
        update: {
          userName,
          agoraUid: numericUid,
          isActive: true,
          lastPing: new Date(),
          joinedAt: new Date()
        }
      })

      return NextResponse.json({ success: true, timestamp: Date.now() })
    } else if (type === 'leave') {
      await prisma.voiceSession.updateMany({
        where: { roomId, userId: voiceUserId },
        data: { isActive: false }
      })

      return NextResponse.json({ success: true, timestamp: Date.now() })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Voice POST error:', error)
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 })
  }
}
