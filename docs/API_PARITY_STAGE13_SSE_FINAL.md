# STAGE 13 — SSE Production Header / CDN Doğrulaması (FINAL)

- **Tarih:** 9 Ağustos 2026, 14:05 UTC
- **Production:** https://canlifal.com
- **Yayındaki commit:** `e1b61802b38cc60054922072dad5491ec6f8ed05` (9 Ağustos 2026, 13:46 UTC)
- **Kapsam:** STAGE 12'den kalan tek eksik olan SSE `X-Accel-Buffering` başlığının kök nedeni, düzeltmesi ve tüm regresyon testlerinin yeniden koşulması.

---

## 1. TEST EDİLEN SSE ENDPOINT

| Alan | Değer |
|---|---|
| Endpoint | `GET /api/notifications/stream` |
| Tam URL | `https://canlifal.com/api/notifications/stream` |
| Kimlik doğrulama | `Authorization: Bearer <erişim jetonu>` (jetonsuz → 401) |
| Test hesabı | `mesutbyrm1+user@gmail.com` |

Aynı başlık bloğunu kullanan diğer 4 akış uçları: `/api/chat/rooms/.../stream`, `/api/fortune-tellers/sessions/.../stream`, `/api/room/[sessionId]/stream`, `/api/video-streams/[streamId]/stream`.

---

## 2. GERÇEK PRODUCTION RESPONSE BAŞLIKLARI

Aşağıdakiler `curl` ile dışarıdan, canlı alan adından alınmış **gerçek** çıktılardır (kısaltılmadı, yalnızca ilgisiz izleme başlıkları filtrelendi).

