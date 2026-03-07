import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const streamId = request.nextUrl.searchParams.get('streamId')
    const recipientId = request.nextUrl.searchParams.get('recipientId') || session?.user?.id
    
    if (!streamId || !recipientId) {
      return NextResponse.json({ error: 'streamId and recipientId required' }, { status: 400 })
    }

    // Get unprocessed signals for this recipient
    const signals = await prisma.videoStreamSignal.findMany({
      where: {
        streamId,
        receiverId: recipientId,
        processed: false
      },
      orderBy: { createdAt: 'asc' },
      take: 20
    })

    // Mark as processed
    if (signals.length > 0) {
      await prisma.videoStreamSignal.updateMany({
        where: { id: { in: signals.map(s => s.id) } },
        data: { processed: true }
      })
    }

    return NextResponse.json(signals.map(s => ({
      id: s.id,
      type: s.signalType,
      senderId: s.senderId,
      data: JSON.parse(s.signalData)
    })))
  } catch (error) {
    console.error('Signal GET error:', error)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const senderId = session?.user?.id || `guest_${Date.now()}`

    const body = await request.json()
    const { streamId, type, receiverId, data } = body

    if (!streamId || !type) {
      return NextResponse.json({ error: 'streamId and type required' }, { status: 400 })
    }

    // Store signal
    await prisma.videoStreamSignal.create({
      data: {
        streamId,
        senderId,
        receiverId: receiverId || 'broadcaster',
        signalType: type,
        signalData: JSON.stringify(data || {})
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Signal POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
