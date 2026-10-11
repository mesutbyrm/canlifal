/**
 * F4: Public Top-100 Leaderboard Endpoint
 *
 * GET /api/leaderboards/top100?scope=voice_room|live_stream&period=hourly|daily&key=2026-09-09T14
 *
 * - scope ve period zorunlu
 * - key opsiyonel (şuan aktif periyot için boş bırak)
 * - Lazy finalize: her çağrıda süresi dolmuş periyotlar finalize edilir
 * - Çift auth: web session + mobil token
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import {
  getTop100,
  finalizeExpiredPeriods,
  ensureDefaultConfigs,
  type LeaderboardScope,
  type PeriodType,
} from '@/lib/leaderboard-engine'

export const dynamic = 'force-dynamic'

const VALID_SCOPES = ['voice_room', 'live_stream']
const VALID_PERIODS = ['hourly', 'daily', 'weekly', 'monthly']

export async function GET(request: NextRequest) {
  // Çift auth
  let currentUserId: string | null = null
  try {
    const session = await getServerSession(authOptions)
    currentUserId = (session?.user as any)?.id || null
  } catch {}
  if (!currentUserId) {
    try {
      const mobileUser = await authenticateRequest(request)
      currentUserId = mobileUser?.id || null
    } catch {}
  }

  const { searchParams } = new URL(request.url)
  const scope = searchParams.get('scope') as LeaderboardScope | null
  const period = searchParams.get('period') as PeriodType | null
  const key = searchParams.get('key') || undefined
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '100', 10)))

  if (!scope || !VALID_SCOPES.includes(scope)) {
    return NextResponse.json({ error: 'scope gerekli (voice_room | live_stream)' }, { status: 400 })
  }
  if (!period || !VALID_PERIODS.includes(period)) {
    return NextResponse.json({ error: 'period gerekli (hourly | daily | weekly | monthly)' }, { status: 400 })
  }

  // Lazy: varsayılan config yoksa oluştur + süresi dolmuş periyotları finalize et
  await Promise.allSettled([
    ensureDefaultConfigs(),
    finalizeExpiredPeriods(),
  ])

  const result = await getTop100(scope, period, key, limit)

  // Kullanıcının sırasını bul
  let currentUserRank: number | null = null
  if (currentUserId && result.entries.length > 0) {
    const found = result.entries.find(e => e.userId === currentUserId)
    currentUserRank = found?.rank ?? null
  }

  return NextResponse.json({
    ...result,
    currentUserId,
    currentUserRank,
  })
}
