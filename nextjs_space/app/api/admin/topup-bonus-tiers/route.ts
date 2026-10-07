import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { DEFAULT_BONUS_TIERS } from '@/lib/currency-branding'
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['admin', 'yonetici', 'moderator', 'finans']
const WRITE_ROLES = ['admin', 'yonetici', 'finans']
const CURRENCIES = ['all', 'jeton', 'cfc']
const SOURCE_TYPES = ['all', 'admin_credit', 'cfc_payment', 'package']

export async function GET(request: NextRequest) {
  try {
    const session = await getHybridSession(request)
    const role = (session?.user as any)?.role
    if (!session?.user?.id || !(await staffCan(role, (session?.user as any)?.id, 'finance.report.view', ADMIN_ROLES))) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const tiers = await prisma.topupBonusTier.findMany({
      orderBy: [{ minAmount: 'asc' }, { sortOrder: 'asc' }],
    })

    return NextResponse.json({
      tiers,
      stats: {
        total: tiers.length,
        active: tiers.filter((t) => t.isActive).length,
        maxPercent: tiers.reduce((m, t) => (t.isActive && t.bonusPercent > m ? t.bonusPercent : m), 0),
        lowestThreshold: tiers.filter((t) => t.isActive).reduce<number | null>(
          (m, t) => (m === null || t.minAmount < m ? t.minAmount : m),
          null
        ),
      },
    })
  } catch (error) {
    console.error('[bonus tiers GET] error:', error)
    return NextResponse.json({ error: 'Kademeler alınamadı' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getHybridSession(request)
    const role = (session?.user as any)?.role
    if (!session?.user?.id || !(await staffCan(role, (session?.user as any)?.id, 'finance.report.view', WRITE_ROLES))) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))

    // Varsayılan kademeleri yükle
    if (body?.action === 'seed_defaults') {
      const existing = await prisma.topupBonusTier.count()
      if (existing > 0) {
        return NextResponse.json({ error: 'Zaten kademe tanımlı. Önce mevcutları düzenleyin.' }, { status: 400 })
      }
      const created = await prisma.topupBonusTier.createMany({
        data: DEFAULT_BONUS_TIERS.map((t) => ({ ...t, currency: 'all', sourceType: 'all', isActive: true })),
      })
      return NextResponse.json({ success: true, created: created.count })
    }

    const minAmount = Math.floor(Number(body?.minAmount) || 0)
    const bonusPercent = Number(body?.bonusPercent) || 0
    if (minAmount <= 0) {
      return NextResponse.json({ error: 'Alt sınır 0\'dan büyük olmalı' }, { status: 400 })
    }
    if (bonusPercent <= 0 || bonusPercent > 100) {
      return NextResponse.json({ error: 'Bonus oranı %0 ile %100 arasında olmalı' }, { status: 400 })
    }

    const currency = CURRENCIES.includes(body?.currency) ? body.currency : 'all'
    const sourceType = SOURCE_TYPES.includes(body?.sourceType) ? body.sourceType : 'all'

    const tier = await prisma.topupBonusTier.create({
      data: {
        label: body?.label ? String(body.label).slice(0, 80) : null,
        minAmount,
        bonusPercent,
        currency,
        sourceType,
        maxBonus: Math.max(0, Math.floor(Number(body?.maxBonus) || 0)),
        isActive: body?.isActive !== false,
        sortOrder: Math.floor(Number(body?.sortOrder) || 0),
      },
    })

    return NextResponse.json({ success: true, tier })
  } catch (error) {
    console.error('[bonus tiers POST] error:', error)
    return NextResponse.json({ error: 'Kademe oluşturulamadı' }, { status: 500 })
  }
}
