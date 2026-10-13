import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [sections, buttons] = await Promise.all([
      prisma.onlineFalSection.findMany({
        where: { isVisible: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.onlineFalButton.findMany({
        where: { isVisible: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ])

    return NextResponse.json({ sections, buttons })
  } catch (error) {
    console.error('Online fal fetch error:', error)
    return NextResponse.json({ sections: [], buttons: [] })
  }
}
