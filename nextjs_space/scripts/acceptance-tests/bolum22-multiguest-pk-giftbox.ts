/**
 * BÖLÜM 22 (§29) — Multi-Guest + PK + Hediye Kutusu otomatik kabul testi.
 *
 * Çalıştırma (nextjs_space içinden, dev sunucu ayakta iken):
 *   yarn tsx --require dotenv/config scripts/acceptance-tests/bolum22-multiguest-pk-giftbox.ts
 *
 * Ortam değişkenleri:
 *   TEST_BASE_URL  (varsayılan http://localhost:3000)
 *
 * Betik kendi izole test verisini üretir (b22_* kullanıcıları, geçici yayın/oda)
 * ve çıkarken ürettiği HER kaydı tek tek siler. Mevcut üretim verisine dokunmaz.
 */
import prisma from '../../lib/db'
import bcrypt from 'bcryptjs'

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'
const PW = 'B22test!pass'
const TAG = `b22_${Date.now().toString(36)}`

// ───────────────────────── test koşucusu ─────────────────────────
type Result = { n: number; title: string; ok: boolean; detail: string }
const results: Result[] = []
let counter = 0

async function scenario(title: string, fn: () => Promise<string>) {
  counter++
  const n = counter
  try {
    const detail = await fn()
    results.push({ n, title, ok: true, detail })
    console.log(`  ✅ [${n}] ${title} — ${detail}`)
  } catch (e: any) {
    const detail = e?.message || String(e)
    results.push({ n, title, ok: false, detail })
    console.log(`  ❌ [${n}] ${title} — ${detail}`)
  }
}

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(msg)
}

// ───────────────────────── HTTP yardımcıları ─────────────────────────
function mergeCookies(prev: string, res: Response): string {
  const jar = new Map<string, string>()
  for (const part of prev.split('; ').filter(Boolean)) {
    const i = part.indexOf('=')
    if (i > 0) jar.set(part.slice(0, i), part.slice(i + 1))
  }
  const raw = (res.headers as any).getSetCookie?.() ?? []
  for (const c of raw) {
    const first = String(c).split(';')[0]
    const i = first.indexOf('=')
    if (i > 0) jar.set(first.slice(0, i), first.slice(i + 1))
  }
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ')
}

/** NextAuth credentials akışıyla oturum çerezi üretir (Bearer token bu rotalarda çalışmaz). */
async function login(email: string): Promise<string> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
  let cookie = mergeCookies('', csrfRes)
  const { csrfToken } = (await csrfRes.json()) as any
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ csrfToken, email, password: PW, json: 'true' }),
    redirect: 'manual',
  })
  cookie = mergeCookies(cookie, res)
  if (!/next-auth\.session-token|__Secure-next-auth\.session-token/.test(cookie)) {
    throw new Error(`giriş başarısız: ${email}`)
  }
  return cookie
}

type ApiRes = { status: number; json: any }
async function api(path: string, opts: { method?: string; body?: any; cookie?: string } = {}): Promise<ApiRes> {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
    },
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  })
  let json: any = null
  try { json = await res.json() } catch { json = null }
  return { status: res.status, json }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ───────────────────────── test verisi ─────────────────────────
const createdUserIds: string[] = []
const createdStreamIds: string[] = []
const createdRoomIds: string[] = []
const createdBoxIds: string[] = []
const createdGiftTypeIds: string[] = []

async function mkUser(suffix: string, jeton = 0) {
  const email = `${TAG}_${suffix}@test.local`
  const u = await prisma.user.create({
    data: {
      email,
      name: `T22 ${suffix}`,
      username: `${TAG}_${suffix}`,
      password: await bcrypt.hash(PW, 10),
      role: 'user',
      jetonBalance: jeton,
    },
    select: { id: true, email: true },
  })
  createdUserIds.push(u.id)
  return { ...u, cookie: await login(email) }
}

async function mkStream(userId: string, title: string) {
  const s = await prisma.videoStream.create({
    data: { userId, title, status: 'live', startedAt: new Date() },
    select: { id: true },
  })
  createdStreamIds.push(s.id)
  return s.id
}

async function mkRoom(ownerId: string, name: string) {
  const r = await prisma.chatRoom.create({
    data: {
      slug: `${TAG}-${Math.random().toString(36).slice(2, 8)}`,
      nameEn: name,
      nameTr: name,
      descEn: 'B22 test room',
      descTr: 'B22 test odası',
      icon: '🧪',
      ownerId,
      isActive: true,
    },
    select: { id: true },
  })
  createdRoomIds.push(r.id)
  return r.id
}

async function joinRoom(roomId: string, userId: string) {
  await prisma.chatPresence.upsert({
    where: { roomId_userId: { roomId, userId } },
    create: { roomId, userId, lastSeen: new Date() },
    update: { lastSeen: new Date() },
  })
}

async function joinStream(streamId: string, viewerId: string) {
  await prisma.videoStreamViewer.upsert({
    where: { streamId_viewerId: { streamId, viewerId } },
    create: { streamId, viewerId, leftAt: null },
    update: { leftAt: null },
  })
}

