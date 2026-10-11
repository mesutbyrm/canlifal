export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

/**
 * GET /api/teller/gifts
 * Auth: ZORUNLU (falcı)
 * Kendi aldığı hediyelerin özet listesi (son 7 gün, gönderenlere göre).
 * Flutter bu yolu kullanıyor; /api/fortune-tellers/gifts?tellerId= mevcut ama
 * falcının kendi ID’sini parametre göndermeden kullanıyor.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      )
    }

    // Falcı kaydını bul
    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { userId: authUser.id },
      select: { id: true },
    })
    if (!teller) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_TELLER', message: 'Falcı profili bulunamadı' } },
        { status: 403 }
      )
    }

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const gifts = await prisma.tellerGift.findMany({
      where: { tellerId: teller.id, createdAt: { gte: oneWeekAgo } },
      orderBy: { totalPrice: 'desc' },
      take: 30,
    })

    const senderMap: Record<string, { senderId: string; totalAmount: number; giftCount: number }> = {}
    for (const g of gifts) {
      if (!senderMap[g.senderId]) {
        senderMap[g.senderId] = { senderId: g.senderId, totalAmount: 0, giftCount: 0 }
      }
      senderMap[g.senderId].totalAmount += g.totalPrice
      senderMap[g.senderId].giftCount += g.quantity
    }

    const senderIds = Object.keys(senderMap)
    const users = senderIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: senderIds } },
          select: { id: true, name: true, image: true, username: true },
        })
      : []
    const userMap: Record<string, any> = {}
    users.forEach((u: any) => { userMap[u.id] = u })

    const result = Object.values(senderMap)
      .map((s) => ({
        ...s,
        senderName: userMap[s.senderId]?.name || 'Anonim',
        senderImage: userMap[s.senderId]?.image || null,
        senderUsername: userMap[s.senderId]?.username || null,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('[teller] gifts error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Hediye listesi alınamadı' } },
      { status: 500 }
    )
  }
}
