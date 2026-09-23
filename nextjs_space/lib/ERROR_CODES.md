# CanlıFal API Hata Kodları Kataloğu

Tüm API uçları aşağıdaki standart zarf formatını kullanır:

```json
{
  "success": false,
  "error": {
    "code": "HATA_KODU",
    "message": "Kullanıcıya gösterilebilecek mesaj",
    "details": {}
  },
  "request_id": "req_xxx"
}
```

---

## Genel Hatalar

| Kod | HTTP | Açıklama |
|-----|------|----------|
| `UNKNOWN_ERROR` | 500 | Bilinmeyen sunucu hatası |
| `VALIDATION_ERROR` | 400 | İstek doğrulama hatası (eksik/hatalı alan) |
| `NOT_FOUND` | 404 | Kaynak bulunamadı |
| `METHOD_NOT_ALLOWED` | 405 | HTTP metodu desteklenmiyor |
| `RATE_LIMITED` | 429 | İstek limiti aşıldı |
| `INTERNAL_ERROR` | 500 | Sunucu iç hatası |
| `SERVICE_UNAVAILABLE` | 503 | Servis geçici olarak kullanılamıyor |
| `ENDPOINT_NOT_FOUND` | 404 | API endpoint bulunamadı |
| `DUPLICATE_REQUEST` | 409 | Idempotency — istek halen işleniyor veya replay |
| `COOLDOWN_ACTIVE` | 429 | Bekleme süresi aktif |

## Kimlik Doğrulama

| Kod | HTTP | Açıklama |
|-----|------|----------|
| `UNAUTHORIZED` | 401 | Oturum açılmamış |
| `FORBIDDEN` | 403 | Yetki yetersiz |
| `NOT_AUTHORIZED` | 403 | Bu işlem için yetkiniz yok |
| `NOT_OWNER` | 403 | Sadece sahip yapabilir |
| `TOKEN_EXPIRED` | 401 | Erişim tokeni süresi dolmuş |
| `TOKEN_INVALID` | 401 | Geçersiz token |
| `REFRESH_TOKEN_EXPIRED` | 401 | Yenileme tokeni süresi dolmuş |
| `ACCOUNT_DISABLED` | 403 | Hesap devre dışı |
| `ACCOUNT_BANNED` | 403 | Hesap yasaklanmış |
| `ACCOUNT_RESTRICTED` | 403 | Hesap kısıtlanmış |
| `BANNED` | 403 | Kullanıcı yasaklı |
| `NOT_APPROVED` | 403 | Henüz onaylı değil |
| `REGISTER_FAILED` | 500 | Kayıt başarısız |

## Kullanıcı

| Kod | HTTP | Açıklama |
|-----|------|----------|
| `USER_NOT_FOUND` | 404 | Kullanıcı bulunamadı |
| `USER_ALREADY_EXISTS` | 409 | Kullanıcı zaten mevcut |
| `INVALID_CREDENTIALS` | 401 | Hatalı e-posta veya şifre |
| `EMAIL_ALREADY_TAKEN` | 409 | E-posta adresi kullanılıyor |
| `USERNAME_ALREADY_TAKEN` | 409 | Kullanıcı adı kullanılıyor |

## Cüzdan / Finans

| Kod | HTTP | Açıklama |
|-----|------|----------|
| `INSUFFICIENT_CREDITS` | 400 | Yetersiz kredi |
| `INSUFFICIENT_BALANCE` | 400 | Yetersiz bakiye |
| `PAYMENT_FAILED` | 500 | Ödeme başarısız |
| `PAYMENT_ALREADY_PROCESSED` | 409 | Ödeme zaten işlenmiş |
| `WITHDRAWAL_NOT_ELIGIBLE` | 400 | Çekim için uygun değil |
| `WITHDRAWAL_LIMIT_EXCEEDED` | 400 | Çekim limiti aşıldı |
| `IDEMPOTENCY_CONFLICT` | 409 | Farklı parametrelerle aynı idempotency anahtarı |
| `INVALID_AMOUNT` | 400 | Geçersiz miktar |

## Oda / Sesli Sohbet

| Kod | HTTP | Açıklama |
|-----|------|----------|
| `ROOM_NOT_FOUND` | 404 | Oda bulunamadı |
| `ROOM_FULL` | 400 | Oda dolu |
| `ROOM_CLOSED` | 400 | Oda kapalı |
| `ROOM_INACTIVE` | 400 | Oda aktif değil |
| `SEAT_OCCUPIED` | 409 | Koltuk dolu |
| `SEAT_TAKEN` | 409 | Koltuk alınmış |
| `SEAT_NOT_FOUND` | 404 | Koltuk bulunamadı |
| `INVALID_SEAT` | 400 | Geçersiz koltuk numarası |
| `ALREADY_IN_ROOM` | 409 | Zaten odada |
| `NOT_IN_ROOM` | 400 | Odada değil |
| `INVALID_ROOM_TYPE` | 400 | Geçersiz oda tipi |
| `INVALID_ROOM_PASSWORD` | 401 | Yanlış oda şifresi |
| `CANNOT_SPEAK` | 403 | Konuşma yetkisi yok |
| `FOLLOWERS_ONLY` | 403 | Sadece takipçiler |
| `COMMENTS_OFF` | 403 | Yorumlar kapalı |
| `MESSAGE_TOO_LONG` | 400 | Mesaj çok uzun |
| `MISSING_ROOM_ID` | 400 | Oda ID'si eksik |
| `MISSING_CHANNEL` | 400 | Kanal bilgisi eksik |
| `USER_MUTED` | 403 | Kullanıcı sessize alınmış |
| `USER_BANNED` | 403 | Kullanıcı odadan yasaklanmış |
| `CONTENT_BLOCKED` | 403 | İçerik engellendi |
| `SPEAK_BLOCKED` | 403 | Konuşma engellendi |

