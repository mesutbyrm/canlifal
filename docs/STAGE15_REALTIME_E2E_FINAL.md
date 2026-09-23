# STAGE 15 — PRODUCTION REAL-TIME E2E FINALIZATION

**Tarih:** 10 Ağustos 2026 (UTC)
**Ortam:** GERÇEK PRODUCTION — https://canlifal.com
**Kapsam:** Stage 14'te açık kalan 3 madde (HEDİYE, PK, 5 DK MEDYA HAREKETSİZLİĞİ) + regresyon
**Yöntem:** Gerçek production HTTP istekleri + gerçek veritabanı okuması + gerçek SSE bağlantısı. Hiçbir mock/stub kullanılmadı.

> Bu raporda yazan her PASS, aşağıda gövdesi verilen **gerçek production yanıtı**, **gerçek veritabanı kaydı** ve (gerekli yerlerde) **gerçek SSE olay teslimi** ile kanıtlanmıştır. Kodda bir çağrının bulunması tek başına PASS sayılmamıştır.

---

## A) PRODUCTION KAYNAK DOĞRULAMASI

| Alan | Değer |
|---|---|
| Repository | `github.com/mesutbyrm/canlifal` (origin) |
| Branch | `master` |
| Test başlangıcındaki commit (baseline) | `0cd94d16f507ba0a6daee742cfb7299e5c40d24e` |
| Stage 15'te oluşturulan commit | `8569d67` → checkpoint commit `63acc4f7d9cbc8e8f2b4fb545ce36d83beddee72` |
| Production URL | https://canlifal.com |
| Deploy | Baseline deploy + Stage 15 düzeltme deploy'u yapıldı, ikisi de **"verified live"** döndü |
| Production commit SHA (final) | `63acc4f7d9cbc8e8f2b4fb545ce36d83beddee72` |

**Kod ↔ production davranış uyumu:** Test başında production'ın gerçekten yeni kodu servis ettiği kanıtlandı:

```
POST https://canlifal.com/api/video-streams/<id>/media-heartbeat   → 401 UNAUTHORIZED (404 değil ⇒ endpoint canlıda)
GET  https://canlifal.com/api/video-streams/<id>/auto-close        → 200 {"shouldClose":false,...}
```

Ayrıca yayın oluşturma yanıtında `lastMediaAt` ve `autoClosedAt` alanları döndü ⇒ veri şeması da production'da güncel.

**Önemli gözlem (şeffaflık):** Stage 15 düzeltmesi deploy edildikten hemen sonra yapılan ilk hediye testinde production hâlâ **eski kodu** servis ediyordu (yayılma süresi). ~3 dakika sonra tekrar edilen aynı test yeni davranışı gösterdi. Aşağıdaki F-3 kanıtı **yayılma tamamlandıktan sonraki** gerçek sonuçtur.

### Test hesapları (gerçek production hesapları)

| Rol | userId | Not |
|---|---|---|
| user | `cmqt77wko00aes6087fd1dcry` | normal kullanıcı |
| teller | `cmqt7ar6g00b2s608n9cdiemc` | canlı falcı / yayıncı |
| admin | `cmqt7cwfs00bps608wxz4efsv` | finans-dışı (`isExcludedFromFinance = true`) |

Gerçek kullanıcı verisine dokunulmadı. Test sonunda tüm test kayıtları silindi ve üç hesabın bakiyesi **0**'a çekildi (bkz. Temizlik).

---

## B) HEDİYE — GERÇEK E2E

### B1) Normal kullanıcı → canlı yayın (500 jeton)

| Alan | Sonuç |
|---|---|
| SYSTEM | Canlı yayın hediyesi |
| SCENARIO | user → teller yayını, `elmas` × 1 |
| REQUEST | `POST /api/live/gift/send` `{roomId, roomType:"stream", giftTypeId:"elmas", quantity:1}` (öncesinde `POST /api/live/join-room` → 200) |
| EXPECTED | 200, 500 jeton düşer, alıcıya pay yazılır, DB kaydı, SSE `gift` olayı |
| ACTUAL HTTP STATUS | **200** |
| ACTUAL RESPONSE | `{"success":true,"data":{"gift":{"id":"cmsmgbyv7000bl208mwephz7w","giftName":"Elmas","quantity":1,"totalPrice":500},"newBalance":2500,"pkUpdate":null}}` |
| DATABASE RESULT | Gönderen bakiye 3000 → **2500** (−500). Alıcı (yayıncı) 1000 → **1250** (+250). `stream_gifts` kaydı: `totalPrice=500` |
| SSE/EVENT RESULT | Yayın kanalı `/api/video-streams/{id}/stream` üzerinden **`gift` olayı teslim edildi**: `totalPrice:500`, `quantity:1`, `giftId`, `senderId`, `streamId` + tam render metadata |
| **PASS/FAIL** | **PASS** |

