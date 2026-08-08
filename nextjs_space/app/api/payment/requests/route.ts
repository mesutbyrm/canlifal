import { NextRequest } from 'next/server'
import {
  GET as canonicalGET,
  POST as canonicalPOST,
} from '@/app/api/payments/requests/route'

export const dynamic = 'force-dynamic'

/**
 * @deprecated /api/payment/requests
 * Kanonik uç: /api/payments/requests
 */
export async function GET(request: NextRequest) {
  console.warn('[DEPRECATED] GET /api/payment/requests → kanonik: /api/payments/requests')
  const res = await canonicalGET(request)
  res.headers.set('Deprecation', 'true')
  res.headers.set('Link', '</api/payments/requests>; rel="successor-version"')
  return res
}

export async function POST(request: NextRequest) {
  console.warn('[DEPRECATED] POST /api/payment/requests → kanonik: /api/payments/requests')
  const res = await canonicalPOST(request)
  res.headers.set('Deprecation', 'true')
  res.headers.set('Link', '</api/payments/requests>; rel="successor-version"')
  return res
}
