import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const comments = await prisma.videoStreamComment.findMany({
      where: { streamId: params.streamId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: {
            name: true,
            image: true
          }
        }
      }
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content } = await request.json()

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 })
    }

    const comment = await prisma.videoStreamComment.create({
      data: {
        streamId: params.streamId,
        userId: session.user.id,
        content: content.trim()
      },
      include: {
        user: {
          select: {
            name: true,
            image: true
          }
        }
      }
    })

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
