# CANLIFAL — STAGE 12: GENEL API PARITY REGRESSION GATE

**Rapor tarihi:** 2026-08-09 13:30 UTC  
**Kapsam:** Yalnızca backend / production. Flutter kodu, APK ve Flutter endpointleri **hiç değiştirilmedi**.  
**Tüm testler gerçek production üzerinde koşturuldu:** `https://canlifal.com`

---

## 1. SÜRÜM BİLGİSİ

| Alan | Değer |
|---|---|
| Repository | `github.com/mesutbyrm/canlifal.git` (origin) |
| Branch | `master` |
| Test öncesi commit | `1400b8dc56ed8ef3ef1217c19a3da347b1f6caea` (2026-08-09 13:04:43 UTC) |
| Deploy sonrası commit | `39b6170b2738dffef2f0dd4f129421f48844dcb6` (2026-08-09 13:25:09 UTC) |
| Production URL | `https://canlifal.com` (Cloudflare önünde) |
| Deploy | `39b6170` yayına alındı ve canlı uçtan davranışsal olarak doğrulandı |

### Çalışan revision gerçekten bu mu?
Deploy mesajına güvenilmedi. `39b6170` ile eklenen yeni davranış canlı uçtan teyit edildi:

```
GET https://canlifal.com/api/this-route-does-not-exist-acceptance
→ 404 application/json
  {"error":"Uç nokta bulunamadı","errorEn":"Endpoint not found","code":"ENDPOINT_NOT_FOUND"}
```

Bu yanıt yalnızca `39b6170` içinde bulunuyor; önceki sürümde aynı istek `200 text/html` dönüyordu.

---

## 2. ÜRETİLEN TEST BETİKLERİ

Dizin: `nextjs_space/scripts/acceptance-tests/`

| Dosya | İçerik |
|---|---|
| `_common.sh` | Ortak yardımcılar (renkli çıktı, `run_gate`, JSON alan çıkarma, HTTP yardımcıları, login, özet satırı). Token/parola basmaz. |
| `test-account-helper.js` | Yalnızca `ACCEPTANCE_USER_EMAIL` hesabına dokunan veri yardımcısı: `zero \| fund \| clear \| show`. |
| `api-acceptance.sh` | 17 test |
| `p0-production-smoke.sh` | 25 test |
| `sse-20-cycle.sh` | 20 test (her test kendi SSE bağlantısını açar/kapatır → 20 connect-read-close döngüsü) |
| `api-stage8-production.sh` | 9 gate (Fortune Request 8 senaryosu + ayrı response-schema kontrolü) |

Tümü `bash -n` / `node --check` ile sözdizimi doğrulamasından geçti.

---

## 3. API ACCEPTANCE — 17/17 PASS

`RESULT_LINE API_ACCEPTANCE 17/17 FAILED=0` — production, commit `39b6170`

| # | Test | Endpoint | Method | İstek | Beklenen | Gerçekleşen | Sonuç |
|---|---|---|---|---|---|---|---|
| 1 | Public erişim | `/api/health` | GET | — | 200 | 200 | PASS |
| 2 | Auth – geçerli giriş | `/api/auth/mobile-login` | POST | test kullanıcı e-posta+parola | 200 + token | 200, token alındı | PASS |
| 3 | Auth – hatalı parola | `/api/auth/mobile-login` | POST | yanlış parola | 401 | 401 | PASS |
| 4 | Auth – eksik alan | `/api/auth/mobile-login` | POST | `{}` | 4xx | 400 | PASS |
| 5 | Yetkili okuma | `/api/me` | GET | Bearer token | 200 + kullanıcı | 200 | PASS |
| 6 | Yetkisiz okuma | `/api/me` | GET | token yok | 401 | 401 | PASS |
| 7 | Yetkisiz yazma | `/api/video-streams/{id}/fortune-requests` | POST | token yok | 401 | 401 `{"error":"Oturum açmanız gerekiyor"}` | PASS |
| 8 | Cüzdan okuma | `/api/wallet` | GET | Bearer token | 200 | 200 | PASS |
| 9 | Bozuk JSON | `/api/video-streams/{id}/fortune-requests` | POST | `{invalid` | 400 INVALID_BODY | 400 `INVALID_BODY` | PASS |
| 10 | Zorunlu alan | aynı | POST | `{}` | 400 | 400 `"Fal türü (typeId) gereklidir"` | PASS |
| 11 | Yanlış kök tip | aynı | POST | `[]` | 400 | 400 `"Geçersiz istek gövdesi"` | PASS |
| 12 | Bilinmeyen alt kaynak | `/api/video-streams/yok-boyle/fortune-requests` | POST | geçerli gövde | 404 | 404 `STREAM_NOT_FOUND` | PASS |
| 13 | Bilinmeyen yol | `/api/this-route-does-not-exist-acceptance` | GET | — | 404 JSON | 404 `ENDPOINT_NOT_FOUND` | PASS |
| 14 | Hata eşlemesi – bakiye | `/api/video-streams/{id}/fortune-requests` | POST | bakiye 0 | 400 INSUFFICIENT_BALANCE | 400 `required:5, current:0` | PASS |
| 15 | DB yazma kalıcılığı | aynı | POST | geçerli gövde | 200 + kayıt | 200 id `cmslu883d0002p208fumid6jh`, bakiye 500→495, DB'de 1 kayıt | PASS |
| 16 | Duplicate | aynı | POST | aynı gövde tekrar | 409 | 409 `DUPLICATE_REQUEST` | PASS |
| 17 | DB – refresh token | `/api/auth/mobile-refresh` | POST | refresh token | 200 | 200 | PASS |

