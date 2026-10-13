import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { getExcludedUserIds } from '@/lib/admin-check'
import { invalidateCachePrefix } from '@/lib/cache'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !(await staffCan(session?.user?.role, (session?.user as any)?.id, 'finance.report.view', ['admin','yonetici','moderator','finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
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
      // Admin/yönetici kullanıcıların işlemlerini kar/zarar hesabından hariç tut
      const excludedUserIds = await getExcludedUserIds()
      const excludeSenderFilter = excludedUserIds.length > 0 ? { senderId: { notIn: excludedUserIds } } : {}
      const excludeUserFilter = excludedUserIds.length > 0 ? { userId: { notIn: excludedUserIds } } : {}

      // Total CFC (credits) and Jeton across all users (always total, not filtered)
      const totals = await prisma.user.aggregate({
        _sum: { credits: true, jetonBalance: true },
      })

      // Total completed payments (revenue) - filtered by date
      const revenue = await prisma.payment.aggregate({
        where: { status: 'completed', ...dateFilter },
        _sum: { amount: true, creditsAwarded: true },
      })

      // Total gifts sent (StreamGift + ChatRoomGift + TellerGift) - filtered, admin/yönetici hariç
      const streamGiftTotal = await prisma.streamGift.aggregate({
        where: { ...dateFilter, ...excludeSenderFilter },
        _sum: { totalPrice: true },
      })
      const chatGiftTotal = await prisma.chatRoomGift.aggregate({
        where: { ...dateFilter, ...excludeSenderFilter },
        _sum: { totalPrice: true, commissionAmount: true },
      })
      const tellerGiftTotal = await prisma.tellerGift.aggregate({
        where: { ...dateFilter, ...excludeSenderFilter },
        _sum: { totalPrice: true },
      })

      // Live session total credits charged - filtered, admin/yönetici hariç
      const sessionCharges = await prisma.liveSession.aggregate({
        where: { status: { in: ['completed', 'active'] }, ...dateFilter, ...excludeUserFilter },
        _sum: { creditsCharged: true },
      })

      // Bana Özel harcamaları - admin/yönetici hariç
      const banaOzelSpent = await prisma.banaOzelHistory.aggregate({
        where: { ...dateFilter, ...excludeUserFilter },
        _sum: { jetonSpent: true },
        _count: true,
      })

      // Üyelik satın alma (jeton ile) - admin/yönetici hariç
      const membershipPurchases = await prisma.membershipPurchase.aggregate({
        where: { status: 'active', ...dateFilter, ...excludeUserFilter },
        _sum: { pricePaid: true },
        _count: true,
      }).catch(() => ({ _sum: { pricePaid: 0 }, _count: 0 }))

      // Jeton transaction bazlı kaynak analizi - admin/yönetici hariç
      const jetonSpendByType = await prisma.jetonTransaction.groupBy({
        by: ['type'],
        where: { amount: { lt: 0 }, ...dateFilter, ...excludeUserFilter },
        _sum: { amount: true },
        _count: true,
      }).catch(() => [])

      // Jeton gelir kaynak analizi - admin/yönetici hariç
      const jetonIncomeByType = await prisma.jetonTransaction.groupBy({
        by: ['type'],
        where: { amount: { gt: 0 }, ...dateFilter, ...excludeUserFilter },
        _sum: { amount: true },
        _count: true,
      }).catch(() => [])

      // Teller earnings - not easily filtered by date on the aggregate, 
      // so for filtered view we calculate from sessions
      let totalTellerEarnings = 0
      const commSetting = await prisma.platformSettings.findUnique({ where: { key: 'commission_rate' } })
      const commRate = commSetting ? parseInt(commSetting.value) : 20
      const broadcasterCommSetting = await prisma.platformSettings.findUnique({ where: { key: 'broadcaster_commission_rate' } })
      const broadcasterCommRate = broadcasterCommSetting ? parseInt(broadcasterCommSetting.value) : 20

      if (dateFrom && dateTo) {
        const sessionsInRange = await prisma.liveSession.findMany({
          where: { status: 'completed', ...dateFilter, ...excludeUserFilter },
          select: { creditsCharged: true },
        })
        const totalCharged = sessionsInRange.reduce((s: any, x: any) => s + x.creditsCharged, 0)
        totalTellerEarnings = totalCharged - Math.floor(totalCharged * commRate / 100)
      } else {
        // Tüm seanslardan admin/yönetici hariç hesapla
        const allSessions = await prisma.liveSession.findMany({
          where: { status: 'completed', ...excludeUserFilter },
          select: { creditsCharged: true },
        })
        const totalCharged = allSessions.reduce((s: any, x: any) => s + (x.creditsCharged || 0), 0)
        totalTellerEarnings = totalCharged - Math.floor(totalCharged * commRate / 100)
      }

      // Total revenue from payments
      const totalRevenue = revenue._sum.amount || 0
      // Commission earned by platform from gifts
      const totalCommission = chatGiftTotal._sum.commissionAmount || 0

      const streamGiftSpent = streamGiftTotal._sum.totalPrice || 0
      const chatGiftSpent = chatGiftTotal._sum.totalPrice || 0
      const tellerGiftSpent = tellerGiftTotal._sum.totalPrice || 0
      const totalGiftSpent = streamGiftSpent + chatGiftSpent + tellerGiftSpent
      const totalSessionSpent = sessionCharges._sum.creditsCharged || 0
      const totalBanaOzelSpent = banaOzelSpent._sum.jetonSpent || 0
      const totalMembershipSpent = membershipPurchases._sum.pricePaid || 0

      // Platform komisyon gelirleri detaylı
      const streamCommission = Math.floor(streamGiftSpent * broadcasterCommRate / 100) // Yayıncıdan kesilen
      const sessionCommission = Math.floor(totalSessionSpent * commRate / 100) // Falcıdan kesilen
      const chatCommission = totalCommission // Sohbet odası komisyonu

      // Siteye kalan toplam (tüm jeton harcamalarından kullanıcılara dağıtılan düşülür)
      const totalDistributed = totalTellerEarnings + Math.floor(streamGiftSpent * (100 - broadcasterCommRate) / 100)
      const totalBurnedJetons = totalBanaOzelSpent + totalMembershipSpent // Bu jetonlar tamamen siteye kalır

      // Manual profit adjustments from platform_settings
      const manualAdjSetting = await prisma.platformSettings.findUnique({
        where: { key: 'manual_profit_adjustment' },
      })
      const manualProfitAdjustment = manualAdjSetting ? parseFloat(manualAdjSetting.value) : 0

      // Platform jeton profit: komisyonlar + yakılan jetonlar (Bana Özel, üyelik gibi siteye kalan)
      // Bu hesap jeton bazlıdır - sitenin jeton olarak ne kadar kazandığını gösterir
      const platformJetonProfit = streamCommission + sessionCommission + chatCommission + totalBurnedJetons
      
      // TRY bazlı platform karı: gelir - (falcılara/yayıncılara ödenmesi gereken)
      const platformProfit = platformJetonProfit

      // Jeton spend/income breakdowns
      const jetonSpendBreakdown: Record<string, { amount: number; count: number }> = {}
      for (const item of jetonSpendByType) {
        jetonSpendBreakdown[item.type] = { amount: Math.abs(item._sum.amount || 0), count: item._count }
      }
      const jetonIncomeBreakdown: Record<string, { amount: number; count: number }> = {}
      for (const item of jetonIncomeByType) {
        jetonIncomeBreakdown[item.type] = { amount: item._sum.amount || 0, count: item._count }
      }

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
        // Detaylı jeton harcama kaynakları
        breakdown: {
          streamGiftSpent,
          chatGiftSpent,
          tellerGiftSpent,
          sessionSpent: totalSessionSpent,
          banaOzelSpent: totalBanaOzelSpent,
          membershipSpent: totalMembershipSpent,
          banaOzelCount: banaOzelSpent._count || 0,
          membershipCount: (membershipPurchases as any)?._count || 0,
        },
        // Platform komisyon detayları
        commissions: {
          streamCommission,
          sessionCommission,
          chatCommission,
          totalBurnedJetons,
          commissionRate: commRate,
          broadcasterCommRate,
        },
        // Jeton akış analizi
        jetonSpendBreakdown,
        jetonIncomeBreakdown,
      })
    }

    if (section === 'daily-revenue') {
      // Son 30 günlük günlük gelir trendi
      const excludedUserIds = await getExcludedUserIds()
      const excludeUserFilter = excludedUserIds.length > 0 ? { userId: { notIn: excludedUserIds } } : {}
      const excludeSenderFilter = excludedUserIds.length > 0 ? { senderId: { notIn: excludedUserIds } } : {}
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      thirtyDaysAgo.setHours(0, 0, 0, 0)

      // Günlük jeton harcama (negatif transactions) - raw SQL for groupBy date
      const dailySpend = (await prisma.$queryRawUnsafe(`
        SELECT DATE(created_at) as date, SUM(ABS(amount)) as total
        FROM jeton_transactions 
        WHERE amount < 0 AND created_at >= $1
        ${excludedUserIds.length > 0 ? `AND user_id NOT IN (${excludedUserIds.map(id => `'${id}'`).join(',')})` : ''}
        GROUP BY DATE(created_at) ORDER BY date ASC
      `, thirtyDaysAgo).catch(() => [])) as any[]

      // Günlük jeton gelir (pozitif transactions)
      const dailyIncome = (await prisma.$queryRawUnsafe(`
        SELECT DATE(created_at) as date, SUM(amount) as total
        FROM jeton_transactions 
        WHERE amount > 0 AND created_at >= $1
        ${excludedUserIds.length > 0 ? `AND user_id NOT IN (${excludedUserIds.map(id => `'${id}'`).join(',')})` : ''}
        GROUP BY DATE(created_at) ORDER BY date ASC
      `, thirtyDaysAgo).catch(() => [])) as any[]

      // Günlük TRY gelir (ödemeler)
      const dailyPayments = (await prisma.$queryRawUnsafe(`
        SELECT DATE(created_at) as date, SUM(amount) as total, COUNT(*) as count
        FROM payments 
        WHERE status = 'completed' AND created_at >= $1
        GROUP BY DATE(created_at) ORDER BY date ASC
      `, thirtyDaysAgo).catch(() => [])) as any[]

      // Son 30 gün tarih listesi oluştur
      const days: { date: string; jetonSpend: number; jetonIncome: number; tryRevenue: number; paymentCount: number }[] = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const spend = dailySpend.find((r: any) => {
          const rDate = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0]
          return rDate === dateStr
        })
        const income = dailyIncome.find((r: any) => {
          const rDate = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0]
          return rDate === dateStr
        })
        const payment = dailyPayments.find((r: any) => {
          const rDate = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0]
          return rDate === dateStr
        })
        days.push({
          date: dateStr,
          jetonSpend: spend ? Number(spend.total) : 0,
          jetonIncome: income ? Number(income.total) : 0,
          tryRevenue: payment ? Number(payment.total) : 0,
          paymentCount: payment ? Number(payment.count) : 0,
        })
      }

      return NextResponse.json({ days })
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

      const receiverIds = topReceivers.map((r: any) => r.recipientId)
      const users = await prisma.user.findMany({
        where: { id: { in: receiverIds } },
        select: { id: true, name: true, username: true, email: true, image: true },
      })
      const userMap = new Map(users.map((u: any) => [u.id, u]))

      return NextResponse.json(
        topReceivers.map((r: any) => ({
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
      const userMap = new Map(users.map((u: any) => [u.id, u]))

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

    // Gift history with sender, receiver, source
    if (section === 'gift-history') {
      const page = parseInt(searchParams.get('page') || '1')
      const limit = 30

      // Chat room gifts
      const chatGifts = await prisma.chatRoomGift.findMany({
        where: dateFilter,
        select: {
          id: true, totalPrice: true, quantity: true, createdAt: true, commissionAmount: true,
          sender: { select: { id: true, name: true, username: true, image: true } },
          recipient: { select: { id: true, name: true, username: true, image: true } },
          giftType: { select: { name: true, icon: true } },
          room: { select: { nameTr: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      })

      // Stream gifts
      const streamGifts = await prisma.streamGift.findMany({
        where: dateFilter,
        select: {
          id: true, totalPrice: true, quantity: true, createdAt: true,
          sender: { select: { id: true, name: true, username: true, image: true } },
          giftType: { select: { name: true, icon: true } },
          stream: { select: { id: true, title: true, user: { select: { id: true, name: true, username: true, image: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      })

      // Teller gifts (no relations in schema, use raw IDs)
      const tellerGiftsRaw = await prisma.tellerGift.findMany({
        where: dateFilter,
        select: {
          id: true, totalPrice: true, quantity: true, createdAt: true,
          senderId: true, tellerId: true, giftTypeId: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      })

      // Resolve teller gift sender/teller info
      const tellerGiftUserIds = [...new Set(tellerGiftsRaw.map((g: any) => g.senderId))]
      const tellerGiftTellerIds = [...new Set(tellerGiftsRaw.map((g: any) => g.tellerId))]
      const tellerGiftTypeIds = [...new Set(tellerGiftsRaw.map((g: any) => g.giftTypeId))]
      const [tgUsers, tgTellers, tgGiftTypes] = await Promise.all([
        prisma.user.findMany({ where: { id: { in: tellerGiftUserIds } }, select: { id: true, name: true, username: true, image: true } }),
        prisma.liveFortuneTeller.findMany({ where: { id: { in: tellerGiftTellerIds } }, select: { id: true, displayName: true, userId: true, user: { select: { id: true, name: true, username: true, image: true } } } }),
        prisma.giftType.findMany({ where: { id: { in: tellerGiftTypeIds } }, select: { id: true, name: true, icon: true } }),
      ])
      const tgUserMap = Object.fromEntries(tgUsers.map((u: any) => [u.id, u]))
      const tgTellerMap = Object.fromEntries(tgTellers.map((t: any) => [t.id, t]))
      const tgGiftTypeMap = Object.fromEntries(tgGiftTypes.map((g: any) => [g.id, g]))

      // Merge and sort by date
      const allGifts = [
        ...chatGifts.map((g: any) => ({
          id: g.id, type: 'chat_room' as const, amount: g.totalPrice, quantity: g.quantity, commission: g.commissionAmount || 0,
          createdAt: g.createdAt, giftName: g.giftType?.name || 'Hediye', giftIcon: g.giftType?.icon || '🎁',
          sender: g.sender, receiver: g.recipient, sourceName: g.room?.nameTr || 'Sohbet Odası', sourceSlug: g.room?.slug,
        })),
        ...streamGifts.map((g: any) => ({
          id: g.id, type: 'stream' as const, amount: g.totalPrice, quantity: g.quantity, commission: Math.floor(g.totalPrice * 0.3),
          createdAt: g.createdAt, giftName: g.giftType?.name || 'Hediye', giftIcon: g.giftType?.icon || '🎁',
          sender: g.sender, receiver: g.stream?.user || null, sourceName: g.stream?.title || 'Canlı Yayın', sourceSlug: null,
        })),
        ...tellerGiftsRaw.map((g: any) => {
          const gt = tgGiftTypeMap[g.giftTypeId]
          const teller = tgTellerMap[g.tellerId]
          return {
            id: g.id, type: 'teller' as const, amount: g.totalPrice, quantity: g.quantity, commission: 0,
            createdAt: g.createdAt, giftName: gt?.name || 'Hediye', giftIcon: gt?.icon || '🎁',
            sender: tgUserMap[g.senderId] || null, receiver: teller?.user || null, sourceName: teller?.displayName || 'Falcı', sourceSlug: null,
          }
        }),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit)

      return NextResponse.json({ gifts: allGifts, page })
    }

    // Top earners (users who earned the most from all sources)
    if (section === 'top-earners') {
      // Earn from chat room gifts (as recipient)
      const chatEarnings = await prisma.chatRoomGift.groupBy({
        by: ['recipientId'],
        where: dateFilter,
        _sum: { totalPrice: true, commissionAmount: true },
      })
      // Earn from stream gifts (broadcaster earns 70%)
      const streamEarnings = await prisma.streamGift.groupBy({
        by: ['streamId'],
        where: dateFilter,
        _sum: { totalPrice: true },
      })
      // Map streamId to user
      const streamIds = streamEarnings.map((s: any) => s.streamId)
      const streams = streamIds.length > 0 ? await prisma.videoStream.findMany({
        where: { id: { in: streamIds } },
        select: { id: true, userId: true },
      }) : []
      const streamUserMap = new Map<string, string>(streams.map((s: any) => [s.id, s.userId]))

      // Teller session earnings
      const tellerEarnings = await prisma.liveFortuneTeller.findMany({
        where: { totalEarnings: { gt: 0 } },
        select: { userId: true, totalEarnings: true },
      })

      // Merge all into earnerMap
      const earnerMap = new Map<string, number>()
      for (const c of chatEarnings) {
        const net = (c._sum.totalPrice || 0) - (c._sum.commissionAmount || 0)
        earnerMap.set(c.recipientId, (earnerMap.get(c.recipientId) || 0) + net)
      }
      for (const s of streamEarnings) {
        const userId = streamUserMap.get(s.streamId)
        if (userId) {
          const earnerShare = Math.floor((s._sum.totalPrice || 0) * 0.7)
          earnerMap.set(userId, (earnerMap.get(userId) || 0) + earnerShare)
        }
      }
      for (const t of tellerEarnings) {
        earnerMap.set(t.userId, (earnerMap.get(t.userId) || 0) + t.totalEarnings)
      }

      const sorted = Array.from(earnerMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)

      const userIds = sorted.map(([id]) => id)
      const users = userIds.length > 0 ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, username: true, email: true, image: true, jetonBalance: true, credits: true },
      }) : []
      const userMap = new Map(users.map((u: any) => [u.id, u]))

      return NextResponse.json(
        sorted.map(([id, earnings]) => ({
          user: userMap.get(id) || { id, name: 'Bilinmeyen' },
          totalEarnings: earnings,
        }))
      )
    }

    // User financial profile (for popup)
    if (section === 'user-profile') {
      const userId = searchParams.get('userId')
      if (!userId) return NextResponse.json({ error: 'userId gerekli' }, { status: 400 })

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, name: true, username: true, email: true, image: true,
          credits: true, jetonBalance: true, role: true, membership: true, createdAt: true,
          _count: { select: { fortunes: true } },
        },
      })
      if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })

      // Gift sent totals
      const giftsSent = await prisma.chatRoomGift.aggregate({
        where: { senderId: userId, ...dateFilter },
        _sum: { totalPrice: true },
        _count: true,
      })
      const streamGiftsSent = await prisma.streamGift.aggregate({
        where: { senderId: userId, ...dateFilter },
        _sum: { totalPrice: true },
        _count: true,
      })
      const tellerGiftsSent = await prisma.tellerGift.aggregate({
        where: { senderId: userId, ...dateFilter },
        _sum: { totalPrice: true },
        _count: true,
      })

      // Gift received totals
      const giftsReceived = await prisma.chatRoomGift.aggregate({
        where: { recipientId: userId, ...dateFilter },
        _sum: { totalPrice: true },
        _count: true,
      })

      // Jeton transactions summary
      const jetonTxs = await prisma.jetonTransaction.findMany({
        where: { userId, ...dateFilter },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, amount: true, type: true, description: true, createdAt: true, balanceBefore: true, balanceAfter: true },
      })

      // Session spending
      const sessionSpending = await prisma.liveSession.aggregate({
        where: { userId, status: { in: ['completed', 'active'] }, ...dateFilter },
        _sum: { creditsCharged: true },
      })

      // Teller earnings (if user is a teller)
      const tellerProfile = await prisma.liveFortuneTeller.findUnique({
        where: { userId },
        select: { totalEarnings: true, totalSessions: true },
      })

      const totalSent = (giftsSent._sum.totalPrice || 0) + (streamGiftsSent._sum.totalPrice || 0) + (tellerGiftsSent._sum.totalPrice || 0)
      const totalReceived = giftsReceived._sum.totalPrice || 0

      return NextResponse.json({
        user,
        financials: {
          totalGiftsSent: totalSent,
          totalGiftsReceived: totalReceived,
          giftsSentCount: (giftsSent._count || 0) + (streamGiftsSent._count || 0) + (tellerGiftsSent._count || 0),
          giftsReceivedCount: giftsReceived._count || 0,
          sessionSpending: sessionSpending._sum.creditsCharged || 0,
          tellerEarnings: tellerProfile?.totalEarnings || 0,
          tellerSessions: tellerProfile?.totalSessions || 0,
        },
        recentTransactions: jetonTxs,
      })
    }

    return NextResponse.json({ error: 'Geçersiz bölüm' }, { status: 400 })
  } catch (error) {
    console.error('Finance API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST: Multiple actions - adjust user balance, update commission settings, manual profit adjustment
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !(await staffCan(session?.user?.role, (session?.user as any)?.id, 'finance.report.view', ['admin','yonetici','moderator','finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
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
      invalidateCachePrefix('platform:')

      // Sync commission rate to all tellers when platform commission changes
      if (key === 'commission_rate') {
        await prisma.liveFortuneTeller.updateMany({
          data: { commissionRate: numVal }
        })
      }

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

      invalidateCachePrefix('platform:')
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
      invalidateCachePrefix('platform:')
    }

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Finance POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
