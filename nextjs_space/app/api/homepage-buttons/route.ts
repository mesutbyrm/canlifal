import { NextResponse } from 'next/server'
import { getCached, CACHE_TTL } from '@/lib/cache'
import { withPerfHeaders, checkETag } from '@/lib/perf'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const t0 = Date.now()
  try {
    const buttons = await getCached('homepage:buttons:visible', CACHE_TTL.HOMEPAGE_BUTTONS, () =>
      prisma.homepageButton.findMany({
        where: { isVisible: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          key: true,
          label: true,
          icon: true,
          href: true,
          sortOrder: true,
          specialBehavior: true,
        },
      })
    )
    const data = { buttons }
    const cached = checkETag(request, data)
    if (cached) return cached
    return withPerfHeaders(data, { maxAge: 60, staleWhileRevalidate: 300, etag: true, requestStart: t0 })
  } catch (error) {
    console.error('Homepage buttons fetch error:', error)
    return NextResponse.json({ buttons: [] })
  }
}
