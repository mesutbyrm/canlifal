export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCachedGiftTypes } from '@/lib/cache'
import { serializeGiftMedia } from '@/lib/media-url'
import { normalizeCatalogGift } from '@/lib/gift-admin'
import { withCachePolicy, checkETag } from '@/lib/perf'

export async function GET(request: Request) {
  try {
    const giftTypes = await getCachedGiftTypes()
    const payload = (giftTypes || []).map((g) => normalizeCatalogGift(serializeGiftMedia(g)))
    const notModified = checkETag(request, payload)
    if (notModified) return notModified
    return withCachePolicy(NextResponse.json(payload), 'no-store')
  } catch (error) {
    console.error('Error fetching gift types:', error)
    return NextResponse.json([], { status: 500 })
  }
}
