import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import {
  displayAmount,
  ledgerWhere,
  normalizeContext,
  normalizePeriod,
  normalizeScope,
} from '@/lib/gift-insights'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gifts/insights/map
 * Query: ?period= &scope=tr|world &context=
 *
 * scope=tr    → density per sender city (Turkey)
 * scope=world → density per sender country
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = normalizePeriod(searchParams.get('period'))
    const scope = normalizeScope(searchParams.get('scope'))
    const context = normalizeContext(searchParams.get('context'))

    const where = ledgerWhere({ period, context, scope, scopeField: 'sender' })
    const field: 'senderCity' | 'senderCountry' =
      scope === 'tr' ? 'senderCity' : 'senderCountry'

    const grouped = await prisma.giftEvent.groupBy({
      by: [field],
      where,
      _sum: { grossAmount: true },
      _count: { _all: true },
    })

    const points = grouped
      .map((g: any) => {
        const location: string | null = g[field]
        const gross = g._sum.grossAmount || 0
        return {
          location,
          gross,
          displayLabel: displayAmount(gross),
          gifts: g._count._all || 0,
          // flat aliases for the mobile client
          label: location,
          city: scope === 'tr' ? location : null,
          country: scope === 'tr' ? 'TR' : location,
          total: gross,
          count: g._count._all || 0,
        }
      })
      .filter(p => !!p.location && p.gross > 0)
      .sort((a, b) => b.gross - a.gross)

    return NextResponse.json({ scope, period, points })
  } catch (error) {
    console.error('[gifts/insights/map]', error)
    return NextResponse.json({ scope: 'tr', period: 'weekly', points: [] })
  }
}
