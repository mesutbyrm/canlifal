import { NextResponse } from 'next/server'
import { GET as canonicalGET } from '@/app/api/payments/methods/route'

export const dynamic = 'force-dynamic'

/**
 * @deprecated GET /api/payment-methods
 * Kanonik uç: GET /api/payments/methods
 */
export async function GET() {
  console.warn('[DEPRECATED] GET /api/payment-methods → kanonik: /api/payments/methods')
  const res = await canonicalGET()
  const out = NextResponse.json(await res.json(), { status: res.status })
  out.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  out.headers.set('Deprecation', 'true')
  out.headers.set('Link', '</api/payments/methods>; rel="successor-version"')
  return out
}