// ───────────────────────── ana akış ─────────────────────────
async function main() {
  console.log(`\n=== BÖLÜM 22 KABUL TESTİ === (${BASE})\n`)

  // Ortak aktörler
  const host = await mkUser('host')
  const guest = await mkUser('guest')
  const streamId = await mkStream(host.id, 'T22 Yayın A')
  await joinStream(streamId, guest.id)

  console.log('── Multi-Guest (1-8) ──')

  let requestId = ''

  await scenario('Kullanıcı guest request gönderir', async () => {
    const r = await api('/api/live/guest', { method: 'POST', cookie: guest.cookie, body: { streamId, action: 'request' } })
    assert(r.status === 200 && r.json?.request?.id, `beklenen 200+request, gelen ${r.status} ${JSON.stringify(r.json)}`)
    requestId = r.json.request.id
    return `request oluştu (status=${r.json.request.status})`
  })

  await scenario('Yayıncı reddeder', async () => {
    const r = await api('/api/live/guest', { method: 'POST', cookie: host.cookie, body: { streamId, action: 'reject', requestId } })
    assert(r.status === 200, `beklenen 200, gelen ${r.status} ${JSON.stringify(r.json)}`)
    const row = await prisma.liveGuestInvite.findUnique({ where: { id: requestId }, select: { status: true } })
    assert(row?.status === 'rejected', `davet durumu rejected olmalı, gelen ${row?.status}`)
    return 'davet rejected'
  })

  await scenario('Kullanıcı kabul edilmeden guest alanına çıkmaya çalışır', async () => {
    const r = await api('/api/live/guest', { method: 'POST', cookie: guest.cookie, body: { streamId, action: 'join' } })
    assert(r.status === 403, `beklenen 403, gelen ${r.status} ${JSON.stringify(r.json)}`)
    return `reddedildi (${r.json?.code || r.status})`
  })

  await scenario('Yayıncı kabul eder', async () => {
    const req2 = await api('/api/live/guest', { method: 'POST', cookie: guest.cookie, body: { streamId, action: 'request' } })
    assert(req2.status === 200 && req2.json?.request?.id, `yeni talep açılamadı: ${JSON.stringify(req2.json)}`)
    const r = await api('/api/live/guest', { method: 'POST', cookie: host.cookie, body: { streamId, action: 'approve', requestId: req2.json.request.id } })
    assert(r.status === 200, `beklenen 200, gelen ${r.status} ${JSON.stringify(r.json)}`)
    const s = await prisma.liveGuestSession.findUnique({ where: { streamId_userId: { streamId, userId: guest.id } }, select: { status: true, slot: true } })
    assert(s?.status === 'active', `misafir oturumu active olmalı, gelen ${s?.status}`)
    return `misafir aktif (slot=${s?.slot})`
  })

  await scenario('Yayıncı guest\'i mute eder (misafir kendi açamaz)', async () => {
    const r = await api('/api/live/guest', { method: 'POST', cookie: host.cookie, body: { streamId, action: 'mute', guestId: guest.id, muted: true } })
    assert(r.status === 200, `mute başarısız: ${r.status} ${JSON.stringify(r.json)}`)
    const s1 = await prisma.liveGuestSession.findUnique({ where: { streamId_userId: { streamId, userId: guest.id } }, select: { isMuted: true, mutedByHost: true } })
    assert(s1?.isMuted && s1?.mutedByHost, `mutedByHost true olmalı: ${JSON.stringify(s1)}`)
    const self = await api('/api/live/guest', { method: 'POST', cookie: guest.cookie, body: { streamId, action: 'mute', muted: false } })
    assert(self.status === 403, `misafir kendini açamamalı, gelen ${self.status}`)
    await api('/api/live/guest', { method: 'POST', cookie: host.cookie, body: { streamId, action: 'mute', guestId: guest.id, muted: false } })
    return 'host mute uyguladı, misafir kaldıramadı (403)'
  })

  await scenario('Yayıncı guest\'in kamerasını kapatır (misafir kendi açamaz)', async () => {
    const r = await api('/api/live/guest', { method: 'POST', cookie: host.cookie, body: { streamId, action: 'camera', guestId: guest.id, videoOff: true } })
    assert(r.status === 200, `camera başarısız: ${r.status} ${JSON.stringify(r.json)}`)
    const s1 = await prisma.liveGuestSession.findUnique({ where: { streamId_userId: { streamId, userId: guest.id } }, select: { isVideoOff: true, videoOffByHost: true } })
    assert(s1?.isVideoOff && s1?.videoOffByHost, `videoOffByHost true olmalı: ${JSON.stringify(s1)}`)
    const self = await api('/api/live/guest', { method: 'POST', cookie: guest.cookie, body: { streamId, action: 'camera', videoOff: false } })
    assert(self.status === 403, `misafir kamerayı kendi açamamalı, gelen ${self.status}`)
    await api('/api/live/guest', { method: 'POST', cookie: host.cookie, body: { streamId, action: 'camera', guestId: guest.id, videoOff: false } })
    return 'host kamerayı kapattı, misafir açamadı (403)'
  })

  await scenario('Guest pozisyonu değiştirilir', async () => {
    const before = await prisma.liveGuestSession.findUnique({ where: { streamId_userId: { streamId, userId: guest.id } }, select: { slot: true } })
    const down = await api('/api/live/guest', { method: 'POST', cookie: host.cookie, body: { streamId, action: 'move_down', guestId: guest.id } })
    assert(down.status === 200, `move_down başarısız: ${down.status} ${JSON.stringify(down.json)}`)
    const mid = await prisma.liveGuestSession.findUnique({ where: { streamId_userId: { streamId, userId: guest.id } }, select: { slot: true } })
    assert(mid!.slot === before!.slot + 1, `slot ${before!.slot}→${before!.slot + 1} olmalı, gelen ${mid!.slot}`)
    const up = await api('/api/live/guest', { method: 'POST', cookie: host.cookie, body: { streamId, action: 'move_up', guestId: guest.id } })
    assert(up.status === 200, `move_up başarısız: ${up.status}`)
    const after = await prisma.liveGuestSession.findUnique({ where: { streamId_userId: { streamId, userId: guest.id } }, select: { slot: true } })
    assert(after!.slot === before!.slot, `slot geri dönmeli (${before!.slot}), gelen ${after!.slot}`)
    const edge = await api('/api/live/guest', { method: 'POST', cookie: guest.cookie, body: { streamId, action: 'move_down', guestId: guest.id } })
    assert(edge.status === 403, `misafir kendi konumunu değiştirememeli, gelen ${edge.status}`)
    return `slot ${before!.slot}→${mid!.slot}→${after!.slot}, yetkisiz taşıma 403`
  })

  await scenario('8 kişilik grid çalışır (kapasite aşılamaz)', async () => {
    const limits = await (await import('../../lib/live-guest')).getGuestLimits()
    const maxGuests = limits.maxGuests
    // Mevcut 1 aktif misafir var; kalan slotları doğrudan veritabanından doldur.
    const filler: string[] = []
    for (let slot = 2; slot <= maxGuests; slot++) {
      const u = await prisma.user.create({
        data: { email: `${TAG}_fill${slot}@test.local`, name: `T22 fill${slot}`, username: `${TAG}_fill${slot}`, password: 'x', role: 'user' },
        select: { id: true },
      })
      createdUserIds.push(u.id)
      filler.push(u.id)
      await prisma.liveGuestSession.create({ data: { streamId, userId: u.id, slot, status: 'active' } })
    }
    const active = await prisma.liveGuestSession.count({ where: { streamId, status: 'active' } })
    assert(active === maxGuests, `${maxGuests} aktif misafir olmalı, gelen ${active}`)
    const overflow = await mkUser('overflow')
    await joinStream(streamId, overflow.id)
    const r = await api('/api/live/guest', { method: 'POST', cookie: overflow.cookie, body: { streamId, action: 'request' } })
    assert(r.status === 409 && r.json?.code === 'GUEST_SLOT_FULL', `beklenen 409/GUEST_SLOT_FULL, gelen ${r.status} ${JSON.stringify(r.json)}`)
    // Grid'i boşalt (sonraki senaryolar için)
    await prisma.liveGuestSession.updateMany({ where: { streamId, userId: { in: filler } }, data: { status: 'left', leftAt: new Date() } })
    return `${maxGuests} slot doldu, ${maxGuests + 1}. talep GUEST_SLOT_FULL`
  })

  console.log('\n── PK / Battle (9-14) ──')

  const hostB = await mkUser('hostb')
  const streamBId = await mkStream(hostB.id, 'T22 Yayın B')
  let pkId = ''

  await scenario('İki yayıncı PK başlatır', async () => {
    const r = await api('/api/video-streams/pk', { method: 'POST', cookie: host.cookie, body: { action: 'create', streamId, targetStreamId: streamBId, duration: 120 } })
    assert(r.status === 200 && r.json?.id, `PK oluşmadı: ${r.status} ${JSON.stringify(r.json)}`)
    pkId = r.json.id
    assert(r.json.status === 'pending', `durum pending olmalı, gelen ${r.json.status}`)
    return `PK pending (mode=${r.json.mode}, duration=${r.json.duration})`
  })

  await scenario('PK kabul edilmeden başlamaz', async () => {
    const row = await prisma.pKBattle.findUnique({ where: { id: pkId }, select: { status: true, startedAt: true } })
    assert(row?.status === 'pending', `durum pending kalmalı, gelen ${row?.status}`)
    const dup = await api('/api/video-streams/pk', { method: 'POST', cookie: host.cookie, body: { action: 'create', streamId, targetStreamId: streamBId } })
    assert(dup.status !== 200, `ikinci PK engellenmeli, gelen ${dup.status}`)
    const notOwner = await api('/api/video-streams/pk', { method: 'POST', cookie: guest.cookie, body: { action: 'accept', battleId: pkId } })
    assert(notOwner.status !== 200, `yetkisiz kabul engellenmeli, gelen ${notOwner.status}`)
    const acc = await api('/api/video-streams/pk', { method: 'POST', cookie: hostB.cookie, body: { action: 'accept', battleId: pkId } })
    assert(acc.status === 200, `kabul başarısız: ${acc.status} ${JSON.stringify(acc.json)}`)
    const after = await prisma.pKBattle.findUnique({ where: { id: pkId }, select: { status: true } })
    assert(after?.status === 'active', `kabul sonrası active olmalı, gelen ${after?.status}`)
    return 'kabulden önce pending, yetkisiz kabul reddedildi, kabul sonrası active'
  })

  // PK skoru için tek kullanımlık hediye tipi
  const giftType = await prisma.giftType.create({
    data: { name: `T22 Hediye ${TAG}`, nameEn: 'T22 Gift', icon: '🎁', price: 10, isActive: true },
    select: { id: true, price: true },
  })
  createdGiftTypeIds.push(giftType.id)

  await scenario('PK sırasında hediye gelir', async () => {
    const sender = await mkUser('gifter', 500)
    await joinStream(streamBId, sender.id)
    const r = await api(`/api/video-streams/${streamBId}/gifts`, { method: 'POST', cookie: sender.cookie, body: { giftTypeId: giftType.id, quantity: 3 } })
    assert(r.status === 200, `hediye gönderilemedi: ${r.status} ${JSON.stringify(r.json)}`)
    const score = await prisma.pkScore.findFirst({ where: { battleId: pkId }, orderBy: { createdAt: 'desc' } })
    assert(score, 'PK skor defterine kayıt düşmeli')
    return `hediye işlendi, skor kaydı oluştu (${score!.points} puan, source=${score!.source})`
  })

  await scenario('PK skorları doğru hesaplanır', async () => {
    const battle = await prisma.pKBattle.findUnique({ where: { id: pkId }, select: { score1: true, score2: true } })
    const expected = giftType.price * 3
    assert(battle!.score2 === expected, `taraf2 skoru ${expected} olmalı, gelen ${battle!.score2}`)
    assert(battle!.score1 === 0, `taraf1 skoru 0 olmalı, gelen ${battle!.score1}`)
    const ledger = await prisma.pkScore.aggregate({ where: { battleId: pkId }, _sum: { points: true } })
    assert(ledger._sum.points === expected, `skor defteri toplamı ${expected} olmalı, gelen ${ledger._sum.points}`)
    // duraklat/devam et: duraklamış PK'da skor artmaz
    const pause = await api('/api/video-streams/pk', { method: 'POST', cookie: host.cookie, body: { action: 'pause', battleId: pkId } })
    assert(pause.status === 200, `duraklatma başarısız: ${pause.status}`)
    const paused = await prisma.pKBattle.findUnique({ where: { id: pkId }, select: { status: true } })
    assert(paused?.status === 'paused', `durum paused olmalı, gelen ${paused?.status}`)
    await api('/api/video-streams/pk', { method: 'POST', cookie: host.cookie, body: { action: 'resume', battleId: pkId } })
    const resumed = await prisma.pKBattle.findUnique({ where: { id: pkId }, select: { status: true } })
    assert(resumed?.status === 'active', `devam sonrası active olmalı, gelen ${resumed?.status}`)
    return `skor1=${battle!.score1} skor2=${battle!.score2}, defter toplamı=${ledger._sum.points}, duraklat/devam çalıştı`
  })

  // Yayın PK'sını kapat (oda PK'sı için tarafları serbest bırak)
  await api('/api/video-streams/pk', { method: 'POST', cookie: host.cookie, body: { action: 'end', battleId: pkId } })

  const roomId = await mkRoom(host.id, `T22 Oda ${TAG}`)
  const rival = await mkUser('rival')
  await joinRoom(roomId, host.id)
  await joinRoom(roomId, rival.id)
  let roomPkId = ''

  await scenario('Sesli odada iki kullanıcı PK yapar', async () => {
    const r = await api(`/api/chat/rooms/${roomId}/pk`, { method: 'POST', cookie: host.cookie, body: { action: 'create_user', side1UserIds: [host.id], side2UserIds: [rival.id], duration: 120, countdownSec: 0 } })
    const battleObj = r.json?.battle ?? r.json
    assert(r.status === 200 && battleObj?.id, `oda PK'sı oluşmadı: ${r.status} ${JSON.stringify(r.json)}`)
    roomPkId = battleObj.id
    const row = await prisma.pKBattle.findUnique({ where: { id: roomPkId }, select: { status: true, mode: true, scope: true } })
    assert(row?.scope === 'room_user', `scope room_user olmalı, gelen ${row?.scope}`)
    assert(['starting', 'active'].includes(row!.status), `durum starting/active olmalı, gelen ${row?.status}`)
    const outsider = await mkUser('outsider')
    const denied = await api(`/api/chat/rooms/${roomId}/pk`, { method: 'POST', cookie: outsider.cookie, body: { action: 'create_user', side1UserIds: [host.id], side2UserIds: [rival.id] } })
    assert(denied.status !== 200, `yetkisiz PK açılmamalı, gelen ${denied.status}`)
    const parts = await prisma.pkBattleParticipant.count({ where: { battleId: roomPkId } })
    assert(parts === 2, `2 katılımcı olmalı, gelen ${parts}`)
    return `oda içi PK (mode=${row?.mode}, scope=${row?.scope}), yetkisiz açma engellendi`
  })

  await scenario('Sesli oda PK kazananı doğru belirlenir', async () => {
    await prisma.pKBattle.update({ where: { id: roomPkId }, data: { status: 'active' } })
    const sender = await mkUser('roomgifter', 500)
    await joinRoom(roomId, sender.id)
    const g = await api('/api/live/gift/send', { method: 'POST', cookie: sender.cookie, body: { roomId, roomType: 'voice', giftTypeId: giftType.id, recipientId: rival.id, quantity: 2 } })
    assert(g.status === 200, `oda hediyesi gönderilemedi: ${g.status} ${JSON.stringify(g.json)}`)
    const mid = await prisma.pKBattle.findUnique({ where: { id: roomPkId }, select: { score1: true, score2: true } })
    assert(mid!.score2 > mid!.score1, `rakip tarafı önde olmalı: ${JSON.stringify(mid)}`)
    const end = await api(`/api/chat/rooms/${roomId}/pk`, { method: 'POST', cookie: host.cookie, body: { action: 'end', battleId: roomPkId } })
    assert(end.status === 200, `PK bitirilemedi: ${end.status} ${JSON.stringify(end.json)}`)
    const done = await prisma.pKBattle.findUnique({ where: { id: roomPkId }, select: { status: true, winnerId: true, score1: true, score2: true } })
    assert(done?.status === 'completed', `durum completed olmalı, gelen ${done?.status}`)
    assert(done?.winnerId === rival.id, `kazanan rakip olmalı, gelen ${done?.winnerId}`)
    return `skor ${done!.score1}-${done!.score2}, kazanan backend tarafından belirlendi`
  })

  console.log('\n── Hediye Kutusu (15-25) ──')

  const creator = await mkUser('boxcreator', 2000)
  await joinStream(streamId, creator.id)
  let boxId = ''
  const joiners: { id: string; cookie: string }[] = []

  await scenario('100 jeton / 10 kişi hediye kutusu oluşturulur', async () => {
    const before = (await prisma.user.findUnique({ where: { id: creator.id }, select: { jetonBalance: true } }))!.jetonBalance
    const r = await api('/api/gift-box', { method: 'POST', cookie: creator.cookie, body: { action: 'create', streamId, totalAmount: 100, winnerCount: 10, durationSec: 60, taskType: 'none' } })
    assert(r.status === 200 && r.json?.box?.id, `kutu oluşmadı: ${r.status} ${JSON.stringify(r.json)}`)
    boxId = r.json.box.id
    createdBoxIds.push(boxId)
    const after = (await prisma.user.findUnique({ where: { id: creator.id }, select: { jetonBalance: true } }))!.jetonBalance
    assert(before - after === 100, `100 jeton emanete alınmalı, fark ${before - after}`)
    const splits = JSON.parse((await prisma.giftBox.findUnique({ where: { id: boxId }, select: { splits: true } }))!.splits)
    assert(splits.length === 10 && splits.reduce((a: number, b: number) => a + b, 0) === 100, `paylar hatalı: ${JSON.stringify(splits)}`)
    return `kutu açıldı, 100 jeton emanette, paylar toplamı=100`
  })

  await scenario('İlk 10 geçerli kişi kazanır (eşzamanlı katılımda sayı korunur)', async () => {
    for (let i = 0; i < 12; i++) {
      const u = await mkUser(`j${i}`)
      await joinStream(streamId, u.id)
      joiners.push(u)
    }
    const responses = await Promise.all(
      joiners.map((u) => api(`/api/gift-box/${boxId}/join`, { method: 'POST', cookie: u.cookie, body: {} }))
    )
    const ok = responses.filter((r) => r.status === 200 && r.json?.isWinner)
    assert(ok.length === 10, `tam 10 kazanan olmalı, gelen ${ok.length}`)
    const entries = await prisma.giftBoxEntry.findMany({ where: { boxId, isWinner: true }, select: { rank: true, rewardAmount: true } })
    const total = entries.reduce((a, e) => a + e.rewardAmount, 0)
    assert(total === 100, `dağıtılan toplam 100 olmalı, gelen ${total}`)
    const ranks = new Set(entries.map((e) => e.rank))
    assert(ranks.size === 10, `sıralamalar benzersiz olmalı, gelen ${ranks.size}`)
    return `12 eşzamanlı katılım → tam 10 kazanan, dağıtılan ${total} jeton, benzersiz sıra`
  })

  await scenario('11. kişi kazanamaz', async () => {
    const losers = await Promise.all(joiners.map((u) => api(`/api/gift-box/${boxId}/join`, { method: 'POST', cookie: u.cookie, body: {} })))
    const codes = losers.map((r) => r.json?.code).filter(Boolean)
    assert(losers.every((r) => r.status !== 200), `kontenjan dolduktan sonra kimse kazanmamalı: ${JSON.stringify(codes)}`)
    const box = await prisma.giftBox.findUnique({ where: { id: boxId }, select: { status: true, paidCount: true, paidAmount: true } })
    assert(box?.paidCount === 10 && box?.paidAmount === 100, `paidCount/paidAmount 10/100 olmalı: ${JSON.stringify(box)}`)
    assert(box?.status === 'finished', `kontenjan dolunca kutu kapanmalı, gelen ${box?.status}`)
    return `fazla katılımlar reddedildi (${Array.from(new Set(codes)).join(',')}), kutu finished`
  })

  await scenario('Aynı kullanıcı iki kez kazanamaz', async () => {
    const rows = await prisma.giftBoxEntry.groupBy({ by: ['userId'], where: { boxId }, _count: { userId: true } })
    const dup = rows.filter((r) => r._count.userId > 1)
    assert(dup.length === 0, `mükerrer katılım var: ${JSON.stringify(dup)}`)
    const winners = await prisma.giftBoxEntry.count({ where: { boxId, isWinner: true } })
    assert(winners === 10, `kazanan sayısı 10 olmalı, gelen ${winners}`)
    return 'kullanıcı başına tek kayıt (benzersiz kısıt), kazanan sayısı sabit'
  })

  await scenario('Aynı ödül iki kez dağıtılamaz', async () => {
    const box = await prisma.giftBox.findUnique({ where: { id: boxId }, select: { paidAmount: true, refundedAmount: true, totalAmount: true, settledAt: true } })
    assert(box!.paidAmount + box!.refundedAmount === box!.totalAmount, `ödenen+iade = toplam olmalı: ${JSON.stringify(box)}`)
    assert(box!.settledAt !== null, 'kapanış kilidi (settledAt) yazılmalı')
    const rewardRows = await prisma.giftBoxEntry.aggregate({ where: { boxId }, _sum: { rewardAmount: true } })
    assert(rewardRows._sum.rewardAmount === 100, `toplam ödül 100 olmalı, gelen ${rewardRows._sum.rewardAmount}`)
    return `ödenen=${box!.paidAmount} iade=${box!.refundedAmount} toplam=${box!.totalAmount}, tek seferlik kapanış`
  })

  async function closeOpenBoxes() {
    const open = await prisma.giftBox.findMany({ where: { id: { in: createdBoxIds }, status: 'active' }, select: { id: true } })
    for (const b of open) {
      await api('/api/gift-box', { method: 'POST', cookie: creator.cookie, body: { action: 'cancel', boxId: b.id } })
    }
  }

  await scenario('Takip görevi doğrulanır', async () => {
    await closeOpenBoxes()
    const r = await api('/api/gift-box', { method: 'POST', cookie: creator.cookie, body: { action: 'create', streamId, totalAmount: 20, winnerCount: 2, durationSec: 60, taskType: 'follow_creator' } })
    assert(r.status === 200, `görevli kutu oluşmadı: ${JSON.stringify(r.json)}`)
    const bid = r.json.box.id
    createdBoxIds.push(bid)
    const u = joiners[0]
    const fail1 = await api(`/api/gift-box/${bid}/join`, { method: 'POST', cookie: u.cookie, body: {} })
    assert(fail1.status !== 200 && fail1.json?.code === 'GIFT_BOX_TASK_INCOMPLETE', `takip etmeyen reddedilmeli: ${JSON.stringify(fail1.json)}`)
    await prisma.follow.create({ data: { followerId: u.id, followingId: creator.id } })
    const ok1 = await api(`/api/gift-box/${bid}/join`, { method: 'POST', cookie: u.cookie, body: {} })
    assert(ok1.status === 200 && ok1.json?.isWinner, `takip sonrası kazanmalı: ${JSON.stringify(ok1.json)}`)
    await api('/api/gift-box', { method: 'POST', cookie: creator.cookie, body: { action: 'cancel', boxId: bid } })
    return 'takip yoksa TASK_INCOMPLETE, takip sonrası ödül verildi'
  })

  await scenario('Belirli @kullanıcı takip görevi doğrulanır', async () => {
    await closeOpenBoxes()
    const r = await api('/api/gift-box', { method: 'POST', cookie: creator.cookie, body: { action: 'create', streamId, totalAmount: 20, winnerCount: 2, durationSec: 60, taskType: 'follow_user', taskTargetUserId: rival.id } })
    assert(r.status === 200, `hedefli görev kutusu oluşmadı: ${JSON.stringify(r.json)}`)
    const bid = r.json.box.id
    createdBoxIds.push(bid)
    const u = joiners[1]
    const fail1 = await api(`/api/gift-box/${bid}/join`, { method: 'POST', cookie: u.cookie, body: {} })
    assert(fail1.json?.code === 'GIFT_BOX_TASK_INCOMPLETE', `hedef kullanıcı takip edilmeden reddedilmeli: ${JSON.stringify(fail1.json)}`)
    // yanlış kişiyi takip etmek yeterli değil
    await prisma.follow.create({ data: { followerId: u.id, followingId: creator.id } })
    const fail2 = await api(`/api/gift-box/${bid}/join`, { method: 'POST', cookie: u.cookie, body: {} })
    assert(fail2.json?.code === 'GIFT_BOX_TASK_INCOMPLETE', `yanlış hedef kabul edilmemeli: ${JSON.stringify(fail2.json)}`)
    await prisma.follow.create({ data: { followerId: u.id, followingId: rival.id } })
    const ok1 = await api(`/api/gift-box/${bid}/join`, { method: 'POST', cookie: u.cookie, body: {} })
    assert(ok1.status === 200 && ok1.json?.isWinner, `doğru hedef takibinde kazanmalı: ${JSON.stringify(ok1.json)}`)
    await api('/api/gift-box', { method: 'POST', cookie: creator.cookie, body: { action: 'cancel', boxId: bid } })
    return 'yalnız hedef @kullanıcı takibi görevi tamamlıyor'
  })

  await scenario('Paylaşım görevi doğrulanır', async () => {
    await closeOpenBoxes()
    const r = await api('/api/gift-box', { method: 'POST', cookie: creator.cookie, body: { action: 'create', streamId, totalAmount: 20, winnerCount: 2, durationSec: 60, taskType: 'share' } })
    assert(r.status === 200, `paylaşım kutusu oluşmadı: ${JSON.stringify(r.json)}`)
    const bid = r.json.box.id
    createdBoxIds.push(bid)
    const u = joiners[2]
    const fail1 = await api(`/api/gift-box/${bid}/join`, { method: 'POST', cookie: u.cookie, body: {} })
    assert(fail1.json?.code === 'GIFT_BOX_TASK_INCOMPLETE', `paylaşım yokken reddedilmeli: ${JSON.stringify(fail1.json)}`)
    const bogus = await api('/api/gift-box/share', { method: 'POST', cookie: u.cookie, body: { scope: 'stream', targetId: 'yok-boyle-bir-yayin' } })
    assert(bogus.status !== 200, `sahte hedef paylaşımı kabul edilmemeli, gelen ${bogus.status}`)
    const sh = await api('/api/gift-box/share', { method: 'POST', cookie: u.cookie, body: { scope: 'stream', targetId: streamId, channel: 'whatsapp' } })
    assert(sh.status === 200, `paylaşım kaydedilemedi: ${JSON.stringify(sh.json)}`)
    const ok1 = await api(`/api/gift-box/${bid}/join`, { method: 'POST', cookie: u.cookie, body: {} })
    assert(ok1.status === 200 && ok1.json?.isWinner, `paylaşım sonrası kazanmalı: ${JSON.stringify(ok1.json)}`)
    await api('/api/gift-box', { method: 'POST', cookie: creator.cookie, body: { action: 'cancel', boxId: bid } })
    return 'paylaşım yoksa TASK_INCOMPLETE, sahte hedef reddedildi, gerçek paylaşım sonrası ödül'
  })

  await scenario('Süre dolunca kutu kapanır (kullanılmayan jeton iade)', async () => {
    await closeOpenBoxes()
    const before = (await prisma.user.findUnique({ where: { id: creator.id }, select: { jetonBalance: true } }))!.jetonBalance
    const r = await api('/api/gift-box', { method: 'POST', cookie: creator.cookie, body: { action: 'create', streamId, totalAmount: 50, winnerCount: 5, durationSec: 5, taskType: 'none' } })
    assert(r.status === 200, `kısa süreli kutu oluşmadı: ${JSON.stringify(r.json)}`)
    const bid = r.json.box.id
    createdBoxIds.push(bid)
    const w = await api(`/api/gift-box/${bid}/join`, { method: 'POST', cookie: joiners[3].cookie, body: {} })
    assert(w.status === 200, `katılım başarısız: ${JSON.stringify(w.json)}`)
    await sleep(7000)
    const late = await api(`/api/gift-box/${bid}/join`, { method: 'POST', cookie: joiners[4].cookie, body: {} })
    assert(late.status !== 200, `süre dolunca katılım kapanmalı, gelen ${late.status}`)
    const box = await prisma.giftBox.findUnique({ where: { id: bid }, select: { status: true, paidAmount: true, refundedAmount: true } })
    assert(box?.status === 'expired', `durum expired olmalı, gelen ${box?.status}`)
    assert(box!.paidAmount + box!.refundedAmount === 50, `ödenen+iade = 50 olmalı: ${JSON.stringify(box)}`)
    const after = (await prisma.user.findUnique({ where: { id: creator.id }, select: { jetonBalance: true } }))!.jetonBalance
    assert(after === before - box!.paidAmount, `bakiye ${before - box!.paidAmount} olmalı, gelen ${after}`)
    return `kutu expired, ödenen=${box!.paidAmount} iade=${box!.refundedAmount}, bakiye doğru`
  })

  await scenario('Kutu iptal edilirse kullanılmayan jeton iade edilir', async () => {
    await closeOpenBoxes()
    const before = (await prisma.user.findUnique({ where: { id: creator.id }, select: { jetonBalance: true } }))!.jetonBalance
    const r = await api('/api/gift-box', { method: 'POST', cookie: creator.cookie, body: { action: 'create', streamId, totalAmount: 30, winnerCount: 3, durationSec: 60, taskType: 'none' } })
    const bid = r.json.box.id
    createdBoxIds.push(bid)
    await api(`/api/gift-box/${bid}/join`, { method: 'POST', cookie: joiners[5].cookie, body: {} })
    const notOwner = await api('/api/gift-box', { method: 'POST', cookie: joiners[6].cookie, body: { action: 'cancel', boxId: bid } })
    assert(notOwner.status === 403, `yalnız sahibi iptal edebilmeli, gelen ${notOwner.status}`)
    const cancel = await api('/api/gift-box', { method: 'POST', cookie: creator.cookie, body: { action: 'cancel', boxId: bid } })
    assert(cancel.status === 200, `iptal başarısız: ${JSON.stringify(cancel.json)}`)
    const twice = await api('/api/gift-box', { method: 'POST', cookie: creator.cookie, body: { action: 'cancel', boxId: bid } })
    assert(twice.status !== 200, `ikinci iptal engellenmeli, gelen ${twice.status}`)
    const box = await prisma.giftBox.findUnique({ where: { id: bid }, select: { status: true, paidAmount: true, refundedAmount: true } })
    const after = (await prisma.user.findUnique({ where: { id: creator.id }, select: { jetonBalance: true } }))!.jetonBalance
    assert(box?.status === 'cancelled', `durum cancelled olmalı, gelen ${box?.status}`)
    assert(after === before - box!.paidAmount, `bakiye ${before - box!.paidAmount} olmalı, gelen ${after}`)
    return `iptal edildi, ${box!.refundedAmount} jeton iade, çift iptal engellendi`
  })

  console.log('\n── Senkronizasyon & temizlik (26-27) ──')

  await scenario('Yayın sync uç noktası tam durumu döner', async () => {
    const r = await api(`/api/video-streams/${streamId}/sync`, { cookie: host.cookie })
    assert(r.status === 200, `sync başarısız: ${r.status} ${JSON.stringify(r.json)}`)
    assert(r.json?.stream?.id === streamId, 'stream alanı eksik')
    assert(Array.isArray(r.json?.guests?.items), 'guests.items dizisi eksik')
    assert(Array.isArray(r.json?.giftBoxes), 'giftBoxes dizisi eksik')
    assert('pk' in r.json, 'pk alanı eksik')
    return `stream+guests(${r.json.guests.items.length})+pk+giftBoxes(${r.json.giftBoxes.length}) döndü`
  })

  await scenario('Oda sync uç noktası tam durumu döner', async () => {
    const r = await api(`/api/chat/rooms/${roomId}/sync`, { cookie: host.cookie })
    assert(r.status === 200, `sync başarısız: ${r.status} ${JSON.stringify(r.json)}`)
    assert(r.json?.room?.id === roomId, 'room alanı eksik')
    assert(Array.isArray(r.json?.giftBoxes), 'giftBoxes dizisi eksik')
    assert('pk' in r.json, 'pk alanı eksik')
    return 'room+pk+giftBoxes döndü'
  })

  await scenario('Yayın kapanınca misafirler ve açık kutular kapatılır', async () => {
    const closeHost = await mkUser('closehost', 500)
    const closeGuest = await mkUser('closeguest')
    const sid = await mkStream(closeHost.id, 'T22 Kapanış')
    createdStreamIds.push(sid)
    await joinStream(sid, closeGuest.id)
    await joinStream(sid, closeHost.id)
    await prisma.liveGuestSession.create({ data: { streamId: sid, userId: closeGuest.id, slot: 1, status: 'active' } })
    const box = await api('/api/gift-box', { method: 'POST', cookie: closeHost.cookie, body: { action: 'create', streamId: sid, totalAmount: 40, winnerCount: 4, durationSec: 120, taskType: 'none' } })
    assert(box.status === 200, `kutu açılmadı: ${JSON.stringify(box.json)}`)
    createdBoxIds.push(box.json.box.id)
    const del = await api(`/api/video-streams/${sid}`, { method: 'PATCH', cookie: closeHost.cookie, body: { status: 'ended' } })
    assert(del.status === 200, `yayın kapatılamadı: ${del.status} ${JSON.stringify(del.json)}`)
    await sleep(500)
    const stillActive = await prisma.liveGuestSession.count({ where: { streamId: sid, status: 'active' } })
    const openBox = await prisma.giftBox.findUnique({ where: { id: box.json.box.id }, select: { status: true, settledAt: true, refundedAmount: true } })
    assert(stillActive === 0, `aktif misafir kalmamalı, kalan ${stillActive}`)
    assert(openBox?.status !== 'active', `kutu kapatılmalı, durum ${openBox?.status}`)
    assert(openBox?.settledAt != null, 'kutu settledAt damgası almalı')
    return `misafirler kapandı, kutu ${openBox?.status} (${openBox?.refundedAmount} iade)`
  })

  console.log('\n── Bütünlük kontrolleri ──')

  await scenario('Hediye kutularında jeton korunumu bozulmaz', async () => {
    const boxes = await prisma.giftBox.findMany({ where: { id: { in: createdBoxIds } }, select: { id: true, status: true, totalAmount: true, paidAmount: true, refundedAmount: true } })
    const bad = boxes.filter((b) => b.status !== 'active' && b.paidAmount + b.refundedAmount !== b.totalAmount)
    assert(bad.length === 0, `korunum bozulan kutular: ${JSON.stringify(bad)}`)
    const sumPaid = boxes.reduce((a, b) => a + b.paidAmount, 0)
    const entrySum = await prisma.giftBoxEntry.aggregate({ where: { boxId: { in: createdBoxIds } }, _sum: { rewardAmount: true } })
    assert((entrySum._sum.rewardAmount || 0) === sumPaid, `ödül toplamı ${entrySum._sum.rewardAmount} ≠ ödenen ${sumPaid}`)
    return `${boxes.length} kutu, toplam ödenen ${sumPaid} jeton ödül kayıtlarıyla birebir`
  })

  await scenario('Hediye kutusu ödülleri PK skoru üretmez (§17)', async () => {
    const boxRewardScores = await prisma.pkScore.count({ where: { source: { in: ['gift_box', 'bonus_reward'] } } })
    assert(boxRewardScores === 0, `hediye kutusu kaynaklı PK skoru bulundu: ${boxRewardScores}`)
    return 'gift_box/bonus_reward kaynaklı PK skoru yok'
  })
}

