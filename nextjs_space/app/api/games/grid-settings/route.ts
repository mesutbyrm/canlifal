import { NextResponse } from 'next/server'
import { getCachedPlatformSetting } from '@/lib/cache'

export const dynamic = 'force-dynamic'

const defaults = {
  xoxGridSizes: [3, 6, 8, 10],
  sosGridSizes: [6, 8, 10],
}

// Public API: Returns allowed grid sizes for XOX and SOS (cached)
export async function GET() {
  try {
    const raw = await getCachedPlatformSetting('game_settings', '')
    if (!raw) return NextResponse.json(defaults)

    try {
      const parsed = JSON.parse(raw)
      return NextResponse.json({
        xoxGridSizes: parsed.xoxGridSizes || defaults.xoxGridSizes,
        sosGridSizes: parsed.sosGridSizes || defaults.sosGridSizes,
      })
    } catch {
      return NextResponse.json(defaults)
    }
  } catch (error: any) {
    console.error('Grid settings fetch error:', error)
    return NextResponse.json(defaults)
  }
}
