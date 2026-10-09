import { NextRequest, NextResponse } from 'next/server'
import { discoveryCards, resolveSort, sortCards } from '@/lib/agency-discovery'

export const dynamic = 'force-dynamic'

/**
 * GET /api/agencies?sort=recommended|hours|members|success|level|newest&q=&level=
 * Herkese açık ajans listesi — istatistikler gerçek kayıtlardan (bkz. lib/agency-discovery).
 */
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams
  const sort = await resolveSort(sp.get('sort'))
  const q = (sp.get('q') || '').trim().toLocaleLowerCase('tr')
  const level = sp.get('level')
  let cards = await discoveryCards()
  if (q) cards = cards.filter((c) => c.name.toLocaleLowerCase('tr').includes(q))
  if (level) cards = cards.filter((c) => c.level === level)
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(sp.get('limit') || '20', 10) || 20))
  const sorted = sortCards(cards, sort)
  return NextResponse.json({
    success: true,
    data: {
      sort,
      total: sorted.length,
      page,
      agencies: sorted.slice((page - 1) * limit, page * limit),
      statsNote: 'Yayın saati son 30 gün, yalnız doğrulanmış video yayını; hedef başarısı son 90 gün kapanmış dönemler.',
    },
  })
}
