/**
 * 3 gün sebepsiz çıkış kuralı — periyodik tarama.
 * Bekleyen ajans çıkış taleplerini 3 gün sonra otomatik onaylar.
 * CRON_SECRET ile korunur; süper admin de elle tetikleyebilir.
 */
import { NextRequest, NextResponse } from 'next/server'
import { apiSuccess, apiError, ErrorCodes } from '@/lib/api-response'
import { requireSuperAdmin } from '@/lib/rbac'
import { processExpiredLeaveRequests } from '@/lib/agency-auto-leave'

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
    const result = await processExpiredLeaveRequests()
    return apiSuccess({
      processed: result.processed,
      removedUserIds: result.removedUserIds.slice(0, 50),
      ranAt: new Date().toISOString(),
    })
  } catch (e: any) {
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Otomatik çıkış taraması başarısız', 500, { message: String(e?.message || e) })
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
