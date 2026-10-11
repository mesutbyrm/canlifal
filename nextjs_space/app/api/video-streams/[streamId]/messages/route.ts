import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { moderateMessage } from '@/lib/girlive-bot'
import { emitStreamEvent } from '@/lib/stream-events'

export const dynamic = 'force-dynamic'

/**
 * GET /api/video-streams/:streamId/messages?since=<ISO8601>&limit=50
 * Fetch chat messages for a live stream.
 * Auth: optional (public viewing) but needed for mobile context.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const sinceParam = request.nextUrl.searchParams.get('since')
    const limitParam = request.nextUrl.searchParams.get('limit')
    const limit = Math.min(parseInt(limitParam || '50') || 50, 100)

    const where: any = { streamId: params.streamId }
    if (sinceParam) {
      const sinceDate = new Date(sinceParam)
      if (!isNaN(sinceDate.getTime())) {
        where.createdAt = { gt: sinceDate }
      }
    }

    // Use VideoStreamComment as the message store (existing model)
    const messages = await prisma.videoStreamComment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            membership: true,
          }
        }
      }
    })

    // Map to Flutter-expected format
    const items = messages.map((msg: any) => {
      const displayName = msg.isHidden ? (msg.nickname || 'Anonim') : (msg.nickname || msg.user?.name || 'Anonim')
      return {
        id: msg.id,
        streamId: msg.streamId,
        content: msg.content,
        createdAt: msg.createdAt,
        user: {
          id: msg.userId,
          name: displayName,
          nickname: msg.nickname || null,
          image: msg.isHidden ? null : msg.user?.image || null,
          role: msg.user?.role || 'user',
          membership: msg.user?.membership || null,
        }
      }
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('Stream messages GET error:', error)
    return NextResponse.json([], { status: 500 })
  }
}

/**
 * POST /api/video-streams/:streamId/messages
 * Send a chat message in a live stream.
 * Auth: Bearer JWT (mobile) or NextAuth session (web) — REQUIRED.
 * Body: { content } or { message } or { body } or { text }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const reqBody = await request.json()
    // Accept multiple field names for content
    const content = (reqBody.content || reqBody.message || reqBody.body || reqBody.text || '').trim()
    const nickname = reqBody.nickname || null
    const isHidden = reqBody.isHidden || false

    if (!content) {
      return NextResponse.json({ error: 'Mesaj içeriği gerekli' }, { status: 400 })
    }

    // Verify stream exists and is live
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId },
      select: { id: true, status: true }
    })
    if (!stream) {
      return NextResponse.json({ error: 'Yayın bulunamadı' }, { status: 404 })
    }
    if (stream.status !== 'live') {
      return NextResponse.json({ error: 'Yayın sona ermiş' }, { status: 400 })
    }

    // GirLive Bot — sunucu taraflı moderasyon
    const moderation = await moderateMessage({ scope: 'live_stream', scopeId: params.streamId, userId: authUser.id, text: content })
    if (!moderation.allowed) {
      return NextResponse.json(
        { error: moderation.message, code: 'MODERATION_BLOCKED', moderation: { verdict: moderation.verdict, severity: moderation.severity } },
        { status: 422 }
      )
    }

    // Create the message using existing VideoStreamComment model
    const comment = await prisma.videoStreamComment.create({
      data: {
        streamId: params.streamId,
        userId: authUser.id,
        content,
        nickname,
        isHidden,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
            membership: true,
          }
        }
      }
    })

    const displayName = isHidden ? (nickname || 'Anonim') : (nickname || comment.user?.name || 'Anonim')
    const messagePayload = {
      type: 'streamMessage',
      streamId: params.streamId,
      message: {
        id: comment.id,
        streamId: comment.streamId,
        content: comment.content,
        createdAt: comment.createdAt,
        user: {
          id: authUser.id,
          name: displayName,
          nickname: nickname || null,
          image: isHidden ? null : comment.user?.image || null,
          role: comment.user?.role || 'user',
          membership: comment.user?.membership || null,
        }
      }
    }

    // Emit to SSE listeners
    emitStreamEvent(params.streamId, 'streamMessage', messagePayload)

    return NextResponse.json(messagePayload.message)
  } catch (error) {
    console.error('Stream message POST error:', error)
    return NextResponse.json({ error: 'Mesaj gönderilemedi' }, { status: 500 })
  }
}