## Yayın / Canlı

| Kod | HTTP | Açıklama |
|-----|------|----------|
| `STREAM_NOT_FOUND` | 404 | Yayın bulunamadı |
| `STREAM_ENDED` | 400 | Yayın sona ermiş |
| `STREAM_NOT_LIVE` | 400 | Yayın canlı değil |
| `ALREADY_LIVE` | 409 | Zaten canlı yayında |
| `DURATION_TOO_LONG` | 400 | Süre çok uzun |
| `MISSING_VIDEO` | 400 | Video eksik |
| `MISSING_VIDEO_URL` | 400 | Video URL'si eksik |
| `TRTC_NOT_CONFIGURED` | 500 | TRTC yapılandırılmamış |
| `PRESIGN_FAILED` | 500 | Ön-imzalama başarısız |
| `TARGET_INACTIVE` | 400 | Hedef aktif değil |

## PK

| Kod | HTTP | Açıklama |
|-----|------|----------|
| `PK_NOT_FOUND` | 404 | PK bulunamadı |
| `PK_ALREADY_ACTIVE` | 409 | Zaten aktif PK var |
| `PK_NOT_ACTIVE` | 400 | PK aktif değil |
| `PK_INVITE_EXPIRED` | 400 | PK daveti süresi dolmuş |
| `PK_EXISTS` | 409 | PK zaten mevcut |
| `PK_EXPIRED` | 400 | PK süresi dolmuş |
| `PK_NOT_PENDING` | 400 | PK beklemede değil |
| `NO_TARGET_OWNER` | 400 | Hedef oda sahibi bulunamadı |
| `MISSING_BATTLE_ID` | 400 | Savaş ID'si eksik |

## Hediye

| Kod | HTTP | Açıklama |
|-----|------|----------|
| `GIFT_NOT_FOUND` | 404 | Hediye bulunamadı |
| `GIFT_UNAVAILABLE` | 400 | Hediye kullanılamıyor |
| `GIFT_SEND_FAILED` | 500 | Hediye gönderimi başarısız |
| `SELF_GIFT` | 400 | Kendinize hediye gönderemezsiniz |
| `NO_RECIPIENT` | 400 | Alıcı belirtilmemiş |
| `RECIPIENT_NOT_FOUND` | 404 | Alıcı bulunamadı |
| `INVALID_GIFT` | 400 | Geçersiz hediye |
| `INVALID_PARENT` | 400 | Geçersiz üst kaynak |

## Üyelik

| Kod | HTTP | Açıklama |
|-----|------|----------|
| `MEMBERSHIP_ALREADY_ACTIVE` | 409 | Üyelik zaten aktif |
| `MEMBERSHIP_NOT_FOUND` | 404 | Üyelik bulunamadı |

## Özellik Bayrağı

| Kod | HTTP | Açıklama |
|-----|------|----------|
| `FEATURE_DISABLED` | 403 | Özellik devre dışı |

## Dosya / Medya

| Kod | HTTP | Açıklama |
|-----|------|----------|
| `FILE_TOO_LARGE` | 413 | Dosya çok büyük |
| `INVALID_FILE_TYPE` | 400 | Geçersiz dosya türü |
| `UPLOAD_FAILED` | 500 | Yükleme başarısız |

## Ajans

| Kod | HTTP | Açıklama |
|-----|------|----------|
| `AGENCY_NOT_FOUND` | 404 | Ajans bulunamadı |
| `AGENCY_ALREADY_MEMBER` | 409 | Zaten ajans üyesi |

## Fal

| Kod | HTTP | Açıklama |
|-----|------|----------|
| `FORTUNE_LIMIT_REACHED` | 429 | Günlük fal limiti dolmuş |
| `TELLER_NOT_AVAILABLE` | 400 | Falcı müsait değil |
| `SESSION_NOT_FOUND` | 404 | Oturum bulunamadı |
| `SESSION_EXPIRED` | 400 | Oturum süresi dolmuş |
| `NOT_A_TELLER` | 403 | Falcı değilsiniz |
| `INVALID_FORTUNE_TYPE` | 400 | Geçersiz fal türü |

## İstek Doğrulama

| Kod | HTTP | Açıklama |
|-----|------|----------|
| `INVALID_PARAMS` | 400 | Geçersiz parametreler |
| `MISSING_PARAMS` | 400 | Eksik parametreler |
| `INVALID_BODY` | 400 | Geçersiz istek gövdesi |
| `INVALID_ACTION` | 400 | Geçersiz işlem |
| `INVALID_OP` | 400 | Geçersiz operasyon |
| `INVALID_FORMAT` | 400 | Geçersiz format |
| `INVALID_CONTENT` | 400 | Geçersiz içerik |
| `INVALID_FORM` | 400 | Geçersiz form verisi |
| `MISSING_KEY` | 400 | Gerekli anahtar eksik |
| `MISSING_OP` | 400 | Operasyon eksik |

---

## Flutter Entegrasyonu Notları

1. **HTTP status + code birlikte ele alınır.** `401` → token yenileme, `403` → yetkisiz ekrana yönlendir, `429` → geri sayım göster.
2. **`request_id`** her yanıtta bulunur; destek taleplerine ekleyin.
3. **Idempotency:** `DUPLICATE_REQUEST` = aynı anahtar halen işleniyor; `IDEMPOTENCY_CONFLICT` = farklı parametrelerle aynı anahtar gönderildi.
4. **Yerellik:** `error.message` her zaman Türkçe'dir ve kullanıcıya doğrudan gösterilebilir.
