import { NextResponse } from 'next/server'
import { GET as canonicalGET } from '@/app/api/payments/settings/route'

export const dynamic = 'force-dynamic'

/**
 * @deprecated GET /api/payment-settings
 * Kanonik uç: GET /api/payments/settings
 */
export async function GET() {
  const res = await canonicalGET()
  const out = NextResponse.json(await res.json(), { status: res.status })
  out.headers.set('Deprecation', 'true')
  out.headers.set('Link', '</api/payments/settings>; rel="successor-version"')
  return out
}
