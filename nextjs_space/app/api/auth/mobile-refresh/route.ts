export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyMobileToken, generateMobileTokens } from '@/lib/mobile-auth'

/**
 * POST /api/auth/mobile-refresh
 * Body: { refreshToken }
 * Returns: { accessToken, refreshToken, user }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { refreshToken } = body

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token gerekli' }, { status: 400 })
    }

    const payload = verifyMobileToken(refreshToken)
    if (!payload || payload.type !== 'refresh') {
      return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş token' }, { status: 401 })
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        image: true,
        credits: true,
        jetonBalance: true,
        cfcBalance: true,
        membership: true,
        membershipExpiresAt: true,
        preferredLanguage: true,
        level: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 401 })
    }

    // Generate new token pair
    const tokens = generateMobileTokens({ id: user.id, email: user.email, role: user.role })

    return NextResponse.json({
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
        image: user.image,
        credits: user.credits,
        jetonBalance: user.jetonBalance,
        cfcBalance: user.cfcBalance ?? 0,
        membership: user.membership,
        membershipExpiresAt: user.membershipExpiresAt,
        preferredLanguage: user.preferredLanguage,
        level: user.level,
      },
    })
  } catch (error: any) {
    console.error('Mobile refresh error:', error)
    return NextResponse.json({ error: 'Token yenileme başarısız' }, { status: 500 })
  }
}
