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
    const period = searchParams.get('period') || 'all' // all, daily, weekly, monthly, yearly, custom
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    // Calculate date range based on period
    function getDateRange(): { from: Date | null; to: Date | null } {
      const now = new Date()
      if (period === 'daily') {
        const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
        return { from, to: now }
      }
      if (period === 'weekly') {
        const from = new Date(now)
        from.setDate(from.getDate() - 7)
        from.setHours(0, 0, 0, 0)
        return { from, to: now }
      }
      if (period === 'monthly') {
        const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
        return { from, to: now }
      }
      if (period === 'yearly') {
        const from = new Date(now.getFullYear(), 0, 1, 0, 0, 0)
        return { from, to: now }
      }
      if (period === 'custom' && fromParam) {
        const from = new Date(fromParam)
        from.setHours(0, 0, 0, 0)
        const to = toParam ? new Date(toParam) : now
        to.setHours(23, 59, 59, 999)
        return { from, to }
      }
      return { from: null, to: null }
    }

    const { from: dateFrom, to: dateTo } = getDateRange()
    const dateFilter = dateFrom && dateTo ? { createdAt: { gte: dateFrom, lte: dateTo } } : {}

    if (section === 'overview') {
      // Total CFC (credits) and Jeton across all users (always total, not filtered)
      const totals = await prisma.user.aggregate({
        _sum: { credits: true, jetonBalance: true },
      })

      // Total completed payments (revenue) - filtered by date
      const revenue = await prisma.payment.aggregate({
        where: { status: 'completed', ...dateFilter },
        _sum: { amount: true, creditsAwarded: true },
      })

      // Total gifts sent (StreamGift + ChatRoomGift + TellerGift) - filtered
      const streamGiftTotal = await prisma.streamGift.aggregate({
        where: dateFilter,
        _sum: { totalPrice: true },
      })
      const chatGiftTotal = await prisma.chatRoomGift.aggregate({
        where: dateFilter,
        _sum: { totalPrice: true, commissionAmount: true },
      })
      const tellerGiftTotal = await prisma.tellerGift.aggregate({
        where: dateFilter,
        _sum: { totalPrice: true },
      })

      // Live session total credits charged - filtered
      const sessionCharges = await prisma.liveSession.aggregate({
        where: { status: { in: ['completed', 'active'] }, ...dateFilter },
        _sum: { creditsCharged: true },
      })

      // Teller earnings - not easily filtered by date on the aggregate, 
      // so for filtered view we calculate from sessions
      let totalTellerEarnings = 0
      if (dateFrom && dateTo) {
        // When filtered, calculate from completed sessions in the period
        const sessionsInRange = await prisma.liveSession.findMany({
          where: { status: 'completed', ...dateFilter },
          select: { creditsCharged: true },
        })
        // Get commission rate 
        const commSetting = await prisma.platformSettings.findUnique({ where: { key: 'commission_rate' } })
        const commRate = commSetting ? parseInt(commSetting.value) : 20
        const totalCharged = sessionsInRange.reduce((s, x) => s + x.creditsCharged, 0)
        totalTellerEarnings = totalCharged - Math.floor(totalCharged * commRate / 100)
      } else {
        const tellerEarnings = await prisma.liveFortuneTeller.aggregate({
          _sum: { totalEarnings: true },
        })
        totalTellerEarnings = tellerEarnings._sum.totalEarnings || 0
      }

      // Total revenue from payments
      const totalRevenue = revenue._sum.amount || 0
      // Commission earned by platform from gifts
      const totalCommission = chatGiftTotal._sum.commissionAmount || 0

      const totalGiftSpent = (streamGiftTotal._sum.totalPrice || 0) + 
                             (chatGiftTotal._sum.totalPrice || 0) + 
                             (tellerGiftTotal._sum.totalPrice || 0)
      const totalSessionSpent = sessionCharges._sum.creditsCharged || 0

      // Manual profit adjustments from platform_settings
      const manualAdjSetting = await prisma.platformSettings.findUnique({
        where: { key: 'manual_profit_adjustment' },
      })
      const manualProfitAdjustment = manualAdjSetting ? parseFloat(manualAdjSetting.value) : 0

      // Platform profit: revenue - (total distributed to tellers) + manual adjustments
      const platformProfit = totalRevenue - totalTellerEarnings + (dateFrom ? 0 : manualProfitAdjustment)

      return NextResponse.json({
        totalCfc: totals._sum.credits || 0,
        totalJeton: totals._sum.jetonBalance || 0,
        totalRevenue,
        totalTellerEarnings,
        totalGiftSpent,
        totalSessionSpent,
        totalCommission,
        platformProfit,
        manualProfitAdjustment: dateFrom ? 0 : manualProfitAdjustment,
        period,
        dateFrom: dateFrom?.toISOString() || null,
        dateTo: dateTo?.toISOString() || null,
      })
    }

    if (section === 'commission-settings') {
      // Fetch all commission-related platform settings
      const keys = [
        'commission_rate',
        'broadcaster_commission_rate',
        'chat_room_default_commission_rate',
        'manual_profit_adjustment',
      ]
      const settings = await prisma.platformSettings.findMany({
        where: { key: { in: keys } },
      })
      const settingsMap: Record<string, string> = {}
      for (const s of settings) {
        settingsMap[s.key] = s.value
      }

      return NextResponse.json({
        // Canlı falcı seans komisyonu (platform keser)
        commission_rate: settingsMap['commission_rate'] || '20',
        // Canlı yayıncı hediye komisyonu (platform keser) 
        broadcaster_commission_rate: settingsMap['broadcaster_commission_rate'] || '20',
        // Sohbet odası hediye komisyonu default
        chat_room_default_commission_rate: settingsMap['chat_room_default_commission_rate'] || '0',
        // Manuel kar/zarar düzeltmesi
        manual_profit_adjustment: settingsMap['manual_profit_adjustment'] || '0',
      })
    }

    if (section === 'top-gift-receivers') {
      // Top users who received most gifts (ChatRoomGift recipients)
      const topReceivers = await prisma.chatRoomGift.groupBy({
        by: ['recipientId'],
        where: dateFilter,
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
        where: dateFilter,
        _sum: { totalPrice: true },
        _count: true,
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 30,
      })
      const streamSenders = await prisma.streamGift.groupBy({
        by: ['senderId'],
        where: dateFilter,
        _sum: { totalPrice: true },
        _count: true,
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 30,
      })
      const tellerSenders = await prisma.tellerGift.groupBy({
        by: ['senderId'],
        where: dateFilter,
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

// POST: Multiple actions - adjust user balance, update commission settings, manual profit adjustment
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    // Update a commission setting
    if (action === 'update-commission') {
      const { key, value } = body
      const allowedKeys = [
        'commission_rate',
        'broadcaster_commission_rate', 
        'chat_room_default_commission_rate',
      ]
      if (!allowedKeys.includes(key)) {
        return NextResponse.json({ error: 'Geçersiz ayar anahtarı' }, { status: 400 })
      }
      const numVal = parseInt(value)
      if (isNaN(numVal) || numVal < 0 || numVal > 100) {
        return NextResponse.json({ error: 'Oran 0-100 arasında olmalıdır' }, { status: 400 })
      }

      const descMap: Record<string, string> = {
        'commission_rate': 'Canlı falcı seans komisyon oranı (%)',
        'broadcaster_commission_rate': 'Canlı yayıncı hediye komisyon oranı (%)',
        'chat_room_default_commission_rate': 'Sohbet odası hediye komisyon oranı (%)',
      }

      await prisma.platformSettings.upsert({
        where: { key },
        update: { value: String(numVal) },
        create: { key, value: String(numVal), description: descMap[key] || key },
      })

      return NextResponse.json({ success: true, key, value: numVal })
    }

    // Manual profit/loss adjustment
    if (action === 'adjust-profit') {
      const { amount, reason } = body
      if (typeof amount !== 'number') {
        return NextResponse.json({ error: 'Geçersiz tutar' }, { status: 400 })
      }

      // Get current adjustment value
      const current = await prisma.platformSettings.findUnique({
        where: { key: 'manual_profit_adjustment' },
      })
      const currentVal = current ? parseFloat(current.value) : 0
      const newVal = currentVal + amount

      await prisma.platformSettings.upsert({
        where: { key: 'manual_profit_adjustment' },
        update: { value: String(newVal) },
        create: { key: 'manual_profit_adjustment', value: String(newVal), description: 'Manuel kar/zarar düzeltmesi (TRY)' },
      })

      // Log as a notification or in description
      if (reason) {
        // We append a history note to description
        const historyNote = `[${new Date().toISOString().slice(0, 16)}] ${amount > 0 ? '+' : ''}${amount} TRY: ${reason}`
        const existingDesc = current?.description || 'Manuel kar/zarar düzeltmesi (TRY)'
        const updatedDesc = existingDesc.includes('[') 
          ? existingDesc + ' | ' + historyNote 
          : historyNote
        await prisma.platformSettings.update({
          where: { key: 'manual_profit_adjustment' },
          data: { description: updatedDesc },
        })
      }

      return NextResponse.json({ success: true, newTotal: newVal })
    }

    // Default: adjust user balance (legacy behavior)
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

    // Auto-adjust platform profit based on jeton add/remove
    // Adding jeton = site cost (like selling jeton for free) → decrease profit
    // Removing jeton = site gain (reclaiming value) → increase profit
    if (currency === 'jeton') {
      // Get jeton_tl_rate to convert jeton to TRY
      const rateSetting = await prisma.platformSettings.findUnique({
        where: { key: 'jeton_tl_rate' },
      })
      const jetonRate = rateSetting ? parseFloat(rateSetting.value) : 0.5
      // amount > 0 means admin added jeton → cost to platform → subtract from profit
      // amount < 0 means admin removed jeton → gain for platform → add to profit
      const profitImpact = -(amount * jetonRate) // negative of jeton value in TRY

      const currentAdj = await prisma.platformSettings.findUnique({
        where: { key: 'manual_profit_adjustment' },
      })
      const currentAdjVal = currentAdj ? parseFloat(currentAdj.value) : 0
      const newAdjVal = currentAdjVal + profitImpact

      const adjNote = `[${new Date().toISOString().slice(0, 16)}] ${profitImpact > 0 ? '+' : ''}${profitImpact.toFixed(2)} TRY: Jeton ${amount > 0 ? 'ekleme' : 'çıkarma'} (${Math.abs(amount)} jeton → ${user.name || user.email})${reason ? ' - ' + reason : ''}`

      await prisma.platformSettings.upsert({
        where: { key: 'manual_profit_adjustment' },
        update: { 
          value: String(newAdjVal),
          description: currentAdj?.description 
            ? (currentAdj.description.includes('[') ? currentAdj.description + ' | ' + adjNote : adjNote)
            : adjNote
        },
        create: { key: 'manual_profit_adjustment', value: String(newAdjVal), description: adjNote },
      })
    }

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Finance POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
