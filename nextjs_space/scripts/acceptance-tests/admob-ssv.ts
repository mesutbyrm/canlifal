/**
 * AdMob SSV imza doğrulama kabul testi.
 *
 * Çalıştırma:
 *   cd nextjs_space && yarn tsx scripts/acceptance-tests/admob-ssv.ts
 *
 * Bu test VERİTABANINA DOKUNMAZ — yalnızca lib/admob-ssv.ts imza mantığını
 * kendi ürettiği P-256 anahtar çiftiyle doğrular (gerçek Google anahtarı yerine
 * test anahtarı enjekte edilir).
 *
 * Uçtan uca HTTP testi için aşağıdaki LIVE bölümüne bakın; o kısım
 * paylaşılan veritabanına yazdığı için VARSAYILAN OLARAK KAPALIDIR
 * (SSV_LIVE=1 ile açılır).
 */
import crypto from 'crypto'
import {
  extractSignedContent,
  verifyAdMobSsvQuery,
  __setVerifierKeyForTest,
} from '../../lib/admob-ssv'

let failures = 0
function check(name: string, ok: boolean, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`)
  if (!ok) failures++
}

const TEST_KEY_ID = '9999999999'
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
})
__setVerifierKeyForTest(TEST_KEY_ID, publicKey.export({ type: 'spki', format: 'pem' }) as string)

function sign(signedData: string): string {
  const der = crypto.createSign('SHA256').update(signedData, 'utf8').sign(privateKey)
  return der.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function main() {
  const base =
    'ad_network=5450213213286189855' +
    '&ad_unit=8698346072' +
    '&reward_amount=5' +
    '&reward_item=credits' +
    '&timestamp=1759500000000' +
    '&transaction_id=abc123DEF456' +
    '&user_id=test-user-id' +
    '&custom_data=a%20b%2Bc'

  // 1 — imzalanan içerik ayıklama: ham dize aynen korunmalı
  const parsed = extractSignedContent(`?${base}&signature=XYZ&key_id=${TEST_KEY_ID}`)
  check('imzalanan içerik ham sorgudan ayıklanıyor', parsed?.signedData === base)
  check('signature/key_id okunuyor', parsed?.signature === 'XYZ' && parsed?.keyId === TEST_KEY_ID)
  check(
    'yüzde kodlaması bozulmuyor',
    (parsed?.signedData ?? '').includes('custom_data=a%20b%2Bc')
  )

  // 2 — geçerli imza
  const good = await verifyAdMobSsvQuery(`?${base}&signature=${sign(base)}&key_id=${TEST_KEY_ID}`)
  check('geçerli imza doğrulandı', good.ok === true, good.ok ? '' : String(good.reason))

  // 3 — bozuk imza
  const tampered = base.replace('reward_amount=5', 'reward_amount=500')
  const bad = await verifyAdMobSsvQuery(
    `?${tampered}&signature=${sign(base)}&key_id=${TEST_KEY_ID}`
  )
  check('değiştirilmiş sorgu reddedildi', bad.ok === false && bad.reason === 'bad_signature')

  const garbage = await verifyAdMobSsvQuery(`?${base}&signature=Zm9vYmFy&key_id=${TEST_KEY_ID}`)
  check('geçersiz imza baytları reddedildi', garbage.ok === false)

  // 4 — imza yok
  const none = await verifyAdMobSsvQuery(`?${base}`)
  check('imzasız sorgu missing_signature', none.ok === false && none.reason === 'missing_signature')

  console.log(failures === 0 ? '\nOK — tüm imza testleri geçti.' : `\n${failures} test başarısız.`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