// ───────────────────────── temizlik ─────────────────────────
async function purge<T extends { id: string }>(rows: T[], del: (id: string) => Promise<any>) {
  for (const r of rows) {
    try {
      await del(r.id)
    } catch {
      /* zaten silinmiş olabilir */
    }
  }
}

async function cleanup() {
  console.log('\n── Test verisi temizleniyor ──')

  const boxes = await prisma.giftBox.findMany({ where: { OR: [{ id: { in: createdBoxIds } }, { streamId: { in: createdStreamIds } }, { roomId: { in: createdRoomIds } }] }, select: { id: true } })
  const boxIds = boxes.map((b) => b.id)
  await purge(await prisma.giftBoxEntry.findMany({ where: { boxId: { in: boxIds } }, select: { id: true } }), (id) => prisma.giftBoxEntry.delete({ where: { id } }))
  await purge(boxes, (id) => prisma.giftBox.delete({ where: { id } }))
  await purge(await prisma.shareEvent.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } }), (id) => prisma.shareEvent.delete({ where: { id } }))

  const battles = await prisma.pKBattle.findMany({
    where: { OR: [{ stream1Id: { in: createdStreamIds } }, { stream2Id: { in: createdStreamIds } }, { scopeRoomId: { in: createdRoomIds } }, { user1Id: { in: createdUserIds } }, { user2Id: { in: createdUserIds } }] },
    select: { id: true },
  })
  const battleIds = battles.map((b) => b.id)
  await purge(await prisma.pkGift.findMany({ where: { battleId: { in: battleIds } }, select: { id: true } }), (id) => prisma.pkGift.delete({ where: { id } }))
  await purge(await prisma.pkScore.findMany({ where: { battleId: { in: battleIds } }, select: { id: true } }), (id) => prisma.pkScore.delete({ where: { id } }))
  await purge(await prisma.pkBattleParticipant.findMany({ where: { battleId: { in: battleIds } }, select: { id: true } }), (id) => prisma.pkBattleParticipant.delete({ where: { id } }))
  await purge(battles, (id) => prisma.pKBattle.delete({ where: { id } }))

  await purge(await prisma.liveGuestSession.findMany({ where: { OR: [{ streamId: { in: createdStreamIds } }, { userId: { in: createdUserIds } }] }, select: { id: true } }), (id) => prisma.liveGuestSession.delete({ where: { id } }))
  await purge(await prisma.liveGuestInvite.findMany({ where: { OR: [{ streamId: { in: createdStreamIds } }, { guestId: { in: createdUserIds } }] }, select: { id: true } }), (id) => prisma.liveGuestInvite.delete({ where: { id } }))
  await purge(await prisma.streamGift.findMany({ where: { OR: [{ streamId: { in: createdStreamIds } }, { senderId: { in: createdUserIds } }] }, select: { id: true } }), (id) => prisma.streamGift.delete({ where: { id } }))
  await purge(await prisma.videoStreamViewer.findMany({ where: { OR: [{ streamId: { in: createdStreamIds } }, { viewerId: { in: createdUserIds } }] }, select: { id: true } }), (id) => prisma.videoStreamViewer.delete({ where: { id } }))
  await purge(await prisma.videoStream.findMany({ where: { id: { in: createdStreamIds } }, select: { id: true } }), (id) => prisma.videoStream.delete({ where: { id } }))

  await purge(await prisma.chatMessage.findMany({ where: { OR: [{ roomId: { in: createdRoomIds } }, { userId: { in: createdUserIds } }] }, select: { id: true } }), (id) => prisma.chatMessage.delete({ where: { id } }))
  await purge(await prisma.chatPresence.findMany({ where: { OR: [{ roomId: { in: createdRoomIds } }, { userId: { in: createdUserIds } }] }, select: { id: true } }), (id) => prisma.chatPresence.delete({ where: { id } }))
  await purge(await prisma.chatRoom.findMany({ where: { id: { in: createdRoomIds } }, select: { id: true } }), (id) => prisma.chatRoom.delete({ where: { id } }))

  await purge(await prisma.giftType.findMany({ where: { id: { in: createdGiftTypeIds } }, select: { id: true } }), (id) => prisma.giftType.delete({ where: { id } }))
  await purge(await prisma.follow.findMany({ where: { OR: [{ followerId: { in: createdUserIds } }, { followingId: { in: createdUserIds } }] }, select: { id: true } }), (id) => prisma.follow.delete({ where: { id } }))
  await purge(await prisma.ledgerEntry.findMany({ where: { accountId: { in: createdUserIds } }, select: { id: true } }), (id) => prisma.ledgerEntry.delete({ where: { id } }))
  await purge(await prisma.jetonTransaction.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } }), (id) => prisma.jetonTransaction.delete({ where: { id } }))
  await purge(await prisma.auditLog.findMany({ where: { actorId: { in: createdUserIds } }, select: { id: true } }), (id) => prisma.auditLog.delete({ where: { id } }))
  await purge(await prisma.session.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } }), (id) => prisma.session.delete({ where: { id } }))
  await purge(await prisma.account.findMany({ where: { userId: { in: createdUserIds } }, select: { id: true } }), (id) => prisma.account.delete({ where: { id } }))
  await purge(await prisma.user.findMany({ where: { id: { in: createdUserIds } }, select: { id: true } }), (id) => prisma.user.delete({ where: { id } }))

  const leftover = await prisma.user.count({ where: { id: { in: createdUserIds } } })
  console.log(leftover === 0 ? '  ✅ tüm test kullanıcıları silindi' : `  ⚠️ ${leftover} test kullanıcısı silinemedi (elle kontrol edin)`)
}

main()
  .catch((e) => {
    console.error('\n💥 Beklenmeyen hata:', e)
    results.push({ n: ++counter, title: 'Beklenmeyen hata', ok: false, detail: e?.message || String(e) })
  })
  .finally(async () => {
    try {
      await cleanup()
    } catch (e: any) {
      console.error('  ⚠️ temizlik hatası:', e?.message || e)
    }
    const ok = results.filter((r) => r.ok).length
    const fail = results.length - ok
    console.log('\n================ ÖZET ================')
    for (const r of results) console.log(`${r.ok ? '✅' : '❌'} [${r.n}] ${r.title}`)
    console.log(`\nToplam: ${results.length} | Geçen: ${ok} | Kalan: ${fail}`)
    await prisma.$disconnect()
    process.exit(fail > 0 ? 1 : 0)
  })
