# Kullanımdan Kaldırılan Uçlar — Geçiş Takvimi

> Son güncelleme: 8 Ağustos 2026 — **Aşama C tamamlandı**

## 1. Genel Bakış

Aşağıdaki eski uçlar **silinmedi**; çalışmaya devam ediyor. Ancak her biri yanıtında şu başlıkları döndürür:

```
Deprecation: true
Link: </api/...kanonik...>; rel="successor-version"
```

Mobil (Flutter) ve dış istemciler bu başlıkları okuyarak kendi taraflarında geçiş yapabilir.

---

## 2. Birleştirme Tablosu

| # | Eski uç (deprecated) | Yöntem | Kanonik uç | Davranış farkı |
|---|---|---|---|---|
| 1 | `/api/leaderboard` | GET | `/api/leaderboards` | Kanonik uç daha geniş veri döner (topluluk sıralamaları dahil) |
| 2 | `/api/membership/packages` | GET | `/api/memberships/packages` | Birebir aynı |
| 3 | `/api/payment/config` | GET | `/api/payments/config` | Birebir aynı |
| 4 | `/api/payment/requests` | GET, POST | `/api/payments/requests` | Birebir aynı |
| 5 | `/api/payment-methods` | GET | `/api/payments/methods` | Birebir aynı |
| 6 | `/api/payment-settings` | GET | `/api/payments/settings` | Birebir aynı |
| 7 | `/api/rooms/{id}/music/current` | GET | `/api/chat/rooms/{id}/music` | Birebir aynı |
| 8 | `/api/rooms/{id}/music/skip` | POST | `/api/chat/rooms/{id}/music` (DELETE) | Yöntem değişti: POST → DELETE |
| 9 | `/api/rooms/{id}/music/stop` | POST | `/api/chat/rooms/{id}/music/stop` | Birebir aynı |
| 10 | `/api/tencent/webhook` | POST | `/api/trtc/webhook` | Birebir aynı; sağlayıcıda kayıtlı olduğu için eski uç **süresiz korunur** |

---

## 3. Önerilen Takvim

### Aşama A — Geçiş Dönemi (şimdi → mobil güncelleme yayınlanana kadar)

- Eski uçlar **tam işlevsel** kalır.
- Mobil (Flutter) tarafında kanonik uçlara geçiş yapılır.
- Web tarafı **zaten geçti** — eski uçlara yapılan web çağrısı sıfır.
- Bu aşamada yapılacak: mobil kodda `Deprecation` başlığını kontrol eden bir yardımcı fonksiyon eklenebilir; uyarı loglanır.

### Aşama B — İzleme (mobil güncelleme yayınlandıktan 2 hafta sonra)

- Eski uçlara gelen istek sayısını sunucu loglarından izleyin.
- Sıfıra düştüğünde Aşama C'ye geçin.

### Aşama C — Kaldırma ✅ TAMAMLANDI

Aşağıdaki alias route dosyaları **silindi** (8 Ağustos 2026):
  - ~~`app/api/leaderboard/route.ts`~~
  - ~~`app/api/membership/packages/route.ts`~~
  - ~~`app/api/payment/config/route.ts`~~
  - ~~`app/api/payment/requests/route.ts`~~
  - ~~`app/api/payment-methods/route.ts`~~
  - ~~`app/api/payment-settings/route.ts`~~
  - ~~`app/api/rooms/[roomId]/music/current/route.ts`~~
  - ~~`app/api/rooms/[roomId]/music/skip/route.ts`~~
  - ~~`app/api/rooms/[roomId]/music/stop/route.ts`~~
- Boş kalan dizinler de kaldırıldı.
- **`/api/tencent/webhook` korundu** — sağlayıcıda kayıtlı.
- Belgeler güncellendi: 690 uç, 148 alan, 438 yol (API_REGISTRY, ENDPOINTS, OpenAPI, Postman).

---

## 4. Flutter Geçiş Rehberi (Hızlı Başvuru)

Mobil tarafta yapılması gereken değişiklikler:

```dart
// ESKİ → YENİ
'/api/leaderboard'              → '/api/leaderboards'
'/api/membership/packages'      → '/api/memberships/packages'
'/api/payment/config'           → '/api/payments/config'
'/api/payment/requests'         → '/api/payments/requests'
'/api/payment-methods'          → '/api/payments/methods'
'/api/payment-settings'         → '/api/payments/settings'
'/api/rooms/$roomId/music/current' → '/api/chat/rooms/$roomId/music'       // GET
'/api/rooms/$roomId/music/skip'    → '/api/chat/rooms/$roomId/music'       // DELETE (yöntem değişti!)
'/api/rooms/$roomId/music/stop'    → '/api/chat/rooms/$roomId/music/stop'  // POST
```

**Dikkat:** `music/skip` artık `DELETE` yöntemiyle çağrılıyor. Flutter `http.delete(...)` kullanmalı.

---

## 5. Önemli Not — room vs rooms

`/api/room/{sessionId}/...` (canlı fal seansı) ile `/api/rooms/{roomId}/...` (sohbet odası) **farklı kimlik uzaylarıdır** ve birleştirilmemiştir. Bunlar kasıtlı olarak ayrı tutulmaktadır:

- `room` → Canlı fal seansı kimliği (`LiveSession.id`)
- `rooms` / `chat/rooms` → Sohbet odası kimliği (`VoiceRoom.id`)

Birleştirmek istekler arasında kimlik karışmasına neden olur.
