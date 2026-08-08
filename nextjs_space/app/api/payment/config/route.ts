import { NextRequest } from 'next/server'
import { GET as canonicalGET } from '@/app/api/payments/config/route'

export const dynamic = 'force-dynamic'

/**
 * @deprecated GET /api/payment/config
 * Kanonik uç: GET /api/payments/config
 */
export async function GET(request: NextRequest) {
  const res = await canonicalGET(request)
  res.headers.set('Deprecation', 'true')
  res.headers.set('Link', '</api/payments/config>; rel="successor-version"')
  return res
}
