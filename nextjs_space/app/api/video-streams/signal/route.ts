import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

// In-memory signal store (in production, use Redis)
const signalStore: Map<string, Array<{ id: string; type: string; data: string; timestamp: number }>> = new Map()

// Clean old signals periodically
setInterval(() => {
  const now = Date.now()
  signalStore.forEach((signals, roomId) => {
    const filtered = signals.filter(s => now - s.timestamp < 30000) // 30 seconds
    if (filtered.length === 0) {
      signalStore.delete(roomId)
    } else {
      signalStore.set(roomId, filtered)
    }
  })
}, 10000)

export async function GET(request: NextRequest) {
  try {
    const roomId = request.nextUrl.searchParams.get('roomId')
    if (!roomId) {
      return NextResponse.json({ error: 'roomId required' }, { status: 400 })
    }

    const signals = signalStore.get(roomId) || []
    // Return and clear signals
    signalStore.set(roomId, [])

    return NextResponse.json(signals.map(s => ({
      ...JSON.parse(s.data),
      id: s.id,
      type: s.type
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
    const { roomId, type, ...data } = body

    if (!roomId || !type) {
      return NextResponse.json({ error: 'roomId and type required' }, { status: 400 })
    }

    const signals = signalStore.get(roomId) || []
    signals.push({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data: JSON.stringify(data),
      timestamp: Date.now()
    })
    signalStore.set(roomId, signals)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Signal POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
