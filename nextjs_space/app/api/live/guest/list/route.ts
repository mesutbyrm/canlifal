export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getGuestLimits, gridSlotsFor, listGuests, expireStalePending } from '@/lib/live-guest'

/**
 * GET /api/live/guest/list?streamId=...
 * Aktif canlı yayın misafir (guest) listesi.
 * Payload: { count, maxGuests, gridSlots, guests: [...] }
 *
 * Tek doğruluk kaynağı `lib/live-guest.ts`; burada mantık tekrarlanmaz.
 */
export async function GET(req: NextRequest) {
  try {
    const streamId = req.nextUrl.searchParams.get('streamId') || req.nextUrl.searchParams.get('roomId')
    const { maxGuests } = await getGuestLimits()

    if (!streamId) {
      return NextResponse.json({ count: 0, maxGuests, gridSlots: 2, guests: [] })
    }

    await expireStalePending(streamId)
    const guests = await listGuests(streamId)
    const count = guests.length

    return NextResponse.json({
      count,
      maxGuests,
      gridSlots: gridSlotsFor(count, maxGuests),
      guests,
    })
  } catch (e) {
    console.error('live/guest/list error:', e)
    return NextResponse.json({ error: 'Misafir listesi alınamadı' }, { status: 500 })
  }
}
