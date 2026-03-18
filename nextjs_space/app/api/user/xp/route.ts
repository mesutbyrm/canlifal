export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

const LEVEL_TITLES: Record<number, string> = {
  1: 'Yeni Üye',
  2: 'Çırak',
  3: 'Keşifci',
  4: 'Yorumcu',
  5: 'Bilge',
  6: 'Usta Yorumcu',
  7: 'Gizemci',
  8: 'Kahin',
  9: 'Büyük Kahin',
  10: 'Efsanevi',
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Giriş yapın' }, { status: 401 })
    const userId = (session.user as any).id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, loginStreak: true },
    })

    const xp = user?.xp || 0
    const level = user?.level || 1
    const xpForNextLevel = level * 100
    const xpInCurrentLevel = xp - ((level - 1) * 100)
    const title = LEVEL_TITLES[Math.min(level, 10)] || 'Efsanevi'

    return NextResponse.json({
      xp,
      level,
      title,
      xpForNextLevel: 100,
      xpInCurrentLevel,
      loginStreak: user?.loginStreak || 0,
    })
  } catch (error) {
    console.error('XP GET error:', error)
    return NextResponse.json({ error: 'Hata oluştu' }, { status: 500 })
  }
}
