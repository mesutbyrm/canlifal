import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { isCursorMode, parseCursorParams, fetchCursorPage } from '@/lib/pagination'
import { apiPaginated } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const giftInclude = {
      sender: { select: { id: true, name: true, username: true, image: true } },
      giftType: { select: { name: true, icon: true, price: true } },
      room: { select: { nameTr: true, nameEn: true, slug: true } },
    }

    const mapGift = (g: any) => ({
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
      createdAt: g.createdAt,
    })

    // Opt-in imleç sayfalama (yalnızca ?cursor= / ?paginate=cursor ile)
    if (isCursorMode(req)) {
      const { cursor, limit } = parseCursorParams(req, 30, 100)
      const { items, meta } = await fetchCursorPage(
        (args) => prisma.chatRoomGift.findMany(args),
        cursor,
        limit,
        { where: { recipientId: auth.id }, include: giftInclude, orderBy: { createdAt: 'desc' } }
      )
      return apiPaginated(items.map(mapGift), meta)
    }

    // Get received chat room gifts
    const chatGifts = await prisma.chatRoomGift.findMany({
      where: { recipientId: auth.id },
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
      where: { recipientId: auth.id, currencyType: 'jeton' },
      _sum: { totalPrice: true }
    })
    const cfcTotal = await prisma.chatRoomGift.aggregate({
      where: { recipientId: auth.id, currencyType: 'cfc' },
      _sum: { totalPrice: true }
    })

    return NextResponse.json({
      gifts: chatGifts.map((g: any) => ({
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
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
