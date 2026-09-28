# FLUTTER INTEGRATION GUIDE

> **Kaynak:** Abacus.AI üzerindeki CANLI backend kaynak ağacı, 2026-09-27.
> **Durum etiketleri:** `DOĞRULANDI` · `KODDAN TESPİT EDİLDİ` · `EKSİK` · `ESKİ` · `ERİŞİM BEKLİYOR`


## 1. Temel yapılandırma

```dart
const baseUrl = 'https://canlifal.com';
// /api/v1/... da aynı handler'lara gider (middleware rewrite)
```

Her istekte:
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

## 2. Oturum

| Adım | Uç |
|---|---|
| Giriş | `POST /api/auth/mobile-login` |
| Kayıt | `POST /api/auth/mobile-register` |
| Google | `POST /api/auth/mobile-google` |
| Apple | `POST /api/auth/mobile-apple` |
| Yenileme | `POST /api/auth/mobile-refresh` |

accessToken **7 gün**, refreshToken **30 gün** (`lib/mobile-auth.ts:8-9`).
Yenileme ucunda 15 sn tekilleştirme vardır → paralel 401'lerde tek çağrı yeterlidir.

## 3. Yanıt biçimi tuzağı

Backend iki biçim döndürür:

```dart
// Zarfli:  {"success": true, "data": {...}}
// Duz:     {...}
final payload = json['data'] ?? json;   // her iki biçimi de tolere edin
```

Bilinen farklar: `/api/live/pk` **zarflı**, `/api/chat/rooms/{id}/pk` ve `/api/video-streams/pk` **düz**.

## 4. SSE

```dart
// Oda kanalı: heartbeat 10 sn → istemci zaman aşımı 40 sn olmalı
// Diğer kanallar: heartbeat 15 sn
```
- Heartbeat satırı `: heartbeat` yorumudur, olay değildir.
- Yeniden bağlanmada **üstel geri çekilme** kullanın; her yeni bağlantıya bir `generation` numarası
  verip eski dinleyicilerin olaylarını yok sayın (mevcut uygulama: `mobile/lib/core/network/sse/base_sse_service.dart`).
- Bağlanmadan önce token geçerliliğini kontrol edin.

## 5. Sesli oda akışı

1. `POST /api/chat/rooms/{roomId}/presence`
2. `POST /api/trtc/usersig` → TRTC `enterRoom`
3. `GET /api/chat/rooms/{roomId}/stream` (SSE)
4. Koltuk: `PATCH /seats` + TRTC `switchRole`
5. Çıkış: `DELETE /presence` **ve** TRTC `exitRoom` **ve** `POST /api/live/leave-room`

> 5. adımı atlamak "hayalet kullanıcı" sorununa yol açar (bkz. `LIVE_ROOMS.md`).

## 6. Hata yönetimi

Bkz. [`ERROR_CODES.md`](./ERROR_CODES.md). 429 yanıtlarında `Retry-After` başlığına uyun.

## 7. Uç listesi

Tam liste: [`ENDPOINT_INVENTORY.md`](./ENDPOINT_INVENTORY.md) · Ayrıntı: [`API_REFERENCE.md`](./API_REFERENCE.md)
