import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

const MAX_MODERATORS = 10

interface ModeratorUser {
  id: string
  name: string
  image: string | null
}

// GET - List moderators for a stream
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const moderators = await prisma.streamModerator.findMany({
      where: { streamId: params.streamId },
      orderBy: { addedAt: 'asc' }
    })
    
    // Fetch user details for each moderator
    const userIds = moderators.map((m: { userId: string }) => m.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true }
    })
    const userMap = new Map(users.map((u: ModeratorUser) => [u.id, u]))
    
    const result = moderators.map((m: { id: string; userId: string }) => ({
      id: m.id,
      userId: m.userId,
      user: userMap.get(m.userId) || { name: 'Unknown', image: null }
    }))
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching moderators:', error)
    return NextResponse.json({ error: 'Failed to fetch moderators' }, { status: 500 })
  }
}

// POST - Add a moderator
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user is the broadcaster
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId }
    })
    
    if (!stream || stream.userId !== session.user.id) {
      return NextResponse.json({ error: 'Only broadcaster can add moderators' }, { status: 403 })
    }
    
    // Check current moderator count
    const currentCount = await prisma.streamModerator.count({
      where: { streamId: params.streamId }
    })
    
    if (currentCount >= MAX_MODERATORS) {
      return NextResponse.json({ error: 'Maximum moderators reached' }, { status: 400 })
    }
    
    const { userId } = await request.json()
    
    // Add moderator
    const moderator = await prisma.streamModerator.create({
      data: {
        streamId: params.streamId,
        userId
      }
    })
    
    return NextResponse.json(moderator)
  } catch (error) {
    console.error('Error adding moderator:', error)
    return NextResponse.json({ error: 'Failed to add moderator' }, { status: 500 })
  }
}

// DELETE - Remove a moderator
export async function DELETE(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user is the broadcaster
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId }
    })
    
    if (!stream || stream.userId !== session.user.id) {
      return NextResponse.json({ error: 'Only broadcaster can remove moderators' }, { status: 403 })
    }
    
    const { userId } = await request.json()
    
    // Remove moderator
    await prisma.streamModerator.deleteMany({
      where: {
        streamId: params.streamId,
        userId
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing moderator:', error)
    return NextResponse.json({ error: 'Failed to remove moderator' }, { status: 500 })
  }
}
