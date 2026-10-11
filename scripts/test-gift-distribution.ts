/**
 * Hediye Dağılımı & Ajans Satın Alma — Birim Testleri
 * Çalıştır: cd nextjs_space && yarn tsx --require dotenv/config scripts/test-gift-distribution.ts
 */

import prisma from '../lib/db'

// ─── helpers ───
let passed = 0
let failed = 0
function assert(cond: boolean, label: string, detail?: string) {
  if (cond) {
    passed++
    console.log(`  ✅ ${label}`)
  } else {
    failed++
    console.error(`  ❌ ${label}${detail ? ' — ' + detail : ''}`)
  }
}

async function ensureSetting(key: string, value: string) {
  await prisma.platformSettings.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  })
}

// ─── Test 1-4: Gift Distribution (voice room) ───
async function testGiftDistribution() {
  console.log('\n═══ HEDIYE DAĞILIM TESTLERİ ═══')

  // Set known platform settings
  await ensureSetting('vr_platform_percent', '50')
  await ensureSetting('vr_owner_share_guest_gift', '30')

  // Invalidate in-memory cache (getCachedPlatformSetting)
  const { invalidateCache } = await import('../lib/cache')
  invalidateCache('platform:vr_platform_percent')
  invalidateCache('platform:vr_owner_share_guest_gift')
  invalidateCache('platform:__all__')

  const { calculateGiftDistribution } = await import('../lib/voice-room-revenue')

  // T1: Hediye oda sahibine → %50 platform, %50 sahibi
  console.log('\nT1: Oda sahibine hediye (1000 jeton, NORMAL oda)')
  const t1 = await calculateGiftDistribution(1000, 'NORMAL', true)
  assert(t1.siteAmount === 500, 'Platform payı = 500', `got ${t1.siteAmount}`)
  assert(t1.ownerNet === 500, 'Oda sahibi payı = 500', `got ${t1.ownerNet}`)
  assert(t1.receiverNet === 0, 'Misafir payı = 0', `got ${t1.receiverNet}`)
  assert(t1.siteAmount + t1.ownerNet + t1.receiverNet === 1000, 'Toplam = 1000')

  // T2: Hediye misafire → %50 platform, kalan 500'ün %30 sahibi (%15 total), %70 misafir (%35 total)
  console.log('\nT2: Misafir koltuğa hediye (1000 jeton, NORMAL oda)')
  const t2 = await calculateGiftDistribution(1000, 'NORMAL', false)
  assert(t2.siteAmount === 500, 'Platform payı = 500', `got ${t2.siteAmount}`)
  assert(t2.ownerNet === 150, 'Oda sahibi payı = 150 (500 × 30%)', `got ${t2.ownerNet}`)
  assert(t2.receiverNet === 350, 'Misafir payı = 350 (500 − 150)', `got ${t2.receiverNet}`)
  assert(t2.siteAmount + t2.ownerNet + t2.receiverNet === 1000, 'Toplam = 1000')

  // T3: FREE oda — sahibine hediye → hepsi platforma
  console.log('\nT3: FREE oda — sahibine hediye (1000 jeton)')
  const t3 = await calculateGiftDistribution(1000, 'FREE', true)
  assert(t3.ownerNet === 0, 'Oda sahibi = 0 (FREE)', `got ${t3.ownerNet}`)
  assert(t3.receiverNet === 0, 'Misafir = 0 (hediye sahibine)', `got ${t3.receiverNet}`)
  assert(t3.siteAmount === 1000, 'Platform hepsini alır = 1000', `got ${t3.siteAmount}`)

  // T4: FREE oda — misafire hediye → misafir alır, sahip 0
  console.log('\nT4: FREE oda — misafir koltuğa hediye (1000 jeton)')
  const t4 = await calculateGiftDistribution(1000, 'FREE', false)
  assert(t4.ownerNet === 0, 'Oda sahibi = 0 (FREE)', `got ${t4.ownerNet}`)
  assert(t4.receiverNet === 500, 'Misafir = 500 (kalan)', `got ${t4.receiverNet}`)
  assert(t4.siteAmount === 500, 'Platform = 500', `got ${t4.siteAmount}`)

  // T5: Canlı yayın hediye (isRecipientOwner=true) — aynı fonksiyonu kullanır
  console.log('\nT5: Canlı yayın — yayıncıya hediye (1000 jeton)')
  const t5 = await calculateGiftDistribution(1000, 'NORMAL', true)
  assert(t5.siteAmount === 500, 'Platform payı = 500', `got ${t5.siteAmount}`)
  assert(t5.ownerNet === 500, 'Yayıncı payı = 500', `got ${t5.ownerNet}`)

  // T6: Küçük hediye — yuvarlama kontrolü (99 jeton)
  console.log('\nT6: Küçük hediye (99 jeton, misafire)')
  const t6 = await calculateGiftDistribution(99, 'NORMAL', false)
  const t6Total = t6.siteAmount + t6.ownerNet + t6.receiverNet
  assert(t6Total <= 99, 'Toplam ≤ orijinal (yuvarlama kaybı ok)', `total=${t6Total}`)
  assert(t6.ownerNet >= 0 && t6.receiverNet >= 0 && t6.siteAmount >= 0, 'Negatif pay yok')
}

