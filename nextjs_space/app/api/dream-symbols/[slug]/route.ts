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
    if (!symbol) return NextResponse.json({ error: 'Bulunamad\u0131' }, { status: 404 })
    return NextResponse.json(symbol)
  } catch (error) {
    console.error('Dream symbol detail error:', error)
    return NextResponse.json({ error: 'Hata olu\u015ftu' }, { status: 500 })
  }
}
