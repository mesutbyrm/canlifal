export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, verifyMobileToken } from '@/lib/mobile-auth'
import { revokeToken } from '@/lib/token-revocation'
import prisma from '@/lib/db'

/**
 * POST /api/auth/logout
 * Body (opsiyonel): { refreshToken?: string, deviceToken?: string }
 *
 * Mobil çıkış. Artık GERÇEK iptal yapar:
 *  - Authorization başlığındaki access token iptal edilir.
 *  - Gövdede refreshToken verilirse o da iptal edilir.
 *  - deviceToken verilirse push cihaz kaydı silinir.
 *
 * Web (NextAuth) oturumları için /api/auth/signout kullanılmaya devam eder;
 * bu uç web davranışını değiştirmez.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    let body: any = {}
    try { body = await req.json() } catch { /* gövde opsiyonel */ }

    const revoked: string[] = []

    // 1) Access token
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const accessToken = authHeader.substring(7)
      const ok = await revokeToken(accessToken, {
        userId: authUser.id,
        tokenType: 'access',
        reason: 'logout',
      })
      if (ok) revoked.push('access')
    }

    // 2) Refresh token (varsa)
    if (typeof body?.refreshToken === 'string' && body.refreshToken.length > 10) {
      const payload = verifyMobileToken(body.refreshToken)
      if (payload && payload.userId === authUser.id) {
        const ok = await revokeToken(body.refreshToken, {
          userId: authUser.id,
          tokenType: 'refresh',
          reason: 'logout',
        })
        if (ok) revoked.push('refresh')
      }
    }

    // 3) Push cihaz kaydı (varsa)
    let deviceRemoved = false
    if (typeof body?.deviceToken === 'string' && body.deviceToken.length > 10) {
      try {
        const device = await prisma.userDevice.findFirst({
          where: { userId: authUser.id, token: body.deviceToken },
          select: { id: true },
        })
        if (device) {
          await prisma.userDevice.delete({ where: { id: device.id } })
          deviceRemoved = true
        }
      } catch { /* cihaz silinemediyse çıkışı engelleme */ }
    }

    return NextResponse.json({ success: true, revoked, deviceRemoved })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
