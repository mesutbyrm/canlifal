/**
 * Google giriş yapılandırma testleri — veritabanına DOKUNMAZ.
 * Çalıştırma: yarn tsx scripts/acceptance-tests/google-audience.ts
 */
import { resolveGoogleAudiences, maskClientId, isGoogleTransportError } from '../../lib/google-audience'

let pass = 0
let fail = 0

function check(name: string, ok: boolean, detail = '') {
  if (ok) {
    pass++
    console.log(`  ✓ ${name}`)
  } else {
    fail++
    console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`)
  }
}

console.log('\nGoogle audience çözümleme')

check('hiçbir değişken yoksa boş dizi', resolveGoogleAudiences({}).length === 0)

check(
  'tekil GOOGLE_CLIENT_ID okunur',
  JSON.stringify(resolveGoogleAudiences({ GOOGLE_CLIENT_ID: 'a.apps.googleusercontent.com' })) ===
    JSON.stringify(['a.apps.googleusercontent.com'])
)

check(
  'GOOGLE_SERVER_CLIENT_ID takma adı okunur',
  resolveGoogleAudiences({ GOOGLE_SERVER_CLIENT_ID: 'srv' })[0] === 'srv'
)

check(
  'GOOGLE_CLIENT_IDS virgülle ayrılır ve boşluklar kırpılır',
  JSON.stringify(resolveGoogleAudiences({ GOOGLE_CLIENT_IDS: ' x , y ,, z ' })) === JSON.stringify(['x', 'y', 'z'])
)

check(
  'hepsi birleşir ve tekrarlar ayıklanır',
  JSON.stringify(
    resolveGoogleAudiences({ GOOGLE_CLIENT_IDS: 'web,ios', GOOGLE_CLIENT_ID: 'web', GOOGLE_SERVER_CLIENT_ID: 'srv' })
  ) === JSON.stringify(['web', 'ios', 'srv'])
)

console.log('\nMaskeleme')
check('uzun client ID maskelenir', !maskClientId('24667749197-abcdefghijklmnop.apps.googleusercontent.com').includes('abcdefghijklmnop'))
check('boş değer için (boş) döner', maskClientId('') === '(boş)')

console.log('\nHata ayırımı (401 vs 503)')
check('ENOTFOUND → transport', isGoogleTransportError({ code: 'ENOTFOUND' }))
check('ETIMEDOUT → transport', isGoogleTransportError({ code: 'ETIMEDOUT' }))
check(
  'sertifika getirme hatası → transport',
  isGoogleTransportError({ message: 'Failed to retrieve verification certificates: unable to fetch federated signon certs' })
)
check('imza hatası → transport DEĞİL', !isGoogleTransportError({ message: 'Invalid token signature' }))
check(
  'audience uyuşmazlığı → transport DEĞİL',
  !isGoogleTransportError({ message: 'Wrong recipient, payload audience != requiredAudience' })
)

console.log(`\nSonuç: ${pass} başarılı, ${fail} başarısız\n`)
process.exit(fail === 0 ? 0 : 1)
