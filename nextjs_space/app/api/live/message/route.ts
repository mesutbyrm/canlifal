import { NextRequest, NextResponse } from 'next/server'
import { guardGatedRoom } from '@/lib/room-access-guard'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { canUserSpeak, getUserRole, ROLE_SYMBOLS } from '@/lib/chat-permissions'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { moderateMessage } from '@/lib/girlive-bot'

export const dynamic = 'force-dynamic'

/**
 * POST /api/live/message
 * Unified message sending for Flutter — supports both stream comments and voice room messages.
 *
 * Body: { roomId, roomType: 'stream' | 'voice', content }
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
        { status: 401 }
      )
    }

    // Rate limit: canlı mesaj
    const rateLimited = await guardRateLimit(request, 'chat_message', { userId: authUser.id })
    if (rateLimited) return rateLimited

    const body = await request.json()
    const { roomId, roomType, content } = body

    if (!roomId || !roomType || !content?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PARAMS', message: 'roomId, roomType ve content gerekli' } },
        { status: 400 }
      )
    }

    const trimmedContent = content.trim()
    if (trimmedContent.length > 500) {
      return NextResponse.json(
        { success: false, error: { code: 'MESSAGE_TOO_LONG', message: 'Mesaj en fazla 500 karakter olabilir' } },
        { status: 400 }
      )
    }

    if (roomType === 'stream') {
      // ── Stream comment ──
      const stream = await prisma.videoStream.findUnique({
        where: { id: roomId },
        select: { id: true, status: true }
      })
      if (!stream) {
        return NextResponse.json(
          { success: false, error: { code: 'ROOM_NOT_FOUND', message: 'Yayın bulunamadı' } },
          { status: 404 }
        )
      }
      if (stream.status !== 'live') {
        return NextResponse.json(
          { success: false, error: { code: 'STREAM_ENDED', message: 'Yayın sona ermiş' } },
          { status: 400 }
        )
      }

      // GirLive Bot — sunucu taraflı moderasyon
      const modS = await moderateMessage({ scope: 'live_stream', scopeId: roomId, userId: authUser.id, text: trimmedContent })
      if (!modS.allowed) {
        return NextResponse.json(
          { success: false, error: { code: 'MODERATION_BLOCKED', message: modS.message, verdict: modS.verdict, severity: modS.severity } },
          { status: 422 }
        )
      }

      const comment = await prisma.videoStreamComment.create({
        data: {
          streamId: roomId,
          userId: authUser.id,
          content: trimmedContent
        },
        include: {
          user: { select: { id: true, name: true, image: true } }
        }
      })

      return NextResponse.json({
        success: true,
        data: {
          id: comment.id || '',
          roomId: roomId || '',
          roomType: 'stream',
          userId: authUser.id || '',
          userName: comment.user?.name || 'Anonim',
          userImage: comment.user?.image || '',
          content: comment.content || '',
          chatRole: '',
          roleSymbol: '',
          createdAt: comment.createdAt?.toISOString?.() || comment.createdAt || '',
        }
      })
    } else {
      // ── Voice room message ──
      // Şifreli VIP oda: kapıdan geçmemiş kullanıcı YAZAMAZ
      const gateDeniedV = await guardGatedRoom(roomId, authUser)
      if (gateDeniedV) return gateDeniedV
      const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        select: { id: true, isMuted: true }
      })
      if (!room) {
        return NextResponse.json(
          { success: false, error: { code: 'ROOM_NOT_FOUND', message: 'Oda bulunamadı' } },
          { status: 404 }
        )
      }

      // Check speaking permission
      const speakCheck = await canUserSpeak(roomId, authUser.id)
      if (!speakCheck.canSpeak) {
        const errorMap: Record<string, string> = {
          banned: 'Bu odadan yasaklandınız',
          muted: 'Susturuldunuz',
          room_muted: 'Oda sessiz modunda. Sadece yetkili kullanıcılar yazabilir.'
        }
        return NextResponse.json(
          { success: false, error: { code: 'CANNOT_SPEAK', message: errorMap[speakCheck.reason || ''] || 'Mesaj gönderemezsiniz' } },
          { status: 403 }
        )
      }

      // GirLive Bot — sunucu taraflı moderasyon
      const modV = await moderateMessage({ scope: 'voice_room', scopeId: roomId, userId: authUser.id, text: trimmedContent })
      if (!modV.allowed) {
        return NextResponse.json(
          { success: false, error: { code: 'MODERATION_BLOCKED', message: modV.message, verdict: modV.verdict, severity: modV.severity } },
          { status: 422 }
        )
      }

      const message = await prisma.chatMessage.create({
        data: {
          roomId,
          userId: authUser.id,
          content: trimmedContent
        },
        include: {
          user: { select: { id: true, name: true, image: true, role: true, membership: true } }
        }
      })

      // Get user's room role
      const userRole = await getUserRole(roomId, authUser.id)
      const roleSymbol = userRole !== 'none' ? ROLE_SYMBOLS[userRole] || '' : ''

      // Update presence
      await prisma.chatPresence.upsert({
        where: { roomId_userId: { roomId, userId: authUser.id } },
        update: { lastSeen: new Date() },
        create: { roomId, userId: authUser.id }
      })

      // Emit SSE event
      try {
        const { emitChatEvent } = await import('@/lib/chat-events')
        emitChatEvent(roomId, 'message', {
          ...message,
          user: { ...message.user, chatRole: userRole !== 'none' ? userRole : null, roleSymbol }
        })
      } catch {}

      return NextResponse.json({
        success: true,
        data: {
          id: message.id || '',
          roomId: roomId || '',
          roomType: 'voice',
          userId: authUser.id || '',
          userName: message.user?.name || 'Anonim',
          userImage: message.user?.image || '',
          content: message.content || '',
          chatRole: userRole !== 'none' ? userRole : '',
          roleSymbol: roleSymbol || '',
          createdAt: message.createdAt?.toISOString?.() || message.createdAt || '',
        }
      })
    }
  } catch (error) {
    console.error('Error in POST /api/live/message:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Mesaj gönderilemedi' } },
      { status: 500 }
    )
  }
}

/**
 * GET /api/live/message?roomId=xxx&roomType=stream|voice&after=ISO&limit=100
 * Fetch messages/comments for a room.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const { searchParams } = request.nextUrl
    const roomId = searchParams.get('roomId')
    const roomType = searchParams.get('roomType') || 'voice'
    const after = searchParams.get('after')
    const limitParam = parseInt(searchParams.get('limit') || '100') || 100
    const limit = Math.min(limitParam, 200)

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PARAMS', message: 'roomId gerekli' } },
        { status: 400 }
      )
    }

    if (roomType === 'stream') {
      // Stream comments
      const where: any = { streamId: roomId }
      if (after) where.createdAt = { gt: new Date(after) }

      const comments = await prisma.videoStreamComment.findMany({
        where,
        orderBy: { createdAt: after ? 'asc' : 'desc' },
        take: limit,
        include: {
          user: { select: { id: true, name: true, image: true } }
        }
      })

      const messages = (after ? comments : comments.reverse()).map((c: any) => ({
        id: c.id || '',
        roomId: roomId || '',
        roomType: 'stream',
        userId: c.userId || '',
        userName: c.user?.name || 'Anonim',
        userImage: c.user?.image || '',
        content: c.content || '',
        chatRole: '',
        roleSymbol: '',
        createdAt: c.createdAt?.toISOString?.() || c.createdAt || '',
      }))

      return NextResponse.json({ success: true, data: { messages, totalCount: messages.length } })
    } else {
      // Voice room messages
      // Şifreli VIP oda: kapıdan geçmemiş kullanıcı mesajları OKUYAMAZ
      const gateDeniedG = await guardGatedRoom(roomId, authUser)
      if (gateDeniedG) return gateDeniedG
      const where: any = { roomId }
      if (after) where.createdAt = { gt: new Date(after) }

      const chatMessages = await prisma.chatMessage.findMany({
        where,
        orderBy: { createdAt: after ? 'asc' : 'desc' },
        take: limit,
        include: {
          user: { select: { id: true, name: true, image: true, role: true, membership: true } }
        }
      })

      // Get roles for all users
      const userIds = [...new Set(chatMessages.map((m: any) => m.userId))]
      const [userRoles, userPresences] = await Promise.all([
        prisma.chatUserRole.findMany({
          where: { roomId, userId: { in: userIds } },
          select: { userId: true, role: true }
        }),
        prisma.chatPresence.findMany({
          where: { roomId, userId: { in: userIds } },
          select: { userId: true, nickname: true }
        })
      ])
      const roleMap = new Map(userRoles.map((r: any) => [r.userId, r.role]))
      const nickMap = new Map(userPresences.map((p: any) => [p.userId, p.nickname]))

      const messages = (after ? chatMessages : chatMessages.reverse()).map((m: any) => {
        const globalAdminRoles = ['admin', 'moderator', 'site_manager']
        const chatRole = roleMap.get(m.userId) || (globalAdminRoles.includes(m.user?.role) ? 'superadmin' : null)
        const roleSymbol = chatRole ? ROLE_SYMBOLS[chatRole as keyof typeof ROLE_SYMBOLS] || '' : ''
        return {
          id: m.id || '',
          roomId: roomId || '',
          roomType: 'voice',
          userId: m.userId || '',
          userName: nickMap.get(m.userId) || m.user?.name || 'Anonim',
          userImage: m.user?.image || '',
          content: m.content || '',
          chatRole: chatRole || '',
          roleSymbol: roleSymbol || '',
          createdAt: m.createdAt?.toISOString?.() || m.createdAt || '',
        }
      })

      return NextResponse.json({ success: true, data: { messages, totalCount: messages.length } })
    }
  } catch (error) {
    console.error('Error in GET /api/live/message:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Mesajlar alınamadı' } },
      { status: 500 }
    )
  }
}
