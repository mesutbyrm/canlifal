import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

// Join a stream as viewer
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const viewerId = session?.user?.id || `guest_${Date.now()}`
    const viewerName = session?.user?.name || 'Misafir'

    // Check if already viewing
    const existing = await prisma.videoStreamViewer.findFirst({
      where: {
        streamId: params.streamId,
        viewerId,
        leftAt: null
      }
    })

    if (existing) {
      return NextResponse.json({ viewerId: existing.id, alreadyJoined: true })
    }

    // Create viewer record
    const viewer = await prisma.videoStreamViewer.create({
      data: {
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

    return NextResponse.json({ viewerId: viewer.id, joined: true })
  } catch (error) {
    console.error('Error joining stream:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Leave a stream
export async function DELETE(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const viewerId = session?.user?.id || request.nextUrl.searchParams.get('viewerId')

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

    return NextResponse.json({ left: true })
  } catch (error) {
    console.error('Error leaving stream:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
