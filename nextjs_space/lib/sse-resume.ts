import type { NextRequest } from 'next/server'

/**
 * SSE "Last-Event-ID" resume helper.
 *
 * Tüm kalıcı SSE kanalları (chat, voice room, video stream, PK, falcı seans,
 * bildirim) aynı sözleşmeyi kullanır:
 *
 *   - Sunucu her olay grubundan sonra `id: <epoch-ms>` satırı yayınlar.
 *   - İstemci (web EventSource otomatik, Flutter elle) yeniden bağlanırken
 *     `Last-Event-ID` başlığını ya da `?lastEventId=` sorgu parametresini gönderir.
 *   - Sunucu imleci o değerden devam ettirir; böylece kopma süresince üretilen
 *     olaylar tekrar oynatılır.
 *
 * ÖNEMLİ SINIR: olay veri yolu süreç-içi (in-memory) olduğu için tekrar oynatma
 * yalnızca aynı sunucu örneğinde ve tampon penceresi (≈2 dk / 200 olay) içinde
 * garanti edilir. DB destekli kanallarda (bildirimler) tekrar oynatma
 * zaman damgasına göre gerçek veritabanından yapılır ve bu sınır geçerli değildir.
 */
export function parseLastEventId(request: NextRequest): number | null {
  const raw =
    request.headers.get('last-event-id') ||
    request.headers.get('Last-Event-ID') ||
    request.nextUrl?.searchParams?.get('lastEventId') ||
    null
  if (!raw) return null
  const parsed = parseInt(raw, 10)
  if (isNaN(parsed) || parsed <= 0) return null
  // Gelecekteki bir zaman damgası kabul edilmez (istemci saat kayması / manipülasyon)
  if (parsed > Date.now() + 60_000) return null
  // Çok eski değerler tampon dışıdır; yine de kabul edip tamponun izin verdiği
  // kadarını oynatırız (getXEventsSince zaten kırpılmış tamponu döner).
  return parsed
}

/** Başlangıç imleci: geçerli Last-Event-ID varsa oradan, yoksa şimdiden. */
export function resumeCursor(request: NextRequest): number {
  return parseLastEventId(request) ?? Date.now()
}

/** Bir olay dizisinden en yeni timestamp'i döner (boşsa mevcut imleci korur). */
export function newestTimestamp(
  events: Array<{ timestamp?: number }>,
  fallback: number,
): number {
  let max = fallback
  for (const e of events) {
    if (typeof e?.timestamp === 'number' && e.timestamp > max) max = e.timestamp
  }
  return max
}

/** SSE `id:` satırı üretir. */
export function sseIdLine(id: number): string {
  return `id: ${id}\n\n`
}