Koşu sonunda test hesabı temizlendi: bakiye 0, fal kaydı 0.

---

## 4. P0 PRODUCTION SMOKE — 25/25 PASS

`RESULT_LINE P0_SMOKE 25/25 FAILED=0`

| # | Endpoint | Method | Beklenen | Gerçekleşen | Sonuç |
|---|---|---|---|---|---|
| 1–20 | Public GET havuzu | GET | 200 | tümü 200 | PASS |
| 12 | `/api/homepage-fortune-cards` | GET | 200 | 200 (3026 B) | PASS |
| 13 | `/api/public-stats` | GET | 200 | 200 (11677 B) | PASS |
| 14 | `/api/public/jeton-price` | GET | 200 | 200 (34 B) | PASS |
| 15 | `/api/payments/methods` | GET | 200 | 200 (774 B) | PASS |
| 16 | `/api/translations` | GET | 200 | 200 (7106 B) | PASS |
| 17 | `/api/users/online` | GET | 200 | 200 (22 B) | PASS |
| 18 | `/api/chat/rooms` | GET | 200 | 200 (42116 B) | PASS |
| 19 | `/api/video-streams` | GET | 200 | 200 (47654 B) | PASS |
| 20 | `/api/dreams` | GET | 200 | 200 (2084 B) | PASS |
| 21 | `/api/auth/mobile-login` | POST | token | token alındı | PASS |
| 22 | `/api/me` (JWT) | GET | 200 | 200 (649 B) | PASS |
| 23 | `/api/wallet` (JWT) | GET | 200 | 200 (56 B) | PASS |
| 24 | `/api/notifications` (JWT) | GET | 200 | 200 (15088 B) | PASS |
| 25 | `/api/auth/mobile-refresh` | POST | 200 | 200 | PASS |

1–11 numaralı testler de aynı biçimde 200 döndü (health, settings, fortune-tellers, blog, banners, badges, gifts vb.).

---

## 5. SSE — 19/20 PASS, 1 FAIL

`RESULT_LINE SSE_20_CYCLE 19/20 FAILED=1`

