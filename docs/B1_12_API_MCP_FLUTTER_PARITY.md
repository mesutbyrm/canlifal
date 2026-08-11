# B1.12 — API / MCP / FLUTTER TAM ENTEGRASYON DENETİMİ

**Tarih:** 11 Ağustos 2026
**Kapsam:** Yalnızca DENETİM ve RAPOR. Hiçbir dosya değiştirilmedi, hiçbir endpoint oluşturulmadı, backend/DB/Redis'e dokunulmadı, signing/keystore/APK/AAB/deployment işlemi yapılmadı.
**Flutter kaynağı:** `mesutbyrm/Cursor-Flutter-` @ `a5ce815` (`mobile/lib/**`)
**Ana backend kaynağı:** `nextjs_space/app/api/**/route.ts` (453 route dosyası, catch-all hariç)
**Canlı doğrulama:** 11 Ağustos 2026 tarihli gerçek HTTP probe'ları (GET + POST, iki host)

---

## 0. YÖNTEM VE DOĞRULUK SINIRLARI

| Konu | Durum |
|---|---|
| ANA backend kaynak kodu | ✅ MEVCUT — envanter kaynak koddan çıkarıldı |
| İKİNCİ backend kaynak kodu | ❌ **YOK** — bu ortamda depo bulunmuyor. İkinci backend envanteri **yalnızca canlı HTTP probe** ile belirlendi. `SOURCE VERIFIED: NO` |
| Tahmin / ezber endpoint | ❌ Hiç kullanılmadı. Her satır ya kaynak dosya ya da probe sonucu ile kanıtlı |
| Fiziksel cihaz testi | ❌ YAPILMADI (cihaz yok) |

**Probe yorumlama kuralı:**
- ANA backend'de tanımsız her yol `app/api/[...unmatched]/route.ts` tarafından **404 `ENDPOINT_NOT_FOUND`** döndürür → ANA'da 404 = yol gerçekten yok (güvenilir).
- İstisna: `/api/auth/**` altındaki tanımsız yollar oturum catch-all'ına düşer ve **400** döner. Bu yüzden `/api/auth/*` için kaynak dizin listesi esas alındı.
- 401/403/405/400 = **yol var** (yetki/method farkı).
- Dinamik kimlik içeren yollarda (`/{id}/stream` gibi) 404 kaynak dosya ile çapraz kontrol edildi.

---

## 1. BACKEND API ENVANTERİ (ANA)

| Ölçüm | Değer |
|---|---|
| Route dosyası (`route.ts`) | **453** (+1 catch-all) |
| Method seviyesinde endpoint | **704** |
| JWT (`authenticateRequest`) koruması olan | kaynak taramasıyla işaretlendi |
| Oturum (`getServerSession`) koruması olan | kaynak taramasıyla işaretlendi |
| Kimlik gerektirmeyen (public) | kalan |

Tam liste: `nextjs_space/app/api/**/route.ts` ağacından üretildi (bu denetimin çalışma dosyası).

### İKİNCİ backend (probe ile kanıtlanan, `canlifalapi.abacusai.app`)
Sağlık: `GET /api/v1/health` → `{status:ok, redis:connected, db:connected}`.

Canlı olarak **var olduğu kanıtlanan** yollar (200 veya 401 döndü):

`/api/games/rooms` · `/api/games/auto-match` (POST 401) · `/api/gifts/battles` · `/api/gifts/goals` · `/api/gifts/insights/{feed,leaderboard,map,album/{id},badge/{id},collection/{id},first-gifter/{ctx}/{id}}` · `/api/gifts/insights/me/{badge,history,recommendations}` · `/api/gifts/missions` · `/api/gifts/missions/me` · `/api/live/guest/list` · `/api/live/pk/active` · `/api/membership/plans` · `/api/pk/active` · `/api/pk/leaderboard` · `/api/pk/me/{history,invites,matches,stats}` · `/api/pk/request` (POST 401) · `/api/pk/room` (POST 401) · `/api/pk/admin/ban` (POST 401) · `/api/pk/admin/bans` · `/api/pk/{matchId}/stream`

