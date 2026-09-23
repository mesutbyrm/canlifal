export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const letter = searchParams.get('letter')
    const search = searchParams.get('search')

    const where: any = { isPublished: true }
    if (letter) where.letter = letter.toUpperCase()
    if (search) where.name = { contains: search, mode: 'insensitive' }

    const symbols = await prisma.dreamSymbol.findMany({
      where,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, letter: true, meaning: true },
    })

    // Get letter counts
    const letterCounts = await prisma.dreamSymbol.groupBy({
      by: ['letter'],
      where: { isPublished: true },
      _count: { id: true },
      orderBy: { letter: 'asc' },
    })

    return NextResponse.json({ symbols, letterCounts })
  } catch (error) {
    console.error('Dream symbols error:', error)
    return NextResponse.json({ error: 'Hata oluştu' }, { status: 500 })
  }
}
