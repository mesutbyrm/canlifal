export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

const LEVEL_TITLES: Record<number, string> = {
  1: 'Yeni \u00dcye',
  2: '\u00c7\u0131rak',
  3: 'Ke\u015fifci',
  4: 'Yorumcu',
  5: 'Bilge',
  6: 'Usta Yorumcu',
  7: 'Gizemci',
  8: 'Kahin',
  9: 'B\u00fcy\u00fck Kahin',
  10: 'Efsanevi',
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Giri\u015f yap\u0131n' }, { status: 401 })
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
    return NextResponse.json({ error: 'Hata olu\u015ftu' }, { status: 500 })
  }
}
