# LIVE ROOMS — Sesli Oda Yaşam Döngüsü

> **Kaynak:** Abacus.AI üzerindeki CANLI backend kaynak ağacı, 2026-09-27.
> **Durum etiketleri:** `DOĞRULANDI` · `KODDAN TESPİT EDİLDİ` · `EKSİK` · `ESKİ` · `ERİŞİM BEKLİYOR`


## 12 adımlık yaşam döngüsü (koddan izlendi)

| # | Adım | Uç / mekanizma |
|---|---|---|
| 1 | Oda oluşturma | `POST /api/chat/rooms/create` (rate limit `room_create` = 5/dk) |
| 2 | Oda listesi | `GET /api/chat/rooms`, `GET /api/live/rooms` |
| 3 | Odaya katılma (uygulama) | `POST /api/chat/rooms/{roomId}/presence` |
| 4 | Medya katmanına katılma | `POST /api/live/join-room` veya `POST /api/trtc/usersig` → TRTC |
| 5 | Durum anlık görüntüsü | `GET /api/chat/rooms/{roomId}/state`, `GET /api/chat/rooms/{roomId}/sync` |
| 6 | Gerçek zamanlı kanal | `GET /api/chat/rooms/{roomId}/stream` (SSE, heartbeat 10 sn) |
| 7 | Koltuk işlemleri | bkz. [`SEAT_MANAGEMENT.md`](./SEAT_MANAGEMENT.md) |
| 8 | Mesaj / yazıyor | `POST /api/chat/rooms/{roomId}/messages`, `/typing` |
| 9 | Hediye | `POST /api/chat/rooms/{roomId}/gifts` (kova `gift_send`) |
| 10 | Müzik / DJ | bkz. [`MUSIC_SYSTEM.md`](./MUSIC_SYSTEM.md) |
| 11 | Moderasyon | `/moderation`, `/kick`, `/mute`, `/bans/{userId}`, `/banned-words` |
| 12 | Çıkış | `DELETE /api/chat/rooms/{roomId}/presence` + `POST /api/live/leave-room` |

`POST /api/live/heartbeat` çevrimiçi durumu tazeler; istemci bunu düzenli göndermelidir.

## Varlık (presence) tutarlılığı — **AÇIK SORUN**

Oda SSE kanalındaki varlık sorgusu `lastSeen >= now - 300000` (**5 dakika**) penceresi kullanır ve
her 5. yoklamada (~10 sn) yenilenir (`app/api/chat/rooms/[roomId]/stream/route.ts`, varlık bloğu ~150–210).

Sonuç: uygulamayı kapatıp yeniden açan (ya da odadan düşen) bir kullanıcı — özellikle **oda sahibi** —
5 dakikaya kadar odada görünmeye devam eder. Kullanıcı raporu ("odayı açar açmaz sahibi 5–10 sn içinde
odada görünüyor") bu pencereyle birebir örtüşmektedir.

**Önerilen düzeltme (henüz uygulanmadı — durum: EKSİK):**
1. Varlık penceresini 45–60 sn'ye indir.
2. `presence` kaydını her `heartbeat`'te tazele (istemci 20–30 sn'de bir).
3. Uygulama arka plana alındığında `DELETE /presence` çağır; TRTC `onRemoteUserLeaveRoom` olayını da tetikleyici yap.

## Tüm oda uçları

