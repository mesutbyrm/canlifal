# ERROR CODES — Hata Kodları

> **Kaynak:** Abacus.AI üzerinde çalışan CANLI backend kaynak ağacı (`nextjs_space/`), 2026-09-27 tarihli durum.
> **Üretim yöntemi:** Route dosyaları programatik olarak taranarak (`app/api/**/route.ts`) üretildi; el ile uydurulmuş uç/alan yoktur.
> **Durum etiketleri:** `DOĞRULANDI` (çalışan sistemde test edildi) · `KODDAN TESPİT EDİLDİ` (kaynak koddan okundu, canlı test edilmedi) · `EKSİK` · `ESKİ` · `ERİŞİM BEKLİYOR`


Merkezi katalog: `lib/api-response.ts → ErrorCodes`. Route'ların bir kısmı hâlâ eski
`{error:'metin'}` biçimini döndürür; bu **kademeli geçiş** nedeniyledir (bkz. dosya başlığındaki not).

## HTTP durum eşlemesi

| HTTP | Anlam | Tipik kodlar |
|---|---|---|
| 400 | Geçersiz istek | `VALIDATION_ERROR`, `BAD_REQUEST`, `INVALID_PARAMS`, `MISSING_PARAMS`, `INVALID_BODY`, `INVALID_JSON` |
| 401 | Kimlik yok/geçersiz | `UNAUTHORIZED`, `TOKEN_REVOKED` |
| 402/400 | Bakiye yetersiz | `INSUFFICIENT_BALANCE`, `INSUFFICIENT_CREDITS` |
| 403 | Yetki yok | `FORBIDDEN`, `NOT_OWNER`, `NOT_STREAM_OWNER`, `NOT_TELLER`, `NOT_MEMBER`, `VIP_LOUNGE_REQUIRED`, `MEMBERSHIP_TIER_REQUIRED` |
| 404 | Bulunamadı | `NOT_FOUND`, `ROOM_NOT_FOUND`, `STREAM_NOT_FOUND`, `PK_NOT_FOUND`, `TARGET_NOT_FOUND`, `USER_NOT_FOUND` |
| 409 | Çakışma | `CONFLICT`, `DUPLICATE`, `DUPLICATE_REQUEST`, `IDEMPOTENCY_CONFLICT` |
| 429 | Hız sınırı | `RATE_LIMITED` |
| 500 | Sunucu hatası | `INTERNAL_ERROR`, `SERVER_ERROR` |
| 503 | Servis kapalı | `SERVICE_UNAVAILABLE`, `TRTC_NOT_CONFIGURED` |

## Koddan taranan tüm kod sabitleri


`ACCOUNT_RESTRICTED`, `ALREADY_DELETED`, `ALREADY_JOINED`, `ALREADY_LIVE`, `BAD_REQUEST`, `BANNED`, `CANNOT_SPEAK`, `CLOSED`, `COMMENTS_OFF`, `CONFIRMATION_REQUIRED`, `CONFIRM_REQUIRED`, `CONFLICT`, `COOLDOWN_ACTIVE`, `DISABLED`, `DUPLICATE`, `DUPLICATE_REQUEST`, `DURATION_TOO_LONG`, `ENDPOINT_NOT_FOUND`, `FILE_TOO_LARGE`, `FOLLOWERS_ONLY`, `FORBIDDEN`, `FULL`, `GENERATION_FAILED`, `IDEMPOTENCY_CONFLICT`, `INSUFFICIENT_BALANCE`, `INTERNAL_ERROR`, `INVALID_ACTION`, `INVALID_AMOUNT`, `INVALID_BODY`, `INVALID_CONTENT`, `INVALID_CREDENTIALS`, `INVALID_FIELD`, `INVALID_FORM`, `INVALID_FORMAT`, `INVALID_FORTUNE_TYPE`, `INVALID_JSON`, `INVALID_MODE`, `INVALID_OP`, `INVALID_PACKAGE`, `INVALID_PARAMS`, `INVALID_PARENT`, `INVALID_PHONE`, `INVALID_PRIORITY`, `INVALID_PRODUCT_MAP`, `INVALID_ROOM_PASSWORD`, `INVALID_ROOM_TYPE`, `INVALID_SEAT`, `INVALID_SERVICE_ACCOUNT`, `INVALID_STATE`, `INVALID_VALUE`, `LIMIT_EXCEEDED`, `MEMBERSHIP_TIER_REQUIRED`, `MESSAGE_TOO_LONG`, `MISSING_BATTLE_ID`, `MISSING_CHANNEL`, `MISSING_KEY`, `MISSING_OP`, `MISSING_PARAMS`, `MISSING_ROOM_ID`, `MISSING_VIDEO`, `MISSING_VIDEO_URL`, `NOT_APPROVED`, `NOT_AUTHORIZED`, `NOT_A_TELLER`, `NOT_FOUND`, `NOT_IMPLEMENTED`, `NOT_MEMBER`, `NOT_OWNER`, `NOT_STREAM_OWNER`, `NOT_TELLER`, `NO_CHANGES`, `NO_CONTEXT`, `PASSWORD_REQUIRED`, `PAYMENT_FAILED`, `PK_EXISTS`, `PK_EXPIRED`, `PK_NOT_ACTIVE`, `PK_NOT_FOUND`, `PK_NOT_PENDING`, `PRESIGN_FAILED`, `RATE_LIMITED`, `REGISTER_FAILED`, `REQUIREMENT`, `ROOM_INACTIVE`, `ROOM_NOT_FOUND`, `SEAT_REQUIRES_PRIVILEGE`, `SEAT_TAKEN`, `SELF_PK`, `SERVER_ERROR`, `SERVICE_UNAVAILABLE`, `SMS_SEND_FAILED`, `STREAM_ENDED`, `STREAM_NOT_FOUND`, `STREAM_NOT_LIVE`, `TARGET_INACTIVE`, `TARGET_NOT_FOUND`, `TARGET_NOT_LIVE`, `TOKEN_REVOKED`, `TOURNAMENT_CLOSED`, `TOURNAMENT_FULL`, `TRTC_NOT_CONFIGURED`, `UNAUTHORIZED`, `UNKNOWN`, `UNKNOWN_ACTION`, `UNKNOWN_FIELD`, `UNKNOWN_PROVIDER`, `UPLOAD_FAILED`, `USER_NOT_FOUND`, `USE_NOT_ALLOWED`, `VALIDATION`, `VALIDATION_ERROR`, `VIP_LOUNGE_REQUIRED`, `WALLET_LOCKED`


> Tarama `app/api/**` ve `lib/**` içindeki `code: 'XXX'` kalıplarını kapsar; toplam **113** farklı kod bulundu.

## Flutter için önerilen eşleme

```dart
switch (code) {
  case 'UNAUTHORIZED': case 'TOKEN_REVOKED':   // token yenile, olmazsa çıkış
  case 'INSUFFICIENT_BALANCE':                 // jeton yükleme sayfası
  case 'RATE_LIMITED':                         // Retry-After başlığını bekle
  case 'TRTC_NOT_CONFIGURED':                  // sesli odayı devre dışı bırak
  default:                                     // genel hata mesajı
}
```
`429` yanıtları `X-RateLimit-*` ve `Retry-After` başlıkları taşır (`lib/rate-limit-guard.ts`).