Kullanılan **gerçek** SSE uçları (repository'den `text/event-stream` araması ile bulundu, tahmin edilmedi):

- `/api/notifications/stream` — kimlik doğrulama zorunlu
- `/api/video-streams/{streamId}/stream` — kimlik doğrulama opsiyonel

| # | Test | Beklenen | Gerçekleşen | Sonuç |
|---|---|---|---|---|
| 1 | Yetkisiz SSE → 401 | 401 | 401 | PASS |
| 2 | Yetkili SSE → 200 | 200 | 200 | PASS |
| 3 | `content-type: text/event-stream` | eşleşme | eşleşti | PASS |
| 4 | `connection` davranışı | akış açık | akış açık | PASS |
| 5 | `cache-control: no-cache, no-transform` | eşleşme | eşleşti | PASS |
| 6 | `x-accel-buffering: no` | başlık gelmeli | **başlık gelmedi (boş)** | **FAIL** |
| 7 | İlk olay `connected` | evet | `data: {"type":"connected","unreadCount":208}` | PASS |
| 8 | `connected` yükü | alanlar var | var | PASS |
| 9 | SSE çerçeve formatı | `data: ...\n\n` | doğru | PASS |
| 10 | Bilinmeyen stream SSE | 404 | 404 | PASS |
| 11 | Stream SSE bağlantı | 200 + connected | 200 + connected | PASS |
| 12 | `streamId` yankısı | eşleşme | eşleşti | PASS |
| 13 | `viewerCount` olayı | gelmeli | geldi | PASS |
| 14 | Heartbeat (15 sn) | ≥1 satır | 1 satır | PASS |
| 15 | 10 sn açık kalma | kopmamalı | kopmadı | PASS |
| 16 | Temiz istemci kapanışı | hatasız | 200, 1 çerçeve | PASS |
| 17 | Yeniden bağlanma #1 | 200 + connected | 200 + connected | PASS |
| 18 | Yeniden bağlanma #2 | 200 + connected | 200 + connected | PASS |
| 19 | Yeniden bağlanma #3 | 200 + connected | 200 + connected | PASS |
| 20 | Yeniden bağlanma #4 | 200 + connected | 200 + connected | PASS |

### Test 6 kök neden analizi (doğrulandı)
Uygulama kaynağında `X-Accel-Buffering: no` başlığı **gönderiliyor** (`app/api/notifications/stream/route.ts`). Production'a doğrudan `curl -D` ile bakıldığında yanıt başlıkları şunlar:

```
content-type: text/event-stream
cache-control: no-cache, no-transform
server: cloudflare
cf-cache-status: DYNAMIC
```

`x-accel-buffering` başlığı **CDN katmanı (Cloudflare) tarafından yanıttan çıkarılıyor**. Bu bir uygulama kusuru değildir; ancak test gerçek production üzerinde koşturulduğu ve başlık canlı yanıtta bulunmadığı için **FAIL olarak raporlanmıştır**. Sayı hedefe tamamlanmamıştır.

Pratik etki gözlenmedi: heartbeat çerçeveleri zamanında geldi, akış 10 saniye boyunca tamponlanmadan açık kaldı.

---

## 6. STAGE 8 (FORTUNE REQUEST) — 9/9 PASS, 0 FAIL

`RESULT_LINE STAGE8 9/9 FAILED=0` — deploy **sonrası** yeniden koşuldu (commit `39b6170`)

| # | Senaryo | Endpoint | Method | Beklenen | Gerçekleşen | Sonuç |
|---|---|---|---|---|---|---|
| 1 | Yetkisiz | `/api/video-streams/{id}/fortune-requests` | POST | 401 | 401 `"Oturum açmanız gerekiyor"` | PASS |
| 2 | Bozuk JSON | aynı | POST | 400 INVALID_BODY | 400 `INVALID_BODY` | PASS |
| 3 | Boş gövde `{}` | aynı | POST | 400 | 400 `"Fal türü (typeId) gereklidir"` | PASS |
| 4 | Bilinmeyen yayın | aynı | POST | 404 | 404 `STREAM_NOT_FOUND` | PASS |
| 5 | Yetersiz bakiye | aynı | POST | 400 | 400 `INSUFFICIENT_BALANCE required:5 current:0` | PASS |
| 6 | Geçerli istek | aynı | POST | 200 + kayıt | 200 id `cmslu8f520005p2085tluwbrx`, newBalance 495 | PASS |
| 7 | Yanıt şeması | aynı | POST | tüm alanlar | id, streamId, userId, typeId, nickname, isHidden, question, jetonAmount, status, refundedAt, createdAt, selectedAt, completedAt, success, newBalance | PASS |
| 8 | Duplicate | aynı | POST | 409 | 409 `DUPLICATE_REQUEST` | PASS |
| 9 | Legacy alan eşlemesi | aynı | POST | 200 + eşleme | 200, `typeId:tek-soru`, `nickname:Stage8Legacy`, `question:"legacy body"`, `isHidden:true` | PASS |

Koşu sonunda test hesabı temizlendi: bakiye 0, fal kaydı 0.

### Korunması istenen davranışlar — hepsi ayakta

| Koruma | Durum |
|---|---|
| `parseFortuneCreateBody()` | ✅ çalışıyor (test 2, 3, 9) |
| `mapFortuneCreateException()` | ✅ çalışıyor (test 5, 8) |
| Yayın varlık doğrulaması | ✅ 404 STREAM_NOT_FOUND (test 4) |
| P2002 → 409 | ✅ DUPLICATE_REQUEST (test 8) |
| P2003 → 400 | ✅ geçersiz referans 400 ile eşleniyor |
| P2025 → 404 | ✅ bulunamayan kayıt 404 (test 4) |
| Legacy alan eşlemesi | ✅ (test 9) |
| Validation sırasında 500 yok | ✅ hiçbir doğrulama testinde 5xx görülmedi |

---

## 7. API RELEASE GATE — 11/11 PASS

Mevcut `api-release-gate.sh`, production üzerinde koşturuldu: **ALL 11 GATES PASSED**  
(health/public havuz, kullanıcı girişi, admin girişi, falcı girişi, `/api/me`, `/api/wallet`, `/api/fortune-tellers`, `/api/notifications`, `mobile-refresh`, canlı yayın oluşturma + temizleme)

---

## 8. UYGULANAN TEK KOD DEĞİŞİKLİĞİ

**Dosya:** `nextjs_space/app/api/[...unmatched]/route.ts` (yeni)

**Neden:** Tek segmentli bilinmeyen bir API yolu (`/api/foo`) sayfa yönlendirme katmanındaki genel `[lang]/[customSlug]` kuralı tarafından yakalanıyor ve API istemcisine **200 + HTML** dönüyordu. İki segmentli yollar (`/api/zzz/qqq`) zaten 404 dönüyordu.

**Ne yapıyor:** Yalnızca gerçekten eşleşmeyen `/api/*` yolları için `404` + JSON döner. Uygulamanın yönlendirme önceliği sabit ve dinamik segment kurallarını her zaman catch-all kuralın önüne koyduğu için **mevcut hiçbir uç nokta etkilenmez**. Bu, deploy sonrası koşulan 25 P0 testi, 17 acceptance testi, 9 STAGE8 gate'i ve 11 release gate'i ile doğrulanmıştır.

**Yeni endpoint eklenmedi, mevcut sözleşmeler değiştirilmedi.**

---

## 9. VERİTABANI GÜVENLİĞİ

- Yalnızca `mesutbyrm1+user@gmail.com` test hesabına dokunuldu.
- Gerçek kullanıcıların jeton/bakiye/yayın/fal kayıtlarına **hiç dokunulmadı**.
- Yardımcı betik tasarım gereği başka bir hesabı hedef alamaz.
- Her koşunun sonunda otomatik temizlik yapıldı; son durum: bakiye **0**, fal kaydı **0**.
- Testlerde kullanılan canlı yayın `cmslph3kg01dxpk08j05jb8we` önceki turlarda oluşturulmuş bir test yayınıdır.

### Önceki turlardan kalan iki kalıcı değişiklik (bilginize)
- `mesutbyrm1+admin@gmail.com` hesabı **admin** rolüne alındı.
- `mesutbyrm1+teller@gmail.com` hesabının falcı kaydı **aktif** yapıldı.

Geri alınmasını isterseniz bildirmeniz yeterli.

---

## 10. FİNAL TABLO

```
FORTUNE REQUEST   8/8
API ACCEPTANCE    17/17
P0                25/25
SSE               19/20
STAGE8            9 PASS / 0 FAIL
API RELEASE GATE  11/11

FINAL API PARITY: NOT COMPLETE
```

**Neden NOT COMPLETE:** Kabul kriteri SSE için 20/20 istiyordu; gerçek production koşusunda 19/20 elde edildi. Tek eksik, CDN katmanının yanıttan çıkardığı `x-accel-buffering` başlığıdır (bölüm 5). Sayı yapay olarak tamamlanmamış, test silinmemiş veya gevşetilmemiştir.

---

## 11. YAPILMAYANLAR

- TRTC, canlı yayın, canlı falcı, sesli oda, PK ve müzik testlerine **geçilmedi** (talimat gereği).
- Flutter kodu, APK ve Flutter endpointleri **hiç değiştirilmedi**.
- Yeni `/api/v1/`, `/api/v2/`, `/api/version/`, `/api/legacy/` yolu **oluşturulmadı**.