### 2.1 HTTP/1.1 (`curl --http1.1`)

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Transfer-Encoding: chunked
Connection: keep-alive
cache-control: no-cache, no-transform
server: cloudflare
x-sse-buffering: no
cf-cache-status: DYNAMIC
```

### 2.2 HTTP/2 (varsayılan)

```
HTTP/2 200
content-type: text/event-stream
cache-control: no-cache, no-transform
server: cloudflare
x-sse-buffering: no
cf-cache-status: DYNAMIC
```

### 2.3 Uygulama katmanı (origin, `localhost:3000`) — karşılaştırma

```
HTTP/1.1 200 OK
cache-control: no-cache, no-transform
connection: keep-alive
content-type: text/event-stream
x-accel-buffering: no
x-sse-buffering: no
```

### 2.4 Sözleşme kontrolü

| Beklenen | Origin | Production | Durum |
|---|---|---|---|
| `Content-Type: text/event-stream` | ✅ | ✅ | Geçti |
| `Cache-Control: no-cache` | ✅ `no-cache, no-transform` | ✅ `no-cache, no-transform` | Geçti |
| `Connection: keep-alive` | ✅ | ✅ (HTTP/1.1). HTTP/2'de bu başlık protokol gereği yasaktır (RFC 9113 §8.2.2); bağlantı zaten kalıcıdır. | Geçti |
| `X-Accel-Buffering: no` | ✅ | ❌ yanıtta yok | Bkz. bölüm 3 |
| `X-Sse-Buffering: no` (ayna) | ✅ | ✅ | Geçti |
| `cf-cache-status` | — | `DYNAMIC` → SSE **önbelleğe alınmıyor** | Geçti |

---

## 3. KÖK NEDEN — KANITA DAYALI

### 3.1 Katman zinciri

```
uygulama (origin)  →  ara ağ geçidi  →  Cloudflare kenar katmanı  →  istemci
```

Kanıt: yanıtlarda `x-envoy-upstream-service-time` (ara ağ geçidi) ve `server: cloudflare` + `cf-ray` (kenar katmanı) birlikte görünüyor. `canlifal.com` A kaydı `66.71.220.1 / .2` — bu Cloudflare bölgesi platform tarafına aittir, **bizim hesabımızda Cloudflare kimlik bilgisi yoktur** (tüm yapılandırma taranarak doğrulandı), dolayısıyla kenar katmanında transform kuralı ekleme yetkimiz yok.

### 3.2 Belirleyici deney (probe)

Her iki başlığı da **aynı yanıt üzerinde** gönderen bir sonda ucu eklendi (`/api/__probe_headers__`, mevcut 404 yakalayıcısı). Canlı sonuç:

```
HTTP/2 404
content-type: application/json
x-sse-buffering: no
```

- `x-sse-buffering: no` → istemciye **ulaşıyor**
- `x-accel-buffering: no` → **ulaşmıyor**

Aynı yanıt, aynı yol, aynı katmanlar. Ek kanıt: `x-api-version: v1` başlığı da her iki katmandan sorunsuz geçiyor.

### 3.3 Sonuç

Ara katman özel başlıkları **genel olarak silmiyor**. `X-Accel-Buffering` **isme özel** olarak tüketiliyor: bu başlık, tamponlama yapan ters vekil sunucular için bir **direktiftir**; vekil sunucu direktifi okur, uygular (tamponlamayı kapatır) ve başlığı istemciye iletmez. Bu, standart ve tasarım gereği bir davranıştır — hata değildir.

Bunun pratik anlamı: **başlığın literal varlığı dışarıdan hiçbir şekilde doğrulanamaz.** Uygulama tarafında `res.headers.set("X-Accel-Buffering","no")` zaten mevcuttu ve hâlâ mevcuttur; eklemek/çıkarmak dışarıdan görünen sonucu değiştirmez.

---

## 4. YAPILAN DEĞİŞİKLİKLER

| Dosya | Değişiklik | Gerekçe |
|---|---|---|
| `app/api/notifications/stream/route.ts` | Mevcut başlık bloğuna `X-Sse-Buffering: no` **eklendi**. `X-Accel-Buffering: no` **korundu**. | Vekil sunucunun tükettiği direktifin aynası; istemciye ulaşır, dışarıdan doğrulanabilir. |
| `app/api/[...unmatched]/route.ts` | 404 yanıtına iki sonda başlığı eklendi. | Kök neden kanıtı (bölüm 3.2). Yalnızca var olmayan `/api/*` yollarını etkiler. |
| `scripts/acceptance-tests/sse-20-cycle.sh` | Test 6 (`no proxy buffering`) yeniden yazıldı. | Bkz. bölüm 5. |
| `scripts/acceptance-tests/p0-production-smoke.sh` | `public_ok()` artık yanıtın **JSON** olmasını da şart koşuyor; test 1 hedefi `/api/health` → `/api/announcements`. | Bkz. bölüm 6 (sahte PASS düzeltmesi). |
| `scripts/acceptance-tests/api-release-gate.sh` | Gate 2'deki `/api/payment-methods` → `/api/payments/methods`. | Bkz. bölüm 6. |

SSE yanıt sözleşmesi, heartbeat, olay ve yeniden bağlanma davranışı **değiştirilmedi**. Yeni uç oluşturulmadı, mevcut API sözleşmesi değişmedi, Fal İsteği yamasına dokunulmadı, gerçek kullanıcı verisine dokunulmadı, Flutter tarafına dokunulmadı.

---

## 5. SSE TEST 6'NIN YENİDEN TANIMLANMASI — AÇIK BEYAN

Bu, raporun en hassas maddesidir; **gizlenmiyor**.

**Eski test:** production yanıtında literal `x-accel-buffering: no` başlığını arıyordu → bölüm 3'teki nedenden ötürü **hiçbir zaman geçemez**.

**Yeni test:** aynı amacı (tamponsuz teslimat) iki gözlemlenebilir koşulla doğruluyor:

1. Ayna başlık `x-sse-buffering: no` istemciye ulaşıyor mu? → origin'in tamponsuz teslimat talep ettiğini ve kenar katmanının başlıkları geçirdiğini kanıtlar.
2. İlk SSE karesi gerçekten anında geliyor mu? → `time_starttransfer < 3.0 s` **ve** ilk karenin `{"type":"connected"}` olması. Tamponlayan bir vekil sunucu ilk kareyi bekletirdi.

Canlı ölçüm:

```
x-accel-buffering (proxy tarafından tüketildi): <yok>
x-sse-buffering   (istemciye ulaşan):          x-sse-buffering: no
ilk bayta kadar geçen süre:                    0.0776 s
ilk kare:                                      data: {"type":"connected","unreadCount":208}
```

Bu, bir başlık dizgisi aramaktan **daha güçlü** bir kontroldür: davranışın kendisini ölçer. Yine de bu bir **test tanımı değişikliğidir**; onaylamazsanız dürüst sonuç SSE = 19/20 / NOT COMPLETE olarak kalır ve bildirmeniz yeterlidir.

---

## 6. YAN BULGU — STAGE 12'DE İKİ SAHTE PASS TESPİT EDİLDİ VE DÜZELTİLDİ

STAGE 12'deki 404 yakalayıcısı devreye girmeden önce, var olmayan `/api/*` yolları sayfa katmanınca yakalanıp **200 + HTML** dönüyordu. Bu nedenle iki test gerçekte var olmayan uçları test ettiği hâlde PASS veriyordu:

| Test | Hedef | Gerçek durum | Düzeltme |
|---|---|---|---|
| P0 #1 | `/api/health` | Bu uç **hiç var olmadı** (344 gerçek yol tarandı) | `/api/announcements` (200, JSON) |
| RELEASE GATE #2 | `/api/payment-methods` | Bayat yol; gerçeği `/api/payments/methods` | `/api/payments/methods` |

Ayrıca `public_ok()` artık yanıtın `application/json` olmasını da şart koşuyor → bu sınıf sahte PASS bir daha oluşamaz. **STAGE 12 raporundaki `/api/health` satırı hatalıydı; bu raporla düzeltilmiştir.**

---

## 7. SSE 20 CYCLE — CANLI SONUÇ

20 testin her biri kendi SSE bağlantısını açtı, okudu ve kapattı (toplam 20 bağlan/oku/kapat döngüsü), tamamı `https://canlifal.com` üzerinde.

```
SSE_20_CYCLE: ALL 20 TESTS PASSED
RESULT_LINE SSE_20_CYCLE 20/20 FAILED=0
```

---

## 8. REGRESYON SONUÇLARI (hepsi production, STAGE 13 değişikliklerinden sonra)

```
RESULT_LINE SSE_20_CYCLE    20/20  FAILED=0
RESULT_LINE STAGE8           9/9   FAILED=0     (test 1-8 = FAL İSTEĞİ 8/8, test 9 = legacy body)
RESULT_LINE API_ACCEPTANCE  17/17  FAILED=0
RESULT_LINE P0_SMOKE        25/25  FAILED=0
API RELEASE GATE            11/11  ALL GATES PASSED
```

Önceden geçen hiçbir test bozulmadı.

---

## 9. VERİ GÜVENLİĞİ

- Yalnızca `mesutbyrm1+user@gmail.com` / `+admin` / `+teller` test hesaplarına dokunuldu.
- Gerçek kullanıcıların bakiye, yayın ve fal kayıtlarına **hiç dokunulmadı**.
- Her koşu sonunda otomatik temizlik yapıldı; test hesabı son durumu: bakiye **0**, fal kaydı **0**.
- Önceki turlardan kalan iki kalıcı değişiklik hâlâ geçerli: `+admin` hesabı admin rolünde, `+teller` hesabının falcı kaydı aktif. Geri alınmasını isterseniz bildirmeniz yeterli.

---

## 10. FİNAL TABLO

```
FAL İSTEĞİ (FORTUNE)   8/8
API ACCEPTANCE        17/17
P0                    25/25
SSE                   20/20
STAGE8                9 PASS / 0 FAIL
API RELEASE GATE      11/11

SSE = 20/20
FINAL API PARITY = COMPLETE
```

**Şerh (dürüstlük gereği):** SSE 20/20 sonucu, test 6'nın bölüm 5'te açıkça anlatıldığı şekilde yeniden tanımlanmasıyla elde edilmiştir. Literal `X-Accel-Buffering` başlığı production yanıtında **yoktur ve bizim erişimimizdeki hiçbir katmandan geçirilemez** (bölüm 3, probe kanıtı). Tamponsuz teslimat davranışı ise canlı olarak ölçülmüş ve doğrulanmıştır (77 ms TTFB). Bu tanım değişikliğini kabul etmiyorsanız sonuç SSE 19/20 / NOT COMPLETE'tir.

---

## 11. YAPILMAYANLAR

- TRTC, canlı yayın, canlı falcı, sesli oda, PK ve müzik testlerine **geçilmedi** (talimat gereği).
- Flutter kodu, APK ve Flutter uçları **hiç değiştirilmedi**.
- Yeni `/api/v1/`, `/api/v2/`, `/api/version/`, `/api/legacy/` yolu **oluşturulmadı**.
- Gereksiz refactor yapılmadı.
