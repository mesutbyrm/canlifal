# TEK BACKEND MIGRATION AUDIT

> **Faz:** B1.14 — SALT ANALİZ / RAPOR
> **Tarih:** 2026-08-11
> **Yöntem:** Flutter kaynak okuma (HEAD `bdebe27`) + ana backend kaynak okuma + canlı HTTP probe (GET/POST, iki host)
> **Bu denetimde HİÇBİR kod, route, şema, MCP tanımı veya deployment değiştirilmedi.**
> Deploy YOK · push YOK · imzalama YOK · endpoint silme YOK.

---

## 0. Yönetici Özeti

| Ölçüm | Değer |
|---|---|
| Backend sayısı | **2** (ana: `canlifal.com`, ikinci: `canlifalapi.abacusai.app`) |
| Ortak veritabanı | **EVET** — aynı DB, paylaşılan birincil anahtarlarla kanıtlı (B0 denetimi) |
| Ortak şema tanımı | **HAYIR** — aynı DB'ye iki ayrı şema bakıyor (196 model vs 36 model) |
| Flutter endpoint sabiti (toplam) | **434** |
| Bunlardan ikinci backend'e yönlenen | **37** (+ 13 yanlış yönlenen insights/missions = gerçek bağımlılık **50**) |
| Flutter'daki split routing kuralı | **5 aile** (`pk`, `gifts/battles+goals`, `membership/`, `live/pk/active`+`live/guest/`, `games/rooms`+`auto-match`) |
| Bunlardan **ÖLÜ** (hiçbir Flutter sabiti eşleşmiyor) | **1** — `_isMembershipBackendPath` |
| Çalışma zamanında kullanılan MCP | **0** |
| **Veri taşıma (data migration) gereksinimi** | **YOK** — aynı DB. Gereken şey **kod/route tekilleştirme**. |
| Tek backend için tek gerçek engel | **Redis + Socket.IO** yalnızca ikinci backend'de var |

### Önemli dürüstlük notu
B1.13'te yapılan geçici routing düzeltmesi **yalnızca geçici çalışma alanında** uygulandı,
Flutter deposuna **push edilmedi** ve VM yeniden başladığında geçici dizinle birlikte kayboldu.
Bu rapordaki “şu anki durum” sütunları deponun **gerçek HEAD hali** (`bdebe27`) esas alınarak
çıkarılmıştır. Yani `insights` + `missions` uçları **şu an hâlâ ana backend'e gidiyor ve 404 alıyor.**

---

## 1. Mevcut Split Routing Yapısının Tam Envanteri

### 1.1 Karar merkezleri (host seçimi nerede yapılıyor)

| # | Dosya | Rol |
|---|---|---|
| 1 | `lib/core/config/env.dart` | İki base URL tanımı + `useSplitGamesApi` bayrağı |
| 2 | `lib/core/network/api_backend_kind.dart` | `enum ApiBackendKind { main, game, gateway }` |
| 3 | `lib/core/network/api_backend_router.dart` | **Ana karar noktası** — 5 split kuralı + `baseUrlFor()` |
| 4 | `lib/core/network/backend_routing_interceptor.dart` | Her istekte `resolve()` çağırıp `options.baseUrl` set eder |
| 5 | `lib/core/network/gateway_fallback_interceptor.dart` | 502/503/504'te tek seferlik geçiş (varsayılan **kapalı**) |
| 6 | `lib/core/network/dio_provider.dart` | Dio kurulumu, `baseUrl: Env.apiBaseUrl` |
| 7 | `lib/core/network/api.dart` | Dio kurulumu, `baseUrl: Env.apiBaseUrl` |
| 8 | `lib/core/network/api_monitor.dart` | Hangi backend'e gittiğini etiketler |
| 9 | `lib/core/network/api_monitor_interceptor.dart` | Aynı |
| 10 | `lib/features/debug/presentation/api_monitor_page.dart` | Debug ekranında backend etiketi |
| 11 | `lib/features/live/data/pk/pk_match_sse_service.dart` | ⚠️ **Router'ı BYPASS eder** — doğrudan `Env.gamesApiBaseUrl` |
| 12 | `lib/features/live/data/services/live_namespace_socket_service.dart` | ⚠️ **Router'ı BYPASS eder** — doğrudan `Env.gamesApiBaseUrl` (Socket.IO) |
| 13 | `test/core/network/api_backend_router_test.dart` | Routing testleri |

**Kritik:** 11 ve 12 numaralı dosyalar HTTP router'ını kullanmaz. SSE ve WebSocket
bağlantıları doğrudan ikinci backend'e açılır. Tek backend'e geçişte bunların da
düzeltilmesi şarttır; yalnızca router'ı değiştirmek yetmez.

### 1.2 Base URL / environment değişkenleri

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `API_BASE_URL` | `https://canlifal.com` | Ana backend |
| `GAMES_API_BASE_URL` | `https://canlifalapi.abacusai.app` | **İkinci backend** |
| `WEB_ORIGIN` | `https://canlifal.com` | Statik varlıklar (API değil) |
| `GATEWAY_API_BASE_URL` | *(boş)* | Acil yedek — boş olduğu için **devre dışı** |

