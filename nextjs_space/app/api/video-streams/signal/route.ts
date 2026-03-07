import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const streamId = request.nextUrl.searchParams.get('streamId')
    const role = request.nextUrl.searchParams.get('role') // 'broadcaster' or 'viewer'
    
    if (!streamId) {
      return NextResponse.json({ error: 'streamId required' }, { status: 400 })
    }

    // Get signals for this user
    const signals = await prisma.videoStreamSignal.findMany({
      where: {
        streamId,
        processed: false,
        ...(session?.user?.id ? { receiverId: session.user.id } : {})
      },
      orderBy: { createdAt: 'asc' },
      take: 50
    })

    // Mark as processed
    if (signals.length > 0) {
      await prisma.videoStreamSignal.updateMany({
        where: {
          id: { in: signals.map(s => s.id) }
        },
        data: { processed: true }
      })
    }

    return NextResponse.json(signals.map(s => ({
      id: s.id,
      type: s.signalType,
      senderId: s.senderId,
      ...JSON.parse(s.signalData)
    })))
  } catch (error) {
    console.error('Signal GET error:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { streamId, type, receiverId, ...data } = body

    if (!streamId || !type) {
      return NextResponse.json({ error: 'streamId and type required' }, { status: 400 })
    }

    // Store signal in database
    await prisma.videoStreamSignal.create({
      data: {
        streamId,
        senderId: session.user.id,
        receiverId: receiverId || null,
        signalType: type,
        signalData: JSON.stringify(data)
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Signal POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
