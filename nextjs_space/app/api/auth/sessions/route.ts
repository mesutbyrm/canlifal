export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getUserRevokedAt } from '@/lib/token-revocation'
import prisma from '@/lib/db'

/**
 * GET /api/auth/sessions
 * Kullanıcının kayıtlı cihazlarını (push kayıtları) ve son toplu çıkış
 * damgasını döner. Flutter "Oturumlarım / Cihazlarım" ekranı için.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const devices = await prisma.userDevice.findMany({
      where: { userId: authUser.id },
      select: { id: true, platform: true, appVersion: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })

    const revokedAtMs = await getUserRevokedAt(authUser.id)

    return NextResponse.json({
      success: true,
      data: {
        devices,
        lastGlobalLogoutAt: revokedAtMs ? new Date(revokedAtMs).toISOString() : null,
      },
    })
  } catch (error) {
    console.error('Sessions error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

/**
 * DELETE /api/auth/sessions?deviceId=xxx
 * Tek bir cihaz kaydını siler (o cihaza push gönderilmez).
 */
export async function DELETE(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const deviceId = req.nextUrl.searchParams.get('deviceId')
    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId gerekli' }, { status: 400 })
    }
    const device = await prisma.userDevice.findFirst({
      where: { id: deviceId, userId: authUser.id },
      select: { id: true },
    })
    if (!device) {
      return NextResponse.json({ error: 'Cihaz bulunamadı' }, { status: 404 })
    }
    await prisma.userDevice.delete({ where: { id: device.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Session delete error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
