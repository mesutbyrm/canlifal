import { NextResponse } from 'next/server'
import { getCachedFortuneRequestTypes } from '@/lib/cache'
import { withPerfHeaders, checkETag } from '@/lib/perf'

export const dynamic = 'force-dynamic'

// GET - List active fortune request types (public, cached 10min)
export async function GET(request: Request) {
  const t0 = Date.now()
  try {
    const types = await getCachedFortuneRequestTypes()
    const cached = checkETag(request, types)
    if (cached) return cached
    return withPerfHeaders(types, { maxAge: 86400, staleWhileRevalidate: 86400, etag: true, requestStart: t0 })
  } catch (error) {
    console.error('Error fetching fortune request types:', error)
    return NextResponse.json({ error: 'Türler alınamadı' }, { status: 500 })
  }
}
