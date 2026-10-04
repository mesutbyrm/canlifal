/**
 * VIP oda şifre koruması — saf birim testleri (veritabanı gerekmez).
 * Çalıştırma:  npx tsx scripts/acceptance-tests/room-access.unit.ts
 */
import assert from 'node:assert/strict'
import {
  hashRoomPassword,
  isHashedPassword,
  isPasswordGatedRoom,
  issueRoomAccessToken,
  matchesRoomPassword,
  verifyRoomAccessToken,
  MAX_PASSWORD_ATTEMPTS,
} from '../../lib/room-access-crypto'

async function main() {
  // 1) Şifre kapısı yalnızca VIP + şifre tanımlı oda
  assert.equal(isPasswordGatedRoom({ roomType: 'VIP', password: 'x' }), true)
  assert.equal(isPasswordGatedRoom({ roomType: 'NORMAL', password: 'x' }), false, 'normal odada şifre kapısı olmaz')
  assert.equal(isPasswordGatedRoom({ roomType: 'FREE', password: 'x' }), false)
  assert.equal(isPasswordGatedRoom({ roomType: 'VIP', password: null }), false)
  assert.equal(MAX_PASSWORD_ATTEMPTS, 3)

  // 2) Şifre hash'lenir; düz metin ASLA saklanmaz
  const hash = await hashRoomPassword('Gizli123')
  assert.ok(isHashedPassword(hash))
  assert.notEqual(hash, 'Gizli123')
  assert.equal(await matchesRoomPassword(hash, 'Gizli123'), true)
  assert.equal(await matchesRoomPassword(hash, 'yanlis'), false)
  assert.equal(await matchesRoomPassword(hash, ''), false)

  // 3) Eski düz metin kayıtlar hâlâ doğrulanır (sonra hash'e çevrilir)
  assert.equal(await matchesRoomPassword('eskiSifre', 'eskiSifre'), true)
  assert.equal(await matchesRoomPassword('eskiSifre', 'baska'), false)

  // 4) Erişim jetonu: oda + kullanıcı + mevcut şifreye bağlı
  const { token, expiresAt } = issueRoomAccessToken('room1', 'userA', hash)
  assert.ok(expiresAt > Date.now())
  assert.equal(verifyRoomAccessToken(token, 'room1', 'userA', hash), true)
  assert.equal(verifyRoomAccessToken(token, 'room2', 'userA', hash), false, 'başka oda')
  assert.equal(verifyRoomAccessToken(token, 'room1', 'userB', hash), false, 'başka kullanıcı')
  const newHash = await hashRoomPassword('YeniSifre')
  assert.equal(verifyRoomAccessToken(token, 'room1', 'userA', newHash), false, 'şifre değişince jeton düşer')
  assert.equal(verifyRoomAccessToken(token, 'room1', 'userA', null), false, 'şifre kalkınca jeton düşer')
  const parts = token.split('.')
  parts[4] = parts[4].slice(0, -2) + 'AA'
  assert.equal(verifyRoomAccessToken(parts.join('.'), 'room1', 'userA', hash), false, 'imza kurcalama')
  assert.equal(verifyRoomAccessToken(undefined, 'room1', 'userA', hash), false)
  assert.equal(verifyRoomAccessToken('a.b.c', 'room1', 'userA', hash), false)

  // 5) Süresi dolmuş jeton
  const realNow = Date.now
  try {
    Date.now = () => realNow() + 3 * 60 * 60 * 1000
    assert.equal(verifyRoomAccessToken(token, 'room1', 'userA', hash), false, '2 saat sonra geçersiz')
  } finally {
    Date.now = realNow
  }

  console.log('room-access unit tests: OK')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
