import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { serializePkMatches } from '@/lib/pk-match'
import { expireAllStalePKs } from '@/lib/pk-expiry'

export const dynamic = 'force-dynamic'

/**
 * GET /api/live/pk/active
 *
 * Canlı yayın PK'ları. Opsiyonel ?roomId= / ?streamId= ile tek odaya filtrelenir.
 * Yanıt: { matches: PkMatch[] }  (tek oda sorgulandığında ayrıca { match } alanı)
 */
export async function GET(req: NextRequest) {
  try {
    await expireAllStalePKs()

    const roomId =
      req.nextUrl.searchParams.get('roomId') || req.nextUrl.searchParams.get('streamId')
    const includePending = ['1', 'true'].includes(
      (req.nextUrl.searchParams.get('includePending') || '').toLowerCase(),
    )
    const statuses = includePending ? ['active', 'pending'] : ['active']

    const battles = await prisma.pKBattle.findMany({
      where: {
        status: { in: statuses },
        ...(roomId ? { OR: [{ stream1Id: roomId }, { stream2Id: roomId }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const matches = await serializePkMatches(battles)
    return NextResponse.json(
      roomId ? { matches, match: matches[0] || null } : { matches },
    )
  } catch (e) {
    console.error('[live/pk/active] error:', e)
    return NextResponse.json({ error: 'Aktif PK maçları alınamadı' }, { status: 500 })
  }
}
