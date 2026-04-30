import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

interface FortuneRequestRecord {
  id: string
  userId: string
  typeId: string | null
  nickname: string | null
  isHidden: boolean
  question: string | null
  jetonAmount: number
  status: string
  createdAt: Date
  type: { name: string; nameEn: string; icon: string } | null
}

interface UserRecord {
  id: string
  name: string
  image: string | null
}

// GET - List fortune requests for a stream (sorted by jeton amount)
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
      include: {
        type: { select: { name: true, nameEn: true, icon: true } }
      },
      orderBy: { jetonAmount: 'desc' }
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
      typeId: r.typeId,
      typeName: r.type?.name || 'Genel Soru',
      typeNameEn: r.type?.nameEn || 'General Question',
      typeIcon: r.type?.icon || '☕',
      nickname: r.nickname,
      isHidden: r.isHidden,
      question: r.question,
      jetonAmount: r.jetonAmount,
      createdAt: r.createdAt,
      user: userMap.get(r.userId) || { name: 'Unknown', image: null }
    }))
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching fortune requests:', error)
    return NextResponse.json({ error: 'Failed to fetch fortune requests' }, { status: 500 })
  }
}

// POST - Create a fortune request (deducts jetons)
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    
    const { typeId, nickname, isHidden, question } = await request.json()
    
    // Check if user already has a pending request for this stream
    const existingRequest = await prisma.streamFortuneRequest.findUnique({
      where: {
        streamId_userId: {
          streamId: params.streamId,
          userId: session.user.id
        }
      }
    })
    
    if (existingRequest && existingRequest.status === 'pending') {
      return NextResponse.json({ 
        error: 'Zaten bekleyen bir fal isteğiniz var', 
        errorEn: 'You already have a pending fortune request' 
      }, { status: 400 })
    }
    
    // Get fortune request type and cost
    const fortuneType = await prisma.fortuneRequestType.findUnique({
      where: { id: typeId }
    })
    
    if (!fortuneType || !fortuneType.isActive) {
      return NextResponse.json({ 
        error: 'Geçersiz fal türü', 
        errorEn: 'Invalid fortune type' 
      }, { status: 400 })
    }
    
    // Check user's jeton balance
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { jetonBalance: true, role: true }
    })
    const isStaff = user?.role === 'admin' || user?.role === 'yonetici'
    
    if (!user || (!isStaff && user.jetonBalance < fortuneType.jetonCost)) {
      return NextResponse.json({ 
        error: 'Yetersiz jeton bakiyesi', 
        errorEn: 'Insufficient jeton balance',
        required: fortuneType.jetonCost,
        current: user?.jetonBalance || 0
      }, { status: 400 })
    }
    
    // Create request (and deduct jetons for non-staff)
    const txOps: any[] = []
    if (!isStaff) {
      txOps.push(
        prisma.user.update({
          where: { id: session.user.id },
          data: { jetonBalance: { decrement: fortuneType.jetonCost } }
        })
      )
    }
    txOps.push(
      prisma.streamFortuneRequest.upsert({
        where: {
          streamId_userId: {
            streamId: params.streamId,
            userId: session.user.id
          }
        },
        update: {
          typeId,
          nickname: nickname || null,
          isHidden: isHidden || false,
          question: question || null,
          jetonAmount: isStaff ? 0 : fortuneType.jetonCost,
          status: 'pending',
          refundedAt: null
        },
        create: {
          streamId: params.streamId,
          userId: session.user.id,
          typeId,
          nickname: nickname || null,
          isHidden: isHidden || false,
          question: question || null,
          jetonAmount: isStaff ? 0 : fortuneType.jetonCost
        }
      })
    )
    const txResult = await prisma.$transaction(txOps)
    const fortuneRequest = txResult[txResult.length - 1]
    
    return NextResponse.json({
      ...fortuneRequest,
      newBalance: isStaff ? (user.jetonBalance ?? 0) : (user.jetonBalance ?? 0) - fortuneType.jetonCost
    })
  } catch (error) {
    console.error('Error creating fortune request:', error)
    return NextResponse.json({ error: 'Failed to create fortune request' }, { status: 500 })
  }
}

