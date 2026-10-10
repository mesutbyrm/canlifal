/**
 * Ajans performansı — saf hesap testleri (DB gerekmez).
 * Çalıştır: npx tsx scripts/test-agency-performance.ts
 */
import {
  clipToWindows,
  dailyMinutes,
  mergeIntervals,
  periodRange,
  streamInterval,
  totalMinutes,
  MEDIA_GRACE_MS,
} from '../lib/agency-performance'

let pass = 0
let fail = 0
function check(name: string, actual: any, expected: any) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) pass++
  else fail++
  console.log(`  ${ok ? '✅' : '❌'} ${name} → ${JSON.stringify(actual)}${ok ? '' : ` (beklenen ${JSON.stringify(expected)})`}`)
}
const t = (iso: string) => new Date(iso).getTime()
const M = 60000

// 1) Çakışan iki oturum iki kez sayılmaz: 10:00-11:00 + 10:30-11:30 = 90 dk
const merged = mergeIntervals([
  { start: t('2026-10-05T07:00:00Z'), end: t('2026-10-05T08:00:00Z') },
  { start: t('2026-10-05T07:30:00Z'), end: t('2026-10-05T08:30:00Z') },
])
check('çakışan oturumlar birleşir', totalMinutes(merged), 90)
check('tek aralık kalır', merged.length, 1)

// 2) Üyelik penceresine kırpma: yayın 09:00-12:00, üyelik 10:00'da başladı → 120 dk
const clipped = clipToWindows(
  [{ start: t('2026-10-05T06:00:00Z'), end: t('2026-10-05T09:00:00Z') }],
  [{ start: t('2026-10-05T07:00:00Z'), end: t('2026-10-06T00:00:00Z') }],
)
check('üyelik öncesi süre sayılmaz', totalMinutes(clipped), 120)

// 3) Gece yarısını (TR) geçen yayın iki güne bölünür: 23:30-00:45 TR
const days = dailyMinutes([{ start: t('2026-10-05T20:30:00Z'), end: t('2026-10-05T21:45:00Z') }])
check('gün bölme (TR saati)', Array.from(days.entries()), [['2026-10-05', 30], ['2026-10-06', 45]])

// 4) Medya kesilmiş ama yayın açık kalmış: 60 dk yayın, medya 20. dk'da kesildi → 20 dk + tolerans
const now = t('2026-10-05T12:00:00Z')
const r = streamInterval(
  {
    id: 's', userId: 'u', title: null, status: 'ended',
    startedAt: new Date(t('2026-10-05T10:00:00Z')),
    endedAt: new Date(t('2026-10-05T11:00:00Z')),
    lastMediaAt: new Date(t('2026-10-05T10:20:00Z')),
    autoClosedAt: null,
  },
  now,
)
check('medya kesintisi sonrası sayılmaz', r.interval ? (r.interval.end - r.interval.start) / M : null, 20 + MEDIA_GRACE_MS / M)
check('kesinti işaretlenir', r.interrupted, true)

// 5) Görsel/boş yayın: başlangıç = bitiş → aralık yok
const z = streamInterval(
  { id: 'z', userId: 'u', title: null, status: 'ended', startedAt: new Date(now - M), endedAt: new Date(now - M), lastMediaAt: null, autoClosedAt: null },
  now,
)
check('sıfır süreli yayın sayılmaz', z.interval, null)

// 6) Dönem sınırları (TR): Çarşamba 2026-10-07 15:00 TR → hafta Pazartesi 00:00 TR
const w = periodRange('weekly', new Date(t('2026-10-07T12:00:00Z')))
check('hafta başı Pazartesi 00:00 TR', w.start.toISOString(), '2026-10-04T21:00:00.000Z')
check('hafta sonu', w.end.toISOString(), '2026-10-11T21:00:00.000Z')
const mo = periodRange('monthly', new Date(t('2026-10-31T22:30:00Z'))) // TR'de 1 Kasım
check('ay sınırı TR saatine göre', mo.start.toISOString(), '2026-10-31T21:00:00.000Z')

console.log(`\n${pass} geçti, ${fail} kaldı`)
process.exit(fail ? 1 : 0)
