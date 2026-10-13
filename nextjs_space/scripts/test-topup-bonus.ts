import { resolveTopupBonus } from '@/lib/currency-branding'
import { getDiscountSettings } from '@/lib/jeton-pricing'

async function main() {
  let pass = 0, fail = 0
  const check = (name: string, ok: boolean, extra = '') => {
    if (ok) { pass++; console.log(`  OK   ${name} ${extra}`) }
    else { fail++; console.log(`  FAIL ${name} ${extra}`) }
  }
  const d = await getDiscountSettings()
  check('topupBonusEnabled kapali', d.topupBonusEnabled === false, `(=${d.topupBonusEnabled})`)

  for (const amt of [10000, 25000, 50000, 100000]) {
    for (const cur of ['jeton', 'cfc', 'credits']) {
      const r = await resolveTopupBonus({ amount: amt, currency: cur, sourceType: 'jeton_payment' })
      check(`bonus yok: ${amt} ${cur}`, r.bonusAmount === 0 && r.tier === null, `(bonus=${r.bonusAmount})`)
    }
  }
  console.log(`\n${pass} basarili / ${fail} basarisiz`)
  process.exit(fail > 0 ? 1 : 0)
}
main()
