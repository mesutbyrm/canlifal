export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCachedPlatformSetting } from '@/lib/cache'

const GIFT_DISPLAY_KEYS = [
  'gift_display_show_sender',
  'gift_display_show_amount',
  'gift_display_animation_enabled',
  'gift_display_banner_enabled',
  'gift_display_banner_min_price',
  'gift_display_leaderboard_enabled',
  'gift_display_combo_enabled',
  'gift_display_sound_enabled',
] as const

const DEFAULTS: Record<string, string> = {
  gift_display_show_sender: 'true',
  gift_display_show_amount: 'true',
  gift_display_animation_enabled: 'true',
  gift_display_banner_enabled: 'true',
  gift_display_banner_min_price: '100',
  gift_display_leaderboard_enabled: 'true',
  gift_display_combo_enabled: 'true',
  gift_display_sound_enabled: 'true',
}

/**
 * GET /api/gifts/display-settings
 * Hediye gösterim ayarlarının herkese açık görünümü.
 */
export async function GET() {
  try {
    const settings: Record<string, string> = {}
    for (const key of GIFT_DISPLAY_KEYS) {
      settings[key] = await getCachedPlatformSetting(key, DEFAULTS[key] ?? '')
    }
    return NextResponse.json(
      { settings },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } },
    )
  } catch (e) {
    console.error('[gifts/display-settings GET]', e)
    return NextResponse.json({ settings: {} }, { status: 500 })
  }
}
