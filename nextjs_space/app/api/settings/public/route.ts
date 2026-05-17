import { NextRequest, NextResponse } from 'next/server'
import { getCachedPlatformSetting, getCachedAllPlatformSettings, CACHE_TTL } from '@/lib/cache'

export const dynamic = 'force-dynamic'

const allowedKeys = ['chat_room_creation_cost', 'live_session_durations', 'credits_per_minute', 'ad_duration_seconds', 'onesignal_enabled', 'chat_grid_user_limit', 'live_matches_enabled']

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')
    const keys = searchParams.get('keys')

    // Support fetching multiple keys at once: ?keys=key1,key2
    if (keys) {
      const keyList = keys.split(',').filter(k => allowedKeys.includes(k.trim()))
      if (keyList.length === 0) {
        return NextResponse.json({ error: 'No valid keys' }, { status: 400 })
      }
      const result: Record<string, string | null> = {}
      for (const k of keyList) {
        result[k] = await getCachedPlatformSetting(k, '') || null
      }
      return NextResponse.json(result)
    }

    if (!key) {
      return NextResponse.json({ error: 'Key required' }, { status: 400 })
    }

    if (!allowedKeys.includes(key)) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    }

    const value = await getCachedPlatformSetting(key, '')
    return NextResponse.json({ value: value || null })
  } catch (error) {
    console.error('Public settings error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
