import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getHybridSession(request)
    if (!session?.user?.id || !(await staffCan(session.user.role, (session?.user as any)?.id, 'moderation.room.manage', ['admin','yonetici','moderator','finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const status = request.nextUrl.searchParams.get('status') || 'all'
    
    const where: any = {}
    if (status !== 'all') {
      where.status = status
    }

    const streams = await prisma.videoStream.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true }
        },
        _count: {
          select: { viewers: true, comments: true, likes: true, gifts: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    // Get total gift earnings for each stream
    const streamsWithEarnings = await Promise.all(streams.map(async (stream: any) => {
      const giftSum = await prisma.streamGift.aggregate({
        where: { streamId: stream.id },
        _sum: { quantity: true }
      })
      
      // Get gift types to calculate total credits
      const gifts = await prisma.streamGift.findMany({
        where: { streamId: stream.id },
        include: { giftType: true }
      })
      
      const totalCredits = gifts.reduce((sum: number, g: any) => sum + g.giftType.price * g.quantity, 0)
      const broadcasterEarnings = Math.floor(totalCredits * 0.7)
      
      return {
        ...stream,
        totalGifts: giftSum._sum.quantity || 0,
        totalCredits,
        broadcasterEarnings
      }
    }))

    return NextResponse.json(streamsWithEarnings)
  } catch (error) {
    console.error('Admin video streams error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getHybridSession(request)
    if (!session?.user?.id || !(await staffCan(session.user.role, (session?.user as any)?.id, 'moderation.room.manage', ['admin','yonetici','moderator','finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { streamId } = await request.json()
    
    if (!streamId) {
      return NextResponse.json({ error: 'Stream ID required' }, { status: 400 })
    }

    // Delete related records first
    await prisma.videoStreamSignal.deleteMany({ where: { streamId } })
    await prisma.streamGift.deleteMany({ where: { streamId } })
    await prisma.videoStreamComment.deleteMany({ where: { streamId } })
    await prisma.videoStreamLike.deleteMany({ where: { streamId } })
    await prisma.videoStreamViewer.deleteMany({ where: { streamId } })
    
    // Delete the stream
    await prisma.videoStream.delete({ where: { id: streamId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete stream error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getHybridSession(request)
    if (!session?.user?.id || !(await staffCan(session.user.role, (session?.user as any)?.id, 'moderation.room.manage', ['admin','yonetici','moderator','finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { streamId, action } = await request.json()
    
    if (!streamId || !action) {
      return NextResponse.json({ error: 'Stream ID and action required' }, { status: 400 })
    }

    if (action === 'end') {
      await prisma.videoStream.update({
        where: { id: streamId },
        data: { status: 'ended', endedAt: new Date() }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update stream error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
