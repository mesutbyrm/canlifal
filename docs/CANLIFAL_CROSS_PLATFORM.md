# CanlıFal Platformlar Arası Tutarlılık Rehberi (§89 #24)

**Versiyon:** 1.0  
**Tarih:** 2026-08-27  
**Platformlar:** Flutter Mobil (iOS/Android) + Web (canlifal.com)  
**API Handler:** 776 | Auth Dağılımı: 66 dual + 192 mobile-only + 112 web-only + 15 RBAC

---

## 1. Genel Bakış

CanlıFal backend'i hem Flutter mobil uygulamayı hem de web istemcisini destekler. Bu doküman, her iki platform arasında tutarlı davranış sağlamak için takip edilmesi gereken standartları belirler.

---

## 2. Kimlik Doğrulama Tutarlılığı

### 2.1 Auth Yöntemleri

| Platform | Yöntem | Token | Kütüphane |
|---|---|---|---|
| Flutter | JWT (Bearer) | accessToken + refreshToken | `authenticateRequest()` |
| Web | Session cookie | NextAuth session | `getServerSession(authOptions)` |
| Her ikisi | Dual auth | JWT önce, session yedek | `authenticateRequest() \|\| getServerSession()` |

### 2.2 Dual Auth Standardı

**66 rota** dual auth destekler. Doğru pattern:

```typescript
const mobileUser = await authenticateRequest(request)
const session = !mobileUser ? await getServerSession(authOptions) : null
const userId = mobileUser?.id || session?.user?.id

if (!userId) {
  return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
}
```

**Kural:** Tüm kullanıcı-facing uçlar dual auth desteklemeli. Admin uçları (RBAC + `resolveUser`) yalnızca JWT kullanır.

### 2.3 Tutarsızlık Riski

| Sorun | Etki | Çözüm |
|---|---|---|
| 192 rota yalnızca `authenticateRequest` | Web session ile çalışmaz | Dual auth'a taşı (geriye dönük uyumlu) |
| 112 rota yalnızca `getServerSession` | Flutter'dan erişilemez | Dual auth'a taşı |
| Session-based uçlar JWT kabul etmez | Mobil kullanıcılar 401 alır | `authenticateRequest` eklenmeli |

---

## 3. Yanıt Formatı Tutarlılığı

### 3.1 Mevcut Durum — İki Format

Platformda iki farklı yanıt formatı kullanılmaktadır:

**Format A — Düz format (eski, ~378 rota):**
```json
{ "error": "Oturum açmanız gerekiyor" }
{ "data": [...], "total": 50 }
```

**Format B — Zarflı format (yeni, ~16 rota):**
```json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Oturum açmanız gerekiyor" } }
{ "success": true, "data": [...], "meta": { "total": 50 } }
```

### 3.2 Flutter İstemci Uyumluluğu

Flutter istemcisi **her iki formatı** da işlemelidir:

```dart
// Hata kontrolü — her iki format desteklenmeli
bool isError(Map<String, dynamic> json) {
  if (json.containsKey('success') && json['success'] == false) return true;
  if (json.containsKey('error') && json['error'] is String) return true;
  return false;
}

String getErrorMessage(Map<String, dynamic> json) {
  if (json['error'] is Map) return json['error']['message'] ?? 'Hata';
  if (json['error'] is String) return json['error'];
  return 'Bilinmeyen hata';
}
```

### 3.3 Standart Yanıt Kılavuzu

Yeni uçlar **Format B** (zarflı) kullanmalıdır. Mevcut uçlar geriye dönük uyumluluk için değiştirilmemiştir.

| Durum | Yanıt |
|---|---|
| Başarılı | `{ success: true, data: {...} }` |
| Başarılı (liste) | `{ success: true, data: [...], meta: { total, page, limit } }` |
| Hata | `{ success: false, error: { code: "ERROR_CODE", message: "Türkçe mesaj" } }` |
| Rate limit | `{ success: false, error: { code: "RATE_LIMITED", message: "..." } }` + 429 + headers |
| Validation | `{ success: false, error: { code: "VALIDATION_ERROR", message: "..." } }` + 400 |

