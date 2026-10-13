import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveStaff } from '@/lib/admin-auth'
import { hasPermission } from '@/lib/permissions'
import {
  JETON_PRICING_KEYS,
  getJetonUnitPrice,
  getCfcUnitPrice,
  getDiscountSettings,
  getWithdrawalTaxPercent,
  computeJetonPrice,
  invalidateJetonPricingCache,
} from '@/lib/jeton-pricing'

export const dynamic = 'force-dynamic'

const FULL_ADMIN = ['admin', 'yonetici']

/** Yalnızca yetkili personel. Normal kullanıcı → 403. */
async function requireFinanceAdmin(req: NextRequest) {
  const staff = await resolveStaff(req)
  if (!staff) return { error: NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 }) }
  const allowed =
    FULL_ADMIN.includes(staff.role) ||
    (await hasPermission(staff.role, 'system.config.manage', staff.id)) ||
    (await hasPermission(staff.role, 'finance.jeton.adjust', staff.id))
  if (!allowed) return { error: NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 }) }
  return { staff }
}

export async function GET(req: NextRequest) {
  const guard = await requireFinanceAdmin(req)
  if ('error' in guard) return guard.error

  const [unitPrice, cfcUnitPrice, discount, taxPercent] = await Promise.all([
    getJetonUnitPrice(),
    getCfcUnitPrice(),
    getDiscountSettings(),
    getWithdrawalTaxPercent(),
  ])

  // Örnek fiyat tablosu (§20 testleri ile aynı formül)
  const samples = await Promise.all([1000, 5000, 10000].map((q) => computeJetonPrice(q)))

  return NextResponse.json({
    jetonUnitPrice: unitPrice,
    cfcUnitPrice,
    discountEnabled: discount.enabled,
    discountPercent: discount.percent,
    topupBonusEnabled: discount.topupBonusEnabled,
    withdrawalTaxPercent: taxPercent,
    samples: samples.map((s) => ({
      jetonAmount: s.jetonAmount,
      finalAmount: s.finalAmount,
      baseAmount: s.baseAmount,
    })),
  })
}

export async function POST(req: NextRequest) {
  const guard = await requireFinanceAdmin(req)
  if ('error' in guard) return guard.error

  const body = await req.json().catch(() => ({}))
  const updates: Array<{ key: string; value: string; description: string }> = []

  const num = (v: any) => (v == null || v === '' ? null : Number(v))

  const jp = num(body.jetonUnitPrice)
  if (jp != null) {
    if (!isFinite(jp) || jp <= 0) return NextResponse.json({ error: 'Geçersiz jeton birim fiyatı' }, { status: 400 })
    updates.push({ key: JETON_PRICING_KEYS.unitPrice, value: String(jp), description: 'Birim jeton fiyatı (TL)' })
  }

  const cp = num(body.cfcUnitPrice)
  if (cp != null) {
    if (!isFinite(cp) || cp <= 0) return NextResponse.json({ error: 'Geçersiz CFC birim fiyatı' }, { status: 400 })
    updates.push({ key: JETON_PRICING_KEYS.cfcUnitPrice, value: String(cp), description: 'Birim CFC fiyatı (TL)' })
  }

  if (body.discountEnabled !== undefined) {
    updates.push({
      key: JETON_PRICING_KEYS.discountEnabled,
      value: body.discountEnabled ? 'true' : 'false',
      description: 'Jeton indirimi aktif mi (varsayılan kapalı)',
    })
  }

  const dp = num(body.discountPercent)
  if (dp != null) {
    if (!isFinite(dp) || dp < 0 || dp > 90)
      return NextResponse.json({ error: 'İndirim yüzdesi 0-90 arasında olmalı' }, { status: 400 })
    updates.push({ key: JETON_PRICING_KEYS.discountPercent, value: String(dp), description: 'Jeton indirim yüzdesi' })
  }

  if (body.topupBonusEnabled !== undefined) {
    updates.push({
      key: JETON_PRICING_KEYS.topupBonusEnabled,
      value: body.topupBonusEnabled ? 'true' : 'false',
      description: 'Otomatik yükleme bonusu aktif mi (varsayılan kapalı)',
    })
  }

  const tax = num(body.withdrawalTaxPercent)
  if (tax != null) {
    if (!isFinite(tax) || tax < 0 || tax > 100)
      return NextResponse.json({ error: 'Vergi yüzdesi 0-100 arasında olmalı' }, { status: 400 })
    updates.push({
      key: JETON_PRICING_KEYS.withdrawalTaxPercent,
      value: String(tax),
      description: 'Para çekiminde uygulanan vergi/kesinti yüzdesi',
    })
  }

  if (updates.length === 0) return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 })

  for (const u of updates) {
    await prisma.platformSettings.upsert({
      where: { key: u.key },
      update: { value: u.value, description: u.description },
      create: { key: u.key, value: u.value, description: u.description },
    })
  }
  invalidateJetonPricingCache()

  const [unitPrice, cfcUnitPrice, discount, taxPercent] = await Promise.all([
    getJetonUnitPrice(),
    getCfcUnitPrice(),
    getDiscountSettings(),
    getWithdrawalTaxPercent(),
  ])

  return NextResponse.json({
    success: true,
    updated: updates.map((u) => u.key),
    jetonUnitPrice: unitPrice,
    cfcUnitPrice,
    discountEnabled: discount.enabled,
    discountPercent: discount.percent,
    topupBonusEnabled: discount.topupBonusEnabled,
    withdrawalTaxPercent: taxPercent,
  })
}
