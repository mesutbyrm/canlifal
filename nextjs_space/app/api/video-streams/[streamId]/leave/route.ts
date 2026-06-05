import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { emitStreamEvent } from '@/lib/stream-events'

export const dynamic = 'force-dynamic'

/**
 * POST /api/video-streams/:streamId/leave
 * Leave a stream as viewer. Decrements viewer count.
 * Auth: Bearer JWT (mobile) or NextAuth session (web).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    let viewerId = authUser?.id

    // Try body for viewerId if not authenticated
    if (!viewerId) {
      try {
        const body = await request.json()
        viewerId = body.viewerId
      } catch {}
    }
    if (!viewerId) {
      viewerId = request.nextUrl.searchParams.get('viewerId') || undefined
    }

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

    // Get accurate count and emit
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
