import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { serializePkMatches } from '@/lib/pk-match'
import { expireAllStalePKs } from '@/lib/pk-expiry'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    let userId: string | null = null
    const mobile = await authenticateRequest(req).catch(() => null)
    if (mobile?.id) userId = mobile.id
    else {
      const session = await getServerSession(authOptions).catch(() => null)
      userId = (session?.user as any)?.id || null
    }
    if (!userId) return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    await expireAllStalePKs()
    const battles = await prisma.pKBattle.findMany({
      where: { status: { in: ['pending', 'active', 'starting', 'paused'] }, OR: [{ user1Id: userId }, { user2Id: userId }] },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    const matches = await serializePkMatches(battles)
    return NextResponse.json({ success: true, matches, items: matches, data: matches })
  } catch (error) {
    console.error('[pk/me/matches]', error)
    return NextResponse.json({ error: 'PK maçları alınamadı' }, { status: 500 })
  }
}