```dart
static bool get useSplitGamesApi {
  ... return games.isNotEmpty && games != main;   // games == main ise SPLIT KAPANIR
}
```
**Bu çok önemli bir kaldıraçtır:** `GAMES_API_BASE_URL` değeri `API_BASE_URL` ile aynı
yapılırsa (`--dart-define=GAMES_API_BASE_URL=https://canlifal.com`), router hâlâ çalışır
ama `baseUrlFor(game) == baseUrlFor(main)` olur ve **tüm trafik tek host'a düşer**.
Yani geçiş için “aniden büyük kod silme” gerekmez; önce backend paritesi sağlanır,
sonra tek `--dart-define` ile anahtar çevrilir, en son ölü kod temizlenir.

### 1.3 5 split kuralı — tek tek durum

| # | Kural (fonksiyon) | Eşleşen path | Flutter'da eşleşen sabit sayısı | Durum |
|---|---|---|:--:|---|
| 1 | `_isPkBackendPath` | `/api/pk*` | 32 | Aktıf |
| 2 | `_isGiftBattleBackendPath` | `/api/gifts/battles*`, `/api/gifts/goals*` | 3 | Aktıf (eksik — B1.13 konusu) |
| 3 | `_isMembershipBackendPath` | `/api/membership/` | **0** | 🔴 **ÖLÜ KOD** |
| 4 | `_isLiveGamesBackendPath` | `/api/live/pk/active`, `/api/live/guest/` | 2 | Aktıf |
| 5 | `_isGameBackendPath` | `/api/games/rooms`, `/api/games/auto-match` | 2 | Aktıf |

**#3 bulgusu:** Flutter'da `/api/membership/` (tekil + eğik çizgi) ile başlayan **hiçbir**
endpoint sabiti yok. Flutter çoğul `/api/memberships*` ve `/api/membership-badges`
kullanıyor — bunlar zaten ana backend'de (200). Kural yalnızca router dosyasının
kendi içinde geçiyor. **Hiçbir davranışı etkilemeden silinebilir.**

---

## 2. Soru-Cevap (12 madde)

### 1) Her endpoint şu anda hangi backend'e gidiyor?
→ Bölüm 9'daki ana tabloda “ŞU ANKİ BACKEND” sütunu. Özet: 9 hediye ucu MAIN'e,
3 hediye ucu (battles/goals) SECOND'a, **13 hediye ucu (insights+missions) yanlışlıkla MAIN'e**.

### 2) Endpoint hangi backend'de gerçekten mevcut?
Canlı probe ile kanıtlandı (Bölüm 3). Özet: hediye ailesi **kesin ikiye bölünmüş** —
katalog/gönderim MAIN'de, sosyal/oyunlaştırma katmanı (battles, goals, insights, missions)
SECOND'da. **Hiçbir hediye ucu iki backend'de birden yok.**

### 3) Aynı işlevi yapan duplicate endpoint var mı?
**EVET, 3 türde:**

**(a) Aynı iş, iki farklı path (ana backend içinde):**
| Path A | Path B | Durum |
|---|---|---|
| `/api/gifts/types` | `/api/live/gift-types` | İkisi de MAIN'de, ikisi de hediye tipi listesi |
| `/api/gifts/types` | `/api/video-streams/gifts` | İkisi de MAIN'de, video bağlamı için aynı liste |
| `/api/gifts/send` | `/api/live/gift/send` | İkisi de MAIN'de; **Flutter yalnızca `/api/live/gift/send` kullanıyor** |

**(b) Aynı path, iki backend'de birden (gerçek çift API katmanı):**
| Path | MAIN | SECOND |
|---|:--:|:--:|
| `/api/games` | 200 | 200 |
| `/api/chat/rooms` | 200 | 200 |
| `/api/video-streams` | 200 | 200 |
| `/api/payments/methods` | 200 | 200 |
| `/api/trtc/usersig` | 405/400 | 404/401 |

**(c) Flutter'da aynı değere sahip çift sabit:**
`membershipPurchase` = `membershipsPurchase` · `feedPosts` = `socialPosts` ·
`paymentRequests` = `paymentRequestsCancel` · `adminCfcPaymentPatch` = `adminCfcPaymentRequests`

### 4) Hangi endpointler eski/kullanılmıyor?
| Endpoint / sabit | Kanıt | Değerlendirme |
|---|---|---|
| `ApiEndpoints.giftsSend` (`/api/gifts/send`) | Flutter'da **0 kullanım** | Ölü sabit (backend ucu web tarafında kullanılıyor, kalır) |
| `/api/pk/battles` | MAIN 404 + SECOND 404 | Ölü — iki backend'de de yok |
| `/api/pk/history` | MAIN 404 + SECOND 404 | Ölü — iki backend'de de yok |
| `/api/pk/invitations` | MAIN 404 + SECOND 404 | Ölü |
| `/api/gifts/battles/{id}` | SECOD 404 (örnek id ile) | ⚠️ **KANITLANAMADI** — geçerli id gerekiyor olabilir |
| `_isMembershipBackendPath` kuralı | 0 eşleşen sabit | Ölü kod |
| `GatewayFallbackInterceptor` | `GATEWAY_API_BASE_URL` boş | Devre dışı (kod duruyor) |

