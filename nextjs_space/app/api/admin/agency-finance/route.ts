import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requirePermission } from '@/lib/rbac'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import {
  AGENCY_SETTING_KEYS, AGENCY_WALLET_USES, AGENCY_COMMISSION_SOURCES, AGENCY_LEVELS,
  getAgencyJetonRate, getAllBonusRules, getAllowedWalletUses, getCommissionRules,
  invalidateAgencySettingsCache,
} from '@/lib/agency-wallet'
import { getCachedPlatformSetting } from '@/lib/cache'

export const dynamic = 'force-dynamic'

/** BÖLÜM 21 / A3 — Ajans finans merkezi: global ayarlar + cüzdan özetleri. */
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'agency.wallet.view')
  if (auth instanceof NextResponse) return auth

  const [rate, bonusRules, allowedUses, globalRules, enabled, minTopUp, maxTransfer] = await Promise.all([
    getAgencyJetonRate(),
    getAllBonusRules(),
    getAllowedWalletUses(),
    getCommissionRules(null),
    getCachedPlatformSetting(AGENCY_SETTING_KEYS.walletEnabled, 'true'),
    getCachedPlatformSetting(AGENCY_SETTING_KEYS.minTopUpTl, '0'),
    getCachedPlatformSetting(AGENCY_SETTING_KEYS.maxTransferPerTxn, '0'),
  ])

  const agencies = await prisma.agency.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, status: true, level: true, ownerName: true,
      commissionRate: true, totalEarnings: true, totalMembers: true, activeMembers: true,
      wallet: { select: { jetonBalance: true, totalTopUp: true, totalBonus: true, totalTransferred: true, totalAdjusted: true, isLocked: true } },
    },
  })

  const totals = agencies.reduce((acc: any, a: any) => {
    acc.balance += a.wallet?.jetonBalance || 0
    acc.topup += a.wallet?.totalTopUp || 0
    acc.bonus += a.wallet?.totalBonus || 0
    acc.transferred += a.wallet?.totalTransferred || 0
    return acc
  }, { balance: 0, topup: 0, bonus: 0, transferred: 0 })

  return NextResponse.json({
    success: true,
    data: {
      settings: {
        tl_to_jeton_rate: rate.rate,
        tl_to_jeton_rate_source: rate.source,
        wallet_enabled: enabled !== 'false',
        min_topup_tl: parseFloat(minTopUp) || 0,
        max_transfer_per_txn: parseFloat(maxTransfer) || 0,
        allowed_uses: allowedUses,
      },
      catalog: {
        uses: AGENCY_WALLET_USES,
        sources: AGENCY_COMMISSION_SOURCES,
        levels: AGENCY_LEVELS,
      },
      bonus_rules: bonusRules,
      global_commission_rules: globalRules,
      agencies,
      totals,
    },
  })
}

/** Global ayarları / bonus kurallarını / global komisyon kurallarını günceller. */
export async function PUT(req: NextRequest) {
  const auth = await requirePermission(req, 'agency.bonus.configure')
  if (auth instanceof NextResponse) return auth
  const admin = (auth as any).user
  const ip = getAuditIp(req)
  const body = await req.json().catch(() => ({}))
  const changed: string[] = []

  const setSetting = async (key: string, value: string, description: string) => {
    await prisma.platformSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value, description },
    })
    changed.push(key)
  }

  if (body.settings && typeof body.settings === 'object') {
    const s = body.settings
    if (s.tl_to_jeton_rate !== undefined) {
      const v = parseFloat(s.tl_to_jeton_rate)
      if (isNaN(v) || v <= 0) return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Geçersiz kur' } }, { status: 400 })
      await setSetting(AGENCY_SETTING_KEYS.tlToJetonRate, String(v), 'Ajans cüzdanı TL → jeton kuru')
    }
    if (s.wallet_enabled !== undefined) {
      await setSetting(AGENCY_SETTING_KEYS.walletEnabled, s.wallet_enabled ? 'true' : 'false', 'Ajans cüzdanı açık/kapalı')
    }
    if (s.min_topup_tl !== undefined) {
      await setSetting(AGENCY_SETTING_KEYS.minTopUpTl, String(parseFloat(s.min_topup_tl) || 0), 'Minimum ajans yükleme tutarı (TL)')
    }
    if (s.max_transfer_per_txn !== undefined) {
      await setSetting(AGENCY_SETTING_KEYS.maxTransferPerTxn, String(parseFloat(s.max_transfer_per_txn) || 0), 'Tek işlemde maksimum ajans transferi')
    }
    if (Array.isArray(s.allowed_uses)) {
      const valid: string[] = AGENCY_WALLET_USES.map((u) => String(u.key))
      const arr = s.allowed_uses.filter((x: any) => valid.includes(String(x)))
      await setSetting(AGENCY_SETTING_KEYS.allowedUses, JSON.stringify(arr), 'İzin verilen ajans cüzdanı kullanımları')
    }
  }

  if (Array.isArray(body.bonus_rules)) {
    for (const r of body.bonus_rules) {
      const level = String(r.level || '')
      if (!AGENCY_LEVELS.some((l) => l.key === level)) continue
      const label = String(r.label || AGENCY_LEVELS.find((l) => l.key === level)?.label || level)
      const bonusRate = Math.max(0, Math.min(100, parseFloat(r.bonusRate) || 0))
      const sortOrder = AGENCY_LEVELS.find((l) => l.key === level)?.sortOrder || 0
      await prisma.agencyBonusRule.upsert({
        where: { level },
        update: {
          label, bonusRate,
          minMonthlyEarning: parseFloat(r.minMonthlyEarning) || 0,
          minActiveBroadcasters: parseInt(r.minActiveBroadcasters) || 0,
          minStreamMinutes: parseInt(r.minStreamMinutes) || 0,
          isActive: r.isActive !== false,
        },
        create: {
          level, label, bonusRate,
          minMonthlyEarning: parseFloat(r.minMonthlyEarning) || 0,
          minActiveBroadcasters: parseInt(r.minActiveBroadcasters) || 0,
          minStreamMinutes: parseInt(r.minStreamMinutes) || 0,
          isActive: r.isActive !== false,
          sortOrder,
        },
      })
      changed.push(`bonus:${level}`)
    }
  }

  if (Array.isArray(body.global_commission_rules)) {
    for (const r of body.global_commission_rules) {
      const sourceType = String(r.sourceType || '')
      if (!AGENCY_COMMISSION_SOURCES.some((s) => s.key === sourceType)) continue
      const rate = r.rate === null || r.rate === undefined || r.rate === '' ? null : Math.max(0, Math.min(100, parseFloat(r.rate)))
      const existing = await prisma.agencyCommissionRule.findFirst({ where: { agencyId: null, sourceType } })
      if (existing) {
        await prisma.agencyCommissionRule.update({
          where: { id: existing.id },
          data: { enabled: !!r.enabled, rate, updatedById: admin.id, updatedByName: admin.name || admin.email },
        })
      } else {
        await prisma.agencyCommissionRule.create({
          data: { agencyId: null, sourceType, enabled: !!r.enabled, rate, updatedById: admin.id, updatedByName: admin.name || admin.email },
        })
      }
      changed.push(`commission:${sourceType}`)
    }
  }

  invalidateAgencySettingsCache()

  recordAudit({
    actorId: admin.id, action: 'agency_finance_config_update',
    targetType: 'agency_finance', targetId: 'GLOBAL',
    metadata: { changed, body }, ip,
  }).catch(() => {})

  return NextResponse.json({ success: true, changed })
}
