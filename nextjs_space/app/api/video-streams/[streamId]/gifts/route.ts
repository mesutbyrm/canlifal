import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

// Get recent gifts for a stream
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const gifts = await prisma.streamGift.findMany({
      where: { streamId: params.streamId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        sender: {
          select: { name: true, image: true }
        },
        giftType: true
      }
    })

    return NextResponse.json(gifts)
  } catch (error) {
    console.error('Error fetching gifts:', error)
    return NextResponse.json([], { status: 500 })
  }
}

// Send a gift
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { giftTypeId, quantity = 1 } = await request.json()

    if (!giftTypeId) {
      return NextResponse.json({ error: 'giftTypeId required' }, { status: 400 })
    }

    // Get gift type and check price
    const giftType = await prisma.giftType.findUnique({
      where: { id: giftTypeId }
    })

    if (!giftType || !giftType.isActive) {
      return NextResponse.json({ error: 'Invalid gift type' }, { status: 400 })
    }

    const totalPrice = giftType.price * quantity

    // Check user credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true }
    })

    if (!user || user.credits < totalPrice) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 400 })
    }

    // Get stream and broadcaster
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId },
      select: { userId: true }
    })

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 })
    }

    // Transaction: deduct credits from sender, create gift record, add credits to broadcaster
    const [gift] = await prisma.$transaction([
      prisma.streamGift.create({
        data: {
          streamId: params.streamId,
          senderId: session.user.id,
          giftTypeId,
          quantity,
          totalPrice
        },
        include: {
          sender: { select: { name: true, image: true } },
          giftType: true
        }
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { credits: { decrement: totalPrice } }
      }),
      // Give 70% to broadcaster
      prisma.user.update({
        where: { id: stream.userId },
        data: { credits: { increment: Math.floor(totalPrice * 0.7) } }
      })
    ])

    return NextResponse.json({
      success: true,
      gift,
      newBalance: user.credits - totalPrice
    })
  } catch (error) {
    console.error('Error sending gift:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
