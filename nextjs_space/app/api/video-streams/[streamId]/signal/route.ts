export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

/**
 * Per-stream WebRTC signal route.
 * Flutter expects /api/video-streams/{streamId}/signal
 * This mirrors the existing /api/video-streams/signal logic but
 * takes streamId from the URL path instead of query params.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const recipientId = request.nextUrl.searchParams.get('recipientId')
    if (!recipientId) return NextResponse.json([])

    const signals = await prisma.videoStreamSignal.findMany({
      where: {
        streamId: params.streamId,
        receiverId: recipientId,
        processed: false,
        createdAt: { gte: new Date(Date.now() - 60000) }
      },
      orderBy: { createdAt: 'asc' },
      take: 50
    })

    if (signals.length > 0) {
      await prisma.videoStreamSignal.updateMany({
        where: { id: { in: signals.map((s: any) => s.id) } },
        data: { processed: true }
      })
    }

    const result = signals.map((s: any) => {
      let data = {}
      try { data = JSON.parse(s.signalData) } catch {}
      return {
        id: s.id,
        type: s.signalType,
        senderId: s.senderId,
        data,
        createdAt: s.createdAt
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Per-stream signal GET error:', error)
    return NextResponse.json([])
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const body = await request.json()
    const { type, receiverId, data } = body
    const streamId = params.streamId

    if (!type || !receiverId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const authUser = await authenticateRequest(request)
    const senderId = authUser?.id || data?.viewerId || `guest_${Date.now()}`

    await prisma.videoStreamSignal.create({
      data: {
        streamId,
        senderId,
        receiverId,
        signalType: type,
        signalData: JSON.stringify(data || {})
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Per-stream signal POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    await prisma.videoStreamSignal.deleteMany({
      where: {
        streamId: params.streamId,
        createdAt: { lt: new Date(Date.now() - 60000) }
      }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