> Bu liste **tam envanter değildir** — ikinci backend'in kaynak kodu olmadığı için yalnızca Flutter'ın çağırdığı yollar sınandı.

---

## 2. FLUTTER API ENVANTERİ

| Ölçüm | Değer |
|---|---|
| Taranan dosya | `mobile/lib/**/*.dart` tamamı |
| Ham `/api/...` metin bulgusu | 343 |
| Ayıklama artefaktı (şablon öneki, router kuralı, `?query` parçası) | 47 |
| **Gerçek benzersiz endpoint** | **296** |

### Ağ katmanı (kaynak: `mobile/lib/core/network/`)
| Bileşen | Dosya |
|---|---|
| Backend yönlendirici | `api_backend_router.dart` |
| Yönlendirme interceptor'ı | `backend_routing_interceptor.dart` |
| Dio kurulumu + interceptor zinciri | `dio_provider.dart` |
| Endpoint sabitleri | `api_endpoints.dart` |
| Token deposu | `token_storage.dart` |
| Token yenileme koordinatörü | `auth_token_refresh_coordinator.dart` |
| Önbellek | `api_cache_interceptor.dart`, `api_cache_policy.dart`, `api_http_cache.dart` |
| Yeniden deneme / yedek | `api_retry_interceptor.dart`, `gateway_fallback_interceptor.dart` |
| SSE | `sse/base_sse_service.dart`, `sse/sse_connection_hub.dart`, `sse/sse_reconnect_policy.dart`, `sse/connectivity_sse_reconnect_provider.dart` |

