export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { verifyMobileToken, generateMobileTokens } from '@/lib/mobile-auth'
import { isTokenStillValid } from '@/lib/token-revocation'

/**
 * Flutter yarış koşulu (race condition) koruması:
 * Aynı refresh token ile eş zamanlı gelen istekler 15 sn boyunca AYNI token
 * çiftini alır. Böylece iki paralel istek birbirinin token'ını geçersiz kılmaz.
 * Not: süreç içi önbellektir; tek örnekli dağıtımda yeterlidir.
 */
const REFRESH_DEDUPE_TTL = 15_000
const refreshDedupe = new Map<string, { tokens: { accessToken: string; refreshToken: string }; expiresAt: number }>()

function getDedupedTokens(key: string) {
  const hit = refreshDedupe.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit.tokens
  if (hit) refreshDedupe.delete(key)
  return null
}

function setDedupedTokens(key: string, tokens: { accessToken: string; refreshToken: string }) {
  refreshDedupe.set(key, { tokens, expiresAt: Date.now() + REFRESH_DEDUPE_TTL })
  if (refreshDedupe.size > 2000) {
    const now = Date.now()
    for (const [k, v] of refreshDedupe) if (v.expiresAt <= now) refreshDedupe.delete(k)
  }
}

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

    // İptal edilmiş (logout / logout-all) refresh token kabul edilmez.
    if (!(await isTokenStillValid(refreshToken, payload))) {
      return NextResponse.json(
        { error: 'Oturum sonlandırılmış. Lütfen tekrar giriş yapın.', code: 'TOKEN_REVOKED' },
        { status: 401 }
      )
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

    // Generate new token pair (aynı refresh token ile eşzamanlı istekler aynı çifti alır)
    const tokens =
      getDedupedTokens(refreshToken) ??
      generateMobileTokens({ id: user.id, email: user.email, role: user.role })
    setDedupedTokens(refreshToken, tokens)

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
