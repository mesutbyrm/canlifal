import { NextRequest, NextResponse } from 'next/server'
import { forwardFortuneList } from '@/lib/live-fortune-proxy'

export const dynamic = 'force-dynamic'

/** GET /api/live/fal-requests?streamId=... — mobil kısa yol */
export async function GET(request: NextRequest) {
  const streamId = request.nextUrl.searchParams.get('streamId')?.trim()
  if (!streamId) {
    return NextResponse.json({ error: 'streamId gerekli' }, { status: 400 })
  }
  return forwardFortuneList(request, streamId)
}
