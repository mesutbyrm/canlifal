export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { isAdminRole } from '@/lib/admin-utils'
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
 * GET /api/admin/voice-room-settings
 * Sesli oda platform ayarlarını döner.
 */
export async function GET(req: NextRequest) {
  const actor = await resolveUser(req)
  if (!actor) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  if (!isAdminRole(actor.role)) return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })

  try {
    const settings: Record<string, string> = {}
    for (const key of VOICE_ROOM_KEYS) {
      settings[key] = await getCachedPlatformSetting(key, '')
    }
    return NextResponse.json({ settings })
  } catch (e) {
    console.error('[voice-room-settings GET]', e)
    return NextResponse.json({ error: 'Ayarlar yüklenemedi' }, { status: 500 })
  }
}

/**
 * POST /api/admin/voice-room-settings
 * Sesli oda ayarlarını günceller.
 * body: { key: value, ... }
 */
export async function POST(req: NextRequest) {
  const actor = await resolveUser(req)
  if (!actor) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  if (!isAdminRole(actor.role)) return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })

  try {
    const body = await req.json()
    const updated: string[] = []

    for (const key of VOICE_ROOM_KEYS) {
      if (body[key] !== undefined) {
        await prisma.platformSettings.upsert({
          where: { key },
          update: { value: String(body[key]) },
          create: { key, value: String(body[key]) },
        })
        updated.push(key)
      }
    }

    return NextResponse.json({ success: true, updated })
  } catch (e) {
    console.error('[voice-room-settings POST]', e)
    return NextResponse.json({ error: 'Ayarlar güncellenemedi' }, { status: 500 })
  }
}