**Interceptor zinciri (sıralı, `dio_provider.dart`):**
`ApiVersionInterceptor` → `BackendRoutingInterceptor` → `CookieManager` → `PaymentRequestInterceptor` → `VoiceRoomApiLogInterceptor` → `ApiMonitorInterceptor` → `ApiTimingInterceptor` → `JsonContentTypeGuardInterceptor` → `ApiRetryInterceptor` → **auth interceptor** (`Authorization: Bearer <token>` ekler; 401'de `/api/auth/mobile-refresh` ile yeniler ve isteği tekrarlar) → `GatewayFallbackInterceptor` → `ApiCacheInterceptor`.

**JWT akışı:** `Env.useMobileAuth` üretimde **true** (host `canlifal.com` içeriyor) → mobil JWT uçları kullanılır. Yenileme yolu: `ApiEndpoints.authMobileRefresh = /api/auth/mobile-refresh` (ANA backend'de **mevcut**).

**Host yapılandırması (`core/config/env.dart`):**
| Değişken | Varsayılan |
|---|---|
| `API_BASE_URL` (ANA) | `https://canlifal.com` |
| `GAMES_API_BASE_URL` (İKİNCİ) | `https://canlifalapi.abacusai.app` |
| `GATEWAY_API_BASE_URL` | *(boş — yedek kapalı)* |
| `WEB_ORIGIN` | `https://canlifal.com` |

---

## 3. BİREBİR KARŞILAŞTIRMA — SONUÇ DAĞILIMI

| Durum | Adet | Açıklama |
|---|---:|---|
| ✅ `MATCH` (ANA) | **194** | Flutter → ANA, ANA'da route mevcut |
| ✅ `MATCH` (İKİNCİ) | **16** | Router İKİNCİ'ye gönderiyor, İKİNCİ'de canlı doğrulandı |
| ⚠️ `WRONG_HOST` | **12** | İKİNCİ'de var, ANA'da 404 — ama router ANA'ya gönderiyor |
| ⚠️ `MISSING_BACKEND_ENDPOINT` | **68** | İki backend'de de yok (GET+POST doğrulandı) |
| ➖ `LEGACY_UNUSED` | **6** | Kodda var ama üretimde çalışmıyor (`useMobileAuth=true` dalı) |
| **TOPLAM** | **296** | |
| `WRONG_PATH` / `WRONG_METHOD` / `DUPLICATE` | **0** | Tespit edilmedi |
| `WRONG_AUTH` / `WRONG_REQUEST` / `WRONG_RESPONSE_MODEL` | **denetlenemedi** | Gerçek oturum jetonu olmadan gövde/şema karşılaştırması yapılamaz |

### 3.1 ⚠️ WRONG_HOST — 12 uç (EN KRİTİK BULGU)

Router (`api_backend_router.dart`) yalnızca `/api/gifts/battles` ve `/api/gifts/goals` öneklerini İKİNCİ'ye gönderiyor. `/api/gifts/insights/*` ve `/api/gifts/missions*` bu kurala **girmiyor** → ANA'ya gidiyor → ANA'da 404.

| Endpoint | ANA | İKİNCİ | Router hedefi | Durum |
|---|---|---|---|---|
| `/api/gifts/insights/feed` | 404 | **200** | ANA | ⚠️ WRONG_HOST |
| `/api/gifts/insights/leaderboard` | 404 | **200** | ANA | ⚠️ WRONG_HOST |
| `/api/gifts/insights/map` | 404 | **200** | ANA | ⚠️ WRONG_HOST |
| `/api/gifts/insights/album/{userId}` | 404 | **200** | ANA | ⚠️ WRONG_HOST |
| `/api/gifts/insights/badge/{userId}` | 404 | **200** | ANA | ⚠️ WRONG_HOST |
| `/api/gifts/insights/collection/{userId}` | 404 | **200** | ANA | ⚠️ WRONG_HOST |
| `/api/gifts/insights/first-gifter/{ctx}/{id}` | 404 | **200** | ANA | ⚠️ WRONG_HOST |
| `/api/gifts/insights/me/badge` | 404 | **401** | ANA | ⚠️ WRONG_HOST |
| `/api/gifts/insights/me/history` | 404 | **401** | ANA | ⚠️ WRONG_HOST |
| `/api/gifts/insights/me/recommendations` | 404 | **401** | ANA | ⚠️ WRONG_HOST |
| `/api/gifts/missions` | 404 | **200** | ANA | ⚠️ WRONG_HOST |
| `/api/gifts/missions/me` | 404 | **401** | ANA | ⚠️ WRONG_HOST |

**Çağıran kod:** `lib/features/gifts/data/gift_insights_remote_datasource.dart` (gerçek dio çağrıları, ölü kod değil).
**Etki:** Hediye liderlik tablosu, koleksiyon, albüm, rozet, öneri, harita, akış ve günlük görevler özelliklerinin **tamamı üretimde 404 alır**.

### 3.2 ➖ LEGACY_UNUSED — 6 uç
`/api/auth/{login,register,me,refresh,google,tiktok}` — yalnızca `Env.useMobileAuth == false` dalında çağrılıyor; üretim host'unda bu dal hiç çalışmıyor. Backend'de de yok. **Aksiyon gerekmez** (temizlik opsiyonel).

---

## 4. ROUTING DOĞRULAMASI (B1.5 KORUNDU)

Kullanıcının özel olarak istediği 6 uç, **canlı probe** ile doğrulandı:

| Endpoint | ANA | İKİNCİ | Router hedefi | Durum |
|---|---|---|---|---|
| `/api/memberships` | **200** | 404 | ANA | ✅ MATCH |
| `/api/memberships/packages` | **200** | 404 | ANA | ✅ MATCH |
| `/api/membership-badges` | **200** | 404 | ANA | ✅ MATCH |
| `/api/games/room` | **200** | 404 | ANA | ✅ MATCH |
| `/api/games/play` | **405** (route var, POST bekliyor) | 404 | ANA | ✅ MATCH |
| `/api/membership/plans` | 404 | **200** | İKİNCİ | ✅ MATCH (kural var, Flutter artık çağırmıyor) |

**B1.5 düzeltmesi olduğu gibi duruyor ve doğrudur. Geri alınmadı.**

Router'ın diğer İKİNCİ kuralları da doğrulandı: `/api/games/rooms` (200), `/api/games/auto-match` (POST 401), `/api/gifts/battles` (200), `/api/gifts/goals` (200), `/api/live/pk/active` (200), `/api/live/guest/list` (200), tüm `/api/pk*` (200/401) → hepsi ✅ MATCH.

---

## 5. MCP ENVANTERİ

| Ölçüm | Değer |
|---|---|
| Bulunan MCP sunucusu | **1** |
| ANA backend içinde MCP kodu | **0** (bu fazda yeniden tarandı) |
| Flutter içinde MCP istemcisi | **0** |
| Üretim çalışma zamanında MCP kullanımı | **0** |
| Toplam MCP aracı | **5** |

**Sunucu:** `canlifal-backend` (paket `canlifal-backend-mcp` v1.0.0) — `mcp-server/index.mjs` (218 satır), stdio/JSON-RPC, MCP `2024-11-05`. Yalnızca `.cursor/mcp.json` üzerinden **editör (geliştirme) aracı**. Yapılandırılmış yol `/workspace/mcp-server/index.mjs` bu ortamda yok → bu VM'de çalışmaz.

| MCP aracı | Çağırdığı backend servisi | İlişkili API | Flutter'ın doğrudan ihtiyacı | Yerine kullanılacak HTTP ucu |
|---|---|---|---|---|
| `list_endpoints` | Yok — yerel belge okur | `docs/API_ENDPOINT_MATRIX.md` | ❌ Hayır | — (geliştirme aracı) |
| `get_endpoint` | Yok — yerel belge okur | `docs/API_ENDPOINT_MATRIX.md` | ❌ Hayır | — |
| `search_endpoints` | Yok — yerel belge okur | `docs/API_ENDPOINT_MATRIX.md` | ❌ Hayır | — |
| `get_auth_flow` | Yok — koda gömülü sabit metin | `/api/auth/mobile-*` | ❌ Hayır | `/api/auth/mobile-login`, `/api/auth/mobile-refresh` |
| `read_audit` | Yok — yerel belge okur | 4 denetim belgesi | ❌ Hayır | — |

**Sonuç: Hiçbir MCP aracı canlı bir backend servisi çağırmıyor.** Flutter'a MCP istemcisi **eklenmemelidir**; sunucunun kendi `get_auth_flow` çıktısı da bunu yazıyor: *"Runtime MCP: not used by Flutter; Flutter uses REST/SSE/TRTC."*

---

## 6. SSE / GERÇEK ZAMANLI KANALLAR

| SSE kanalı | ANA kaynakta var mı | Probe | Durum |
|---|---|---|---|
| `/api/notifications/stream` | ✅ `notifications/stream/route.ts` | ANA 401 | ✅ MATCH |
| `/api/fortune-tellers/sessions/stream` | ✅ `fortune-tellers/sessions/stream/route.ts` | ANA 401 | ✅ MATCH |
| `/api/chat/rooms/{roomId}/stream` | ✅ `chat/rooms/[roomId]/stream/route.ts` | (kimlik yok → 404) | ✅ MATCH (kaynak kanıtı) |
| `/api/video-streams/{streamId}/stream` | ✅ `video-streams/[streamId]/stream/route.ts` | (kimlik yok → 404) | ✅ MATCH (kaynak kanıtı) |
| `/api/pk/{matchId}/stream` | — (İKİNCİ) | İKİNCİ **200** | ✅ MATCH (İKİNCİ) |
| `/api/messages/conversations/{id}/stream` | ❌ dizin yok | 404/404 | ⚠️ MISSING_BACKEND_ENDPOINT |
| `/api/short-videos/{id}/stream` | ❌ dizin yok | 404/404 | ⚠️ MISSING_BACKEND_ENDPOINT |
| `/api/admin/payments/stream` | ❌ dizin yok | 404/404 | ⚠️ MISSING_BACKEND_ENDPOINT |

Ayrıca ikinci backend'de `socket.io` polling ucu 200 dönüyor; Flutter'da socket.io istemcisi kullanımı tespit edilmedi (yalnız SSE).

---

## 7. KRİTİK ÖZELLİK PARİTE TABLOSU

| Feature | Backend API | Flutter API | Host | Auth | Request | Response | SSE/Realtime | Status |
|---|---|---|---|---|---|---|---|---|
| AUTH / JWT | `/api/auth/mobile-*`, `/api/me` | 31 uç | ANA | JWT Bearer + refresh | ✅ | denetlenemedi | — | ⚠️ 20 ✅ / 5 eksik / 6 legacy |
| PROFILE | `/api/user/*`, `/api/users/*`, `/api/profile/*` | 37 uç | ANA | JWT | ✅ | denetlenemedi | — | ⚠️ 24 ✅ / 13 eksik |
| SOCIAL | `/api/social/*`, `/api/short-videos/*`, `/api/posts/*` | 27 uç | ANA | JWT | ✅ | denetlenemedi | kısmen | ⚠️ 18 ✅ / 9 eksik |
| LIVE | `/api/live/*`, `/api/video-streams/*` | 24 uç | ANA + İKİNCİ | JWT | ✅ | denetlenemedi | ✅ SSE | ⚠️ 19 ✅ / 5 eksik |
| LIVE FALCI | `/api/fortune-tellers/*`, `/api/live-fal/*` | 15 uç | ANA | JWT | ✅ | denetlenemedi | ✅ SSE | ⚠️ 10 ✅ / 5 eksik |
| TRTC | `/api/trtc/*` | 2 uç | ANA | JWT | ✅ | denetlenemedi | — | ✅ MATCH (cihaz testi YAPILMADI) |
| VOICE ROOMS | `/api/chat/rooms/*` | 3 uç (+alt yollar) | ANA | JWT | ✅ | denetlenemedi | ✅ SSE | ✅ MATCH |
| PK | `/api/pk/*` (İKİNCİ), `/api/live/pk` (ANA) | 21 uç | Karma | JWT | ✅ | denetlenemedi | ✅ SSE (İKİNCİ) | ⚠️ 17 ✅ / 4 eksik |
| SEATS | `/api/live/seats`, `/api/chat/rooms/*/seats` | 4 uç | ANA | JWT | ✅ | denetlenemedi | ✅ SSE | ✅ MATCH |
| GIFTS | `/api/gifts/*` (ANA + İKİNCİ) | 25 uç | Karma | JWT | ✅ | denetlenemedi | kısmen | ❌ **12 WRONG_HOST** / 13 ✅ |
| CHAT | `/api/chat/*`, `/api/messages/*` | 9 uç | ANA | JWT | ✅ | denetlenemedi | ⚠️ 1 SSE eksik | ⚠️ 7 ✅ / 2 eksik |
| SSE | 8 kanal | 8 kanal | ANA + İKİNCİ | JWT | ✅ | — | — | ⚠️ 5 ✅ / 3 eksik |
| PRESENCE | `/api/live/online-users`, `user_presence_service.dart` | — | ANA | JWT | ✅ | denetlenemedi | ✅ | ✅ MATCH |
| MUSIC / !İSTEK | `/api/chat/youtube-stream` | 3 uç | ANA | JWT | ✅ | denetlenemedi | — | ⚠️ 1 ✅ / 2 eksik (`chat/music/popular`, `chat/youtube-audio`) |
| FAL / TAROT | `/api/fortunes/*`, `/api/fortune-*` | 14 uç | ANA | JWT | ✅ | denetlenemedi | — | ⚠️ 12 ✅ / 2 eksik |
| MEMBERSHIPS | `/api/memberships*`, `/api/membership-badges` | 4 uç | ANA | JWT | ✅ | denetlenemedi | — | ✅ **TAM MATCH** (B1.5) |
| GAMES | `/api/games/*` (ANA), `/rooms`+`/auto-match` (İKİNCİ) | 15 uç | Karma | JWT | ✅ | denetlenemedi | — | ⚠️ 12 ✅ / 3 eksik |
| NOTIFICATIONS | `/api/notifications/*` | 4 uç | ANA | JWT | ✅ | denetlenemedi | ✅ SSE | ⚠️ 2 ✅ / 2 eksik |
| UPLOADS / CDN | `/api/upload*`, `/api/files/*` | 2 uç | ANA | JWT | ✅ | denetlenemedi | — | ✅ MATCH |

---

## 8. MISSING_BACKEND_ENDPOINT — 68 UÇ (İKİ BACKEND'DE DE YOK)

GET **ve** POST ile iki host üzerinde doğrulandı.

**Yönetim (8):** `/api/admin/mobile-auth`, `/api/admin/payment-notifications`, `/api/admin/payment-requests`, `/api/admin/payment-requests/dismiss-pending`, `/api/admin/payments/stream`, `/api/admin/voice-room-backgrounds`, `/api/admin/voice-room-finance-audit`, `/api/admin/voice-room-settings`

**Kimlik (4 — aktif çağrı, kritik):** `/api/auth/mobile-send-verification`, `/api/auth/mobile-verify-email`, `/api/auth/mobile-sessions`, `/api/auth/mobile/device-token`

**Ana sayfa / vitrin (9):** `/api/advisors`, `/api/advisors/online`, `/api/banners`, `/api/blog/recent`, `/api/celebrities`, `/api/homepage`, `/api/leaderboard`, `/api/platform-stats`, `/api/platform/voice-room-settings`

**Profil / kullanıcı (13):** `/api/user/cosmetics`, `/api/user/cosmetics/equip`, `/api/user/cosmetics/loadout`, `/api/user/profile/cosmetics/equip`, `/api/user/daily-tasks`, `/api/user/device-token`, `/api/user/favorites`, `/api/user/story`, `/api/users/me/activity`, `/api/users/me/stats`, `/api/users/me/broadcast-history`, `/api/users/me/gifts-received`, `/api/users/me/profile-visitors`

**Sosyal / kısa video (9):** `/api/social/announcements`, `/api/social/fortune-tellers`, `/api/social/public-stats`, `/api/social/stories`, `/api/short-videos/explore/nearby`, `/api/short-videos/hashtags/search`, `/api/short-videos/hashtags/trending`, `/api/short-videos/music/recommend`, `/api/short-videos/viewed/me`

**Canlı fal (5):** `/api/live-fal/pending`, `/api/live-fal/request/{id}`, `/api/live/fal-request/{id}`, `/api/live/fal-request/create`, `/api/live/fal-requests`

**PK (4):** `/api/pk/battles`, `/api/pk/history`, `/api/pk/stats`, `/api/pk/admin/unban`

**Oyun (3):** `/api/games/history`, `/api/games/mini-scores`, `/api/tournaments/join`

**Sohbet / müzik (2):** `/api/chat/music/popular`, `/api/chat/youtube-audio`

**Fal erişimi (2):** `/api/fortune-access/consume`, `/api/fortune-access/settings`

**Bildirim (2):** `/api/notifications/payment`, `/api/notifications/unread`

**Falcı paneli (2):** `/api/teller/gifts`, `/api/teller/reviews`

**Fan kulüpleri (2):** `/api/fan-clubs`, `/api/fan-clubs/popular`

**Diğer (3):** `/api/daily-rewards`, `/api/reports`, `/api/mobile/auth/web-session`

---

## 9. MISSING_FLUTTER_INTEGRATION

| Ölçüm | Değer |
|---|---|
| ANA backend'de olup Flutter'ın hiç çağırmadığı route | **273** |
| — bunlardan `/api/admin/*` (web yönetim paneli, mobil kapsam dışı) | **97** |
| — mobil ile ilgili olabilecek (admin dışı) | **176** |

> `/api/admin/*` uçları web yönetim paneline aittir; mobil eksiklik sayılmaz. Kalan 176 uç ağırlıkla web sitesi/SEO/ödeme-webhook/CMS uçlarıdır; bunların mobilde gerekli olup olmadığı ürün kararıdır — bu denetimde **eksiklik olarak işaretlenmedi**, yalnızca sayıldı.

---

## 10. ÖZET CEVAPLAR (A–I)

| | Soru | Cevap |
|---|---|---|
| **A** | Kaç aktif backend endpointi bulundu | **ANA: 453 route / 704 method-endpoint** (kaynak koddan). İKİNCİ: kaynak yok; probe ile **27 yol** var olduğu kanıtlandı |
| **B** | Kaç Flutter endpoint çağrısı bulundu | **296 benzersiz uç** (343 ham metinden 47 artefakt ayıklandı) |
| **C** | Kaç tanesi doğru | **210** (194 ANA + 16 İKİNCİ) |
| **D** | Kaç tanesi yanlış host/path | **12 WRONG_HOST** (tamamı `/api/gifts/insights/*` + `/api/gifts/missions*`). WRONG_PATH: **0**, WRONG_METHOD: **0** |
| **E** | Kaç tanesi Flutter'da eksik | **273** backend route'u Flutter çağırmıyor (97'si yönetim paneli, 176'sı admin dışı) |
| **F** | Kaç tanesi backend'de eksik | **68** (GET+POST, iki host doğrulandı) |
| **G** | Kaç MCP bulundu | **1 sunucu, 5 araç** — üretimde kullanım **0** |
| **H** | MCP → API eşleşmeleri | **Hiçbiri canlı API çağırmıyor.** 3 araç `API_ENDPOINT_MATRIX.md`, 1 araç 4 denetim belgesi, 1 araç gömülü sabit metin okuyor. Flutter'a MCP istemcisi gerekmez |
| **I** | Kritik özelliklerdeki eksikler | **GIFTS: 12 uç yanlış host (özellik tamamen çalışmıyor)** · AUTH: 4 aktif uç backend'de yok (e-posta doğrulama, oturum listesi, cihaz jetonu) · PROFILE: 13 eksik (kozmetik/görev/favori/hikaye/ziyaretçi) · SOCIAL: 9 eksik · LIVE FALCI: 5 eksik · SSE: 3 kanal eksik · PK: 4 eksik · GAMES: 3 eksik · NOTIFICATIONS: 2 eksik · MUSIC: 2 eksik · **MEMBERSHIPS, SEATS, VOICE ROOMS, TRTC, PRESENCE, UPLOADS: tam parite ✅** |

---

## 11. ÖNCELİK SIRASI (öneri — bu fazda UYGULANMADI)

1. **P0 — GIFTS WRONG_HOST (12 uç):** `api_backend_router.dart` içinde `_isGiftBattleBackendPath` kuralını `/api/gifts/insights` ve `/api/gifts/missions` öneklerini de kapsayacak şekilde genişletmek. Tek dosya, tek fonksiyon.
2. **P1 — AUTH 4 uç:** e-posta doğrulama gönder/doğrula, aktif oturum listesi, cihaz jetonu kaydı → backend'de yok. Ya backend'e eklenmeli ya Flutter'dan kaldırılmalı.
3. **P2 — SSE 3 kanal:** mesaj SSE, kısa video SSE, yönetim ödeme SSE.
4. **P3 — Kalan 61 eksik uç:** ürün kararı gerektirir (özellik gerçekten planlandı mı?).
5. **P4 — 6 legacy auth ucu** temizliği.

---

## 12. DURUM

```
BACKEND ENVANTERİ      : TAMAM (ANA kaynak kodlu, İKİNCİ probe ile)
FLUTTER ENVANTERİ      : TAMAM
BİREBİR KARŞILAŞTIRMA  : TAMAM (296 uç)
ROUTING DOĞRULAMA      : TAMAM — B1.5 KORUNDU VE DOĞRU
MCP ENVANTERİ          : TAMAM (1 sunucu / 5 araç / 0 runtime)
KRİTİK ÖZELLİKLER      : TAMAM (18 alan)
KOD DEĞİŞİKLİĞİ        : YAPILMADI (talimat gereği)
DEPLOYMENT             : YAPILMADI
SIGNING / APK / AAB    : YAPILMADI
CİHAZ TESTİ            : YAPILMADI (cihaz yok)
```

**DUR.**
