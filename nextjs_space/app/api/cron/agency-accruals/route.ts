/**
 * Yayıncı hedef dönemlerini otomatik kapatır (günlük/haftalık/aylık).
 * Önerilen: günde bir kez (ör. 00:15 TR) çağrılır. İdempotent — aynı dönem iki kez kapanmaz.
 * Ayrıca ajans paneli açıldığında ajans bazında kendiliğinden tetiklenir.
 * CRON_SECRET ile korunur; süper admin de elle tetikleyebilir.
 */
import { NextRequest, NextResponse } from 'next/server'
import { apiSuccess, apiError, ErrorCodes } from '@/lib/api-response'
import { requireSuperAdmin } from '@/lib/rbac'
import { autoClosePeriods } from '@/lib/agency-accruals'

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
  try {
    const r = await autoClosePeriods()
    return apiSuccess({ ...r, ranAt: new Date().toISOString() })
  } catch (e: any) {
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Dönem kapatma başarısız', 500, { message: String(e?.message || e) })
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