---

## 4. Sayfalama Tutarlılığı

### 4.1 Offset Tabanlı (Eski)

```json
// İstek: GET /api/blog?page=1&limit=20
// Yanıt:
{ "data": [...], "total": 150, "page": 1, "limit": 20 }
```

### 4.2 İmleç Tabanlı (Yeni)

```json
// İstek: GET /api/admin/ledger?cursor=xxx&limit=20
// Yanıt:
{ "success": true, "data": [...], "meta": { "cursor": "yyy", "hasMore": true } }
```

### 4.3 Rehber

| Sayfalama Tipi | Kullanım Alanı | Helper |
|---|---|---|
| Offset | Genel listeler, blog, profiller | `parseOffsetParams()` |
| Cursor | Admin tabloları, gerçek zamanlı akışlar | `parseCursorParams()` + `cursorQuery()` + `buildCursorMeta()` |

**Her iki tip de desteklenmeli.** Flutter istemcisi `meta.cursor` varsa cursor, yoksa offset kullanmalıdır.

---

## 5. Derin Bağlantı Tutarlılığı

### 5.1 URI Şeması

| Platform | Format | Örnek |
|---|---|---|
| Web | Tam URL | `https://canlifal.com/canli-falcilar/abc123` |
| Flutter | canlifal:// URI | `canlifal://teller/abc123` |
| Evrensel | Her iki format da çözülür | `resolveDeepLink()` her ikisini de kabul eder |

### 5.2 Desteklenen 14 Tip

| Tip | Web Yolu | App URI | Entity |
|---|---|---|---|
| teller | /canli-falcilar/{id} | canlifal://teller/{id} | LiveFortuneTeller |
| room | /canli-oda/{id} | canlifal://room/{id} | LiveSession |
| stream | /videolar/izle/{id} | canlifal://stream/{id} | VideoStream |
| video | /tiktok/{id} | canlifal://video/{id} | ShortVideo |
| post | /fal/{id} | canlifal://post/{id} | FortunePost |
| blog | /blog/{slug} | canlifal://blog/{slug} | BlogPost |
| profile | /profil/{username} | canlifal://profile/{username} | User |
| chatroom | /sohbet/{slug} | canlifal://chatroom/{slug} | ChatRoom |
| dream | /ruya/{slug} | canlifal://dream/{slug} | DreamInterpretation |
| dreamdict | /ruya-sozlugu/{slug} | canlifal://dreamdict/{slug} | DreamDictionary |
| page | /sayfa/{slug} | canlifal://page/{slug} | CustomPage |
| message | /mesajlar/{userId} | canlifal://message/{userId} | User |
| question | /sorbak/soru/{slug} | canlifal://question/{slug} | Question |
| home | / | canlifal://home/ | — |

### 5.3 API Kullanımı

```
# URL'den bağlantı çöz
GET /api/v1/deeplink/resolve?url=https://canlifal.com/blog/ruya-tabirleri

# Tip+değer'den bağlantı üret
GET /api/v1/deeplink/resolve?type=blog&value=ruya-tabirleri
```

---

## 6. Push Bildirim Tutarlılığı

### 6.1 Dağıtım

| Özellik | Detay |
|---|---|
| Sağlayıcı | OneSignal (kanonik) |
| FCM token | /api/devices/fcm (yalnızca token yakalama) |
| Lib | `lib/push.ts` — `sendPush()`, `sendPushBulk()` |
| Kullanım | 31 rota push bildirim gönderiyor |

### 6.2 Bildirim Verisi Formatı

```json
{
  "title": "Yeni hediye!",
  "body": "Kullanıcı size 100 jeton değerinde hediye gönderdi",
  "data": {
    "type": "gift",
    "deeplink": "canlifal://stream/abc123",
    "referenceId": "abc123"
  }
}
```

**Kural:** Her push bildiriminde `data.deeplink` alanı olmalı → Flutter bu alan ile doğrudan ilgili ekrana yönlendirir.

