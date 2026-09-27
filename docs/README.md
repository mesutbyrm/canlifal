# CanliFal Backend Dokumantasyonu — Dizin

> Uretim tarihi: **2026-09-27** · Kaynak: **canli backend kaynak kodu** (`nextjs_space/app/api/**`, `lib/**`, `prisma/schema.prisma`)
> Kapsam: **717 route dosyasi / 1080 metot-uc**, 270 veri modeli, 7 SSE akisi, 113 hata kodu.

## Bu set nedir?

Bu dizindeki 20 dosya, **canli backend kaynagindan otomatik cikarilmis** tek kaynak
dokumantasyondur. Flutter gelistiricisinin tek bakmasi gereken referans budur.

**Onemli:** Bu depoda zaten **262 adet** eski dokuman var. Hicbiri silinmedi.
Bu set onlari **degistirmez, birlestirir**: celiski oldugunda **canli kaynaktan uretilen bu
dosyalar esas alinir**, eski dosyalar tarihsel/urun baglami icin korunur.

## Yeni dosyalar

| Dosya | Icerik |
|---|---|
| [`docs/BACKEND_ARCHITECTURE.md`](./BACKEND_ARCHITECTURE.md) | Katman yapisi, ortak kutuphaneler, surumleme |
| [`docs/API_REFERENCE.md`](./API_REFERENCE.md) | 16 cekirdek grup icin uc uc detay (124 KB) |
| [`docs/ENDPOINT_INVENTORY.md`](./ENDPOINT_INVENTORY.md) | 717 route / 1080 metot-uc tam envanter |
| [`docs/AUTHENTICATION.md`](./AUTHENTICATION.md) | Mobil JWT, web oturumu, RBAC, VIP, imza |
| [`docs/DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) | 270 model ozeti ve uc-model eslesmesi |
| [`docs/ERROR_CODES.md`](./ERROR_CODES.md) | 113 hata kodu |
| [`docs/REALTIME_SSE.md`](./REALTIME_SSE.md) | 7 SSE akisi, olay tipleri, gercek kalp atisi degerleri |
| [`docs/TRTC_INTEGRATION.md`](./TRTC_INTEGRATION.md) | UserSig, webhook, sdkAppId dogrulamasi |
| [`docs/LIVE_ROOMS.md`](./LIVE_ROOMS.md) | Sesli oda yasam dongusu (12 adim), varlik tutarliligi |
| [`docs/SEAT_MANAGEMENT.md`](./SEAT_MANAGEMENT.md) | Koltuk uclari ve proxy yonlendirme |
| [`docs/PK_BATTLE.md`](./PK_BATTLE.md) | 3 PK giris noktasi, zarf farklari, acik hata |
| [`docs/GIFT_SYSTEM.md`](./GIFT_SYSTEM.md) | Hediye katalogu, gonderim, kutu, yan etkiler |
| [`docs/NOTIFICATIONS.md`](./NOTIFICATIONS.md) | Bildirim uclari ve SSE akisi |
| [`docs/MUSIC_SYSTEM.md`](./MUSIC_SYSTEM.md) | Oda muzik ve sarki istegi |
| [`docs/PERFORMANCE.md`](./PERFORMANCE.md) | A/B/C kategorili performans bulgulari |
| [`docs/SECURITY.md`](./SECURITY.md) | Guvenlik incelemesi + 54 route inceleme listesi |
| [`docs/API_TESTING.md`](./API_TESTING.md) | Uretim yazmasi olmadan test yontemi |
| [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md) | Dagitim ve ortam degiskenleri (deger yok) |
| [`docs/FLUTTER_INTEGRATION_GUIDE.md`](./FLUTTER_INTEGRATION_GUIDE.md) | Flutter tarafi entegrasyon kilavuzu |
| [`docs/CHANGELOG.md`](./CHANGELOG.md) | Bu dokumantasyon setinin degisim gunlugu |

Ek olarak:

| Yol | Icerik |
|---|---|
| [`openapi/openapi.yaml`](../openapi/openapi.yaml) | OpenAPI 3.0.3 — 701 yol / 1073 operasyon, **dogrulandi** (`openapi-spec-validator`) |
| [`examples/curl/`](../examples/curl/) | 7 calistirlabilir curl ornegi (yazma ornekleri bilerek kapali) |
| [`examples/flutter/`](../examples/flutter/) | 4 Dart referans dosyasi (api_client, auth, SSE, oda akisi) |

## Eski dokumanlarla eslesme

| Yeni | Ilgili mevcut dokuman(lar) | Not |
|---|---|---|
| `docs/ENDPOINT_INVENTORY.md` | API_ENDPOINT_INVENTORY.md / BACKEND_API_ROUTE_INDEX.md / BACKEND_API_INVENTORY.md | Eski envanterler kismi; bu dosya canli kaynaktan tam sayimdir. |
| `docs/API_REFERENCE.md` | BACKEND_API_REFERENCE.md / FLUTTER_API_REFERENCE.md / CANLIFAL_FLUTTER_API.md | Eski referanslar korunur; celiski halinde bu dosya esas alinir. |
| `docs/REALTIME_SSE.md` | SSE_EVENTS_FLUTTER_PARSED.md / SSE_PAYLOAD_EXAMPLES_FLUTTER.md / VOICE_ROOM_SSE_ANALYSIS.md / GIFT_REALTIME_SSE_VS_SOCKET.md | Yuk ornekleri eski dosyalarda; kalp atisi/yoklama degerleri burada gunceldir. |
| `docs/TRTC_INTEGRATION.md` | RTC_LIFECYCLE.md / RTC_SSE_REPORT.md | Yasam dongusu eski dosyada; sdkAppId dogrulamasi burada. |
| `docs/LIVE_ROOMS.md` | LIVE_VOICE_V2.md / VOICE_ROOM_PROFESSIONAL_AUDIT.md / VOICE_ROOM_SYNC_ANALYSIS.md / LIVE_BROADCAST_ROOM_MODULES.md | Urun gereksinimleri eski dosyalarda; uc davranisi burada. |
| `docs/PK_BATTLE.md` | PK_ENTEGRASYON.md / PK_STATE_MACHINE_FLUTTER.md / PK_SYSTEM_FLUTTER_INTEGRATION.md / PK_LIVE_SYSTEM_ANALYSIS.md | Durum makinesi eski dosyada; zarf farklari ve acik hata burada. |
| `docs/GIFT_SYSTEM.md` | CANLIFAL_HEDIYE_SISTEMI_DOKUMANTASYONU.md / GIFT_PK_MUSIC_V2.md / API_GIFT_PHASE_REPORT.md | Is kurallari eski dosyalarda. |
| `docs/MUSIC_SYSTEM.md` | ROOM_MUSIC_SYSTEM.md / MUSIC_SONG_REQUEST_CONTRACT.md / API_MUSIC_PHASE_REPORT.md | Sozlesme detaylari eski dosyalarda. |
| `docs/SEAT_MANAGEMENT.md` | API_VOICE_SEAT_PHASE_REPORT.md / VOICE_ROOM_FEATURES_ANALYSIS.md | — |
| `docs/NOTIFICATIONS.md` | NOTIFICATIONS_MESSAGES_SETTINGS_V2.md / PSYCHIC_ONESIGNAL_ACTION_BUTTONS.md | Push saglayici detayi eski dosyalarda. |
| `docs/PERFORMANCE.md` | PERFORMANCE_REPORT.md / PERFORMANS_ANALIZI.md / VOICE_CHAT_PERF_REPORT.md / HOME_SHORTS_PERF_REPORT.md | Olcum gecmisi eski dosyalarda; bu dosya kod tabanli siniflandirmadir. |
| `docs/SECURITY.md` | FAZ11_SECURITY_STATUS.md | Eski durum raporu korunur. |
| `docs/DEPLOYMENT.md` | CANLIFAL_COM_KURULUM.md / DEPLOY_PARITY_INDEX.md / RELEASE_CHECKLIST.md | — |
| `docs/AUTHENTICATION.md` | GOOGLE_SIGNIN_SETUP_TR.md / GOOGLE_SIGNIN_FIX_SHA1_TR.md | Google tarafi eski dosyalarda. |
| `docs/FLUTTER_INTEGRATION_GUIDE.md` | FLUTTER_ENTegrasyon_KILAVUZU.md / CANLIFAL_FLUTTER_RESMI_SERVIS_ENTEGRASYONU.md / FLUTTER_API_DOKUMANTASYONU.md | Eski kilavuzlar silinmedi; bu dosya canli kaynakla dogrulanmis ozettir. |
| `docs/DATABASE_SCHEMA.md` | VERI_MODELI_UYUM_RAPORU.md | — |
| `docs/API_TESTING.md` | ACCEPTANCE_TESTS.md / P0_SMOKE_ACCEPTANCE.md / PHASE_TEST_REPORT.md | — |

## Durum etiketleri

Her ucun/iddianin yaninda su etiketlerden biri bulunur:

| Etiket | Anlam |
|---|---|
| **DOGRULANDI** | Canli sistemde veya ortam degeriyle bizzat teyit edildi |
| **KODDAN TESPIT EDILDI** | Kaynak kodda okundu, calisma zamaninda test edilmedi |
| **EKSIK** | Beklenen davranis kodda bulunamadi |
| **ESKI** | GitHub kopyasinda var, canli kaynakta yok/degismis |
| **ERISIM BEKLIYOR** | Dogrulama icin erisim/izin gerekiyor |

**Durustluk notu:** Bu turda **canli uca uctan uca HTTP testi CALISTIRILMADI**.
Bu nedenle uclarin buyuk cogunlugu **KODDAN TESPIT EDILDI** etiketlidir.
**DOGRULANDI** etiketi yalnizca su uc konuda kullanilmistir:
TRTC `sdkAppId` degeri, token omurleri (7g/30g), SSE kalp atisi/yoklama araliklari.

## GitHub kopyasi hakkinda

- `main` dali **bos** (yalnizca 31 baytlik README).
- Gercek kaynak `full-source` dalindadir ve **canli sunucudan eskidir**.
- Bu nedenle tum analiz **canli kaynak agacindan** yapilmistir, GitHub kopyasindan degil.
