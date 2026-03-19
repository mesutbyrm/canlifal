import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section') || 'overview'

    if (section === 'overview') {
      // Total CFC (credits) and Jeton across all users
      const totals = await prisma.user.aggregate({
        _sum: { credits: true, jetonBalance: true },
      })

      // Total completed payments (revenue)
      const revenue = await prisma.payment.aggregate({
        where: { status: 'completed' },
        _sum: { amount: true, creditsAwarded: true },
      })

      // Total gifts sent (StreamGift + ChatRoomGift + TellerGift)
      const streamGiftTotal = await prisma.streamGift.aggregate({
        _sum: { totalPrice: true },
      })
      const chatGiftTotal = await prisma.chatRoomGift.aggregate({
        _sum: { totalPrice: true, commissionAmount: true },
      })
      const tellerGiftTotal = await prisma.tellerGift.aggregate({
        _sum: { totalPrice: true },
      })

      // Teller earnings & commission
      const tellerEarnings = await prisma.liveFortuneTeller.aggregate({
        _sum: { totalEarnings: true },
      })

      // Live session total credits charged
      const sessionCharges = await prisma.liveSession.aggregate({
        where: { status: { in: ['completed', 'active'] } },
        _sum: { creditsCharged: true },
      })

      // Total revenue from payments
      const totalRevenue = revenue._sum.amount || 0
      // Total teller earnings (what tellers earned after commission)
      const totalTellerEarnings = tellerEarnings._sum.totalEarnings || 0
      // Commission earned by platform from gifts
      const totalCommission = chatGiftTotal._sum.commissionAmount || 0

      // Broadcaster percentage is commissionRate on each teller (default 20%)
      // Platform keeps: total spent - what goes to tellers
      const totalGiftSpent = (streamGiftTotal._sum.totalPrice || 0) + 
                             (chatGiftTotal._sum.totalPrice || 0) + 
                             (tellerGiftTotal._sum.totalPrice || 0)
      const totalSessionSpent = sessionCharges._sum.creditsCharged || 0

      // Platform profit: revenue - (total distributed to tellers)
      const platformProfit = totalRevenue - totalTellerEarnings

      return NextResponse.json({
        totalCfc: totals._sum.credits || 0,
        totalJeton: totals._sum.jetonBalance || 0,
        totalRevenue,
        totalTellerEarnings,
        totalGiftSpent,
        totalSessionSpent,
        totalCommission,
        platformProfit,
      })
    }

    if (section === 'top-gift-receivers') {
      // Top users who received most gifts (ChatRoomGift recipients)
      const topReceivers = await prisma.chatRoomGift.groupBy({
        by: ['recipientId'],
        _sum: { totalPrice: true, quantity: true },
        _count: true,
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 20,
      })

      const receiverIds = topReceivers.map((r) => r.recipientId)
      const users = await prisma.user.findMany({
        where: { id: { in: receiverIds } },
        select: { id: true, name: true, username: true, email: true, image: true },
      })
      const userMap = new Map(users.map((u) => [u.id, u]))

      return NextResponse.json(
        topReceivers.map((r) => ({
          user: userMap.get(r.recipientId) || { id: r.recipientId, name: 'Bilinmeyen' },
          totalReceived: r._sum.totalPrice || 0,
          totalQuantity: r._sum.quantity || 0,
          giftCount: r._count,
        }))
      )
    }

    if (section === 'top-gift-senders') {
      // Combine ChatRoomGift + StreamGift + TellerGift senders
      const chatSenders = await prisma.chatRoomGift.groupBy({
        by: ['senderId'],
        _sum: { totalPrice: true },
        _count: true,
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 30,
      })
      const streamSenders = await prisma.streamGift.groupBy({
        by: ['senderId'],
        _sum: { totalPrice: true },
        _count: true,
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 30,
      })
      const tellerSenders = await prisma.tellerGift.groupBy({
        by: ['senderId'],
        _sum: { totalPrice: true },
        _count: true,
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 30,
      })

      // Merge by senderId
      const senderMap = new Map<string, { total: number; count: number }>()
      for (const s of chatSenders) {
        const prev = senderMap.get(s.senderId) || { total: 0, count: 0 }
        senderMap.set(s.senderId, { total: prev.total + (s._sum.totalPrice || 0), count: prev.count + s._count })
      }
      for (const s of streamSenders) {
        const prev = senderMap.get(s.senderId) || { total: 0, count: 0 }
        senderMap.set(s.senderId, { total: prev.total + (s._sum.totalPrice || 0), count: prev.count + s._count })
      }
      for (const s of tellerSenders) {
        const prev = senderMap.get(s.senderId) || { total: 0, count: 0 }
        senderMap.set(s.senderId, { total: prev.total + (s._sum.totalPrice || 0), count: prev.count + s._count })
      }

      const sorted = Array.from(senderMap.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 20)

      const senderIds = sorted.map(([id]) => id)
      const users = await prisma.user.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, name: true, username: true, email: true, image: true },
      })
      const userMap = new Map(users.map((u) => [u.id, u]))

      return NextResponse.json(
        sorted.map(([id, data]) => ({
          user: userMap.get(id) || { id, name: 'Bilinmeyen' },
          totalSent: data.total,
          giftCount: data.count,
        }))
      )
    }

    if (section === 'top-jeton-holders') {
      const topHolders = await prisma.user.findMany({
        orderBy: { jetonBalance: 'desc' },
        take: 20,
        select: { id: true, name: true, username: true, email: true, image: true, jetonBalance: true, credits: true },
      })
      return NextResponse.json(topHolders)
    }

    if (section === 'top-cfc-holders') {
      const topHolders = await prisma.user.findMany({
        orderBy: { credits: 'desc' },
        take: 20,
        select: { id: true, name: true, username: true, email: true, image: true, jetonBalance: true, credits: true },
      })
      return NextResponse.json(topHolders)
    }

    return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
  } catch (error) {
    console.error('Finance API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST: Add/remove jeton or CFC for a user
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, amount, currency, reason } = body

    if (!userId || typeof amount !== 'number' || !currency) {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
    }

    const updateData = currency === 'jeton'
      ? { jetonBalance: { increment: amount } }
      : { credits: { increment: amount } }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, credits: true, jetonBalance: true },
    })

    // Log the transaction if it's jeton
    if (currency === 'jeton') {
      await prisma.jetonTransaction.create({
        data: {
          userId,
          amount,
          type: amount > 0 ? 'admin_add' : 'admin_remove',
          description: reason || (amount > 0 ? 'Admin tarafından eklendi' : 'Admin tarafından çıkarıldı'),
          balanceBefore: user.jetonBalance - amount,
          balanceAfter: user.jetonBalance,
        },
      })
    }

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Finance POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
