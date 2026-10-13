# FAZ 24 RAPORU — FLUTTER ENTEGRASYON SÖZLEŞMESİ (§82)

Tarih: 2026-08-27 · Checkpoint: `Phase 24: Flutter backend contract doc`

---

## Kapsam

Ana mimari belgesinin **82. bölümü** (FLUTTER INTEGRATION CONTRACT) uygulandı. Belge, Flutter ekibinin backend ile konuşurken uyması gereken tüm kuralları 28 zorunlu başlık altında tanımlar.

**Bu faz salt dokümantasyondur — hiçbir uygulama kodu değiştirilmemiştir.** Regresyon riski yoktur.

---

## Üretilen dosya

`docs/CANLIFAL_FLUTTER_BACKEND_CONTRACT.md` (+ `.pdf` / `.docx`) — ~960 satır, 28 bölüm eksiksiz.

| # | Başlık | İçerik özeti |
|---|---|---|
| 1 | Base URL | Üretim adresi, `/api` ↔ `/api/v1` eşdeğerliği, zorunlu başlıklar |
| 2 | Authentication | 12 kimlik ucu, JWT Bearer, çift kimlik (başlık/oturum) |
| 3 | Token lifecycle | 7g access / 30g refresh, yenileme akışı, mutex kuralı |
| 4 | API endpoints | 16 uç grubu + tam liste referansları |
| 5 | Request examples | 4 gerçek istek örneği |
| 6 | Response examples | Zarf + legacy format, tek ayrıştırıcı Dart kodu |
| 7 | Error codes | 111 kodun HTTP eşleşmesi, `code` üzerinden dallanma kuralı |
| 8 | WebSocket URL | **WebSocket yok** — SSE mimarisi, 7 akış ucu |
| 9 | WebSocket auth | Bearer ile SSE, Dart örneği, 401/403/404 davranışı |
| 10 | Event types | 9 oda olay türü + 15 `room_event` alt türü + diğer akışlar |
| 11 | Event payloads | 12 gerçek JSON yükü |
| 12 | Event ordering | `ts` sıralaması, 2sn yoklama, akışlar arası garanti yok |
| 13 | Reconnect | Üstel geri çekilme + jitter, `Last-Event-ID`, 2dk/200 olay tamponu |
| 14 | Resync | 4 tetikleyici, ekran başına resync ucu tablosu |
| 15 | Deep links | `canlifal://` şeması, 14 tip × web eşleşmesi, resolve ucu |
| 16 | Feature flags | `/config` (harita) ve `/bootstrap` (dizi) farkı — canlı doğrulanmış |
| 17 | Remote config | Gruplu harita vs ham dizi, gerçek anahtar örnekleri |
| 18 | Image/CDN | İmzalı URL kuralı, önbellekleme, yer tutucu zorunluluğu |
| 19 | Pagination | Ofset vs imleç, 12 imleç destekli uç |
| 20 | Rate limits | 18 kapsamın limit tablosu, 429 başlıkları |
| 21 | Upload rules | İki adımlı imzalı yükleme, tip/başlık kuralları |
| 22 | Room bootstrap | 6 adımlı oda giriş sırası, koltuk 409 davranışı |
| 23 | Live bootstrap | İzleyici + yayıncı akışları, RTC telemetri kuralı |
| 24 | PK flow | Davet→kabul→skor→bitiş, 3 bağlam, saat senkronizasyonu |
| 25 | Gift flow | Katalog→bakiye→gönder→SSE, 7 idempotent uç |
| 26 | Wallet flow | 7 uç, bakiye tek gerçek kaynağı kuralı |
| 27 | Notification flow | Push + SSE, tekilleştirme pencereleri, deep link |
| 28 | Device/session flow | Cihaz kimliği, doğrulama, oturum yaşam döngüsü |

Ek olarak **13 maddelik Flutter istemci kontrol listesi** ve sürüm geçmişi tablosu.

---

## Canlı doğrulama

Belgedeki yanıt şekilleri tahmin değil, **çalışan sistemden ölçüldü**:

| Kontrol | Sonuç |
|---|---|
| `GET /api/v1/health` | 200 · `{status:"ok", dbLatencyMs:33}` |
| `GET /api/v1/config?platform=ios` | 200 · `featureFlags`=harita, `featureFlagsDetailed`=dizi, `remoteConfig`=gruplu harita |
| `GET /api/v1/bootstrap?platform=android` | 200 · `featureFlags`=**dizi**, `remoteConfigs`=**dizi**, `platformSettings`, `user` |
| `GET /api/v1/deeplink/resolve?url=canlifal://teller/abc` | 200 · `{type,value,web,app}` |
| `GET /api/v1/gifts/version` | 200 · `{giftVersion:14, themeVersion:2}` |
| `POST /api/v1/auth/mobile-login` | 200 · `accessToken` **kökte** (zarf içinde değil) |
| `GET /api/v1/chat/rooms/{id}/state` | 200 · zarflı, `dj`/`music`/`room`/koltuklar |
| `GET /api/v1/chat/rooms/{id}/stream` (SSE, Bearer) | Akış açıldı · `connected` → `dj` çerçeveleri alındı |

Bu ölçümler sonucunda **iki önemli düzeltme** yapıldı:
1. `/config` ile `/bootstrap` **farklı şekiller döndürüyor** (harita vs dizi) — belgede açıkça uyarı olarak işlendi.
2. Bildirim okundu işaretleme `PATCH` değil **`POST`**; yükleme yanıtı `signedHeaders` değil **`publicUrl`** döndürüyor.

---

## Doğrulama durumu

| Kontrol | Durum |
|---|---|
| Tip kontrolü (`tsc`) | ✅ |
| Üretim derlemesi | ✅ |
| Geliştirme sunucusu | ✅ |
| Canlı uç doğrulaması (8 uç + SSE) | ✅ |
| Kod değişikliği | Yok (salt dokümantasyon) |
| Tarayıcı UI testi | ❌ yapılmadı |
| Yayına alma (deploy) | ❌ yapılmadı |

---

## Envanter (değişmedi)

780 handler · 502 path · 172 kategori · 215 model · 111 hata kodu · 12 imleç destekli uç · 11 idempotent uç · 52 transaction
