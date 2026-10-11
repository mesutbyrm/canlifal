import { NextRequest, NextResponse } from 'next/server'
import { activeMissions, serializeMissionDefinition } from '@/lib/gift-insights'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gifts/missions
 * Public list of active gift mission definitions.
 */
export async function GET(_request: NextRequest) {
  try {
    const missions = await activeMissions()
    return NextResponse.json(missions.map(serializeMissionDefinition))
  } catch (error) {
    console.error('[gifts/missions]', error)
    return NextResponse.json({ error: 'Görevler alınamadı' }, { status: 500 })
  }
}
