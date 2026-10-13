/**
 * GirLive moderasyon çekirdeği — saf birim testleri.
 * Çalıştırma:  npx tsx scripts/acceptance-tests/girlive-moderation.unit.ts
 */
import assert from 'node:assert/strict'
import {
  DEFAULT_BANNED_WORDS,
  DEFAULT_SEVERITY_ACTIONS,
  botNoticeFor,
  decideAction,
  detectViolation,
  escalateSeverity,
  normalizeText,
  parseSeverityActions,
  tokenize,
} from '../../lib/girlive-moderation-core'

const detect = (t: string, wl: string[] = []) => detectViolation(t, DEFAULT_BANNED_WORDS, wl)

// Normal mesajlar geçer (yanlış pozitif yok)
for (const ok of ['merhaba nasılsınız', 'Amasya güzel bir şehir', 'sikke koleksiyonu yapıyorum', 'malatya', 'ama neden', 'salaklık yapma sevgili dostum?'.replace('salaklık', 'saygı')]) {
  assert.equal(detect(ok), null, `yanlış pozitif: ${ok}`)
}

// Eşleşmeler + ciddiyet
assert.equal(detect('sen salak mısın')?.severity, 'LOW')
assert.equal(detect('amk')?.severity, 'MEDIUM')
assert.equal(detect('AMKKKK')?.severity, 'MEDIUM', 'tekrar eden harf')
assert.equal(detect('a.m.k')?.severity, 'MEDIUM', 'noktalı yazım')
assert.equal(detect('s i k t i r git')?.severity, 'MEDIUM', 'boşluklu yazım')
assert.equal(detect('0rospu')?.severity, 'MEDIUM', 'leet')
assert.equal(detect('seni gebertirim')?.severity, 'HIGH')
assert.equal(detect('Orospuluk yapma')?.severity, 'MEDIUM', 'prefix')
assert.equal(detect('çocuk pornosu')?.severity, 'CRITICAL', 'ifade')

// En ciddi eşleşme kazanır
assert.equal(detect('salak amk pedofil')?.severity, 'CRITICAL')

// Oda sahibinin "güvenli" kelimesi
assert.equal(detect('salak', ['salak']), null)

// Eylem eşlemesi (varsayılan)
assert.deepEqual(decideAction('LOW', 0).rule, { action: 'warn' })
assert.equal(decideAction('MEDIUM', 0).rule.action, 'mute')
assert.equal(decideAction('HIGH', 0).rule.action, 'kick')
assert.equal(decideAction('CRITICAL', 0).rule.action, 'ban')

// Tekrar → yükselme: tek kelimede doğrudan ban YOK, kademeli
assert.equal(decideAction('LOW', 0).rule.action, 'warn')
assert.equal(decideAction('LOW', 1).rule.action, 'mute')
assert.equal(decideAction('LOW', 3).rule.action, 'kick')
assert.equal(decideAction('LOW', 5).rule.action, 'ban')
assert.equal(escalateSeverity('CRITICAL', 9), 'CRITICAL')

// Admin override geçersiz değerleri ele alır
const custom = parseSeverityActions({ LOW: { action: 'mute', minutes: 10 }, MEDIUM: { action: 'oops' }, HIGH: 5 })
assert.deepEqual(custom.LOW, { action: 'mute', minutes: 10 })
assert.deepEqual(custom.MEDIUM, DEFAULT_SEVERITY_ACTIONS.MEDIUM)
assert.deepEqual(custom.HIGH, DEFAULT_SEVERITY_ACTIONS.HIGH)
assert.equal(decideAction('LOW', 0, custom).rule.action, 'mute')

// Bot metinleri
assert.equal(botNoticeFor('warn', 'ali'), '⚠️ @ali, lütfen kullandığınız kelimelere dikkat edin. Oda kurallarına uyun.')
assert.equal(botNoticeFor('mute', 'ali'), '🔇 @ali kurallara uymadığı için geçici olarak sessize alındı.')
assert.equal(botNoticeFor('ban', 'ali'), '🚫 @ali oda kurallarını ihlal ettiği için odadan uzaklaştırıldı.')
assert.equal(normalizeText('ÇĞİÖŞÜ'), 'cgiosu')
assert.deepEqual(tokenize('Merhaba, dünya!'), ['merhaba', 'dunya'])

console.log('girlive moderation unit tests: OK')