| Metot | Yol | Yetki | Rate limit | Durum |
|---|---|---|---|---|
| `GET` | `/api/chat/rooms` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET, PATCH` | `/api/chat/rooms/[roomId]/background` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/chat/rooms/[roomId]/banned-words` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `DELETE` | `/api/chat/rooms/[roomId]/banned-words/[word]` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `POST, DELETE` | `/api/chat/rooms/[roomId]/bans/[userId]` | Yönlendirme | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/chat/rooms/[roomId]/dj` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST, DELETE` | `/api/chat/rooms/[roomId]/dj/[targetUserId]` | Yönlendirme | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/chat/rooms/[roomId]/gifts` | Web oturumu, Bearer JWT | gift_send | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/chat/rooms/[roomId]/join-seat` | Yönlendirme | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/chat/rooms/[roomId]/kick` | Yönlendirme | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/chat/rooms/[roomId]/mentions` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET, POST, DELETE` | `/api/chat/rooms/[roomId]/messages` | Web oturumu, Bearer JWT | chat_message | KODDAN TESPİT EDİLDİ |
| `DELETE` | `/api/chat/rooms/[roomId]/messages/[messageId]` | Yönlendirme | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/chat/rooms/[roomId]/moderation` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET, POST, DELETE` | `/api/chat/rooms/[roomId]/music` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/chat/rooms/[roomId]/music-queue` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/chat/rooms/[roomId]/music-request-by-query` | Web oturumu, Bearer JWT, Yönlendirme | — | KODDAN TESPİT EDİLDİ |
| `GET, PATCH` | `/api/chat/rooms/[roomId]/music-settings` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/chat/rooms/[roomId]/music/stop` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/chat/rooms/[roomId]/mute` | Yönlendirme | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/chat/rooms/[roomId]/pin-message` | VIP yetenek | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/chat/rooms/[roomId]/pk` | Web oturumu, Bearer JWT | pk_create | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/chat/rooms/[roomId]/pk/score` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET, POST, DELETE` | `/api/chat/rooms/[roomId]/presence` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET, DELETE` | `/api/chat/rooms/[roomId]/queue` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/chat/rooms/[roomId]/report` | Web oturumu, Bearer JWT | report | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/chat/rooms/[roomId]/roles` | Yönlendirme | — | KODDAN TESPİT EDİLDİ |
| `GET, PATCH` | `/api/chat/rooms/[roomId]/seats` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET, PATCH` | `/api/chat/rooms/[roomId]/settings` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET, POST, PATCH` | `/api/chat/rooms/[roomId]/song-request` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `DELETE` | `/api/chat/rooms/[roomId]/song/[queueId]` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET, POST, DELETE` | `/api/chat/rooms/[roomId]/speak-request` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST, DELETE` | `/api/chat/rooms/[roomId]/speak-request/[userId]/block` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST, DELETE` | `/api/chat/rooms/[roomId]/speak-request/[userId]/reject` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/chat/rooms/[roomId]/speak-requests` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `DELETE` | `/api/chat/rooms/[roomId]/speak-requests/[targetUserId]` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/chat/rooms/[roomId]/speak-requests/[targetUserId]/approve` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST, DELETE` | `/api/chat/rooms/[roomId]/speak-requests/[targetUserId]/block` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `POST, DELETE` | `/api/chat/rooms/[roomId]/speak-requests/[targetUserId]/reject` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/chat/rooms/[roomId]/state` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/chat/rooms/[roomId]/stream` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/chat/rooms/[roomId]/sync` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/chat/rooms/[roomId]/transfer-ownership` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/chat/rooms/[roomId]/typing` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/chat/rooms/[roomId]/voice` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/chat/rooms/backgrounds` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/chat/rooms/create` | Bearer JWT | room_create | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/chat/rooms/pk-list` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/chat/rooms/pk/candidates` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/live/create-room` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/live/fal-request/[requestId]/complete` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `POST, PATCH` | `/api/live/fal-request/[requestId]/update` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/live/fal-request/create` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/live/fal-requests` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/live/gift-types` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/live/gift/send` | Web oturumu, Bearer JWT | gift_send | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/live/guest` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/live/guest/list` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/live/heartbeat` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/live/join-room` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/live/leave-room` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/live/message` | Bearer JWT | chat_message | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/live/online-users` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/live/pk` | Bearer JWT | pk_create | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/live/pk/active` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/live/pk/score` | Bearer JWT, Admin/RBAC | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/live/rooms` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/live/seats` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
