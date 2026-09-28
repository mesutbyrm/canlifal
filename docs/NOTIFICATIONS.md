# NOTIFICATIONS — Bildirimler

> **Kaynak:** Abacus.AI üzerindeki CANLI backend kaynak ağacı, 2026-09-27.
> **Durum etiketleri:** `DOĞRULANDI` · `KODDAN TESPİT EDİLDİ` · `EKSİK` · `ESKİ` · `ERİŞİM BEKLİYOR`


## Kanallar

| Kanal | Mekanizma |
|---|---|
| Uygulama içi | `GET /api/notifications/stream` (SSE, heartbeat **15 sn**, yoklama 5 sn) |
| Liste | `GET /api/notifications` |
| Push | OneSignal entegrasyonu (`lib/onesignal-admin.ts`), cihaz kaydı `UserDevice`, log `PushNotificationLog` |

SSE olay tipleri: `connected`, `notification`.

## Uçlar

| Metot | Yol | Yetki | Rate limit | Durum |
|---|---|---|---|---|
| `GET, POST, DELETE` | `/api/admin/notifications` | Web oturumu | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/admin/payment-notifications` | Admin/RBAC | — | KODDAN TESPİT EDİLDİ |
| `POST, DELETE` | `/api/auth/mobile/device-token` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
| `GET, POST, DELETE` | `/api/notifications` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `POST, PATCH` | `/api/notifications/[notificationId]/read` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET, DELETE` | `/api/notifications/payment` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/notifications/stream` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET` | `/api/notifications/unread` | Bearer JWT | — | KODDAN TESPİT EDİLDİ |
| `GET, POST` | `/api/payments/notifications/[notificationId]/dispute` | Admin/RBAC | report | KODDAN TESPİT EDİLDİ |
| `POST, DELETE` | `/api/user/device-token` | Yok ⚠ | — | KODDAN TESPİT EDİLDİ |
