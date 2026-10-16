import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getNotificationPrefs, saveNotificationPrefs, NOTIFICATION_CHANNELS } from '@/lib/notification-prefs'

export const dynamic = 'force-dynamic'

/**
 * GET/PUT /api/user/notification-settings
 * Kanallar: messages, liveStarters, dailyFortune, other (varsayılan hepsi açık).
 * Kapatılan kanalın push bildirimi sunucudan hiç gönderilmez (uygulama
 * içindeki bildirim listesi etkilenmez).
 */
export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Giriş yapın' }, { status: 401 })
  const prefs = await getNotificationPrefs(user.id)
  return NextResponse.json({ success: true, data: prefs })
}

export async function PUT(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Giriş yapın' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const patch: Record<string, boolean> = {}
  for (const c of NOTIFICATION_CHANNELS) {
    if (typeof body?.[c] === 'boolean') patch[c] = body[c]
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ success: false, error: 'Değiştirilecek ayar yok' }, { status: 400 })
  }
  const prefs = await saveNotificationPrefs(user.id, patch)
  return NextResponse.json({ success: true, data: prefs })
}

export const PATCH = PUT
