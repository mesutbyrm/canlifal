export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

/**
 * DELETE /api/auth/mobile-sessions/:id
 * Auth: ZORUNLU
 * Belirli bir cihaz kaydını (push token) iptal eder.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const { id } = await params
    const device = await prisma.userDevice.findFirst({
      where: { id, userId: authUser.id },
    })
    if (!device) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Cihaz bulunamadı' } },
        { status: 404 }
      )
    }

    await prisma.userDevice.delete({ where: { id: device.id } })

    return NextResponse.json({ success: true, data: { revoked: true, deviceId: id } })
  } catch (error: any) {
    console.error('[auth] mobile-session revoke error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Oturum iptal edilemedi' } },
      { status: 500 }
    )
  }
}
