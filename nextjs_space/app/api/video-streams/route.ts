import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const streams = await prisma.videoStream.findMany({
      where: { status: 'live' },
      orderBy: { startedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      }
    })

    // Get active viewer counts for each stream
    const streamIds = streams.map(s => s.id)
    const viewerCounts = await prisma.videoStreamViewer.groupBy({
      by: ['streamId'],
      where: {
        streamId: { in: streamIds },
        leftAt: null
      },
      _count: { id: true }
    })
    const viewerCountMap = new Map(viewerCounts.map(v => [v.streamId, v._count.id]))

    return NextResponse.json(streams.map(s => ({
      ...s,
      viewerCount: viewerCountMap.get(s.id) || 0,
      likeCount: s._count.likes,
      commentCount: s._count.comments
    })))
  } catch (error) {
    console.error('Error fetching streams:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, category } = await request.json()

    const stream = await prisma.videoStream.create({
      data: {
        userId: session.user.id,
        title,
        description,
        category: category || 'general',
        status: 'live'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })

    return NextResponse.json(stream)
  } catch (error) {
    console.error('Error creating stream:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
