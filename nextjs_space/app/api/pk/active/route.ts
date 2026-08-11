import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { serializePkMatches } from '@/lib/pk-match'
import { expireAllStalePKs } from '@/lib/pk-expiry'

export const dynamic = 'force-dynamic'

/**
 * GET /api/pk/active
 * Birleşik PK: şu anda canlı (ve isteğe bağlı bekleyen) tüm maçlar.
 *
 * Query: ?includePending=1 → bekleyen davetleri de döner
 * Yanıt: { matches: PkMatch[] }
 */
export async function GET(req: NextRequest) {
  try {
    await expireAllStalePKs()

    const includePending = ['1', 'true'].includes(
      (req.nextUrl.searchParams.get('includePending') || '').toLowerCase(),
    )
    const statuses = includePending ? ['active', 'pending'] : ['active']

    const battles = await prisma.pKBattle.findMany({
      where: { status: { in: statuses } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const matches = await serializePkMatches(battles)
    return NextResponse.json({ matches })
  } catch (e) {
    console.error('[pk/active] error:', e)
    return NextResponse.json({ error: 'Aktif PK maçları alınamadı' }, { status: 500 })
  }
}
