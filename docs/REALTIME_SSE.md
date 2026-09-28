# REALTIME / SSE — Gerçek Zamanlı Olaylar

> **Kaynak:** Abacus.AI üzerinde çalışan CANLI backend kaynak ağacı (`nextjs_space/`), 2026-09-27 tarihli durum.
> **Üretim yöntemi:** Route dosyaları programatik olarak taranarak (`app/api/**/route.ts`) üretildi; el ile uydurulmuş uç/alan yoktur.
> **Durum etiketleri:** `DOĞRULANDI` (çalışan sistemde test edildi) · `KODDAN TESPİT EDİLDİ` (kaynak koddan okundu, canlı test edilmedi) · `EKSİK` · `ESKİ` · `ERİŞİM BEKLİYOR`


Backend **WebSocket kullanmaz**. Gerçek zamanlı iletim `text/event-stream` (Server-Sent Events) üzerinden,
sunucu tarafında periyodik veritabanı yoklaması + bellek-içi olay veri yolu (`lib/chat-events.ts`,
`lib/room-events.ts`, `lib/stream-events.ts`) ile yapılır.

## SSE uçları ve gerçek zamanlama değerleri (koddan okundu)

| Uç | Amaç | Heartbeat | Yoklama aralığı |
|---|---|---|---|
| `GET /api/chat/rooms/[roomId]/stream` | Sesli/yazılı oda ana kanalı | **10 sn** | 2 sn |
| `GET /api/notifications/stream` | Bildirimler | **15 sn** | 5 sn |
| `GET /api/pk/[matchId]/stream` | PK maç skoru | **15 sn** | 2 sn |
| `GET /api/video-streams/[streamId]/stream` | Video yayını izleyici sayacı | **15 sn** | 1 sn |
| `GET /api/room/[sessionId]/stream` | Birebir fal seansı mesajları | **15 sn** | 1 sn |
| `GET /api/fortune-tellers/sessions/stream` | Falcı bekleyen seanslar | **15 sn** | 3 sn |
| `GET /api/admin/payments/stream` | Admin ödeme akışı | **~5 sn (poll içinde)** | 5 sn |

## Olay kataloğu (her uçta gönderilen `type` değerleri)


**`/api/admin/payments/stream`**

- `connected`
- `payment`

**`/api/chat/rooms/[roomId]/stream`**

- `connected`
- `gift`
- `gift_box`
- `messages`
- `pk`
- `presence`
- `room_event`
- `system`
- `typing`

**`/api/fortune-tellers/sessions/stream`**

- `connected`
- `pending_sessions`

**`/api/notifications/stream`**

- `connected`
- `notification`

**`/api/room/[sessionId]/stream`**

- `connected`
- `message`

**`/api/video-streams/[streamId]/stream`**

- `connected`
- `viewerCount`

**`/api/pk/[matchId]/stream`**

- `connected`
- `match_update`
- `not_found`
- `pk`

## Oda kanalı olay ayrıntısı — `GET /api/chat/rooms/{roomId}/stream`

| `type` | Ne zaman | İçerik |
|---|---|---|
| `connected` | Bağlantı açılışında ilk çerçeve | bağlantı onayı |
| `messages` | Yeni sohbet mesajları | mesaj dizisi |
| `presence` | Odadaki kullanıcı listesi değiştiğinde | kullanıcı listesi |
| `gift` | Odaya hediye gönderildiğinde | hediye olayı |
| `gift_box` | Hediye kutusu olayları | kutu durumu |
| `pk` | PK davet/başlangıç/skor/bitiş | PK durumu |
| `room_event` | Bellek-içi oda olayları (koltuk, DJ, moderasyon…) | olay yükü |
| `system` | Sistem mesajları | metin |
| `typing` | Yazıyor göstergesi | kullanıcı adları |

Heartbeat satırı SSE yorumu olarak gönderilir: `: heartbeat\n\n` (olay değildir, `onMessage` tetiklemez).

## Bilinen davranış ve istemci kuralları

- **İstemci heartbeat zaman aşımı heartbeat aralığından büyük olmalıdır.** Oda kanalı 10 sn'de bir
  heartbeat gönderir; Flutter istemcisinde zaman aşımı **40 sn**'dir
  (`mobile/lib/core/network/sse/base_sse_service.dart`).
- Sunucu tarafında istemci koptuğunda yoklama döngüsü `send()` yardımcı fonksiyonunun `false`
  dönmesiyle durdurulur (`app/api/chat/rooms/[roomId]/stream/route.ts` — `send()` tanımı ~64. satır).
- Yeniden bağlanma **üstel geri çekilme** ile yapılmalı; watchdog doğrudan `_openStream()` çağırmamalıdır.

## AÇIK SORUN (durum: EKSİK)

1. **Hayalet varlık (presence).** Oda akışındaki varlık penceresi `lastSeen >= now - 300000` (5 dakika)
   olarak hesaplanır ve her 5. yoklamada (~10 sn) yenilenir
   (`app/api/chat/rooms/[roomId]/stream/route.ts`, varlık bloğu ~150–210. satırlar).
   Sonuç: uygulamayı yeni açan bir oda sahibi 5 dakikaya kadar odada görünmeye devam edebilir.
   **Öneri:** pencereyi 45–60 sn'ye indirmek ve çıkışta `DELETE /api/chat/rooms/{roomId}/presence` çağrısını garanti altına almak.
2. **PK daveti karşı tarafa ulaşmıyor.** `pk` olayı yalnızca davet edilen odanın kanalında yayınlanırsa
   görünür; `/api/live/pk`, `/api/chat/rooms/{id}/pk` ve `/api/video-streams/pk` farklı yolları kullanır
   (bkz. [`PK_BATTLE.md`](./PK_BATTLE.md)). Uçtan uca doğrulama yapılmamıştır.