// PATCH - Select, complete or refund a fortune request
export async function PATCH(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    
    // Check if user is the broadcaster
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId }
    })
    
    const isBroadcaster = stream?.userId === session.user.id
    
    if (!isBroadcaster) {
      return NextResponse.json({ error: 'Only broadcaster can manage fortune requests' }, { status: 403 })
    }
    
    const { requestId, action } = await request.json()
    
    // Get the request
    const fortuneRequest = await prisma.streamFortuneRequest.findUnique({
      where: { id: requestId }
    })
    
    if (!fortuneRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    
    if (action === 'select') {
      // Mark as selected - broadcaster is viewing this fortune
      await prisma.streamFortuneRequest.update({
        where: { id: requestId },
        data: { 
          status: 'selected',
          selectedAt: new Date()
        }
      })
      return NextResponse.json({ success: true, action: 'selected' })
    } 
    
    if (action === 'complete') {
      // Mark as completed - broadcaster has finished this fortune
      await prisma.streamFortuneRequest.update({
        where: { id: requestId },
        data: { 
          status: 'completed',
          completedAt: new Date()
        }
      })
      return NextResponse.json({ success: true, action: 'completed' })
    }
    
    if (action === 'refund') {
      // Refund the jetons to the user
      if (fortuneRequest.status === 'completed' || fortuneRequest.status === 'refunded') {
        return NextResponse.json({ error: 'Cannot refund completed or already refunded request' }, { status: 400 })
      }
      
      await prisma.$transaction([
        prisma.user.update({
          where: { id: fortuneRequest.userId },
          data: { jetonBalance: { increment: fortuneRequest.jetonAmount } }
        }),
        prisma.streamFortuneRequest.update({
          where: { id: requestId },
          data: { 
            status: 'refunded',
            refundedAt: new Date()
          }
        })
      ])
      
      return NextResponse.json({ success: true, action: 'refunded', amount: fortuneRequest.jetonAmount })
    }
    
    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
  } catch (error) {
    console.error('Error updating fortune request:', error)
    return NextResponse.json({ error: 'Failed to update fortune request' }, { status: 500 })
  }
}

// DELETE - Refund and cancel a fortune request (for user or when stream ends)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const refundAll = searchParams.get('refundAll') === 'true'
    
    // Refund all pending requests for a stream (when stream ends)
    if (refundAll) {
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
      }
      
      // Check if user is the broadcaster
      const stream = await prisma.videoStream.findUnique({
        where: { id: params.streamId }
      })
      
      if (stream?.userId !== session.user.id) {
        return NextResponse.json({ error: 'Only broadcaster can refund all' }, { status: 403 })
      }
      
      // Get all pending requests
      const pendingRequests = await prisma.streamFortuneRequest.findMany({
        where: { 
          streamId: params.streamId,
          status: 'pending'
        }
      })
      
      // Refund each user
      for (const req of pendingRequests) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: req.userId },
            data: { jetonBalance: { increment: req.jetonAmount } }
          }),
          prisma.streamFortuneRequest.update({
            where: { id: req.id },
            data: { 
              status: 'refunded',
              refundedAt: new Date()
            }
          })
        ])
      }
      
      return NextResponse.json({ 
        success: true, 
        refundedCount: pendingRequests.length,
        totalRefunded: pendingRequests.reduce((sum: any, r: any) => sum + r.jetonAmount, 0)
      })
    }
    
    // Refund single user's request (when user leaves)
    const targetUserId = userId || session?.user?.id
    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }
    
    const fortuneRequest = await prisma.streamFortuneRequest.findUnique({
      where: {
        streamId_userId: {
          streamId: params.streamId,
          userId: targetUserId
        }
      }
    })
    
    if (!fortuneRequest || fortuneRequest.status !== 'pending') {
      return NextResponse.json({ success: true, message: 'No pending request to refund' })
    }
    
    // Refund
    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUserId },
        data: { jetonBalance: { increment: fortuneRequest.jetonAmount } }
      }),
      prisma.streamFortuneRequest.update({
        where: { id: fortuneRequest.id },
        data: { 
          status: 'refunded',
          refundedAt: new Date()
        }
      })
    ])
    
    return NextResponse.json({ 
      success: true, 
      refunded: true,
      amount: fortuneRequest.jetonAmount
    })
  } catch (error) {
    console.error('Error refunding fortune request:', error)
    return NextResponse.json({ error: 'Failed to refund' }, { status: 500 })
  }
}
