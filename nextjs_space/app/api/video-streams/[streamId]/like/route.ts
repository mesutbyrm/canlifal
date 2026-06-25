import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

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
    // Each tap adds likes (no toggling - TikTok style)
    // Flutter sends { count } for batch likes; default to 1
    let count = 1
    try {
      const body = await request.json()
      if (body.count && typeof body.count === 'number' && body.count > 0) {
        count = Math.min(Math.floor(body.count), 100) // cap at 100 per request
      }
    } catch {}
    
    const stream = await prisma.videoStream.update({
      where: { id: params.streamId },
      data: { likeCount: { increment: count } },
      select: { likeCount: true }
    })

    return NextResponse.json({ likeCount: stream.likeCount })
  } catch (error) {
    console.error('Error adding like:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
