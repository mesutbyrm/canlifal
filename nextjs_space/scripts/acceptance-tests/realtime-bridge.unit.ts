/**
 * Örnekler arası gerçek zamanlı olay köprüsü — saf birim testleri.
 * Veritabanına HİÇ dokunmaz: köprü `REALTIME_CROSS_INSTANCE=0` ile kapatılır,
 * böylece `publishEvent` erken döner ve yoklayıcı hiç başlamaz.
 *
 * Çalıştırma:  yarn tsx scripts/acceptance-tests/realtime-bridge.unit.ts
 */
process.env.REALTIME_CROSS_INSTANCE = '0'

import assert from 'node:assert/strict'

async function main() {
  const bridge = await import('../../lib/realtime-bridge')
  const chat = await import('../../lib/chat-events')
  const stream = await import('../../lib/stream-events')
  const room = await import('../../lib/room-events')

  // 1) Kapatma anahtarı
  assert.equal(bridge.isCrossInstanceEnabled(), false, 'REALTIME_CROSS_INSTANCE=0 köprüyü kapatmalı')
  process.env.REALTIME_CROSS_INSTANCE = '1'
  assert.equal(bridge.isCrossInstanceEnabled(), true)
  process.env.REALTIME_CROSS_INSTANCE = 'false'
  assert.equal(bridge.isCrossInstanceEnabled(), false)
  delete process.env.REALTIME_CROSS_INSTANCE
  assert.equal(bridge.isCrossInstanceEnabled(), true, 'varsayılan AÇIK olmalı')
  process.env.REALTIME_CROSS_INSTANCE = '0'

  // 2) Yüksek hacimli tipler paylaşılmaz (veritabanını şişirmemek için)
  for (const t of ['typing', 'viewerCount', 'like', 'ping']) {
    assert.equal(bridge.isSharedType(t), false, `${t} paylaşılmamalı`)
  }
  for (const t of ['message', 'gift', 'pk', 'room', 'gift_box', 'streamMessage', 'streamEnded', 'viewerKicked', 'session_request', 'session_ended']) {
    assert.equal(bridge.isSharedType(t), true, `${t} paylaşılmalı`)
  }

  // 3) Örnek kimliği benzersiz biçimde üretilir
  assert.match(bridge.INSTANCE_ID, /^i_[a-z0-9]+_[a-z0-9]+$/)

  // 4) Sohbet: uzak olay yerel tampona düşer ve `since` imlecine takılmaz
  const roomId = 'test-room-1'
  const before = Date.now()
  chat.__ingestRemoteChatEvent({
    scope: roomId,
    type: 'message',
    eventId: 'remote:1',
    remoteTimestamp: before - 60_000, // uzak sunucunun saati geride
    data: { text: 'merhaba' },
  })
  const got = chat.getChatEventsSince(roomId, before - 1)
  assert.equal(got.length, 1, 'uzak olay saat kayması yüzünden düşmemeli')
  assert.equal(got[0].eventId, 'remote:1')
  assert.equal(got[0].data.text, 'merhaba')

  // 5) Aynı olay iki kez enjekte edilemez (kopya koruması)
  chat.__ingestRemoteChatEvent({ scope: roomId, type: 'message', eventId: 'remote:1', remoteTimestamp: Date.now(), data: { text: 'merhaba' } })
  assert.equal(chat.getChatEventsSince(roomId, before - 1).length, 1, 'kopya olay eklenmemeli')

  // 6) Yerel emit + uzak enjeksiyon bir arada, sıralı çalışır
  chat.emitChatEvent(roomId, 'gift', { giftId: 'g1' })
  const both = chat.getChatEventsSince(roomId, before - 1)
  assert.equal(both.length, 2)
  assert.equal(both[1].type, 'gift')

  // 7) Yayın (stream) kanalı
  const streamId = 'test-stream-1'
  stream.__ingestRemoteStreamEvent({ scope: streamId, type: 'streamMessage', eventId: 'rs:1', remoteTimestamp: 1, data: { text: 'a' } })
  stream.__ingestRemoteStreamEvent({ scope: streamId, type: 'streamMessage', eventId: 'rs:1', remoteTimestamp: 1, data: { text: 'a' } })
  const sEvents = stream.getStreamEventsSince(streamId, 0)
  assert.equal(sEvents.length, 1, 'yayın kanalında kopya engellenmeli')

  // 8) Oturum ve falcı kanalları
  const sessionId = 'test-session-1'
  room.__ingestRemoteSessionEvent({ scope: sessionId, type: 'session_ended', eventId: 'rr:1', remoteTimestamp: 1, data: { reason: 'bitti' } })
  assert.equal(room.getRoomEventsSince(sessionId, 0).length, 1)
  const tellerId = 'test-teller-1'
  room.__ingestRemoteTellerEvent({ scope: tellerId, type: 'session_request', eventId: 'rt:1', remoteTimestamp: 1, data: { userId: 'u1' } })
  room.__ingestRemoteTellerEvent({ scope: tellerId, type: 'session_request', eventId: 'rt:1', remoteTimestamp: 1, data: { userId: 'u1' } })
  assert.equal(room.getTellerEventsSince(tellerId, 0).length, 1)

  // 9) Farklı oda/yayın kapsamları birbirine karışmaz
  assert.equal(chat.getChatEventsSince('baska-oda', 0).length, 0)
  assert.equal(stream.getStreamEventsSince('baska-yayin', 0).length, 0)

  console.log('realtime bridge unit tests: OK')
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err)
    process.exit(1)
  }
)
