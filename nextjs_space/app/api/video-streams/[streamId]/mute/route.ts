import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

// POST - Mute a viewer
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user is the broadcaster or a moderator
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId }
    })
    
    const isBroadcaster = stream?.userId === session.user.id
    const isModerator = await prisma.streamModerator.findUnique({
      where: {
        streamId_userId: {
          streamId: params.streamId,
          userId: session.user.id
        }
      }
    })
    
    if (!isBroadcaster && !isModerator) {
      return NextResponse.json({ error: 'Only broadcaster or moderator can mute viewers' }, { status: 403 })
    }
    
    const { viewerId, reason, expiresAt } = await request.json()
    
    // Create mute record
    const mutedViewer = await prisma.streamMutedViewer.upsert({
      where: {
        streamId_viewerId: {
          streamId: params.streamId,
          viewerId
        }
      },
      update: {
        mutedBy: session.user.id,
        reason: reason || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        mutedAt: new Date()
      },
      create: {
        streamId: params.streamId,
        viewerId,
        mutedBy: session.user.id,
        reason: reason || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    })
    
    return NextResponse.json(mutedViewer)
  } catch (error) {
    console.error('Error muting viewer:', error)
    return NextResponse.json({ error: 'Failed to mute viewer' }, { status: 500 })
  }
}

// DELETE - Unmute a viewer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user is the broadcaster or a moderator
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId }
    })
    
    const isBroadcaster = stream?.userId === session.user.id
    const isModerator = await prisma.streamModerator.findUnique({
      where: {
        streamId_userId: {
          streamId: params.streamId,
          userId: session.user.id
        }
      }
    })
    
    if (!isBroadcaster && !isModerator) {
      return NextResponse.json({ error: 'Only broadcaster or moderator can unmute viewers' }, { status: 403 })
    }
    
    const { viewerId } = await request.json()
    
    // Remove mute record
    await prisma.streamMutedViewer.deleteMany({
      where: {
        streamId: params.streamId,
        viewerId
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unmuting viewer:', error)
    return NextResponse.json({ error: 'Failed to unmute viewer' }, { status: 500 })
  }
}

// GET - List muted viewers
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const mutedViewers = await prisma.streamMutedViewer.findMany({
      where: { 
        streamId: params.streamId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    })
    
    return NextResponse.json(mutedViewers.map((m: { viewerId: string }) => m.viewerId))
  } catch (error) {
    console.error('Error fetching muted viewers:', error)
    return NextResponse.json({ error: 'Failed to fetch muted viewers' }, { status: 500 })
  }
}
