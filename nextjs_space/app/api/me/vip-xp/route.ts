/**
 * BÖLÜM 20 §18 — Kullanıcının VIP sezon puanı (XP) özeti + günlük giriş puanı talebi.
 * Jeton/CFC ekonomisiyle ilişkisi YOKTUR.
 * GET  /api/me/vip-xp
 * POST /api/me/vip-xp   { action: "daily_login" }
 */
import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiUnauthorized, apiInternalError, ErrorCodes } from '@/lib/api-response'
import { resolveUserId } from '@/lib/vip-guard'
import { apiLimiter } from '@/lib/rate-limiter'
import { getVipXpSummary, claimDailyLoginXp } from '@/lib/vip-xp'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return apiUnauthorized()

    const limitParam = Number(req.nextUrl.searchParams.get('limit') || 20)
    const summary = await getVipXpSummary(userId, isFinite(limitParam) ? limitParam : 20)
    return apiSuccess(summary)
  } catch (e) {
    console.error('[me/vip-xp] GET hatası:', e)
    return apiInternalError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return apiUnauthorized()

    const { success: rlOk } = apiLimiter.check(`vip-xp:${userId}`)
    if (!rlOk) return apiError(ErrorCodes.RATE_LIMITED, 'Çok fazla istek gönderildi', 429)

    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || 'daily_login')
    if (action !== 'daily_login') {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Geçersiz işlem', 400)
    }

    const result = await claimDailyLoginXp(userId)
    const summary = await getVipXpSummary(userId, 10)
    return apiSuccess({ claimed: result.awarded, amount: result.amount, reason: result.reason ?? null, summary })
  } catch (e) {
    console.error('[me/vip-xp] POST hatası:', e)
    return apiInternalError()
  }
}
