import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const streamId = request.nextUrl.searchParams.get('streamId')
    const recipientId = request.nextUrl.searchParams.get('recipientId')
    
    if (!streamId || !recipientId) {
      return NextResponse.json([])
    }

    // Get unprocessed signals for this recipient - extended to 60 seconds for reliability
    const signals = await prisma.videoStreamSignal.findMany({
      where: {
        streamId,
        receiverId: recipientId,
        processed: false,
        createdAt: {
          gte: new Date(Date.now() - 60000) // 60 seconds for better reliability
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 50
    })

    // Mark as processed immediately
    if (signals.length > 0) {
      await prisma.videoStreamSignal.updateMany({
        where: { id: { in: signals.map((s: any) => s.id) } },
        data: { processed: true }
      })
    }

    const result = signals.map((s: any) => {
      let data = {}
      try {
        data = JSON.parse(s.signalData)
      } catch (e) {
        console.error('Signal parse error:', e)
      }
      return {
        id: s.id,
        type: s.signalType,
        senderId: s.senderId,
        data,
        createdAt: s.createdAt
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Signal GET error:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { streamId, type, receiverId, data } = body

    if (!streamId || !type || !receiverId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get sender ID from session or use the viewerId from data
    const session = await getServerSession(authOptions)
    const senderId = session?.user?.id || data?.viewerId || `guest_${Date.now()}`

    // Store signal
    await prisma.videoStreamSignal.create({
      data: {
        streamId,
        senderId,
        receiverId,
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

// Cleanup old signals periodically (called internally)
export async function DELETE() {
  try {
    await prisma.videoStreamSignal.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 60000) // Delete signals older than 1 minute
        }
      }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
