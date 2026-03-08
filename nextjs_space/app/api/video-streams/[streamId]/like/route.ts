import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId },
      select: { likeCount: true }
    })

    return NextResponse.json({ likeCount: stream?.likeCount || 0 })
  } catch (error) {
    console.error('Error getting like count:', error)
    return NextResponse.json({ likeCount: 0 }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    // Allow both logged-in users and guests to like
    // Each tap adds a like (no toggling - TikTok style)
    
    const stream = await prisma.videoStream.update({
      where: { id: params.streamId },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true }
    })

    return NextResponse.json({ likeCount: stream.likeCount })
  } catch (error) {
    console.error('Error adding like:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
