import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { invalidateCachePrefix } from '@/lib/cache'

export const dynamic = 'force-dynamic'

// GET: Fetch game settings from PlatformSettings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const setting = await prisma.platformSettings.findFirst({
      where: { key: 'game_settings' },
    })

    const defaults = {
      commissionRate: 10,
      minBetAmount: 0,
      maxBetAmount: 10000,
      allowedCurrencies: ['FREE', 'CFC', 'JETON'],
      turnTimerOptions: [0, 10, 15, 20],
      gamesEnabled: true,
      xoxGridSizes: [3, 6, 8, 10],
      sosGridSizes: [6, 8, 10],
    }

    if (!setting) return NextResponse.json(defaults)

    try {
      const parsed = JSON.parse(setting.value)
      return NextResponse.json({ ...defaults, ...parsed })
    } catch {
      return NextResponse.json(defaults)
    }
  } catch (error: any) {
    console.error('Game settings fetch error:', error)
    return NextResponse.json({ error: 'Ayarlar yüklenemedi' }, { status: 500 })
  }
}

// PUT: Update game settings
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const body = await req.json()
    const value = JSON.stringify(body)

    await prisma.platformSettings.upsert({
      where: { key: 'game_settings' },
      create: { key: 'game_settings', value },
      update: { value },
    })
    invalidateCachePrefix('platform:')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Game settings update error:', error)
    return NextResponse.json({ error: 'Ayarlar güncellenemedi' }, { status: 500 })
  }
}
