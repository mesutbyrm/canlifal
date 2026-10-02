import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { welcomeUser } from '@/lib/girlive-bot'
import { emitStreamEvent } from '@/lib/stream-events'

export const dynamic = 'force-dynamic'

// POST: Join a stream as viewer
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    // Dual auth: mobile JWT or web session
    const authUser = await authenticateRequest(request)
    const viewerId = authUser?.id || `guest_${Date.now()}`
    const viewerName = authUser?.name || 'Misafir'

    // Upsert viewer record - handles re-joining after leaving
    const viewer = await prisma.videoStreamViewer.upsert({
      where: {
        streamId_viewerId: {
          streamId: params.streamId,
          viewerId
        }
      },
      update: {
        leftAt: null,
        viewerName,
        joinedAt: new Date()
      },
      create: {
        streamId: params.streamId,
        viewerId,
        viewerName
      }
    })

    // Update viewer count on stream
    await prisma.videoStream.update({
      where: { id: params.streamId },
      data: { viewerCount: { increment: 1 } }
    })

    // Get accurate count and emit viewerCount event
    const activeCount = await prisma.videoStreamViewer.count({
      where: { streamId: params.streamId, leftAt: null }
    })
    emitStreamEvent(params.streamId, 'viewerCount', {
      type: 'viewerCount',
      streamId: params.streamId,
      viewerCount: activeCount,
      viewers: activeCount,
    })

    if (authUser?.id) void welcomeUser('live_stream', params.streamId, authUser.id)

    return NextResponse.json({ viewerId: viewer.id, joined: true, viewerCount: activeCount })
  } catch (error) {
    console.error('Error joining stream:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/video-streams/:id/leave alias (Flutter uses POST for leave too)
// Also supports DELETE for backward compatibility
export async function DELETE(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    const viewerId = authUser?.id || request.nextUrl.searchParams.get('viewerId')

    if (!viewerId) {
      return NextResponse.json({ error: 'viewerId required' }, { status: 400 })
    }

    // Mark viewer as left
    await prisma.videoStreamViewer.updateMany({
      where: {
        streamId: params.streamId,
        viewerId,
        leftAt: null
      },
      data: { leftAt: new Date() }
    })

    // Update viewer count
    await prisma.videoStream.update({
      where: { id: params.streamId },
      data: { viewerCount: { decrement: 1 } }
    })

    // Get accurate count and emit viewerCount event
    const activeCount = await prisma.videoStreamViewer.count({
      where: { streamId: params.streamId, leftAt: null }
    })
    emitStreamEvent(params.streamId, 'viewerCount', {
      type: 'viewerCount',
      streamId: params.streamId,
      viewerCount: activeCount,
      viewers: activeCount,
    })

    return NextResponse.json({ left: true, viewerCount: activeCount })
  } catch (error) {
    console.error('Error leaving stream:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
