/**
 * Örnekler arası (cross-instance) gerçek zamanlı olay köprüsü.
 *
 * SORUN: `lib/chat-events.ts`, `lib/room-events.ts` ve `lib/stream-events.ts`
 * olayları yalnız **bellekte** tutar. Uygulama birden fazla sunucu örneğinde
 * çalışıyorsa, A örneğine düşen bir POST isteğinin ürettiği olay, SSE akışı
 * B örneğine bağlı olan istemciye hiç ulaşmaz.
 *
 * ÇÖZÜM: Her olay, yayımlandığı anda (ateşle-unut) paylaşımlı veritabanındaki
 * `RealtimeEvent` tablosuna da yazılır. Her örnek tek bir arka plan yoklayıcı
 * (poller) çalıştırır; **başka** örneklerden gelen satırları çekip kendi bellek
 * tamponuna enjekte eder. Böylece `get*Since()` fonksiyonları ve 3 SSE rotası
 * hiç değişmeden çalışmaya devam eder.
 *
 * TASARIM NOTLARI
 * - Tek sorgu / tur: oda sayısından bağımsız olarak örnek başına ~1.5 sn'de bir
 *   tek `findMany`. Veritabanı yükü sabit kalır.
 * - Boşta durma: son 60 sn içinde hiç yerel etkinlik yoksa yoklama atlanır.
 * - Hacim koruması: `typing`, `viewerCount`, `like`, `ping` gibi yüksek hacimli
 *   ve kendiliğinden tazelenen olay tipleri veritabanına YAZILMAZ.
 * - Kopya koruması: her olayın `eventId` değeri korunur; aynı kimlik iki kez
 *   enjekte edilmez.
 * - Saat kayması koruması: uzak olay belleğe **yerel varış zamanıyla** eklenir,
 *   böylece istemcinin `since` imleci yüzünden düşmez. Özgün zaman damgası
 *   payload içinde `remoteTimestamp` olarak taşınır.
 * - Kapatma anahtarı: `REALTIME_CROSS_INSTANCE=0` → köprü tamamen devre dışı,
 *   davranış eski (yalnız bellek) haline döner.
 */

import { prisma } from './db'

/** Bu süreç için benzersiz kimlik — kendi yazdığımız satırları ayıklamak için. */
export const INSTANCE_ID = `i_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`

const POLL_INTERVAL_MS = 1500
/** Son yerel etkinlikten bu kadar süre sonra yoklama durur. */
const IDLE_AFTER_MS = 60 * 1000
/** Veritabanında olay saklama süresi. */
const RETENTION_MS = 5 * 60 * 1000
const MAX_ROWS_PER_POLL = 300

/** Veritabanına yazılmayacak (yüksek hacimli / kendiliğinden tazelenen) tipler. */
const SKIPPED_TYPES = new Set(['typing', 'viewerCount', 'like', 'ping'])

export function isCrossInstanceEnabled(): boolean {
  const raw = (process.env.REALTIME_CROSS_INSTANCE ?? '1').trim().toLowerCase()
  return raw !== '0' && raw !== 'false' && raw !== 'off'
}

/** Belirli bir olay tipinin paylaşıma uygun olup olmadığı. */
export function isSharedType(type: string): boolean {
  return !SKIPPED_TYPES.has(type)
}

export type BridgeChannel = 'chat' | 'session' | 'teller' | 'stream'

export interface IncomingEvent {
  scope: string
  type: string
  eventId: string
  remoteTimestamp: number
  data: any
}

type Handler = (ev: IncomingEvent) => void

const handlers = new Map<BridgeChannel, Handler>()

/** Bir olay deposunun uzak olayları almak için kendini kaydetmesi. */
export function registerBridgeHandler(channel: BridgeChannel, handler: Handler) {
  handlers.set(channel, handler)
}

let lastActivityAt = 0
let lastSeenAt: Date | null = null
let pollerStarted = false
let polling = false
let bridgeDisabledReason: string | null = null

/** Son görülen olay kimlikleri — kopya enjeksiyonunu engeller. */
const seenEventIds = new Set<string>()
const seenOrder: string[] = []
const MAX_SEEN = 4000

function markSeen(eventId: string): boolean {
  if (seenEventIds.has(eventId)) return false
  seenEventIds.add(eventId)
  seenOrder.push(eventId)
  if (seenOrder.length > MAX_SEEN) {
    const drop = seenOrder.splice(0, seenOrder.length - MAX_SEEN)
    for (const id of drop) seenEventIds.delete(id)
  }
  return true
}

/**
 * Yerel olarak üretilen bir olayı paylaşımlı kanala yayımlar (ateşle-unut).
 * Hiçbir koşulda çağıranı yavaşlatmaz veya hata fırlatmaz.
 */
