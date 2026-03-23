import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')
    const keys = searchParams.get('keys')

    // Only allow certain public settings
    const allowedKeys = ['chat_room_creation_cost', 'live_session_durations', 'credits_per_minute', 'ad_duration_seconds', 'onesignal_enabled']

    // Support fetching multiple keys at once: ?keys=key1,key2
    if (keys) {
      const keyList = keys.split(',').filter(k => allowedKeys.includes(k.trim()))
      if (keyList.length === 0) {
        return NextResponse.json({ error: 'No valid keys' }, { status: 400 })
      }
      const settings = await prisma.platformSettings.findMany({
        where: { key: { in: keyList } }
      })
      const result: Record<string, string | null> = {}
      keyList.forEach(k => { result[k] = null })
      settings.forEach((s: { key: string; value: string }) => { result[s.key] = s.value })
      return NextResponse.json(result)
    }

    if (!key) {
      return NextResponse.json({ error: 'Key required' }, { status: 400 })
    }

    if (!allowedKeys.includes(key)) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    }

    const setting = await prisma.platformSettings.findUnique({ where: { key } })
    return NextResponse.json({ value: setting?.value || null })
  } catch (error) {
    console.error('Public settings error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
