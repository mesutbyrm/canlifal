export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCachedPlatformSetting } from '@/lib/cache'

const VOICE_ROOM_KEYS = [
  'voice_room_max_seats',
  'voice_room_default_type',
  'voice_room_creation_cost',
  'voice_room_vip_cost',
  'voice_room_gift_commission_rate',
  'voice_room_min_level_to_create',
  'voice_room_auto_close_empty_minutes',
  'voice_room_max_rooms_per_user',
  'voice_room_background_enabled',
  'voice_room_music_enabled',
  'voice_room_pk_enabled',
] as const

/**
 * GET /api/platform/voice-room-settings
 * Sesli oda ayarlarının herkese açık (salt-okunur) görünümü.
 */
export async function GET() {
  try {
    const settings: Record<string, string> = {}
    for (const key of VOICE_ROOM_KEYS) {
      settings[key] = await getCachedPlatformSetting(key, '')
    }
    return NextResponse.json(
      { settings },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } },
    )
  } catch (e) {
    console.error('[platform/voice-room-settings GET]', e)
    return NextResponse.json({ settings: {} }, { status: 500 })
  }
}
