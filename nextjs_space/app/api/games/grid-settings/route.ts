import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// Public API: Returns allowed grid sizes for XOX and SOS
export async function GET() {
  try {
    const setting = await prisma.platformSettings.findFirst({
      where: { key: 'game_settings' },
    })

    const defaults = {
      xoxGridSizes: [3, 6, 8, 10],
      sosGridSizes: [6, 8, 10],
    }

    if (!setting) return NextResponse.json(defaults)

    try {
      const parsed = JSON.parse(setting.value)
      return NextResponse.json({
        xoxGridSizes: parsed.xoxGridSizes || defaults.xoxGridSizes,
        sosGridSizes: parsed.sosGridSizes || defaults.sosGridSizes,
      })
    } catch {
      return NextResponse.json(defaults)
    }
  } catch (error: any) {
    console.error('Grid settings fetch error:', error)
    return NextResponse.json({ xoxGridSizes: [3, 6, 8, 10], sosGridSizes: [6, 8, 10] })
  }
}
