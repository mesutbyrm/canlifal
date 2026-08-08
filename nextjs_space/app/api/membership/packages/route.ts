import { NextResponse } from 'next/server'
import { GET as canonicalGET } from '@/app/api/memberships/packages/route'

export const dynamic = 'force-dynamic'

/**
 * @deprecated GET /api/membership/packages
 * Kanonik uç: GET /api/memberships/packages
 * Eski istemciler bozulmasın diye tutuluyor; aynı uygulamayı çağırır.
 */
export async function GET() {
  const res = await canonicalGET()
  const out = NextResponse.json(await res.json(), { status: res.status })
  out.headers.set('Deprecation', 'true')
  out.headers.set('Link', '</api/memberships/packages>; rel="successor-version"')
  return out
}
