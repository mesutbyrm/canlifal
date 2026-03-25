import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { logActivity } from '@/lib/activity-logger'
import { isExcludedFromFinance } from '@/lib/admin-check'

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
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
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

    // Check user jeton balance (stream gifts require jetons)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { jetonBalance: true }
    })

    if (!user || (user.jetonBalance ?? 0) < totalPrice) {
      return NextResponse.json({ error: 'Yetersiz jeton' }, { status: 400 })
    }

    // Get stream and broadcaster
    const stream = await prisma.videoStream.findUnique({
      where: { id: params.streamId },
      select: { userId: true }
    })

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 })
    }

    // Admin/yönetici kullanıcıların hediyeleri alıcıya bakiye olarak yansımaz
    const senderExcluded = await isExcludedFromFinance(session.user.id)

    const txOps: any[] = [
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
        data: { jetonBalance: { decrement: totalPrice } }
      }),
    ]

    // Sadece normal kullanıcıların hediyeleri yayıncıya bakiye olarak yansır
    if (!senderExcluded) {
      txOps.push(
        prisma.user.update({
          where: { id: stream.userId },
          data: { jetonBalance: { increment: Math.floor(totalPrice * 0.7) } }
        })
      )
    }

    const [gift] = await prisma.$transaction(txOps)

    // Log gift activity
    logActivity({
      userId: session.user.id,
      userName: session.user.name || 'Kullanıcı',
      userAvatar: (session.user as any)?.image || null,
      activityType: 'gift_sent',
      detail: `hediye gönderdi 🎁`,
      targetUrl: `/sohbet/video`,
    })

    return NextResponse.json({
      success: true,
      gift,
      newBalance: (user.jetonBalance ?? 0) - totalPrice
    })
  } catch (error) {
    console.error('Error sending gift:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
