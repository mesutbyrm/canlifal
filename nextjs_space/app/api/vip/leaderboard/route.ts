/**
 * BÖLÜM 20 §19 — VIP kullanıcı sıralaması (sezon puanına göre).
 * Herkese açık okunur; `hideVipStatus` tercihi olanlar anonimleştirilir.
 * GET /api/vip/leaderboard?limit=50
 */
import { NextRequest } from 'next/server'
import { apiSuccess, apiInternalError } from '@/lib/api-response'
import { resolveUserId } from '@/lib/vip-guard'
import { getVipLeaderboard } from '@/lib/vip-xp'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const viewerId = await resolveUserId(req)
    const limit = Number(req.nextUrl.searchParams.get('limit') || 50)
    const data = await getVipLeaderboard({ limit: isFinite(limit) ? limit : 50, viewerId })
    return apiSuccess(data)
  } catch (e) {
    console.error('[vip/leaderboard] hata:', e)
    return apiInternalError()
  }
}
