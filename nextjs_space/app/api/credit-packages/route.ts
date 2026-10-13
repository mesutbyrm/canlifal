export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCachedCreditPackages } from '@/lib/cache'
import { withCachePolicy, checkETag } from '@/lib/perf'

export async function GET(request: Request) {
  try {
    const packages = await getCachedCreditPackages()
    const notModified = checkETag(request, packages)
    if (notModified) return notModified
    return withCachePolicy(NextResponse.json(packages), 'public-10m')
  } catch (error) {
    console.error('Error fetching credit packages:', error)
    return NextResponse.json([], { status: 500 })
  }
}
