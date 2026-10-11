# CANLIFAL_ERROR_CODES.md — Standart Hata Kodları

> Bu doküman API'nin döndürebileceği tüm hata kodlarını tanımlar.
> Kaynak: `lib/api-response.ts` → `ErrorCodes` enum.

## Hata Yanıt Zarfı

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Yetersiz bakiye",
    "details": {}         // opsiyonel
  },
  "request_id": "req_m2abc3_x9f4k7pg"
}
```

> **Geriye dönük uyumluluk:** Eski uçlar hâlâ `{error: string}` dönebilir. Yeni uçlar ve kademeli geçiş sürecinde güncellenen uçlar yukarıdaki zarfı kullanır. Client’lar **her iki formatı** desteklemelidir.

---

## Genel Hatalar

| Kod | HTTP | Açıklama |
|---|---|---|
| `UNKNOWN_ERROR` | 500 | Bilinmeyen hata |
| `VALIDATION_ERROR` | 400 | İstek verisi geçersiz |
| `NOT_FOUND` | 404 | Kaynak bulunamadı |
| `METHOD_NOT_ALLOWED` | 405 | HTTP metodu desteklenmiyor |
| `RATE_LIMITED` | 429 | Çok fazla istek |
| `INTERNAL_ERROR` | 500 | Sunucu iç hatası |
| `SERVICE_UNAVAILABLE` | 503 | Servis geçici olarak kullanılamıyor |

## Kimlik Doğrulama

| Kod | HTTP | Açıklama |
|---|---|---|
| `UNAUTHORIZED` | 401 | Oturum açılmamış / geçersiz token |
| `FORBIDDEN` | 403 | Yetki yetersiz |
| `TOKEN_EXPIRED` | 401 | Access token süresi dolmuş |
| `TOKEN_INVALID` | 401 | Token geçersiz |
| `REFRESH_TOKEN_EXPIRED` | 401 | Refresh token süresi dolmuş |
| `ACCOUNT_DISABLED` | 403 | Hesap devre dışı |
| `ACCOUNT_BANNED` | 403 | Hesap yasaklanmış |

## Kullanıcı

| Kod | HTTP | Açıklama |
|---|---|---|
| `USER_NOT_FOUND` | 404 | Kullanıcı bulunamadı |
| `USER_ALREADY_EXISTS` | 409 | Kullanıcı zaten mevcut |
| `INVALID_CREDENTIALS` | 401 | Geçersiz giriş bilgileri |
| `EMAIL_ALREADY_TAKEN` | 409 | E-posta adresi zaten kayıtlı |
| `USERNAME_ALREADY_TAKEN` | 409 | Kullanıcı adı zaten alınmış |

## Cüzdan & Finans

| Kod | HTTP | Açıklama |
|---|---|---|
| `INSUFFICIENT_CREDITS` | 400 | Yetersiz kredi |
| `INSUFFICIENT_BALANCE` | 400 | Yetersiz bakiye |
| `PAYMENT_FAILED` | 400 | Ödeme başarısız |
| `PAYMENT_ALREADY_PROCESSED` | 409 | Ödeme zaten işlenmiş |
| `WITHDRAWAL_NOT_ELIGIBLE` | 400 | Para çekme koşulu karşılanmıyor |
| `WITHDRAWAL_LIMIT_EXCEEDED` | 400 | Para çekme limiti aşıldı |
| `IDEMPOTENCY_CONFLICT` | 409 | İşlem zaten gerçekleştirildi (aynı idempotency key) |

## Oda & Yayın

| Kod | HTTP | Açıklama |
|---|---|---|
| `ROOM_NOT_FOUND` | 404 | Oda bulunamadı |
| `ROOM_FULL` | 400 | Oda dolu |
| `ROOM_CLOSED` | 400 | Oda kapalı |
| `SEAT_OCCUPIED` | 400 | Koltuk dolu |
| `SEAT_NOT_FOUND` | 404 | Koltuk bulunamadı |
| `ALREADY_IN_ROOM` | 400 | Zaten odadasınız |
| `NOT_IN_ROOM` | 400 | Odada değilsiniz |
| `STREAM_NOT_FOUND` | 404 | Yayın bulunamadı |
| `STREAM_ENDED` | 400 | Yayın sonlanmış |

## Hediye

| Kod | HTTP | Açıklama |
|---|---|---|
| `GIFT_NOT_FOUND` | 404 | Hediye türü bulunamadı |
| `GIFT_UNAVAILABLE` | 400 | Hediye şu an kullanılamıyor |
| `GIFT_SEND_FAILED` | 500 | Hediye gönderimi başarısız |

## PK

| Kod | HTTP | Açıklama |
|---|---|---|
| `PK_NOT_FOUND` | 404 | PK eşleşmesi bulunamadı |
| `PK_ALREADY_ACTIVE` | 400 | Zaten aktif bir PK var |
| `PK_NOT_ACTIVE` | 400 | PK aktif değil |
| `PK_INVITE_EXPIRED` | 400 | PK daveti süresi dolmuş |

## Üyelik

| Kod | HTTP | Açıklama |
|---|---|---|
| `MEMBERSHIP_ALREADY_ACTIVE` | 400 | Zaten aktif üzelik var |
| `MEMBERSHIP_NOT_FOUND` | 404 | Üyelik planı bulunamadı |

## Özellik Bayrağı

| Kod | HTTP | Açıklama |
|---|---|---|
| `FEATURE_DISABLED` | 403 | Bu özellik şu an kapalı |

## Dosya & Medya

| Kod | HTTP | Açıklama |
|---|---|---|
| `FILE_TOO_LARGE` | 400 | Dosya boyutu çok büyük |
| `INVALID_FILE_TYPE` | 400 | Geçersiz dosya türü |
| `UPLOAD_FAILED` | 500 | Yükleme başarısız |

## Moderasyon

| Kod | HTTP | Açıklama |
|---|---|---|
| `USER_MUTED` | 403 | Kullanıcı sessize alınmış |
| `USER_BANNED` | 403 | Kullanıcı yasaklanmış |
| `CONTENT_BLOCKED` | 403 | İçerik engellenmiş |
| `SPEAK_BLOCKED` | 403 | Konuşma isteği engellenmiş |

## Ajans

| Kod | HTTP | Açıklama |
|---|---|---|
| `AGENCY_NOT_FOUND` | 404 | Ajans bulunamadı |
| `AGENCY_ALREADY_MEMBER` | 400 | Zaten ajans üyesi |

## Fal & Seans

| Kod | HTTP | Açıklama |
|---|---|---|
| `FORTUNE_LIMIT_REACHED` | 429 | Günlük fal limiti doldu |
| `TELLER_NOT_AVAILABLE` | 400 | Falcı müsait değil |
| `SESSION_NOT_FOUND` | 404 | Seans bulunamadı |
| `SESSION_EXPIRED` | 400 | Seans süresi dolmuş |
