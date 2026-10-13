export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { revokeAllUserTokens } from '@/lib/token-revocation'
import prisma from '@/lib/db'

/**
 * POST /api/auth/logout-all
 * Kullanıcının TÜM cihazlarındaki mobil token'larını geçersiz kılar.
 * Body (opsiyonel): { removeDevices?: boolean } — push cihaz kayıtlarını da siler.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    let body: any = {}
    try { body = await req.json() } catch { /* opsiyonel */ }

    await revokeAllUserTokens(authUser.id, 'logout_all')

    let devicesRemoved = 0
    if (body?.removeDevices === true) {
      const devices = await prisma.userDevice.findMany({
        where: { userId: authUser.id },
        select: { id: true },
      })
      for (const d of devices) {
        try {
          await prisma.userDevice.delete({ where: { id: d.id } })
          devicesRemoved++
        } catch { /* yoksay */ }
      }
    }

    try {
      const { recordAudit } = await import('@/lib/audit-log')
      await recordAudit({
        action: 'auth.logout_all',
        actorId: authUser.id,
        targetType: 'user',
        targetId: authUser.id,
        metadata: { devicesRemoved },
      } as any)
    } catch { /* audit opsiyonel */ }

    return NextResponse.json({ success: true, devicesRemoved })
  } catch (error) {
    console.error('Logout-all error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
