/**
 * F4: Admin Leaderboard Yönetimi
 *
 * GET  — Config listesi + geçmiş periyotlar + ödül geçmişi
 * POST — Aksiyonlar: update_config, finalize_now, distribute_rewards, seed_defaults
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { recordAudit } from '@/lib/audit-log'
import { requireConfirmation } from '@/lib/critical-confirm'
import { invalidateCache } from '@/lib/cache'
import {
  ensureDefaultConfigs,
  finalizeExpiredPeriods,
  distributeRewards,
  type RewardConfigEntry,
  type ScoringRules,
} from '@/lib/leaderboard-engine'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['admin', 'yonetici']

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (!role || !ADMIN_ROLES.includes(role)) return null
  return (session?.user as any)?.id as string
}

// ─── GET: Tüm konfigürasyonlar + geçmiş periyotlar ───
export async function GET(request: NextRequest) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') || 'configs' // configs | periods | rewards

  if (view === 'configs') {
    const configs = await prisma.leaderboardConfig.findMany({
      orderBy: [{ scope: 'asc' }, { periodType: 'asc' }],
      include: { _count: { select: { periods: true } } },
    })
    return NextResponse.json({ configs })
  }

  if (view === 'periods') {
    const scope = searchParams.get('scope') || undefined
    const periodType = searchParams.get('periodType') || undefined
    const status = searchParams.get('status') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20', 10))

    const where: any = {}
    if (scope) where.scope = scope
    if (periodType) where.periodType = periodType
    if (status) where.status = status

    const [periods, total] = await Promise.all([
      prisma.leaderboardPeriod.findMany({
        where,
        orderBy: { startTime: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { entries: true, rewards: true } } },
      }),
      prisma.leaderboardPeriod.count({ where }),
    ])
    return NextResponse.json({ periods, total, page, limit })
  }

  if (view === 'rewards') {
    const periodId = searchParams.get('periodId')
    if (!periodId) return NextResponse.json({ error: 'periodId gerekli' }, { status: 400 })

    const rewards = await prisma.leaderboardReward.findMany({
      where: { periodId },
      orderBy: { rank: 'asc' },
      include: { user: { select: { id: true, name: true, username: true, image: true } } },
    })
    return NextResponse.json({ rewards })
  }

  return NextResponse.json({ error: 'Geçersiz view' }, { status: 400 })
}

// ─── POST: Aksiyonlar ───
export async function POST(request: NextRequest) {
  const adminId = await requireAdmin()
  if (!adminId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 }) }

  const { action } = body

  // --- seed_defaults: Varsayılan 4 config oluştur ---
  if (action === 'seed_defaults') {
    await ensureDefaultConfigs()
    invalidateCache('lb:active_configs')
    return NextResponse.json({ ok: true, message: 'Varsayılan konfigürasyonlar oluşturuldu' })
  }

  // --- update_config: Bir config'i güncelle ---
  if (action === 'update_config') {
    const { configId, isEnabled, topN, rewardConfig, scoringRules } = body
    if (!configId) return NextResponse.json({ error: 'configId gerekli' }, { status: 400 })

    const data: any = {}
    if (typeof isEnabled === 'boolean') data.isEnabled = isEnabled
    if (typeof topN === 'number' && topN > 0 && topN <= 1000) data.topN = topN
    if (rewardConfig !== undefined) {
      // Validasyon
      if (Array.isArray(rewardConfig)) {
        for (const rc of rewardConfig as RewardConfigEntry[]) {
          if (!rc.rank || !rc.rewardType || !rc.rewardValue) {
            return NextResponse.json({ error: 'rewardConfig girişlerinde rank, rewardType, rewardValue zorunlu' }, { status: 400 })
          }
        }
        data.rewardConfig = rewardConfig
      } else {
        data.rewardConfig = null
      }
    }
    if (scoringRules !== undefined) {
      data.scoringRules = scoringRules
    }

    const updated = await prisma.leaderboardConfig.update({
      where: { id: configId },
      data,
    })
    invalidateCache('lb:active_configs')
    recordAudit({ actorId: adminId, action: 'leaderboard.update_config', targetType: 'leaderboard_config', targetId: configId, after: data }).catch(() => {})
    return NextResponse.json({ ok: true, config: updated })
  }

  // --- finalize_now: Süresi dolmuş periyotları şimdi finalize et ---
  if (action === 'finalize_now') {
    const count = await finalizeExpiredPeriods()
    return NextResponse.json({ ok: true, finalized: count })
  }

  // --- distribute_rewards: Belirli bir periyodun ödüllerini dağıt ---
  if (action === 'distribute_rewards') {
    const { periodId } = body
    if (!periodId) return NextResponse.json({ error: 'periodId gerekli' }, { status: 400 })

    // Kritik işlem onayı (spec §88)
    const guard = requireConfirmation('distribute_rewards', body.confirm)
    if (guard) return guard

    const result = await distributeRewards(periodId)
    recordAudit({ actorId: adminId, action: 'leaderboard.distribute_rewards', targetType: 'leaderboard_period', targetId: periodId, after: result }).catch(() => {})
    return NextResponse.json({ ok: true, ...result })
  }

  // --- create_config: Yeni config oluştur (haftalık/aylık/etkinlik) ---
  if (action === 'create_config') {
    const { scope, periodType, topN, rewardConfig, scoringRules } = body
    if (!scope || !periodType) return NextResponse.json({ error: 'scope ve periodType gerekli' }, { status: 400 })

    const existing = await prisma.leaderboardConfig.findUnique({
      where: { scope_periodType: { scope, periodType } },
    })
    if (existing) return NextResponse.json({ error: 'Bu scope+periodType zaten mevcut' }, { status: 409 })

    const config = await prisma.leaderboardConfig.create({
      data: {
        scope, periodType,
        isEnabled: true,
        topN: topN || 100,
        rewardConfig: rewardConfig || null,
        scoringRules: scoringRules || null,
      },
    })
    invalidateCache('lb:active_configs')
    return NextResponse.json({ ok: true, config })
  }

  return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 })
}
