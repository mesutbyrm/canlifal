# GIFT SYSTEM — Hediye Sistemi

> **Kaynak:** Abacus.AI üzerindeki CANLI backend kaynak ağacı, 2026-09-27.
> **Durum etiketleri:** `DOĞRULANDI` · `KODDAN TESPİT EDİLDİ` · `EKSİK` · `ESKİ` · `ERİŞİM BEKLİYOR`


## Gönderim uçları

| Uç | Bağlam | Rate limit |
|---|---|---|
| `POST /api/gifts/send` | Genel | — |
| `POST /api/chat/rooms/{roomId}/gifts` | Sesli/yazılı oda | `gift_send` (10/dk) |
| `POST /api/live/gift/send` | Canlı yayın | `gift_send` |
| `POST /api/gifts/lucky/send` | Şanslı hediye | `lucky_gift` (10/dk) |

## Bakiye ve atomiklik

Jeton/kredi düşümü `lib/balance-guard.ts` içindeki `atomicDebitCredits` / `atomicDebitJeton`
fonksiyonlarıyla **tek işlemde** yapılır. Bakiye yetersizse `isInsufficientBalanceError` yakalanır ve
**400 `INSUFFICIENT_BALANCE`** döndürülür.

> **Idempotency:** Hediye gönderimi varsayılan olarak idempotent **değildir**. Ağ tekrarında çift
> gönderim riski vardır. `IDEMPOTENCY_CONFLICT` kodu şemada mevcuttur ancak tüm hediye uçlarında
> uygulanmış değildir — **durum: EKSİK**, bkz. [`PERFORMANCE.md`](./PERFORMANCE.md) Kategori B.

## Katalog ve medya

- `GET /api/gifts/types`, `GET /api/gifts/catalog` — hediye kataloğu.
- Medya URL'leri `lib/media-url.ts → serializeGiftMedia` ile normalize edilir.
- `GET /api/gifts/version` — istemci önbelleğini geçersizleştirmek için sürüm damgası.
- `GET /api/gifts/display-settings` — 8 adet `gift_display_*` ayar anahtarı (varsayılanlı).
- Fiyat taşıyan uçlar bilinçli olarak kısa önbellekli (`600 sn + swr` + ETag), 1 günlük değil.

## Etkinlikler

Hediye kutusu (`/api/gifts/battles`, `/api/gift-box/*`), hedefler (`/api/gifts/goals`),
görevler (`/api/gifts/missions`), içgörüler (`/api/gifts/insights/*`).

## Tüm hediye uçları

| Metot | Yol | Yetki | Rate limit | Durum |
|---|---|---|---|---|
| `GET, POST, PATCH` | `/api/admin/gift-collections` | Web oturumu | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/admin/gift-upload` | Web oturumu | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/admin/gifts` | Web oturumu | — | KODDAN TESPİT EDİLDİ |
| `GET, PATCH, DELETE` | `/api/admin/gifts/[giftId]` | Web oturumu | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/admin/gifts/stats` | Web oturumu | — | KODDAN TESPİT EDİLDİ |
| `GET, POST, PATCH, DELETE` | `/api/admin/lucky-gifts/tiers` | Web oturumu, Admin/RBAC | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/admin/users/[userId]/gifts` | Admin/RBAC | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/chat/rooms/[roomId]/gifts` | Web oturumu, Bearer JWT | gift_send | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/fortune-tellers/gifts` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/gift-box` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gift-box/[boxId]` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/gift-box/[boxId]/join` | Web oturumu, Bearer JWT | gift_box_join | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/gift-box/share` | Web oturumu, Bearer JWT | gift_box_join | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/gift-engine/finish` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gift-engine/gifts` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gift-engine/queue` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/gifts/battles` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/battles/[battleId]` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/catalog` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/gifts/check-reciprocal` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/display-settings` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/gifts/goals` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/insights/album/[userId]` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/insights/badge/[userId]` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/insights/collection/[userId]` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/insights/feed` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/insights/first-gifter/[context]/[contextId]` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/insights/leaderboard` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/insights/map` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/insights/me/badge` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/insights/me/history` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/insights/me/recommendations` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/lucky/config` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/lucky/history` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/gifts/lucky/send` | Web oturumu, Bearer JWT | lucky_gift | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/missions` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/gifts/missions/[missionId]/claim` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/missions/me` | Web oturumu, Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/recent-big` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/gifts/send` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/types` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/gifts/version` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/live/gift-types` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/live/gift/send` | Web oturumu, Bearer JWT | gift_send | KODDAN TESPİT EDİLDİ |
| `POST` | `/api/memberships/gift` | Bearer JWT | membership | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/teller/gifts` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/user/received-gifts` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/video-streams/[streamId]/gifts` | Web oturumu, Bearer JWT | gift_send | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/video-streams/[streamId]/gifts/leaderboard` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/video-streams/gifts` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
