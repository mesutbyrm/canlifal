# CanlıFal — Faz 10 Raporu
## Derin Bağlantı (Deep Link) Standardı

Tarih: 2026-08-27

---

### Özet

§89 yayın kapısı listesindeki **#19 — derin bağlantı standardı** maddesi kapatıldı.
Tek bir kayıt defteri üzerinden web yolu ile mobil uygulama URI'si (`canlifal://`)
arasında köprü kuran, tamamen **eklemeli** bir katman eklendi. Mevcut rotalar,
paylasım akışları veya yönlendirme davranışı **değişmedi**.

Not: §89 #11 (imleç tabanlı sayfalama standardı) için `lib/pagination.ts` yardımcıları
zaten mevcut ve short-videos / ledger / audit gibi uçlar tarafından kullanılıyor;
bu faz onu tekrar ele almadı (mevcut offset tabanlı uçlar geriye dönük uyumluluk
için aynen korunuyor).

---

### 1. Yeni kütüphane — `lib/deeplink.ts`

| Öğe | Görev |
|---|---|
| `DEEPLINK_SCHEME` | `canlifal` (uygulama URI şeması) |
| `DeepLinkType` | 14 tip: teller, room, stream, video, post, blog, profile, chatroom, dream, dreamdict, page, message, question, home |
| `buildDeepLink(type, params)` | Tip + parametreden `{ web, app, entity }` üretir |
| `resolveDeepLink(input)` | `canlifal://...` URI'sini VEYA web yolu/URL'sini hedef tanıma çözümler; tanınamazsa `null` |

#### Bağlantı kayıt defteri (14 varlık tipi)

| Tip | Web yolu | Uygulama URI'si | Varlık |
|---|---|---|---|
| teller | `/canli-falcilar/{id}` | `canlifal://teller/{id}` | LiveFortuneTeller |
| room | `/canli-oda/{id}` | `canlifal://room/{id}` | LiveSession |
| stream | `/videolar/izle/{id}` | `canlifal://stream/{id}` | VideoStream |
| video | `/tiktok/{id}` | `canlifal://video/{id}` | ShortVideo |
| post | `/fal/{id}` | `canlifal://post/{id}` | FortunePost |
| blog | `/blog/{slug}` | `canlifal://blog/{slug}` | BlogPost |
| profile | `/profil/{username}` | `canlifal://profile/{username}` | User |
| chatroom | `/sohbet/{slug}` | `canlifal://chatroom/{slug}` | ChatRoom |
| dream | `/ruya/{slug}` | `canlifal://dream/{slug}` | DreamInterpretation |
| dreamdict | `/ruya-sozlugu/{slug}` | `canlifal://dreamdict/{slug}` | DreamDictionary |
| page | `/sayfa/{slug}` | `canlifal://page/{slug}` | CustomPage |
| message | `/mesajlar/{userId}` | `canlifal://message/{userId}` | User |
| question | `/sorbak/soru/{slug}` | `canlifal://question/{slug}` | Question |
| home | `/` | `canlifal://home` | — |

Çözümleyici, web yolundaki isteğe bağlı `/tr` veya `/en` dil önekini tolere eder
ve tam URL'lerden (`https://canlifal.com/...`) yalnızca yolu çıkarır.

---

### 2. Yeni uç — `GET /api/v1/deeplink/resolve`

Kimlik gerektirmeyen, salt yardımcı uç (hiçbir veri yazmaz):

| Kullanım | Açıklama |
|---|---|
| `?url=canlifal://teller/abc` | URI'yi hedef tipe/yola çözümler |
| `?url=https://canlifal.com/tr/fal/xyz` | Web URL'sini çözümler |
| `?type=teller&value=abc` | Belirtilen varlık için web + uygulama bağlantısı üretir |

Standart `apiSuccess` / `apiError` zarfını kullanır.

---

### 3. Envanter değişimi

| Ölçüm | Faz 9 | Faz 10 |
|---|---|---|
| Uç nokta işleyicisi | 775 | **776** |
| OpenAPI yolu | 497 | **498** |
| Kategori | 167 | **167** |
| Veri modeli | 214 | **214** (değişmedi) |

`backend-docs/` yeniden üretildi. Bu faz şema değişikliği içermez.

---

### 4. Doğrulama durumu

| Kontrol | Durum |
|---|---|
| Tip denetimi (tsc) | ✅ Hatasız |
| Üretim derlemesi | ✅ Başarılı |
| Geliştirme sunucusu | ✅ Ayakta |
| Canlı uçtan uca test | ❌ Yapılmadı |
| Yayına alma | ❌ Yapılmadı |

---

### 5. §89 yayın kapısı güncellemesi

| # | Madde | Önce | Sonra |
|---|---|---|---|
| 19 | Derin bağlantı standardı | ❌ | ✅ |

Kalan açık maddeler: #3 standart hata zarfı yaygınlaştırma, #11 imleç tabanlı
sayfalama (yardımcılar mevcut, geniş benimseme bekliyor), #13 hız sınırı kapsamı,
#21 yük testi, #23 test planı, #24 platformlar arası tutarlılık testi.
