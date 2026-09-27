# CanliFal Backend Dokumantasyonu — Dizin

> Uretim tarihi: **2026-09-27** · Kaynak: **canli backend kaynak kodu** (`nextjs_space/app/api/**`, `lib/**`, `prisma/schema.prisma`)
> Kapsam: **717 route dosyasi / 1084 metot-uc**, 270 veri modeli, 7 SSE akisi, 113 hata kodu.

## Bu set nedir?

Bu dizindeki 20 dosya, **canli backend kaynagindan otomatik cikarilmis** tek kaynak
dokumantasyondur. Flutter gelistiricisinin tek bakmasi gereken referans budur.

**Onemli:** Bu depoda zaten **215 dosya** (76 Markdown) eski dokuman var. Hicbiri silinmedi.
Bu set onlari **degistirmez, birlestirir**: celiski oldugunda **canli kaynaktan uretilen bu
dosyalar esas alinir**, eski dosyalar tarihsel/urun baglami icin korunur.

## Yeni dosyalar

| Dosya | Icerik |
|---|---|
| [`docs/BACKEND_ARCHITECTURE.md`](./BACKEND_ARCHITECTURE.md) | Katman yapisi, ortak kutuphaneler, surumleme |
| [`docs/API_REFERENCE.md`](./API_REFERENCE.md) | 16 cekirdek grup icin uc uc detay (124 KB) |
| [`docs/ENDPOINT_INVENTORY.md`](./ENDPOINT_INVENTORY.md) | 717 route / 1084 metot-uc tam envanter |
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
| `docs/ENDPOINT_INVENTORY.md` | API_INVENTORY.md / API_REGISTRY.md | Eski envanterler kismi; bu dosya canli kaynaktan tam sayimdir. |
| `docs/API_REFERENCE.md` | BACKEND_API_REFERENCE.md / CANLIFAL_API.md | Eski referanslar korunur; celiski halinde bu dosya esas alinir. |
| `docs/BACKEND_ARCHITECTURE.md` | CANLIFAL_BACKEND_ARCHITECTURE.md | Mimari anlatimi eski dosyada; sayimlar burada gunceldir. |
| `docs/REALTIME_SSE.md` | CANLIFAL_REALTIME_EVENTS.md / API_PARITY_STAGE13_SSE_FINAL.md / STAGE14_REALTIME_BACKEND_AUDIT.md / STAGE15_REALTIME_E2E_FINAL.md | Olay adlari eski dosyalarda; kalp atisi/yoklama degerleri burada gunceldir. |
| `docs/TRTC_INTEGRATION.md` | CANLIFAL_WEBRTC.md | Yasam dongusu eski dosyada; sdkAppId dogrulamasi burada. |
| `docs/LIVE_ROOMS.md` | CANLIFAL_WEBRTC.md / CANLIFAL_PERMISSIONS.md | Oda yetkileri eski dosyalarda; uc davranisi burada. |
| `docs/SEAT_MANAGEMENT.md` | CANLIFAL_PERMISSIONS.md | Koltuk yetki kurallari eski dosyada. |
| `docs/PK_BATTLE.md` | — (eski depoda ayri PK dosyasi yok) | Bu dosya yeni; acik hata notu icerir. |
| `docs/GIFT_SYSTEM.md` | FAZ1_GIFT_INSIGHTS_MIGRATION.md / B1_13_GIFTS_ROUTING_FIX.md | Is kurallari ve yonlendirme duzeltmeleri eski dosyalarda. |
| `docs/MUSIC_SYSTEM.md` | — (eski depoda ayri muzik dosyasi yok) | Bu dosya yeni. |
| `docs/NOTIFICATIONS.md` | — (eski depoda ayri bildirim dosyasi yok) | Bu dosya yeni. |
| `docs/DATABASE_SCHEMA.md` | CANLIFAL_DATA_MODEL.md / BACKEND_DATABASE_REALITY_AUDIT.md | Model anlatimi eski dosyalarda; 270 model sayimi burada. |
| `docs/ERROR_CODES.md` | CANLIFAL_ERROR_CODES.md | 113 kodun kaynak kodundan cikarilmis tam listesi burada. |
| `docs/AUTHENTICATION.md` | CANLIFAL_PERMISSIONS.md / CANLIFAL_FLUTTER_BACKEND_CONTRACT.md | Rol matrisi eski dosyalarda; token sureleri burada dogrulandi. |
| `docs/PERFORMANCE.md` | CANLIFAL_PERFORMANCE.md / CANLIFAL_LOAD_TEST_PLAN.md | Olcum planlari eski dosyalarda; bu dosya kod tabanli A/B/C siniflandirmadir. |
| `docs/SECURITY.md` | CANLIFAL_SECURITY.md | Eski guvenlik dosyasi korunur; 54 route inceleme listesi burada. |
| `docs/API_TESTING.md` | CANLIFAL_TEST_PLAN.md / CANLIFAL_BACKEND_TEST_PLAN.md / CANLIFAL_LOAD_TEST_PLAN.md | Uretim yazmasiz test yontemi burada. |
| `docs/DEPLOYMENT.md` | CANLIFAL_BACKEND_RELEASE_GATE.md | Surum kapisi eski dosyada. |
| `docs/FLUTTER_INTEGRATION_GUIDE.md` | CANLIFAL_FLUTTER_BACKEND_CONTRACT.md / BACKEND_FLUTTER_PARITY.md / STAGE16_FLUTTER_BACKEND_PARITY.md / CANLIFAL_FLUTTER_DELIVERY_CHECKLIST.md | Eski kilavuzlar silinmedi; bu dosya canli kaynakla dogrulanmis ozettir. |

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
