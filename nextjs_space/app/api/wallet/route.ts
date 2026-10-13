export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

/**
 * GET /api/wallet
 * Returns user's coin/jeton/cfc balances for Flutter.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        jetonBalance: true,
        credits: true,
        cfcBalance: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    return NextResponse.json({
      coins: user.jetonBalance ?? 0,
      jetonBalance: user.jetonBalance ?? 0,
      cfcBalance: user.cfcBalance ?? 0,
      credits: user.credits ?? 0,
    })
  } catch (error) {
    console.error('Wallet GET error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