// ─── Test 7-10: Agency Purchase Quote ───
async function testAgencyPurchase() {
  console.log('\n═══ AJANS SATIN ALMA TESTLERİ ═══')

  const { invalidateCache } = await import('../lib/cache')

  // Set known settings
  await ensureSetting('agency_purchase_bonus_pct', '10')
  await ensureSetting('agency.purchase.discount_pct', '15')
  // Remove per-agency overrides
  await prisma.platformSettings.deleteMany({ where: { key: { startsWith: 'agency_purchase_bonus_pct_test' } } })
  await prisma.platformSettings.deleteMany({ where: { key: { startsWith: 'agency.purchase.discount_pct.test' } } })
  invalidateCache('platform:agency_purchase_bonus_pct')
  invalidateCache('platform:agency.purchase.discount_pct')
  invalidateCache('platform:__all__')

  const { quoteAgencyPurchase, quoteAgencyPurchaseByTL, getAgencyPurchaseBonus, getAgencyPurchaseDiscount } = await import('../lib/agency-purchase')

  // T7: Discount mode — jeton gir, TL düşer
  console.log('\nT7: İndirim modu (1000 jeton, %15 indirim)')
  const t7 = await quoteAgencyPurchase('test-agency-id', 1000)
  assert(t7.mode === 'jeton', 'Mod = jeton')
  assert(t7.jetonAmount === 1000, 'Jeton = 1000', `got ${t7.jetonAmount}`)
  assert(t7.discountPercent === 15, 'İndirim = %15', `got ${t7.discountPercent}`)
  assert(t7.finalPriceTl <= t7.listPriceTl, 'finalPrice ≤ listPrice', `final=${t7.finalPriceTl}, list=${t7.listPriceTl}`)
  assert(t7.totalJeton === 1000, 'totalJeton = jetonAmount (indirim modunda bonus yok)', `got ${t7.totalJeton}`)
  assert(t7.bonusJeton === 0, 'bonusJeton = 0 (indirim modunda)', `got ${t7.bonusJeton}`)

  // T8: Bonus mode — TL gir, jeton artar
  console.log('\nT8: Bonus modu (100 TL, %10 bonus)')
  const t8 = await quoteAgencyPurchaseByTL('test-agency-id', 100)
  assert(t8.mode === 'tl', 'Mod = tl')
  assert(t8.finalPriceTl === 100, 'Ödenen TL = 100', `got ${t8.finalPriceTl}`)
  assert(t8.bonusPercent === 10, 'Bonus = %10', `got ${t8.bonusPercent}`)
  assert(t8.bonusJeton > 0, 'bonusJeton > 0', `got ${t8.bonusJeton}`)
  assert(t8.totalJeton === t8.jetonAmount + t8.bonusJeton, 'totalJeton = base + bonus', `total=${t8.totalJeton}, base=${t8.jetonAmount}, bonus=${t8.bonusJeton}`)
  const expectedBonus = Math.floor(t8.jetonAmount * 10 / 100)
  assert(t8.bonusJeton === expectedBonus, `bonusJeton = floor(${t8.jetonAmount} × 10%) = ${expectedBonus}`, `got ${t8.bonusJeton}`)

  // T9: Bonus/İndirim scope kontrolü — global vs ajansa özel
  console.log('\nT9: Scope kontrolü — global ayar')
  const bonus9 = await getAgencyPurchaseBonus('test-agency-nonexist')
  assert(bonus9.scope === 'global', 'Scope = global (ajansa özel ayar yok)', `got ${bonus9.scope}`)
  assert(bonus9.percent === 10, 'Bonus = %10 (global)', `got ${bonus9.percent}`)

  // T10: Ajansa özel bonus
  console.log('\nT10: Ajansa özel bonus')
  await ensureSetting('agency_purchase_bonus_pct_test-agency-special', '25')
  invalidateCache('platform:agency_purchase_bonus_pct_test-agency-special')
  const bonus10 = await getAgencyPurchaseBonus('test-agency-special')
  assert(bonus10.scope === 'agency', 'Scope = agency', `got ${bonus10.scope}`)
  assert(bonus10.percent === 25, 'Bonus = %25 (ajansa özel)', `got ${bonus10.percent}`)
  // Cleanup
  await prisma.platformSettings.deleteMany({ where: { key: 'agency_purchase_bonus_pct_test-agency-special' } })
}

