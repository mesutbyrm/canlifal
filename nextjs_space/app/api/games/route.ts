import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET: Fetch all active games
export async function GET() {
  try {
    const games = await prisma.miniGame.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(games)
  } catch (error: any) {
    console.error('Games fetch error:', error)
    return NextResponse.json({ error: 'Oyunlar yüklenemedi' }, { status: 500 })
  }
}
