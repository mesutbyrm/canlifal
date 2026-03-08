import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const { streamId } = params

    // Get all active viewers (these are anonymous viewers without user relations)
    const viewers = await prisma.videoStreamViewer.findMany({
      where: {
        streamId,
        leftAt: null
      },
      orderBy: {
        joinedAt: 'desc'
      },
      take: 50
    })

    // Get gift senders with user info
    const gifts = await prisma.streamGift.findMany({
      where: {
        streamId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        giftType: {
          select: {
            price: true
          }
        }
      }
    })

    // Calculate gift totals per user
    const giftTotals: Record<string, { user: { id: string; name: string | null; image: string | null }; total: number }> = {}
    gifts.forEach(gift => {
      const total = (gift.giftType.price * gift.quantity)
      if (!giftTotals[gift.senderId]) {
        giftTotals[gift.senderId] = {
          user: gift.sender,
          total: 0
        }
      }
      giftTotals[gift.senderId].total += total
    })

    // Create viewer list from gift senders (these are the people who have gifted)
    const gifterList = Object.values(giftTotals).map(item => ({
      id: item.user.id,
      name: item.user.name || 'User',
      image: item.user.image,
      hasGifted: true,
      totalGiftAmount: item.total
    }))

    // Create regular viewer list (anonymous viewers)
    const regularViewerList = viewers.map((viewer, idx) => ({
      id: viewer.viewerId,
      name: viewer.viewerName || `Viewer ${idx + 1}`,
      image: null,
      hasGifted: false,
      totalGiftAmount: 0
    }))

    // Combine and return - gifters first, then regular viewers
    const allViewers = [...gifterList, ...regularViewerList]

    return NextResponse.json(allViewers)
  } catch (error) {
    console.error('Error fetching viewers:', error)
    return NextResponse.json([], { status: 200 })
  }
}