// ─── Test 11-12: Edge Cases ───
async function testEdgeCases() {
  console.log('\n═══ KENAR DURUM TESTLERİ ═══')

  const { calculateGiftDistribution } = await import('../lib/voice-room-revenue')

  // T11: 0 jeton hediye
  console.log('\nT11: 0 jeton hediye')
  const t11 = await calculateGiftDistribution(0, 'NORMAL', true)
  assert(t11.siteAmount === 0, 'Platform = 0', `got ${t11.siteAmount}`)
  assert(t11.ownerNet === 0, 'Sahibi = 0', `got ${t11.ownerNet}`)
  assert(t11.receiverNet === 0, 'Misafir = 0', `got ${t11.receiverNet}`)

  // T12: Çok büyük hediye — tutarlılık
  console.log('\nT12: Büyük hediye (1.000.000 jeton, misafire)')
  const t12 = await calculateGiftDistribution(1_000_000, 'NORMAL', false)
  const t12Total = t12.siteAmount + t12.ownerNet + t12.receiverNet
  assert(t12Total <= 1_000_000, 'Toplam ≤ 1M (yuvarlama kaybı ok)', `total=${t12Total}`)
  assert(t12.siteAmount === 500_000, 'Platform = 500.000', `got ${t12.siteAmount}`)
  assert(t12.ownerNet === 150_000, 'Sahibi = 150.000', `got ${t12.ownerNet}`)
  assert(t12.receiverNet === 350_000, 'Misafir = 350.000', `got ${t12.receiverNet}`)
}

// ─── Main ───
async function main() {
  console.log('🧪 CanlıFal Hediye Dağılımı & Ajans Test Paketi')
  console.log('================================================')

  try {
    await testGiftDistribution()
    await testAgencyPurchase()
    await testEdgeCases()
  } finally {
    await prisma.$disconnect()
  }

  console.log('\n================================================')
  console.log(`Sonuç: ${passed} geçti, ${failed} başarısız`)
  if (failed > 0) process.exit(1)
  console.log('🎉 Tüm testler başarılı!')
}

main().catch(err => {
  console.error('Test çalıştırma hatası:', err)
  process.exit(1)
})
