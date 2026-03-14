import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get received chat room gifts
    const chatGifts = await prisma.chatRoomGift.findMany({
      where: { recipientId: session.user.id },
      include: {
        sender: { select: { id: true, name: true, username: true, image: true } },
        giftType: { select: { name: true, icon: true, price: true } },
        room: { select: { nameTr: true, nameEn: true, slug: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    // Get totals
    const jetonTotal = await prisma.chatRoomGift.aggregate({
      where: { recipientId: session.user.id, currencyType: 'jeton' },
      _sum: { totalPrice: true }
    })
    const cfcTotal = await prisma.chatRoomGift.aggregate({
      where: { recipientId: session.user.id, currencyType: 'cfc' },
      _sum: { totalPrice: true }
    })

    return NextResponse.json({
      gifts: chatGifts.map(g => ({
        id: g.id,
        senderName: g.sender.name,
        senderUsername: g.sender.username,
        senderImage: g.sender.image,
        giftName: g.giftType.name,
        giftIcon: g.giftType.icon,
        amount: g.totalPrice,
        currencyType: g.currencyType,
        roomName: g.room.nameTr,
        roomSlug: g.room.slug,
        createdAt: g.createdAt
      })),
      totals: {
        jetonTotal: jetonTotal._sum.totalPrice || 0,
        cfcTotal: cfcTotal._sum.totalPrice || 0
      }
    })
  } catch (error) {
    console.error('Received gifts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
