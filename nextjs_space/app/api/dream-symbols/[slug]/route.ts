export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const symbol = await prisma.dreamSymbol.findUnique({
      where: { slug: params.slug, isPublished: true },
    })
    if (!symbol) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 })

    // Resolve related symbols to actual dream links
    let relatedDreams: { name: string; slug: string }[] = []
    if (symbol.relatedSymbols && symbol.relatedSymbols.length > 0) {
      const related = await prisma.dreamSymbol.findMany({
        where: {
          name: { in: symbol.relatedSymbols, mode: 'insensitive' },
          isPublished: true,
        },
        select: { name: true, slug: true },
        take: 8,
      })
      relatedDreams = related
    }

    // If we have fewer than 4 related, fill with same-letter symbols
    if (relatedDreams.length < 4) {
      const sameLetter = await prisma.dreamSymbol.findMany({
        where: {
          letter: symbol.letter,
          isPublished: true,
          slug: { not: symbol.slug },
          NOT: { slug: { in: relatedDreams.map(r => r.slug) } },
        },
        select: { name: true, slug: true },
        take: 4 - relatedDreams.length,
        orderBy: { name: 'asc' },
      })
      relatedDreams = [...relatedDreams, ...sameLetter]
    }

    return NextResponse.json({ ...symbol, relatedDreams })
  } catch (error) {
    console.error('Dream symbol detail error:', error)
    return NextResponse.json({ error: 'Hata oluştu' }, { status: 500 })
  }
}
