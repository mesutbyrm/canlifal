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
      odUserId: item.user.id,
      name: item.user.name || 'User',
      image: item.user.image,
      hasGifted: true,
      totalGiftAmount: item.total
    }))

    // Get user info for logged-in viewers
    const viewerUserIds = viewers.map(v => v.viewerId).filter(id => !id.startsWith('guest_') && !id.startsWith('viewer_'))
    const viewerUsers = viewerUserIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: viewerUserIds } },
      select: { id: true, name: true, image: true }
    }) : []

    // Create regular viewer list
    const regularViewerList = viewers.map((viewer, idx) => {
      const user = viewerUsers.find(u => u.id === viewer.viewerId)
      const isLoggedIn = !viewer.viewerId.startsWith('guest_') && !viewer.viewerId.startsWith('viewer_')
      return {
        id: viewer.viewerId,
        odUserId: isLoggedIn ? viewer.viewerId : null,
        name: user?.name || viewer.viewerName || `Viewer ${idx + 1}`,
        image: user?.image || null,
        hasGifted: false,
        totalGiftAmount: 0
      }
    })

    // Filter out duplicates (users who are both gifters and viewers)
    const gifterIds = new Set(gifterList.map(g => g.id))
    const filteredRegularViewers = regularViewerList.filter(v => !gifterIds.has(v.id))

    // Combine and return - gifters first, then regular viewers
    const allViewers = [...gifterList, ...filteredRegularViewers]

    return NextResponse.json(allViewers)
  } catch (error) {
    console.error('Error fetching viewers:', error)
    return NextResponse.json([], { status: 200 })
  }
}
