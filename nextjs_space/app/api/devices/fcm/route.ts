import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/devices/fcm
 *
 * FCM (Firebase Cloud Messaging) veya APNs push token kaydeder.
 * Flutter uygulaması başlatıldığında ve token yenilenince çağrılır.
 *
 * Body: { token: string, platform?: 'android'|'ios'|'web', appVersion?: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Dual auth
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id

    if (!userId) {
      return NextResponse.json(
        { error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { token, platform, appVersion, previousToken } = body

    if (!token || typeof token !== 'string' || token.length < 10) {
      return NextResponse.json(
        { error: 'Geçerli bir push token gerekli' },
        { status: 400 }
      )
    }

    // Hesap değişimi: bir cihaz token'ı aynı anda yalnız TEK hesaba bağlı olur.
    // Aynı telefonda önce A sonra B oturum açarsa A'nın kaydı silinir; böylece
    // A'ya ait bildirimler B'nin cihazına düşmez.
    await prisma.userDevice.deleteMany({ where: { token, userId: { not: userId } } })

    // Upsert: aynı user+token varsa güncelle, yoksa oluştur
    const device = await prisma.userDevice.upsert({
      where: {
        userId_token: { userId, token }
      },
      update: {
        platform: platform || 'android',
        appVersion: appVersion || null,
        updatedAt: new Date(),
      },
      create: {
        userId,
        token,
        platform: platform || 'android',
        appVersion: appVersion || null,
      },
    })

    // Token yenilendiyse eski token bu hesaptan kaldırılır (çift teslimat olmasın).
    if (typeof previousToken === 'string' && previousToken && previousToken !== token) {
      await prisma.userDevice.deleteMany({ where: { userId, token: previousToken } })
    }

    return NextResponse.json({
      success: true,
      deviceId: device.id,
    })
  } catch (error) {
    console.error('[FCM] Device register error:', error)
    return NextResponse.json(
      { error: 'Cihaz kaydedilemedi' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/devices/fcm
 *
 * Push token'u kaldırır (logout veya token geçersiz olduğunda).
 *
 * Body: { token: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id

    if (!userId) {
      return NextResponse.json(
        { error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: 'Token gerekli' }, { status: 400 })
    }

    await prisma.userDevice.deleteMany({
      where: { userId, token },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[FCM] Device unregister error:', error)
    return NextResponse.json(
      { error: 'Cihaz kaldırılamadı' },
      { status: 500 }
    )
  }
}