### 5) Hangi endpointler Flutter tarafından gerçekten çağrılıyor?
25 hediye sabitinin **24'ü** aktif kullanılıyor; yalnızca `giftsSend` kullanılmıyor.
Tüm insights (10) + missions (3) + battles/goals (3) sabitleri aktif çağrılıyor —
**yani P0 hatası canlı kullanıcıyı etkiliyor.**
Gerçek çağıran dosya: `lib/features/gifts/data/gift_insights_remote_datasource.dart`.

### 6) Hangi endpointler web tarafından kullanılıyor?
| Endpoint | Web dosya sayısı |
|---|:--:|
| `/api/gifts/types` | 3 |
| `/api/gifts/send` | 1 |
| `/api/gifts/lucky/history` | 1 |
| `/api/gifts/recent-big` | 1 |
| `/api/video-streams/gifts` | 1 |
| `battles` / `goals` / `insights` / `missions` | **0** |
| `version` / `catalog` / `lucky/config` / `lucky/send` / `check-reciprocal` | **0** (yalnız mobil) |

**Sonuç:** İkinci backend'deki hediye özelliklerinin **tamamı mobil-özeldir.** Web hiç kullanmıyor.
Bu, taşıma riskini düşürür: taşıma sırasında web etkilenmez.

### 7) Hangi endpointlerin taşınması gerekiyor?
SECOND'da olup MAIN'de olmayan ve Flutter'ın çağırdığı **50 uç**:
- Hediye: 13 (10 insights + 3 missions) + 3 (battles, battles/{id}, goals) = **16**
- PK: **32**
- Canlı: `/api/live/pk/active`, `/api/live/guest/list` = **2**
- Oyun odası: `/api/games/rooms`, `/api/games/auto-match` = **2**

