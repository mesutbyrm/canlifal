/**
 * BÖLÜM 20 — Süresi dolan üyelikleri Basic'e düşürür (§23).
 * Kozmetik seçimler SAKLANIR, yalnız kullanılamaz hale gelir.
 * CRON_SECRET ile korunur; süper admin de elle tetikleyebilir.
 */
import { NextRequest, NextResponse } from 'next/server'
import { apiSuccess, apiError, ErrorCodes } from '@/lib/api-response'
import { requireSuperAdmin } from '@/lib/rbac'
import { sweepExpiredMemberships } from '@/lib/membership-lifecycle'

export const dynamic = 'force-dynamic'

async function authorize(req: NextRequest): Promise<NextResponse | null> {
  const secret = process.env.CRON_SECRET
  const header = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (secret && header && header === secret) return null
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth
  return null
}

export async function POST(req: NextRequest) {
  const denied = await authorize(req)
  if (denied) return denied

  const url = new URL(req.url)
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '500', 10) || 500, 1), 2000)

  try {
    const result = await sweepExpiredMemberships(limit)
    return apiSuccess({
      processed: result.processed,
      userIds: result.userIds.slice(0, 50),
      ranAt: new Date().toISOString(),
    })
  } catch (e: any) {
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Süre bitiş taraması başarısız', 500, { message: String(e?.message || e) })
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
