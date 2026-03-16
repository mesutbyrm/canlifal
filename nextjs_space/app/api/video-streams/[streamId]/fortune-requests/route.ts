import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

interface FortuneRequestRecord {
  id: string
  userId: string
  nickname: string | null
  isHidden: boolean
  totalGiftAmount: number
}

interface UserRecord {
  id: string
  name: string
  image: string | null
}

// GET - List fortune requests for a stream (sorted by gift amount)
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const requests = await prisma.streamFortuneRequest.findMany({
      where: { 
        streamId: params.streamId,
        status: 'pending'
      },
      orderBy: { totalGiftAmount: 'desc' }
    })
    
    // Fetch user details for each request
    const userIds = requests.map((r: FortuneRequestRecord) => r.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true }
    })
    const userMap = new Map(users.map((u: UserRecord) => [u.id, u]))
    
    const result = requests.map((r: FortuneRequestRecord) => ({
      id: r.id,
      userId: r.userId,
      nickname: r.nickname,
      isHidden: r.isHidden,
      totalGiftAmount: r.totalGiftAmount,
      user: userMap.get(r.userId) || { name: 'Unknown', image: null }
    }))
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching fortune requests:', error)
    return NextResponse.json({ error: 'Failed to fetch fortune requests' }, { status: 500 })
  }
}

// POST - Create or update a fortune request
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { nickname, isHidden, giftAmount = 0 } = await request.json()
    
    // Upsert fortune request
    const fortuneRequest = await prisma.streamFortuneRequest.upsert({
      where: {
        streamId_userId: {
          streamId: params.streamId,
          userId: session.user.id
        }
      },
      update: {
        nickname: nickname || null,
        isHidden: isHidden || false,
        totalGiftAmount: { increment: giftAmount }
      },
      create: {
        streamId: params.streamId,
        userId: session.user.id,
        nickname: nickname || null,
        isHidden: isHidden || false,
        totalGiftAmount: giftAmount
      }
    })
    
    return NextResponse.json(fortuneRequest)
  } catch (error) {
    console.error('Error creating fortune request:', error)
    return NextResponse.json({ error: 'Failed to create fortune request' }, { status: 500 })
  }
}

// PATCH - Select or reject a fortune request
export async function PATCH(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user is the broadcaster or a moderator
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId }
    })
    
    const isBroadcaster = stream?.userId === session.user.id
    
    if (!isBroadcaster) {
      return NextResponse.json({ error: 'Only broadcaster can select fortune requests' }, { status: 403 })
    }
    
    const { requestId, action } = await request.json()
    
    if (action === 'select') {
      // Mark as selected and remove from list
      await prisma.streamFortuneRequest.update({
        where: { id: requestId },
        data: { 
          status: 'selected',
          selectedAt: new Date()
        }
      })
    } else if (action === 'reject') {
      await prisma.streamFortuneRequest.update({
        where: { id: requestId },
        data: { status: 'rejected' }
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating fortune request:', error)
    return NextResponse.json({ error: 'Failed to update fortune request' }, { status: 500 })
  }
}