### 8) İkinci backend'in hangi özellikleri ana backend'e alınmalı?
| Özellik | Zorluk | Gerekçe |
|---|---|---|
| Hediye insights (10 uç) | 🟢 **DÜŞÜK** | Salt-okunur REST, aynı DB, Redis gerekmez |
| Hediye missions (3 uç) | 🟢 **DÜŞÜK** | Basit CRUD + claim, aynı DB |
| Hediye battles + goals (3 uç) | 🟡 **ORTA** | Sayım/skor durumu — eşzamanlılık yönetimi gerek |
| PK REST uçları (stats, me/*, admin) | 🟡 **ORTA** | REST kısmı taşınabilir |
| PK canlı skor + SSE (`/{id}/stream`, `/{id}/events`) | 🔴 **YÜKSEK** | Paylaşılan durum → **Redis şart** |
| Oyun odaları (`/api/games/rooms`, `auto-match`) | 🔴 **YÜKSEK** | Redis + Socket.IO ile oda durumu |
| `live/guest/list`, `live/pk/active` | 🟡 **ORTA** | Gerçek zamanlı liste — paylaşılan durum |
| Socket.IO namespace | 🔴 **YÜKSEK** | Ana backend'de Socket.IO katmanı yok |

**🚨 KRİTİK ENGEL:** Ana backend **Redis kullanmıyor** — `lib/cache.ts` içinde süreç-içi
(in-memory) TTL cache var. İkinci backend Redis + Socket.IO kullanıyor.
Gerçek zamanlı özellikler (oyun odası, PK canlı skor, misafir listesi) **paylaşılan durum
katmanı olmadan** ana backend'e taşınamaz — çok örnekli dağıtımda oda durumu bozulur.
Bu, tek backend hedefinin **tek gerçek teknik ön koşuludur.**

### 9) Taşıma sonrasında hangi endpointler tamamen silinebilir?
| Silinecek | Nerede | Koşul |
|---|---|---|
| İkinci backend'in **tüm** `/api/*` yüzeyi | SECOND | Parite sağlandıktan + trafik kesildikten sonra |
| `_isMembershipBackendPath` | Flutter router | Şimdi bile silinebilir (ölü kod) |
| `_isPkBackendPath`, `_isGiftBattleBackendPath`, `_isLiveGamesBackendPath`, `_isGameBackendPath` | Flutter router | Taşıma tamamlanınca |
| `ApiBackendKind.game` + `ApiBackendKind.gateway` | Flutter | Taşıma tamamlanınca |
| `Env.gamesApiBaseUrl`, `Env.gatewayApiBaseUrl`, `Env.useSplitGamesApi` | Flutter env | Taşıma tamamlanınca |
| `BackendRoutingInterceptor`, `GatewayFallbackInterceptor` | Flutter | Taşıma tamamlanınca |
| `ApiEndpoints.giftsSend` (ölü sabit) | Flutter | Şimdi bile silinebilir |
| `/api/pk/battles`, `/api/pk/history`, `/api/pk/invitations` sabitleri | Flutter | Zaten iki tarafta da 404 |
| Duplicate sabitler (4 çift) | Flutter | Her an |

⚠️ **Ana backend'deki `/api/gifts/*` uçlarının HİÇBİRİ silinmemeli** — hepsi ya web ya mobil tarafından kullanılıyor.

### 10) MCP'lerin hangileri gerçekten gerekli?
| MCP | Durum | Karar |
|---|---|---|
| `canlifal-backend` (`mcp-server/index.mjs`) | Yalnızca editör (Cursor) için; çalışma zamanında **0** kullanım; `/workspace/...` mutlak yolu bu ortamda geçersiz | **Üretim için GEREKSİZ.** Geliştirici aracı olarak tutulabilir, ancak tek-backend geçişinde bir rolü yok |

**Ana backend içinde MCP sunucusu: 0 · Flutter içinde MCP istemcisi: 0 · Üretimde kullanılan MCP: 0.**
Yani tek backend geçişi MCP tarafından **hiç engellenmiyor** ve MCP için taşıma işi yok.

### 11) Flutter'daki hangi router/service dosyaları sadeleştirilmeli?
Bölüm 1.1'deki 13 dosya. Öncelik sırası Bölüm 10'da.

### 12) Tek backend'e geçildiğinde kullanılacak TEK BASE URL nedir?
### ✅ `https://canlifal.com`
Gerekçe: (a) 434 Flutter sabitinin **384'ü** zaten burada, (b) web sitesi + statik varlıklar
(`WEB_ORIGIN`) zaten burada, (c) auth/oturum, cüzdan, ödeme, mesajlaşma, sosyal, TRTC imzası,
bildirim SSE burada, (d) Apple OAuth callback zaten `https://canlifal.com/api/auth/callback/apple`
olarak sabitlenmiş, (e) 196 modelli otoritatif şema bu tarafta.

---

## 3. Canlı Probe Kanıtları (2026-08-11)

`M-G`/`M-P` = MAIN GET/POST · `S-G`/`S-P` = SECOND GET/POST

### 3.1 Hediye ailesi — tam
```
ENDPOINT                                       M-G  M-P  | S-G  S-P
/api/gifts/version                             200  405  | 404  404
/api/gifts/catalog                             401  405  | 404  404
/api/gifts/types                               200  405  | 404  404
/api/gifts/send                                405  401  | 404  404
/api/gifts/lucky/config                        200  405  | 404  404
/api/gifts/lucky/send                          405  401  | 404  404
/api/gifts/lucky/history                       401  405  | 404  404
/api/gifts/recent-big                          200  405  | 404  404
/api/gifts/check-reciprocal                    405  200  | 404  404
/api/gifts/battles                             404  404  | 200  401
/api/gifts/battles/b1                          404  404  | 404  404
/api/gifts/goals                               404  404  | 200  401
/api/gifts/insights/feed                       404  404  | 200  404
/api/gifts/insights/leaderboard                404  404  | 200  404
/api/gifts/insights/map                        404  404  | 200  404
/api/gifts/insights/album/u1                   404  404  | 200  404
/api/gifts/insights/badge/u1                   404  404  | 200  404
/api/gifts/insights/collection/u1              404  404  | 200  404
/api/gifts/insights/first-gifter/live/u1       404  404  | 200  404
/api/gifts/insights/me/badge                   404  404  | 401  404
/api/gifts/insights/me/history                 404  404  | 401  404
/api/gifts/insights/me/recommendations         404  404  | 401  404
/api/gifts/missions                            404  404  | 200  404
/api/gifts/missions/me                         404  404  | 401  404
/api/gifts/missions/m1/claim                   404  404  | 404  401
```

### 3.2 Diğer split aileleri + duplicate kontrolü
```
/api/pk/active                                 404  404  | 200  404
/api/pk/leaderboard                            404  404  | 200  404
/api/pk/stats/u1                               404  404  | 200  404
/api/pk/me/stats                               404  404  | 401  404
/api/pk/p1/stream                              404  404  | 200  404
/api/pk/p1/events                              404  404  | 200  401
/api/pk/battles                                404  404  | 404  404   <- ÖLÜ
/api/pk/history                                404  404  | 404  404   <- ÖLÜ
/api/pk/invitations                            404  404  | 404  404   <- ÖLÜ
/api/membership/plans                          404  404  | 200  404   <- Flutter kullanmıyor
/api/memberships                               200  405  | 404  404
/api/membership-badges                         200  405  | 404  404
/api/live/pk/active                            404  404  | 200  404
/api/live/guest/list                           404  404  | 200  404
/api/live/pk                                   400  401  | 404  404
/api/games/rooms                               404  404  | 200  401
/api/games/auto-match                          404  404  | 404  401
/api/games/room                                200  401  | 404  404
/api/games/play                                405  401  | 404  401
/api/games                                     200  405  | 200  404   <- DUPLICATE
/api/chat/rooms                                200  405  | 200  404   <- DUPLICATE
/api/video-streams                             200  401  | 200  401   <- DUPLICATE
/api/payments/methods                          200  405  | 200  401   <- DUPLICATE
/api/me                                        401  405  | 404  404
/api/auth/mobile-login                         405  400  | 404  400
/api/social/posts                              200  401  | 404  404
/api/wallet                                    401  405  | 404  404
/api/messages                                  401  405  | 404  404
/api/trtc/usersig                              405  400  | 404  401
/api/notifications/stream                      401  405  | 404  404
```

---

## 4. Özellik Bazında Hedef Backend Kararı

| Özellik | Şu an | **HEDEF** | Not |
|---|---|---|---|
| Auth / oturum / mobil JWT | MAIN | **MAIN** | Değişmez |
| Kullanıcı / profil / cüzdan / jeton | MAIN | **MAIN** | Değişmez |
| Sosyal / kısa video / hikâye / mesaj | MAIN | **MAIN** | Değişmez |
| Ödeme | MAIN | **MAIN** | SECOND'daki duplicate kapatılır |
| Hediye katalog / gönderim / lucky | MAIN | **MAIN** | Değişmez |
| **Hediye insights (10)** | SECOND *(hatalı şekilde MAIN'e yönleniyor)* | **MAIN** | 🟢 İlk taşınacak dalga |
| **Hediye missions (3)** | SECOND *(hatalı şekilde MAIN'e yönleniyor)* | **MAIN** | 🟢 İlk taşınacak dalga |
| **Hediye battles + goals** | SECOND | **MAIN** | 🟡 İkinci dalga |
| Sesli oda (voice room) | MAIN | **MAIN** | Değişmez |
| Sesli oda PK (`/api/chat/rooms/{id}/pk`) | MAIN | **MAIN** | Değişmez (B1.5'te kanıtlandı) |
| **Birleşik PK REST (32 uç)** | SECOND | **MAIN** | 🟡 Üçüncü dalga |
| **PK canlı skor / SSE** | SECOND | **MAIN** | 🔴 Redis şart |
| Canlı yayın (video-streams) | MAIN | **MAIN** | SECOND'daki duplicate kapatılır |
| **Canlı misafir listesi** | SECOND | **MAIN** | 🟡 Paylaşılan durum gerek |
| Oyun kataloğu / room / play | MAIN | **MAIN** | Değişmez |
| **Oyun odası listeleme + auto-match** | SECOND | **MAIN** | 🔴 Redis + Socket.IO şart |
| **Socket.IO namespace** | SECOND | **MAIN** | 🔴 En son taşınır |
| TRTC imza | MAIN | **MAIN** | Değişmez |
| MCP | dev-only | **kaldırılabilir** | Üretimde rolü yok |

---

## 5. Önerilen Geçiş Planı (uygulanmadı — yalnızca plan)

**Faz 0 — Ön koşullar (kod yok):** Şema tekilleştirme kararı (196-modelli ana şema otoritatif
kabul edilir) + ana backend için paylaşılan durum katmanı (Redis) kararı.

**Faz 1 — 🟢 Düşük riskli hediye dalgası:** insights (10) + missions (3) ana backend'de
uygulanır. Salt-okunur/basit CRUD, aynı DB, Redis gerekmez, **web hiç kullanmıyor**.
Parite kanıtlandıktan sonra router kuralı kaldırılır. B1.13'ün geçici düzeltmesi burada kalıcı çözüme dönüşür.

**Faz 2 — 🟡 battles + goals:** eşzamanlılık yönetimi ile ana backend'e taşınır.

**Faz 3 — 🟡 PK REST:** stats, me/*, admin, leaderboard uçları taşınır. Ölü uçlar (`/api/pk/battles`, `/api/pk/history`, `/api/pk/invitations`) hiç taşınmaz, sabitleri silinir.

**Faz 4 — 🔴 Gerçek zamanlı katman:** Redis kurulduktan sonra oyun odaları, auto-match,
misafir listesi, PK SSE ve Socket.IO taşınır. `pk_match_sse_service.dart` ve
`live_namespace_socket_service.dart` bypass'ları burada düzeltilir.

**Faz 5 — Anahtar çevirme:** `--dart-define=GAMES_API_BASE_URL=https://canlifal.com`.
Tek satırlık, anında geri alınabilir. ⚠️ Ancak Faz 4'ten önce yapılmamalı — SSE/soket bypass'ları bu değişkeni okur ama parite yoksa kırılır.

**Faz 6 — Ölü kod temizliği:** router, interceptor, enum, env değişkenleri silinir.

**Faz 7 — İkinci backend kapatılır.**

---

## 6. Riskler

| # | Risk | Seviye |
|---|---|---|
| 1 | Ana backend'de **Redis yok** — gerçek zamanlı özellikler taşınamaz | 🔴 YÜKSEK |
| 2 | Tek DB'ye **iki ayrı şema/migration geçmişi** bakıyor | 🔴 YÜKSEK |
| 3 | 4 duplicate path iki backend'de birden 200 dönüyor — tutarsız veri riski | 🟡 ORTA |
| 4 | SSE/Socket router'ı bypass ediyor — yalnız router düzeltmek yetmez | 🟡 ORTA |
| 5 | `/api/gifts/battles/{id}` gerçek varlığı kanıtlanamadı (geçerli id yok) | 🟢 DÜŞÜK |
| 6 | İkinci backend kaynağı elimizde yok — iş mantığı yalnızca probe ile çıkarılabiliyor | 🔴 YÜKSEK |

**Risk 6 en kritik olanıdır:** ikinci backend'in kaynak kodu mevcut olmadığı için taşınacak
50 ucun iç iş mantığı (hesaplama kuralları, yan etkiler) **yeniden yazılmak** zorundadır.
Taşımadan önce her ucun gerçek yanıt gövdesi (response schema) kaydedilmelidir.

---

## 7. Bu Denetimde KANITLANAMAYANLAR (dürüstlük notu)

- İkinci backend'in kaynak kodu **okunamadı** — tüm bulgular canlı probe ile sınırlı.
- Kimlik gerektiren uçların **2xx gövdeleri** alınamadı (geçerli token yok) — yalnızca 401 ile varlık kanıtlandı.
- `{id}` gerektiren uçlar (`battles/{id}`, `pk/{id}` türevleri) geçerli kimlik olmadan kesin doğrulanamadı.
- Socket.IO namespace'lerinin tam listesi **çıkarılmadı** (WebSocket el sıkışması denenmedi).
- Ana backend'in Redis'e geçirilmesinin maliyeti/süresi **tahmin edilmedi**.
- Fiziksel cihaz olmadığı için TRTC/kamera/mikrofon uçtan uca testi **YAPILMADI**.

---

## 8. ⚠️ B1.13 Hakkında

B1.13'te yapılan routing düzeltmesi **geçici çözüm** olarak kabul edilmiştir ve talimat
uyarınca kalıcı mimari sayılmamaktadır. Ayrıca değişiklik depoya push edilmediği ve
geçici çalışma alanı temizlendiği için **şu an depoda mevcut değildir** — yani
insights/missions uçları hâlâ hatalı yönlendiriliyor. Kalıcı çözüm Faz 1'dir.

---

## 9. ANA TABLO

> `✓` = evet · `✗` = hayır · `?` = kanıtlanamadı
> “SİLİNECEK Mİ” = tek backend'e geçiş sonrası tamamen kaldırılabilir mi

| ENDPOINT | ŞU ANKİ BACKEND | HEDEF BACKEND | FLUTTER KULLANIYOR MU | WEB KULLANIYOR MU | DUPLICATE MI | SİLİNECEK Mİ | TAŞINACAK MI |
|---|---|---|:--:|:--:|:--:|:--:|:--:|
| `/api/gifts/version` | MAIN | MAIN | ✓ | ✗ | ✗ | ✗ | ✗ |
| `/api/gifts/catalog` | MAIN | MAIN | ✓ | ✗ | ✗ | ✗ | ✗ |
| `/api/gifts/types` | MAIN | MAIN | ✓ | ✓ | ✓ (live/gift-types, video-streams/gifts) | ✗ | ✗ |
| `/api/gifts/send` | MAIN | MAIN | ✗ (sabit ölü) | ✓ | ✓ (live/gift/send) | ✗ (backend kalır; **Flutter sabiti silinir**) | ✗ |
| `/api/gifts/lucky/config` | MAIN | MAIN | ✓ | ✗ | ✗ | ✗ | ✗ |
| `/api/gifts/lucky/send` | MAIN | MAIN | ✓ | ✗ | ✗ | ✗ | ✗ |
| `/api/gifts/lucky/history` | MAIN | MAIN | ✓ | ✓ | ✗ | ✗ | ✗ |
| `/api/gifts/recent-big` | MAIN | MAIN | ✓ | ✓ | ✗ | ✗ | ✗ |
| `/api/gifts/check-reciprocal` | MAIN | MAIN | ✓ | ✗ | ✗ | ✗ | ✗ |
| `/api/gifts/battles` | SECOND | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/gifts/battles/{id}` | SECOND | MAIN | ✓ | ✗ | ✗ | ? | ✓ |
| `/api/gifts/goals` | SECOND | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/gifts/insights/feed` | **MAIN (HATALI)** | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/gifts/insights/leaderboard` | **MAIN (HATALI)** | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/gifts/insights/map` | **MAIN (HATALI)** | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/gifts/insights/album/{id}` | **MAIN (HATALI)** | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/gifts/insights/badge/{id}` | **MAIN (HATALI)** | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/gifts/insights/collection/{id}` | **MAIN (HATALI)** | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/gifts/insights/first-gifter/{ctx}/{id}` | **MAIN (HATALI)** | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/gifts/insights/me/badge` | **MAIN (HATALI)** | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/gifts/insights/me/history` | **MAIN (HATALI)** | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/gifts/insights/me/recommendations` | **MAIN (HATALI)** | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/gifts/missions` | **MAIN (HATALI)** | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/gifts/missions/me` | **MAIN (HATALI)** | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/gifts/missions/{id}/claim` | **MAIN (HATALI)** | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/live/gift-types` | MAIN | MAIN | ✓ | ✗ | ✓ (gifts/types) | ✗ (tekilleştirme adayı) | ✗ |
| `/api/live/gift/send` | MAIN | MAIN | ✓ | ✗ | ✓ (gifts/send) | ✗ | ✗ |
| `/api/video-streams/gifts` | MAIN | MAIN | ✓ | ✓ | ✓ (gifts/types) | ✗ | ✗ |
| `/api/pk/active` | SECOND | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/pk/leaderboard` | SECOND | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/pk/stats/{id}` | SECOND | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/pk/me/stats` · `me/history` · `me/invites` · `me/matches` | SECOND | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/pk/{id}` + türevleri (`/start`,`/end`,`/cancel`,`/respond`,`/seats/*`,`/stream`,`/events`) | SECOND | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ (Redis sonrası) |
| `/api/pk/admin/*` | SECOND | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/pk/request` · `/api/pk/room` | SECOND | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/pk/battles` | **YOK (404/404)** | — | ✓ (sabit var) | ✗ | ✗ | **✓ (ölü sabit)** | ✗ |
| `/api/pk/history` | **YOK (404/404)** | — | ✓ (sabit var) | ✗ | ✗ | **✓ (ölü sabit)** | ✗ |
| `/api/pk/invitations` | **YOK (404/404)** | — | ✓ (sabit var) | ✗ | ✗ | **✓ (ölü sabit)** | ✗ |
| `/api/membership/plans` | SECOND | MAIN | ✗ | ✗ | ✓ (`/api/memberships`) | **✓** | ✗ |
| `/api/membership/purchase` | SECOND | MAIN | ✗ | ✗ | ✓ (`/api/memberships/purchase`) | **✓** | ✗ |
| `/api/memberships` · `/packages` · `/purchase` | MAIN | MAIN | ✓ | ✗ | ✗ | ✗ | ✗ |
| `/api/membership-badges` | MAIN | MAIN | ✓ | ✗ | ✗ | ✗ | ✗ |
| `/api/live/pk/active` | SECOND | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/live/guest/list` | SECOND | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ |
| `/api/live/pk` · `/api/live/pk/score` | MAIN | MAIN | ✓ | ✗ | ✗ | ✗ | ✗ |
| `/api/games/rooms` | SECOND | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ (Redis sonrası) |
| `/api/games/auto-match` | SECOND | MAIN | ✓ | ✗ | ✗ | ✗ | ✓ (Redis sonrası) |
| `/api/games/room` · `/api/games/play` | MAIN | MAIN | ✓ | ✓ | ✗ | ✗ | ✗ |
| `/api/games` | **HER İKİSİ** | MAIN | ✓ | ✓ | **✓** | ✗ (SECOND kopyası kapanır) | ✗ |
| `/api/chat/rooms*` | **HER İKİSİ** | MAIN | ✓ | ✓ | **✓** | ✗ (SECOND kopyası kapanır) | ✗ |
| `/api/video-streams*` | **HER İKİSİ** | MAIN | ✓ | ✓ | **✓** | ✗ (SECOND kopyası kapanır) | ✗ |
| `/api/payments/methods` | **HER İKİSİ** | MAIN | ✓ | ✓ | **✓** | ✗ (SECOND kopyası kapanır) | ✗ |
| `/api/trtc/usersig` | MAIN | MAIN | ✓ | ✓ | kısmen | ✗ | ✗ |
| `/api/me` · `/api/auth/*` · `/api/wallet` · `/api/messages` · `/api/social/*` · `/api/stories` · `/api/short-videos` · `/api/notifications/*` | MAIN | MAIN | ✓ | ✓ | ✗ | ✗ | ✗ |

---

## 10. SONUÇ BÖLÜMLERİ

### 10.1 Flutter'ın bağlanacağı TEK BASE URL
```
https://canlifal.com
```
- `API_BASE_URL = https://canlifal.com`
- `WEB_ORIGIN = https://canlifal.com`
- `GAMES_API_BASE_URL` → **kaldırılır** (geçiş sırasında geçici olarak `https://canlifal.com`)
- `GATEWAY_API_BASE_URL` → **kaldırılır** (zaten boş/devre dışı)

### 10.2 Korunacak endpointler (değişiklik yok)
Ana backend'de zaten çalışan ve hedefte de kalacak olanlar:
- **Hediye:** `/api/gifts/version`, `/catalog`, `/types`, `/send`, `/lucky/config`, `/lucky/send`, `/lucky/history`, `/recent-big`, `/check-reciprocal`
- **Hediye (diğer aile):** `/api/live/gift-types`, `/api/live/gift/send`, `/api/video-streams/gifts`
- **Üyelik:** `/api/memberships`, `/api/memberships/packages`, `/api/memberships/purchase`, `/api/membership-badges`
- **Oyun:** `/api/games`, `/api/games/room`, `/api/games/play`
- **Canlı:** `/api/live/pk`, `/api/live/pk/score`, `/api/video-streams*`
- **Sesli oda:** `/api/chat/rooms*` (PK dahil)
- **Çekirdek:** `/api/me`, `/api/auth/*`, `/api/wallet`, `/api/messages`, `/api/social/*`, `/api/stories`, `/api/short-videos`, `/api/payments/*`, `/api/trtc/usersig`, `/api/notifications/*`

### 10.3 Taşınacak endpointler (SECOND → MAIN) — **50 uç**

**🟢 Dalga 1 — Hediye insights + missions (13) · düşük risk, Redis gerekmez, web etkilenmez**
`/api/gifts/insights/feed` · `/leaderboard` · `/map` · `/album/{id}` · `/badge/{id}` ·
`/collection/{id}` · `/first-gifter/{ctx}/{id}` · `/me/badge` · `/me/history` ·
`/me/recommendations` · `/api/gifts/missions` · `/api/gifts/missions/me` · `/api/gifts/missions/{id}/claim`

**🟡 Dalga 2 — Hediye battles + goals (3)**
`/api/gifts/battles` · `/api/gifts/battles/{id}` · `/api/gifts/goals`

**🟡 Dalga 3 — PK REST (~26)**
`/api/pk/active` · `/leaderboard` · `/stats/{id}` · `/me/stats` · `/me/history` ·
`/me/invites` · `/me/matches` · `/request` · `/room` · `/admin/*` (5) · `/{id}` türevleri (REST kısmı)

**🔴 Dalga 4 — Gerçek zamanlı (8) · Redis + Socket.IO şart**
`/api/pk/{id}/stream` · `/api/pk/{id}/events` · `/api/pk/{id}/seats/*` (3) ·
`/api/live/pk/active` · `/api/live/guest/list` · `/api/games/rooms` · `/api/games/auto-match` · Socket.IO namespace

### 10.4 Silinecek endpointler

**🔴 Backend tarafı (taşıma + trafik kesimi sonrası):**
- İkinci backend'in **tüm** `/api/*` yüzeyi (`canlifalapi.abacusai.app`)
- İkinci backend'in duplicate kopyaları: `/api/games`, `/api/chat/rooms`, `/api/video-streams`, `/api/payments/methods`

**🟢 Flutter tarafı (şimdi bile güvenle silinebilir):**
- `ApiEndpoints.giftsSend` — 0 kullanım (backend ucu web'de kalır)
- `/api/pk/battles`, `/api/pk/history`, `/api/pk/invitations` sabitleri — iki backend'de de 404
- Duplicate sabitler: `membershipsPurchase`, `socialPosts` *(veya `feedPosts`)*, `paymentRequestsCancel`, `adminCfcPaymentPatch`
- `_isMembershipBackendPath` kuralı — 0 eşleşen sabit (ölü kod)

**🟡 Flutter tarafı (taşıma tamamlanınca):**
- `_isPkBackendPath` · `_isGiftBattleBackendPath` · `_isLiveGamesBackendPath` · `_isGameBackendPath`
- `ApiBackendKind.game` · `ApiBackendKind.gateway`
- `Env.gamesApiBaseUrl` · `Env.gatewayApiBaseUrl` · `Env.useSplitGamesApi`

### 10.5 Silinecek MCP'ler
| MCP | Karar | Gerekçe |
|---|---|---|
| `canlifal-backend` (`mcp-server/index.mjs`, 5 araç, 4 kaynak) | **Üretimden kaldırılabilir** | Çalışma zamanında 0 kullanım; yalnız Cursor editörü için; `/workspace/...` yolu bu ortamda geçersiz. İstenirse geliştirici aracı olarak bırakılabilir — tek-backend geçişini **hiç etkilemez** |

**Taşınacak MCP: YOK · Yeni yazılacak MCP: YOK · Flutter'a MCP istemcisi eklenmeyecek.**

### 10.6 Değiştirilecek Flutter dosyaları

| # | Dosya | Yapılacak | Faz |
|---|---|---|:--:|
| 1 | `lib/core/network/api_backend_router.dart` | Faz 1'de insights+missions kuralı; sonunda tüm split kuralları silinir, `resolve()` daima `main` döner → dosya tamamen kaldırılır | 1→6 |
| 2 | `lib/core/config/env.dart` | `gamesApiBaseUrl`, `gatewayApiBaseUrl`, `useSplitGamesApi` kaldırılır | 5→6 |
| 3 | `lib/core/network/api_backend_kind.dart` | `game` + `gateway` değerleri kaldırılır → dosya kaldırılabilir | 6 |
| 4 | `lib/core/network/backend_routing_interceptor.dart` | Tek base URL kalınca gereksiz → kaldırılır | 6 |
| 5 | `lib/core/network/gateway_fallback_interceptor.dart` | Zaten devre dışı → kaldırılır | 6 |
| 6 | **`lib/features/live/data/pk/pk_match_sse_service.dart`** | ⚠️ Router bypass'ı — `Env.gamesApiBaseUrl` → `Env.apiBaseUrl` | **4** |
| 7 | **`lib/features/live/data/services/live_namespace_socket_service.dart`** | ⚠️ Socket.IO bypass'ı — `Env.gamesApiBaseUrl` → `Env.apiBaseUrl` | **4** |
| 8 | `lib/core/network/dio_provider.dart` | Interceptor kayıtları sadeleştirilir | 6 |
| 9 | `lib/core/network/api.dart` | Çift-backend yorumları/kurulumu sadeleştirilir | 6 |
| 10 | `lib/core/network/api_monitor.dart` | Backend etiketleme kaldırılır | 6 |
| 11 | `lib/core/network/api_monitor_interceptor.dart` | Aynı | 6 |
| 12 | `lib/features/debug/presentation/api_monitor_page.dart` | Backend sütunu kaldırılır | 6 |
| 13 | `lib/core/network/api_endpoints.dart` | Ölü + duplicate sabitler temizlenir | 1 / 6 |
| 14 | `test/core/network/api_backend_router_test.dart` | Faz 1'de güncellenir, Faz 6'da kaldırılır | 1→6 |

**Toplam: 14 dosya.** Bunlardan **13'ü** şu an split routing'e bağımlı,
**2'si (6 ve 7)** router'ı tamamen bypass ettiği için en yüksek dikkat gerektiriyor.

---

## DUR

Bu aşama **yalnızca analiz ve rapordur.** Talimat uyarınca:
kod değiştirilmedi · endpoint silinmedi · deploy yapılmadı · Flutter deposuna push yapılmadı ·
imzalama yapılmadı · production değişikliği yapılmadı.

Hangi fazdan başlamamı istediğinizi bekliyorum. Önerim **Faz 1** (hediye insights + missions):
en düşük riskli, Redis gerektirmeyen, web'i hiç etkilemeyen ve şu an canlıda kırık olan P0 özelliği
kalıcı olarak çözen dalga.
