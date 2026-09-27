# SEAT MANAGEMENT — Koltuk Yönetimi

> **Kaynak:** Abacus.AI üzerindeki CANLI backend kaynak ağacı, 2026-09-27.
> **Durum etiketleri:** `DOĞRULANDI` · `KODDAN TESPİT EDİLDİ` · `EKSİK` · `ESKİ` · `ERİŞİM BEKLİYOR`


İki farklı koltuk API'si vardır ve **aynı değildirler**:

| API | Kullanım | Not |
|---|---|---|
| `GET,PATCH /api/chat/rooms/{roomId}/seats` | Sohbet/sesli oda koltuk düzeni | Ana uç |
| `GET,POST /api/live/seats` | Canlı yayın/`live` akışı koltukları | Mobil `live` modülü |
| `POST /api/chat/rooms/{roomId}/join-seat` | Kısa yol | `lib/chat-route-proxy.ts → forwardToSeats` ile `/seats` ucuna yönlendirir — **ayrı bir uygulama değildir** |

Konuşma isteği akışı ayrı uçlardadır:

| Metot | Yol | Yetki | Rate limit | Durum |
|---|---|---|---|---|
| `POST` | `/api/chat/rooms/[roomId]/join-seat` | Yönlendirme | — | KODDAN TESPİT EDİLDİ |
| `GET, DELETE` | `/api/chat/rooms/[roomId]/queue` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET, PATCH` | `/api/chat/rooms/[roomId]/seats` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET, POST, DELETE` | `/api/chat/rooms/[roomId]/speak-request` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST, DELETE` | `/api/chat/rooms/[roomId]/speak-request/[userId]/block` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST, DELETE` | `/api/chat/rooms/[roomId]/speak-request/[userId]/reject` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/chat/rooms/[roomId]/speak-requests` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `DELETE` | `/api/chat/rooms/[roomId]/speak-requests/[targetUserId]` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/chat/rooms/[roomId]/speak-requests/[targetUserId]/approve` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST, DELETE` | `/api/chat/rooms/[roomId]/speak-requests/[targetUserId]/block` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `POST, DELETE` | `/api/chat/rooms/[roomId]/speak-requests/[targetUserId]/reject` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gift-engine/queue` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/live/seats` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |

## Akış

1. Dinleyici `POST /speak-request` gönderir.
2. Oda sahibi/moderatör `GET /speak-requests` ile listeler.
3. Onay: `POST /speak-requests/{targetUserId}/approve` → koltuk atanır.
4. Ret/engel: `/reject`, `/block`.
5. Koltuk değişikliği `PATCH /seats` ile yapılır; sonuç SSE `room_event` olarak yayınlanır.

## Tutarlılık notu

Koltuk durumu ile TRTC yayın durumu **ayrı sistemlerdir**. Koltuğa çıkan kullanıcı TRTC tarafında
`switchRole(anchor)` çağırmazsa sesi duyulmaz; koltuktan inince `switchRole(audience)` çağrılmalıdır.
Sunucu bu iki durumu senkronize etmez — **istemci sorumluluğundadır**.
