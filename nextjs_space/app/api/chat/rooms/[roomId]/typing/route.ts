import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST typing status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomId } = await params
    const { isTyping } = await request.json()

    await prisma.chatPresence.upsert({
      where: {
        roomId_userId: {
          roomId,
          userId: session.user.id
        }
      },
      update: {
        isTyping: isTyping,
        lastTyping: isTyping ? new Date() : null,
        lastSeen: new Date()
      },
      create: {
        roomId,
        userId: session.user.id,
        isTyping: isTyping,
        lastTyping: isTyping ? new Date() : null
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating typing status:', error)
    return NextResponse.json({ error: 'Failed to update typing status' }, { status: 500 })
  }
}
