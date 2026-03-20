import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const buttons = await prisma.homepageButton.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        key: true,
        label: true,
        icon: true,
        href: true,
        sortOrder: true,
        specialBehavior: true,
      },
    })
    return NextResponse.json({ buttons })
  } catch (error) {
    console.error('Homepage buttons fetch error:', error)
    return NextResponse.json({ buttons: [] })
  }
}