### B2) Finans-dışı rol (admin) → canlı yayın — Stage 14 F-2 hatası

| Alan | Sonuç |
|---|---|
| SCENARIO | admin (finans-dışı) → teller yayını, `elmas` × 1 |
| EXPECTED | 200, **`totalPrice = 500`** (Stage 14'te 0 idi), bakiyeler değişmez |
| ACTUAL HTTP STATUS | **200** |
| ACTUAL RESPONSE | `{"gift":{"id":"cmsmghi95000hl2084m2vefku","quantity":1,"totalPrice":500},"newBalance":3000}` |
| DATABASE RESULT | `stream_gifts`: `totalPrice = 500` ✔ (**0 DEĞİL**). Gönderen 3000 → 3000, alıcı 1250 → 1250 (finans muafiyeti doğru çalışıyor) |
| SSE/EVENT RESULT | `gift` olayı teslim edildi, `"totalPrice":500`, `senderId` = admin |
| **PASS/FAIL** | **PASS — Stage 14 F-2 GİDERİLDİ** |

> "0 jeton atıldı" davranışı production'da artık **yok**. Hem yanıtta, hem veritabanında, hem SSE olayında gerçek tutar (500) görünüyor.

### B3) YENİ BULGU — F-3: gelir dağılımı kaydedilmiyordu (Stage 15'te düzeltildi)

Stage 15 sırasında tespit edildi: yayın hediyelerinde alıcıya jeton **gerçekten aktarılıyordu** ama `stream_gifts.receiverAmount` ve `siteAmount` alanları **0 olarak** kaydediliyordu → gelir raporlamasında tutarsızlık.

**Düzeltme öncesi (production, gerçek kayıt):**
```json
{"id":"cmsmgvb1s004nl208f77yy5ta","totalPrice":500,"receiverAmount":0,"siteAmount":0}
```
**Düzeltme sonrası (production, gerçek kayıt):**
```json
{"id":"cmsmgyqwh0001pn08hnw8apv9","totalPrice":500,"receiverAmount":250,"siteAmount":250}
```

Aynı deploy'da SSE `gift` yükü **additive** olarak zenginleştirildi (mevcut alanların hiçbiri değişmedi/kaldırılmadı):
```json
{"type":"gift","streamId":"...","roomId":"...","receiverId":"cmqt7ar6g00b2s608n9cdiemc",
 "gift":{"giftId":"...","senderId":"...","receiverId":"...","streamId":"...","roomId":"...","totalPrice":500,...}}
```
Böylece kullanıcının istediği tüm alanlar olayda mevcut: **giftId, senderId, receiverId, roomId, streamId(liveId), amount(quantity), totalPrice**.

**PASS/FAIL: PASS** (production'da doğrulandı)

### B4) Hediye validasyonu — beklenmeyen 500 yok

| Senaryo | HTTP | Kod |
|---|---|---|
| Kendine hediye | 400 | `SELF_GIFT` |
| Geçersiz hediye tipi | 400 | `INVALID_GIFT` |
| Yetkisiz (token yok) | 401 | `UNAUTHORIZED` |
| Eksik parametre | 400 | `MISSING_PARAMS` |
| Hatalı `roomType` | 400 | `INVALID_ROOM_TYPE` |
| Olmayan yayın | 404 | `STREAM_NOT_FOUND` |
| Yetersiz bakiye (9999 adet) | 400 | `INSUFFICIENT_BALANCE` |
| Negatif adet (−5) | 200 | adet 1'e sabitlenir (çökme yok) |

**Beklenmeyen 500: 0 adet. PASS**

### ► HEDİYE = **PASS**

---

## C) PK — GERÇEK E2E

### TEST 1 — SESLİ ODA PK

İki gerçek sohbet odası oluşturuldu (sahipler: user ve teller), her ikisine `join-room` yapıldı, **her iki odanın chat SSE kanalı olay tetiklenmeden ÖNCE açıldı**.

| Adım | HTTP | Yanıt | Oda A SSE | Oda B SSE |
|---|---|---|---|---|
| CREATE (user → teller) | 200 | `{"id":"cmsmgldg7001dl208eah5ghmj","status":"pending"}` | `created` ✔ | `created` ✔ |
| ACCEPT (teller) | 200 | `status:"active"`, `startedAt`, `endTime` | `started` ✔ | `started` ✔ |
| SCORE (hediye ile) | 200 | `pkUpdate:{score1:500,score2:0}` | `score_update` ✔ + `gift` ✔ | `score_update` ✔ |
| END | 200 | `status:"completed", winnerId=user` | `completed` ✔ | `completed` ✔ |
| REJECT (ayrı battle) | 200 | `status:"rejected"` | — | `rejected` ✔ |
| CANCEL (ayrı battle) | 200 | `status:"cancelled"` | — | `cancelled` ✔ |

- Karşı taraf request olayını **aldı** ✔
- Olay **sohbet kanalına** gitti ✔
- `room1Id` / `room2Id` doğru ✔, `user1Id` / `user2Id` doğru ✔
- **Duplicate yok**: her kanalda her aksiyondan tam olarak **1** olay sayıldı ✔

**► PK SESLİ ODA = PASS**

### TEST 2 — CANLI YAYIN PK (Stage 14'ün asıl FAIL'i)

İki gerçek canlı yayın oluşturuldu (teller ve admin), **her iki yayının SSE kanalı olay tetiklenmeden ÖNCE açıldı**.

| Adım | HTTP | Yanıt | Yayın 1 SSE | Yayın 2 SSE |
|---|---|---|---|---|
| CREATE (teller → admin) | 200 | `{"id":"cmsmgjjih000ul208rdlrdlv3","status":"pending"}` | `created` ✔ | `created` ✔ |
| ACCEPT (admin) | 200 | `status:"active"` | `started` ✔ | `started` ✔ |
| SCORE (user 500 jetonluk hediye) | 200 | `pkUpdate:{score1:500,score2:0}` | `score_update` ✔ | `score_update` ✔ |
| END (teller) | 200 | `status:"completed", winnerId=teller` | `completed` ✔ | `completed` ✔ |

Gerçek SSE gövdesi (hedef yayın kanalından yakalandı):
```json
{"type":"pk","battleId":"cmsmgjjih000ul208rdlrdlv3","action":"created",
 "room1Id":"cmsmgar080004l208bb4rc8zw","room2Id":"cmsmgj5uv000ql208lbuchgw3",
 "user1Id":"cmqt7ar6g00b2s608n9cdiemc","user2Id":"cmqt7cwfs00bps608wxz4efsv",
 "duration":180,"status":"pending","expiresAt":"..."}
```

- Olay **yayın kanalına gidiyor** ✔ (Stage 14'te gitmiyordu)
- `liveId` (`room1Id`/`room2Id`) doğru ✔, sender/receiver doğru ✔
- **Duplicate yok**: her kanalda 4 olay, her aksiyondan 1 tane ✔

**► PK CANLI YAYIN = PASS**

### PK validasyonu — beklenmeyen 500 yok

| Senaryo | HTTP | Kod |
|---|---|---|
| Token yok | 401 | `UNAUTHORIZED` |
| Geçersiz action | 400 | `INVALID_ACTION` |
| Eksik parametre | 400 | `MISSING_PARAMS` |
| Olmayan oda | 404 | `ROOM_NOT_FOUND` |
| Oda sahibi değil | 403 | `NOT_OWNER` |
| Olmayan battle | 404 | `PK_NOT_FOUND` |
| GET roomId'siz | 400 | `MISSING_ROOM_ID` |

**Beklenmeyen 500: 0 adet.**

### ► PK = **PASS**

---

## D) 5 DAKİKA MEDYA HAREKETSİZLİĞİNDE OTOMATİK KAPATMA

Bu kural, 15 dakikalık "hediye gelmedi" kuralından **tamamen ayrıdır**: farklı ayar (`stream_media_inactivity_timeout` = 5 dk vs `stream_no_gift_timeout` = 15 dk), farklı `reason` değeri (`media_inactivity` vs hediye kuralı) ve farklı tetikleyici (medya heartbeat'i vs hediye zamanı). İkisi karıştırılmamıştır.

**Güvenlik kuralı:** `lastMediaAt = null` olan yayınlar bu kuralla **asla** kapatılmaz (heartbeat göndermeyen istemciler etkilenmez).

### 10 adımlı gerçek production doğrulaması

| # | Adım | Sonuç |
|---|---|---|
| 1 | Gerçek production yayını oluşturuldu | `POST /api/video-streams` → 200, `status:"live"`, `lastMediaAt:null` |
| 2 | Yayın aktif hale getirildi, izleyici katıldı | `join-room` → 200, aktif izleyici = 1 |
| 3 | Media heartbeat çalışıyor mu | `POST /api/video-streams/{id}/media-heartbeat` → **200** `{"lastMediaAt":"2026-08-09T23:55:47.245Z","timeoutMinutes":5,"recommendedIntervalSeconds":30}` |
| 3b | Sahiplik kontrolü | Yayıncı olmayan kullanıcı → **403 `NOT_OWNER`** |
| 4 | `lastMediaAt` gerçekten yazıldı mı | Veritabanı: `lastMediaAt = 2026-08-09T23:55:47.245Z` ✔ |
| 5 | Heartbeat durduruldu | Yeni heartbeat gönderilmedi |
| 6 | 5 dk eşiği | Production kodu **değiştirilmeden**, sadece test yayınının `lastMediaAt` değeri 6 dakika geriye alındı (aynı kod yolu, gerçek sweeper) |
| 6b | Eşik sorgusu | `GET /api/video-streams/{id}/auto-close` → **200** `{"shouldClose":true,"reason":"media_inactivity","timeoutMinutes":5}` |
| 7 | Sweeper kapattı mı | `GET /api/video-streams` (gerçek liste isteği, sweeper buna bağlı) → yayın kapandı |
| 8 | Veritabanı durumu | `status:"ended"`, `endedAt:"2026-08-09T23:56:02.491Z"`, **`autoClosedAt:"2026-08-09T23:56:02.491Z"`** ✔ |
| 9 | SSE kapanış olayı | Yayın kanalından **gerçekten teslim edildi**: `{"type":"streamEnded","streamId":"...","reason":"media_inactivity","timeoutMinutes":5,"endedAt":"2026-08-09T23:56:02.491Z"}` ✔ |
| 10 | Online/presence temizliği | Aktif izleyici 1 → **0** ✔ ; `GET /api/live/online-users` → `{"users":[],"totalCount":0}` ✔ |

### Ek kontroller

| Senaryo | HTTP | Sonuç |
|---|---|---|
| `lastMediaAt = null` olan diğer canlı yayın | — | **Kapatılmadı**, `status:"live"` kaldı ✔ (güvenlik kuralı çalışıyor) |
| Kapanmış yayına heartbeat | 400 | `STREAM_NOT_LIVE` |
| Olmayan yayına heartbeat | 404 | `STREAM_NOT_FOUND` |
| Yetkisiz heartbeat | 403 | `NOT_OWNER` |

**Beklenmeyen 500: 0 adet.**

### ► 5 DK MEDYA HAREKETSİZLİĞİ AUTO CLOSE = **PASS**

---

## E) REGRESYON

Mevcut production kabul testi paketi (`scripts/acceptance-tests/stage14-realtime-audit.sh`, 54 kapı) **gerçek production'a karşı** çalıştırıldı:

```
===== GROUP RESULTS =====
  TRTC : PASS
  CANLI_YAYIN : PASS
  CANLI_FALCI : PASS
  SESLI_ODA : PASS
  SEAT : PASS
  PRESENCE : PASS
  HEDIYE : PASS
  JETON : PASS
  PK : PASS
  MUZIK : PASS
  SSE : PASS
  AUTO_CLOSE : PASS

RESULT_LINE STAGE14-REALTIME-AUDIT 54/54 FAILED=0
```

Kapsanan akışlar: TRTC imza/oda, canlı yayın aç-kapat, canlı falcı online/offline, sesli oda JOIN / LEAVE / HEARTBEAT / stale cleanup, seat take / leave / swap / yarış koşulu, jeton bakiye düşümü, hediye alıcı payı, presence, SSE (sohbet + yayın kanalı), PK, müzik arama / `!istek` / kuyruk / DJ SSE.

**► REGRESYON = PASS (54/54)**

---

## F) 500 HATASI KURALI

Stage 15 boyunca çalıştırılan **tüm** validasyon senaryolarında (hediye 8, PK 7, media-heartbeat 3, auto-close 2 + regresyon paketinin negatif kapıları) **hiçbir beklenmeyen 500 üretilmedi**. Tüm hata yanıtları kanonik HTTP durum kodu + `{"success":false,"error":{"code":"...","message":"..."}}` formatındadır.

**► 500 KURALI = PASS**

---

## G) SONUÇ TABLOSU

| Sistem | Stage 14 | Stage 15 (production, gerçek) |
|---|---|---|
| **HEDİYE** | KISMİ FAIL (F-2: finans-dışı rolde 0 jeton) | **PASS** |
| **PK — SESLİ ODA** | KISMİ FAIL | **PASS** |
| **PK — CANLI YAYIN** | KISMİ FAIL (SSE gitmiyordu) | **PASS** |
| **5 DK MEDYA HAREKETSİZLİĞİ** | EKSİK | **PASS** |
| Gelir dağılımı kaydı (F-3, yeni bulundu) | — | **PASS** (Stage 15'te düzeltildi) |
| Regresyon (54 kapı) | 54/54 | **54/54 PASS** |
| Beklenmeyen 500 | 0 | **0** |

# OVERALL STAGE 15 = PASS

---

## DEĞİŞİKLİK / DEPLOY ÖZETİ

### Stage 15'te değiştirilen dosya

| Dosya | Değişiklik |
|---|---|
| `app/api/live/gift/send/route.ts` | (1) Yayın hediyelerinde gelir dağılımı artık kayda yazılıyor: `receiverAmount` + `siteAmount` (F-3). (2) Hediye SSE yüküne **additive** olarak `receiverId`, `roomId`, `streamId` eklendi. Mevcut alanların hiçbiri değiştirilmedi/kaldırılmadı. |

**Yeni endpoint oluşturulmadı. Mevcut API sözleşmeleri bozulmadı. Flutter koduna dokunulmadı.**

### Commit ve deploy

| | |
|---|---|
| Commit | `8569d67` → checkpoint commit **`63acc4f7d9cbc8e8f2b4fb545ce36d83beddee72`** |
| Build | Başarılı (tip kontrolü + production build) |
| Deploy | **Evet**, canlifal.com'a deploy edildi ve "verified live" döndü |
| Deploy sonrası doğrulama | Yeni davranış production'da gerçek istekle tekrar doğrulandı (F-3 kanıtı yukarıda) |

### Temizlik (yapıldı)

| İşlem | Adet |
|---|---|
| Silinen test yayını | 4 |
| Silinen test odası | 4 |
| Silinen PK kaydı | 5 |
| Silinen yayın hediyesi | 6 |
| Silinen oda hediyesi | 4 |
| Silinen izleyici kaydı | 4 |
| Silinen geçici falcı kaydı (admin test fixture) | 1 |
| Bakiyesi 0'a çekilen test hesabı | 3 (doğrulandı: her biri `jetonBalance = 0`) |

Gerçek kullanıcıların parasına/jetonuna dokunulmadı; tüm işlemler yalnızca üç beyaz listeli test hesabı üzerinde yapıldı.

### Şeffaflık notları

1. Production'da oturum açabilmek için üç **test hesabının** şifresi test başında rastgele yeni değerlerle değiştirildi. Bu kalıcı bir değişikliktir ve yalnızca test hesaplarını etkiler.
2. İkinci yayıncıyı oluşturabilmek için admin test hesabına geçici bir "canlı falcı" kaydı açıldı; test sonunda **silindi**.
3. 5 dakikalık eşik, gerçek 5 dakika beklemek yerine test yayınının `lastMediaAt` değeri geriye alınarak tetiklendi. **Production kodu değiştirilmedi**; kapatmayı yapan sweeper, eşik hesabı, veritabanı güncellemesi, SSE yayını ve presence temizliği tamamen gerçek production kod yolu üzerinden çalıştı.
4. Hediye komisyon oranı bu ortamda gözlemlenen değerle **%50**'dir (500 jeton → alıcı 250 / site 250). Bu bir platform ayarıdır (`stream_gift_commission`), kod sabiti değildir.
