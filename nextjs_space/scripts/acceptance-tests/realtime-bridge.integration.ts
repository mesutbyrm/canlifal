/**
 * Örnekler arası olay köprüsü — gerçek veritabanıyla ELLE çalıştırılan test.
 *
 *   yarn tsx --require dotenv/config scripts/acceptance-tests/realtime-bridge.integration.ts
 *
 * Yalnız `realtime_events` tablosuna yazıp siler (5 dk saklamalı, geçici tablo).
 * Başka HİÇBİR tabloya dokunmaz. `yarn test` koşucusuna DAHİL DEĞİLDİR.
 */
import assert from 'node:assert/strict'
import { prisma } from '../../lib/db'
import { getChatEventsSince, emitChatEvent } from '../../lib/chat-events'
import { touchBridge, INSTANCE_ID } from '../../lib/realtime-bridge'

const ROOM = `__bridge_test_${Date.now()}`

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  // Yoklayıcıyı başlat
  touchBridge()

  // 1) Yerel emit → veritabanına yazılmalı (ateşle-unut, kısa bekleme)
  emitChatEvent(ROOM, 'message', { text: 'yerel' })
  await sleep(1500)
  const mine = await prisma.realtimeEvent.findMany({ where: { scope: ROOM } })
  assert.equal(mine.length, 1, 'yerel olay paylaşımlı kanala yazılmalı')
  assert.equal(mine[0].originId, INSTANCE_ID)
  console.log('✓ yerel olay paylaşımlı kanala yazıldı')

  // 2) Yüksek hacimli tip yazılmamalı
  emitChatEvent(ROOM, 'typing', { userId: 'u1' })
  await sleep(1200)
  const typingRows = await prisma.realtimeEvent.findMany({ where: { scope: ROOM, type: 'typing' } })
  assert.equal(typingRows.length, 0, 'typing olayları veritabanına yazılmamalı')
  console.log('✓ yüksek hacimli tip (typing) paylaşılmadı')

  // 3) BAŞKA bir örnekten gelmiş gibi satır ekle → yoklayıcı bellek tamponuna almalı
  const cursor = Date.now()
  await prisma.realtimeEvent.create({
    data: {
      channel: 'chat',
      scope: ROOM,
      type: 'message',
      eventId: 'other-instance-event-1',
      payload: JSON.stringify({ scope: ROOM, data: { text: 'uzak' }, remoteTimestamp: Date.now() }),
      originId: 'other-instance-xyz',
    },
  })

  let found = false
  for (let i = 0; i < 12; i++) {
    await sleep(700)
    const events = getChatEventsSince(ROOM, cursor)
    if (events.some((e) => e.eventId === 'other-instance-event-1' && e.data?.text === 'uzak')) {
      found = true
      break
    }
  }
  assert.ok(found, 'başka örnekten gelen olay yerel SSE tamponuna düşmeli')
  console.log('✓ başka örnekten gelen olay yerel tampona enjekte edildi')

  // 4) Kopya koruması — aynı eventId tekrar yazılırsa tampona ikinci kez girmemeli
  await prisma.realtimeEvent.create({
    data: {
      channel: 'chat',
      scope: ROOM,
      type: 'message',
      eventId: 'other-instance-event-1',
      payload: JSON.stringify({ scope: ROOM, data: { text: 'uzak' }, remoteTimestamp: Date.now() }),
      originId: 'other-instance-xyz',
    },
  })
  await sleep(3000)
  const dup = getChatEventsSince(ROOM, cursor).filter((e) => e.eventId === 'other-instance-event-1')
  assert.equal(dup.length, 1, 'kopya olay ikinci kez eklenmemeli')
  console.log('✓ kopya olay engellendi')

  // Temizlik — yalnız bu testin satırları
  const del = await prisma.realtimeEvent.deleteMany({ where: { scope: ROOM } })
  console.log(`✓ temizlendi (${del.count} satır)`)
  console.log('\nrealtime bridge integration: OK')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error(err)
    await prisma.realtimeEvent.deleteMany({ where: { scope: ROOM } }).catch(() => {})
    await prisma.$disconnect()
    process.exit(1)
  })