---

## 7. Hata Mesajı Yerelleştirmesi

### 7.1 Kural

Tüm kullanıcıya gösterilen hata mesajları **Türkçe** olmalıdır:

| İngilizce (yanlış) | Türkçe (doğru) |
|---|---|
| Unauthorized | Oturum açmanız gerekiyor |
| Not found | Bulunamadı |
| Rate limited | Çok fazla istek gönderdiniz, lütfen biraz bekleyin |
| Insufficient balance | Yetersiz bakiye |
| Invalid input | Geçersiz giriş |
| Server error | Bir hata oluştu, lütfen tekrar deneyin |

### 7.2 Geliştirici Hata Kodları

Flutter geliştiricileri için `error.code` alanı İngilizce kalır:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Yetersiz bakiye"
  }
}
```

---

## 8. Medya URL Tutarlılığı

### 8.1 Kural

- Tüm medya URL'leri **tam nitelikli** (fully-qualified) olmalı
- Göreceli yollar `/uploads/...` döndürülMEMELİ
- `serializeGiftMedia()` gibi serializer'lar URL'leri dönüştürür

### 8.2 URL Formatları

| Tip | Format |
|---|---|
| Kullanıcı yükleme | `https://<bucket>.s3.<region>.amazonaws.com/<key>` |
| Public asset | `https://canlifal.com/fortunes/tarot.jpg` |
| CDN (opsiyonel) | `https://cdn.canlifal.com/<path>` |

---

## 9. Feature Flag Tutarlılığı

### 9.1 Kontrol Noktaları

| Katman | Yöntem |
|---|---|
| Backend API | `requireFeature('FLAG_NAME')` → 403 döner |
| Flutter | Bootstrap API'den flagları al, yerel olarak kontrol et |
| Web | `/api/config` veya bootstrap'ten flagları al |

### 9.2 Mevcut Flaglar (12 adet)

```
PHONE_LOGIN_ENABLED, LIVE_ENABLED, VOICE_ROOM_ENABLED,
GIFTS_ENABLED, PK_ENABLED, FORTUNE_TELLER_ENABLED,
SOCIAL_ENABLED, SHORT_VIDEOS_ENABLED, GAMES_ENABLED,
DREAMS_ENABLED, STORIES_ENABLED, CHAT_ENABLED
```

### 9.3 Bootstrap Yanıtı

```json
GET /api/v1/bootstrap?platform=flutter
{
  "success": true,
  "data": {
    "featureFlags": { "LIVE_ENABLED": true, ... },
    "remoteConfigs": { "level_thresholds": {...}, ... },
    "platformSettings": { "credits_per_minute": "10", ... },
    "user": { "id": "...", "name": "...", "level": 5 }
  }
}
```

---

## 10. Tutarlılık Kontrol Listesi

Yeni uç eklerken bu kontrol listesini takip edin:

- [ ] Dual auth destekliyor mu? (authenticateRequest + getServerSession)
- [ ] Yanıt formatı zarflı mı? (success/data/error)
- [ ] Hata mesajları Türkçe mi?
- [ ] Hata kodları İngilizce mi? (UPPERCASE_SNAKE_CASE)
- [ ] Rate limit gerekli mi? (yazma uçları için evet)
- [ ] Sayfalama gerekli mi? (liste uçları için evet)
- [ ] Medya URL'leri tam nitelikli mi?
- [ ] Feature flag kontrolü gerekli mi?
- [ ] Push bildirim gerekli mi? (deeplink dahil)
- [ ] Derin bağlantı registry'ye eklenecek yeni entity var mı?
- [ ] OpenAPI/Postman dokümanları güncellendi mi?
- [ ] Idempotency gerekli mi? (finansal yazma uçları için evet)
- [ ] Audit log gerekli mi? (admin işlemleri için evet)
- [ ] Ledger kaydı gerekli mi? (para hareketi olan uçlar için evet)
- [ ] Risk değerlendirmesi gerekli mi? (yüksek miktarlı işlemler)