export function publishEvent(
  channel: BridgeChannel,
  scope: string,
  type: string,
  eventId: string,
  data: any
) {
  lastActivityAt = Date.now()
  if (!isCrossInstanceEnabled() || bridgeDisabledReason) return
  if (!isSharedType(type)) return
  // Kendi yazdığımızı geri almamak için kimliği şimdiden "görüldü" işaretle.
  markSeen(eventId)
  ensurePoller()

  let payload: string
  try {
    payload = JSON.stringify({ scope, data, remoteTimestamp: Date.now() })
  } catch {
    return // döngüsel / serileştirilemez veri — paylaşma
  }
  // 256 KB üstü payload'ları paylaşma (veritabanını şişirmemek için).
  if (payload.length > 256 * 1024) return

  void prisma.realtimeEvent
    .create({
      data: { channel, scope, type, eventId, payload, originId: INSTANCE_ID },
    })
    .catch((err: any) => {
      // Tablo yoksa (şema henüz uygulanmadıysa) köprüyü sessizce kapat.
      const code = err?.code
      if (code === 'P2021' || code === 'P2022') {
        bridgeDisabledReason = `tablo yok (${code})`
        console.warn('[realtime-bridge] devre dışı:', bridgeDisabledReason)
      }
    })
}

/** Yerel okuma etkinliğini işaretler (SSE akışları canlıyken yoklama sürsün). */
export function touchBridge() {
  lastActivityAt = Date.now()
  ensurePoller()
}

function ensurePoller() {
  if (pollerStarted || !isCrossInstanceEnabled()) return
  if (typeof setInterval !== 'function') return
  pollerStarted = true
  const timer = setInterval(() => {
    void pollOnce()
  }, POLL_INTERVAL_MS)
  // Yoklayıcı sürecin kapanmasını engellemesin.
  if (typeof (timer as any)?.unref === 'function') (timer as any).unref()
}

async function pollOnce() {
  if (polling || bridgeDisabledReason) return
  if (Date.now() - lastActivityAt > IDLE_AFTER_MS) return
  polling = true
  try {
    if (lastSeenAt === null) {
      // İlk turda geçmişi tekrar oynatma — yalnız bundan sonrasını al.
      lastSeenAt = new Date(Date.now() - 2000)
    }
    const rows = await prisma.realtimeEvent.findMany({
      where: { createdAt: { gt: lastSeenAt }, originId: { not: INSTANCE_ID } },
      orderBy: { createdAt: 'asc' },
      take: MAX_ROWS_PER_POLL,
    })
    for (const row of rows) {
      // Aynı ms'te yazılan satırları kaçırmamak için imleci 1 ms geri al;
      // kopyalar `seenEventIds` ile elenir.
      const t = new Date(row.createdAt.getTime() - 1)
      if (!lastSeenAt || t > lastSeenAt) lastSeenAt = t
      if (!markSeen(row.eventId)) continue
      const handler = handlers.get(row.channel as BridgeChannel)
      if (!handler) continue
      let parsed: any
      try {
        parsed = JSON.parse(row.payload)
      } catch {
        continue
      }
      try {
        handler({
          scope: row.scope,
          type: row.type,
          eventId: row.eventId,
          remoteTimestamp: Number(parsed?.remoteTimestamp) || row.createdAt.getTime(),
          data: parsed?.data,
        })
      } catch {
        /* tek bir olay tüm turu bozmasın */
      }
    }
    maybeCleanup()
  } catch (err: any) {
    const code = err?.code
    if (code === 'P2021' || code === 'P2022') {
      bridgeDisabledReason = `tablo yok (${code})`
      console.warn('[realtime-bridge] devre dışı:', bridgeDisabledReason)
    }
    // Diğer hatalar (zaman aşımı, bağlantı) geçici kabul edilir — sessiz geç.
  } finally {
    polling = false
  }
}

let lastCleanupAt = 0
function maybeCleanup() {
  const now = Date.now()
  if (now - lastCleanupAt < 60 * 1000) return
  // Tüm örnekler aynı anda silmeye kalkmasın.
  if (Math.random() > 0.2) {
    lastCleanupAt = now
    return
  }
  lastCleanupAt = now
  void prisma.realtimeEvent
    .deleteMany({ where: { createdAt: { lt: new Date(now - RETENTION_MS) } } })
    .catch(() => { /* yoksay */ })
}

/** Testler için: iç durumu sıfırla. */
export function __resetBridgeForTest() {
  seenEventIds.clear()
  seenOrder.length = 0
  lastSeenAt = null
  lastActivityAt = 0
  bridgeDisabledReason = null
}
