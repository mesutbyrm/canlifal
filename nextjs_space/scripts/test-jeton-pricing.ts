/**
 * §20 Kabul testleri — Jeton & CFC fiyatlandırma
 * Çalıştır: yarn tsx --require dotenv/config scripts/test-jeton-pricing.ts
 */
import {
  computeJetonPrice,
  computeCfcPrice,
  getJetonUnitPrice,
  getDiscountSettings,
  getWithdrawalTaxPercent,
  validateClientAmount,
  invalidateJetonPricingCache,
} from '../lib/jeton-pricing'
import { prisma } from '../lib/db'

let pass = 0
let fail = 0

function check(name: string, actual: any, expected: any) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    pass++
    console.log(`  ✅ ${name} → ${JSON.stringify(actual)}`)
  } else {
    fail++
    console.log(`  ❌ ${name} → beklenen ${JSON.stringify(expected)}, gelen ${JSON.stringify(actual)}`)
  }
}

async function main() {
  invalidateJetonPricingCache()

  console.log('\n=== 0) Ayarlar ===')
  const unit = await getJetonUnitPrice()
  const disc = await getDiscountSettings()
  const tax = await getWithdrawalTaxPercent()
  console.log(`  jeton birim fiyat = ${unit} TL`)
  console.log(`  indirim = ${JSON.stringify(disc)}`)
  console.log(`  çekim vergisi = %${tax}`)
  check('Birim fiyat 0.50 TL', unit, 0.5)
  check('İndirim kapalı', disc.enabled, false)
  check('Topup bonus kapalı', disc.topupBonusEnabled, false)

  console.log('\n=== 1) Fiyat hesaplama ===')
  const q1 = await computeJetonPrice(1000)
  const q5 = await computeJetonPrice(5000)
  const q10 = await computeJetonPrice(10000)
  check('1.000 Jeton = 500 TL', q1.finalAmount, 500)
  check('5.000 Jeton = 2.500 TL', q5.finalAmount, 2500)
  check('10.000 Jeton = 5.000 TL', q10.finalAmount, 5000)

  console.log('\n=== 2) Yanlış tutar reddi (PRICE_MISMATCH) ===')
  const bad = validateClientAmount(q10, 10000)
  check('İstemci 10.000 TL gönderirse red', bad.ok, false)
  check('Hata kodu PRICE_MISMATCH', bad.code, 'PRICE_MISMATCH')
  const good = validateClientAmount(q10, 5000)
  check('İstemci 5.000 TL gönderirse kabul', good.ok, true)
  const tol = validateClientAmount(q10, 5000.004)
  check('1 kuruş altı tolerans kabul', tol.ok, true)

  console.log('\n=== 3) Otomatik indirim/bonus yok ===')
  check('İndirim tutarı 0', q10.discountAmount, 0)
  check('Taban fiyat = son fiyat', q10.baseAmount, q10.finalAmount)

  console.log('\n=== 4) Üyelik seviyesi fiyatı değiştirmiyor ===')
  // Fiyat fonksiyonu üyelik parametresi almaz → her seviye için aynı sonuç.
  for (const tier of ['free', 'gold', 'premium', 'diamond', 'svip']) {
    const q = await computeJetonPrice(10000)
    check(`${tier} → 5.000 TL`, q.finalAmount, 5000)
  }

  console.log('\n=== 5) CFC fiyatı ayrı ===')
  const c100 = await computeCfcPrice(100)
  console.log(`  100 CFC = ${c100.finalAmount} TL (birim ${c100.unitPrice})`)
  check('CFC birim fiyatı jetondan bağımsız', c100.unitPrice !== q10.unitPrice || c100.unitPrice === 1, true)

  console.log('\n=== 6) Jeton paketleri birim fiyat uyumu ===')
  const packages = await prisma.creditPackage.findMany({ where: { isActive: true }, orderBy: { credits: 'asc' } })
  for (const p of packages) {
    const expected = Number((p.credits * unit).toFixed(2))
    const actual = Number(p.price.toFixed(2))
    check(`Paket ${p.credits} Jeton`, actual, expected)
  }

  console.log('\n=== 7) Çekim vergisi hesabı ===')
  const gross = 1000
  const taxAmount = Number(((gross * tax) / 100).toFixed(2))
  console.log(`  1.000 TL brüt → kesinti ${taxAmount} TL → net ${gross - taxAmount} TL (%${tax})`)

  console.log(`\n=== SONUÇ: ${pass} başarılı / ${fail} başarısız ===\n`)
  await prisma.$disconnect()
  if (fail > 0) process.exit(1)
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
