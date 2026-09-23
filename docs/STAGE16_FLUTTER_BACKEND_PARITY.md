# STAGE 16 — FLUTTER ↔ PRODUCTION BACKEND PARITY AUDIT

**Tarih:** 2026-08-10
**Backend referansı:** `https://canlifal.com` (Stage 15 production — DEĞİŞTİRİLMEDİ)
**Flutter kaynağı:** `mesutbyrm/Cursor-Flutter-` @ `main` (pushed_at 2026-08-09T12:32:37Z), `mobile/` — 1469 Dart dosyası
**Kapsam:** Yalnızca denetim. Bu turda ne backend ne Flutter kodunda değişiklik yapılmadı.

---

## 0. Yöntem ve kanıt düzeyi

| Adım | Yöntem | Kanıt |
|---|---|---|
| Flutter endpoint envanteri | kaynak taraması | 524 ham `/api/...` string → 474 normalize path |
| Backend endpoint envanteri | `app/api/**/route.ts` | 454 route → 453 normalize path |
| Fark doğrulama | production HTTP probe | 213 aday path canlı çağrıldı |
| 404 kesinliği | `app/api/[...unmatched]` | bilinmeyen tüm path/method → `404 {"code":"ENDPOINT_NOT_FOUND"}` |
| Sonuç | — | **185 path production'da gerçekten 404** |
| Event isimleri | backend kaynak kodundan çıkarıldı | ezberden yazılmadı |
| Gerçek cihaz | `adb devices` boş, AVD yok | **cihaz yok** |

---

## 1. KRİTİK BULGU — Flutter iki ayrı backend'e bölünmüş yönlendirme yapıyor

**DOSYA:** `lib/core/network/api_backend_router.dart` + `lib/core/network/backend_routing_interceptor.dart` (tek Dio'ya global interceptor olarak eklenmiş: `lib/core/network/dio_provider.dart:74`)

Flutter iki origin kullanıyor:
- `Env.apiBaseUrl` = `https://canlifal.com` (ana backend)
- `Env.gamesApiBaseUrl` = `https://canlifalapi.abacusai.app` (oyun backend'i, canlı)

`ApiBackendRouter.resolve()` bazı yolları oyun backend'ine çeviriyor. Canlı probe ile doğrulanan gerçek durum:

| Path | canlifal.com | canlifalapi | Flutter nereye gönderiyor | Durum |
|---|---|---|---|---|
| `/api/live/pk` (GET/POST) | **200** | **404** | games | ❌ KIRIK |
| `/api/live/pk/score` | **405** (var, POST) | **404** | games | ❌ KIRIK |
| `/api/chat/rooms/{id}/pk` | **200** | 200 (ayrı veri) | games | ❌ YANLIŞ ORIGIN |
| `/api/chat/rooms/{id}/pk/score` | **405** (var, POST) | **404** | games | ❌ KIRIK |
| `/api/membership/*` | 404 | 200 | games | ✅ doğru |
| `/api/gifts/battles`, `/api/gifts/goals` | 404 | 200 | games | ✅ doğru |
| `/api/games/*` | 404 | 200 | games | ✅ doğru |
| `/api/live/guest/*` | 404 | 200 | games | ✅ doğru |
| `/api/pk/*` (oyun PK odaları) | 404 | var (401/200) | games | ✅ doğru |

### 1.1 Bunun yarattığı zincirleme arıza (kullanıcının bildirdiği "PK karşı tarafta işlenmiyor" sorununun kök nedeni)

- SSE **her zaman ana backend'den** dinleniyor: `lib/core/network/sse/base_sse_service.dart:39` → `baseUrl: Env.apiBaseUrl`; `video_stream_sse_service.dart:27` de aynı.
- PK **oluşturma/kabul/skor** ise oyun backend'ine gidiyor.
- Ana backend'in `chat/rooms/[roomId]/pk/route.ts` ve `live/pk/route.ts` dosyaları PK eventlerini `emitChatEvent`/`emitStreamEvent` ile **ana SSE kanalına** yayıyor. PK oyun backend'inde oluşturulduğu için ana backend'de hiç PK kaydı oluşmuyor → **hiçbir PK eventi yayınlanmıyor** → karşı taraf daveti/skoru görmüyor.
- Aynı nedenle hediye kaynaklı PK skoru da çalışmıyor: `app/api/live/gift/send/route.ts:353-354` `score_update` eventini ancak ana backend'de aktif bir PK varsa yayıyor.

**SORUN SINIFI:** C (API contract mismatch) + E (SSE)
**DÜZELTME (Flutter):** `_isPkBackendPath` dışındaki üç kuralı kaldır — `_isVoiceRoomPkBackendPath` (`^/api/chat/rooms/[^/]+/pk`) ve `_isLiveGamesBackendPath` içindeki `/api/live/pk`, `/api/live/pk/` girişleri silinmeli; bu yollar `ApiBackendKind.main`'e düşmeli. `/api/pk/*` (oyun PK odaları) games'te kalmalı.

### 1.2 PK create gövdesi contract'a uymuyor

**DOSYA/FONKSİYON:** `lib/features/voice_hub/data/datasources/pk_battle_remote_datasource.dart` → `createBattle`
**MEVCUT:** İlk denenen "canonical" gövdeler `action` alanı içermiyor (`{guestUserId, durationSec, targetRoomId}`); ardından oyun backend'i yedeği; en son `action:'create'` "legacy" olarak deneniyor. Her deneme birden çok room key adayı ile tekrarlanıyor.
**BEKLENEN:** `app/api/chat/rooms/[roomId]/pk/route.ts:87` → `{ action:'create', targetRoomId, duration }`; kabul/ret/iptal/bitir için `action: accept|reject|cancel|end`.
**SORUN SINIFI:** C + H
**DÜZELTME:** Tek istek, tek gövde: `{action:'create', targetRoomId, duration}`. Shotgun deneme döngüleri kaldırılmalı.

### 1.3 Var olmayan PK alt uçları

`/api/chat/rooms/{id}/pk/{inviteId}/respond` ve `/api/chat/rooms/{id}/pk/{battleId}/end` **her iki backend'de de 404**. (`api_endpoints.dart:499,503`; kullanım `pk_battle_remote_datasource.dart:295,325`.)
**SORUN SINIFI:** C — **DÜZELTME:** `POST /api/chat/rooms/{id}/pk` + `action: accept|reject|end` kullanılmalı.

---

## 2. Auth / JWT (D)

| Kontrol | Sonuç |
|---|---|
| `Authorization: Bearer` tüm korumalı isteklerde | ✅ `dio_provider.dart:87-104` |
| Public auth path'lerde token temizleniyor | ✅ |
| 401 → refresh → tek sefer retry | ✅ `dio_provider.dart:106-128` |
| Refresh ucu `/api/auth/mobile-refresh` | ✅ backend'de var (`app/api/auth/mobile-refresh`) |
| `/api/v1` interceptor | ✅ varsayılan kapalı (`ApiConfig.useApiV1=false`), sorun yok |
| **Oyun backend'i ana JWT'yi kabul ediyor mu** | ❌ **HAYIR** |

**DOSYA:** `lib/core/network/dio_provider.dart` (tek Dio, tek token deposu)
**MEVCUT:** Ana site JWT'si oyun backend'ine de gönderiliyor.
**KANIT:** `canlifalapi.abacusai.app/api/pk/me/stats` → token'sız 401, ana JWT ile de **401**. `/api/membership/me` → aynı. Yalnızca public uçlar (`/api/games/rooms`, `/api/gifts/battles`, `/api/live/guest/list`, `/api/pk/active`) 200 dönüyor.
**BEKLENEN:** Oyun backend'inin kendi oturum/token'ı veya ana JWT'yi kabul eden bir doğrulama.
**SORUN SINIFI:** D
**ETKİ:** Üyelik (membership/me) ve kişisel PK istatistikleri mobilde hiç çalışmıyor. Ayrıca her 401, ana backend'e gereksiz bir refresh çağrısı tetikliyor (H).

### 2.1 Ölü auth uçları
`/api/auth/login`, `/register`, `/refresh`, `/me`, `/google`, `/tiktok`, `/callback/apple`, `/mobile-sessions`, `/mobile/device-token`, `/mobile-send-verification`, `/mobile-verify-email` → hepsi NextAuth catch-all'a düşüp **400** dönüyor. Flutter'da bunlar yalnızca `Env.useMobileAuth == false` dalında yedek olarak kullanılıyor; production'da `useMobileAuth == true` olduğu için canlı çağrı yolunda **değiller**. **Sonuç: sorun değil**, ama ölü kod.

---

## 3. SSE event isimleri (E)

**Backend gerçek event tipleri (koddan çıkarıldı, ezber değil):**

- Sesli oda `/api/chat/rooms/{roomId}/stream`: `connected`, `messages`, `system`, `gift`, `pk`, `room_event`, `presence`, `typing`, `dj`
- Canlı yayın `/api/video-streams/{streamId}/stream`: `connected`, `viewerCount`, `gift`, `pk`, `streamEnded`, `streamMessage`, `: heartbeat`
- PK `action` değerleri: `created`, `started`, `score_update`, `completed`, `rejected`, `cancelled`

**Flutter parser'ları:**

| Kontrol | Sonuç |
|---|---|
| `chat_room_sse_event.dart:36-131` tüm tipleri + alias'ları tanıyor | ✅ |
| `video_stream_sse_service.dart:241-311` tüm tipleri tanıyor | ✅ |
| `created/started/score_update/completed/rejected/cancelled` parse | ✅ |
| PK eventi state'e uygulanıyor mu | ✅ sesli oda: `chat_room_providers_sse.dart:147-159` → `pkBattleProvider.applyRemoteBattle` + `pkBattleRemoteProvider.ingestSseBattle`; canlı yayın: `live_room_providers.dart:185-191` → `liveVideoPkProvider.applyRemoteBattle` |
| DJ eventi (`type:'dj'`, `QUEUE_UPDATED`, `nowPlaying{...}`) | ✅ tanınıyor |

**SONUÇ:** Flutter'ın SSE parse ve state uygulama zinciri **DOĞRU**. PK'nın çalışmamasının nedeni parse değil, **Madde 1'deki yanlış origin**.

---

## 4. Hediye alan eşleşmesi

**Backend gift SSE payload'ı** (`app/api/live/gift/send/route.ts:207,359`):
`{type:'gift', streamId|roomId, receiverId, gift:{id, giftId, senderId, receiverId, senderName, giftName, giftIcon, quantity, totalPrice, timestamp, ...}}`

| Alan | Backend SSE'de | Flutter'da eşleşiyor mu |
|---|---|---|
| `amount` / `quantity` | ✅ | ✅ |
| `totalPrice` | ✅ (iç `gift{}` içinde) | ✅ |
| `senderId`, `receiverId` | ✅ | ✅ |
| `roomId`, `streamId` | ✅ | ✅ |
| `receiverAmount` | ❌ **SSE'de yok** (yalnız DB'de) | — |
| `siteAmount` | ❌ **SSE'de yok** (yalnız DB'de) | — |

**"500 jeton → 0 jeton" riski:** `lib/features/gifts/domain/gift_payload_util.dart:21-38` dış zarf ile iç `gift{}` objesini birleştiriyor, `lib/features/live/data/datasources/live_gifts_remote_datasource.dart:230-290` ise `totalPrice/totalCoin/totalCost/amount/coins/...` dahil 12+ alan adını deniyor. **Kod düzeyinde "0 jeton" gösterme riski yok.** (Gerçek cihazda görsel doğrulama yapılmadı.)

**SORUN SINIFI:** C (yalnızca `receiverAmount`/`siteAmount` için) — backend'e dokunulmayacağı için Flutter bu iki alanı SSE'den **alamaz**; gelir kırılımı yalnızca REST rapor uçlarından okunabilir.

---

## 5. TRTC (F)

**Backend:** `POST /api/trtc/token` → `{success, data:{sdkAppId, userId, userSig, roomId, trtcRoomId, numericUid, expireTime, role}}`
**Flutter:** `lib/features/trtc/data/datasources/trtc_remote_datasource.dart:33` body `{roomId, role}`; `trtc_credentials.dart:45-55` `sdkAppId/userSig/trtcRoomId/numericUid/expireTime` alanlarını doğru okuyor, `effectiveStrRoomId` kanonik oda kimliğini kullanıyor.

**SONUÇ:** Sözleşme uyumlu ✅ (kod düzeyi). **Ses/görüntü/mikrofon doğrulaması: NOT PERFORMED** — fiziksel cihaz yok.

---

## 6. Sesli oda / koltuk / presence / heartbeat (G)

| Kontrol | Sonuç |
|---|---|
| `GET/POST /api/chat/rooms/{id}/seats` | ✅ backend'de var |
| `/api/chat/rooms/{id}/join-seat` | ❌ **404** — ama `chat_room_remote_datasource.dart:2126-2145` 404'te `seats` → `PATCH seats` → `presence` sırasıyla yedekliyor → **işlevsel**, sadece boşa 1 istek (H) |
| `presence` SSE → state | ✅ `chat_room_providers_sse.dart:117-133` |
| presence heartbeat | ✅ `chat_room_providers_presence.dart:494` |

---

## 7. Canlı falcı akışı

| Uç | Production | Flutter'da |
|---|---|---|
| `GET /api/fortune-tellers/sessions` | ✅ var | ✅ birincil |
| `GET /api/fortune-tellers/sessions/stream` (SSE) | ✅ var | ✅ |
| `/api/live-fal/pending` | ❌ 404 | yedek olarak **her poll'da çağrılıyor** |
| `/api/fortune-tellers/sessions/incoming` | ❌ 404 | yedek olarak **her poll'da çağrılıyor** |
| `/api/live-fal/request/{id}/accept|reject`, `/api/live/fal-request/*`, `/api/fortune-tellers/session/{id}` | ❌ 404 | sabit tanımlı, canlı yolda kullanılmıyor (ölü kod) |

**DOSYA/FONKSİYON:** `lib/features/live_psychics/data/repositories/live_psychics_remote_datasource.dart:571-593` → `fetchIncomingRequests`
**MEVCUT:** Her çağrıda 4 uca sırayla istek atıyor; 2'si kesin 404.
**BEKLENEN:** Yalnızca `/api/fortune-tellers/sessions?status=pending`.
**SORUN SINIFI:** H — **DÜZELTME:** 404 dönen iki yedek listeden çıkarılmalı.

---

## 8. Müzik / !istek

| Uç | Production | Flutter |
|---|---|---|
| `POST /api/chat/rooms/{id}/song-request` (!istek) | ✅ var | ✅ birincil (`chat_room_providers.dart:2740`) |
| `GET/POST/DELETE /api/chat/rooms/{id}/music`, `music/stop`, `music-queue`, `dj` | ✅ var | ✅ |
| DJ SSE (`type:'dj'`, `nowPlaying`, `musicQueue`) | ✅ | ✅ parse ediliyor |
| `/api/chat/rooms/{id}/current-song` | ❌ 404 | `room_song_remote_datasource.dart:13` **birincil** → her zaman hata |
| `/api/chat/rooms/{id}/music-stream` | ❌ 404 | `room_music_remote_datasource.dart:59-74` |
| `/api/chat/rooms/{id}/music-settings`, `music-request-by-query`, `/api/chat/music/popular`, `/api/chat/youtube-audio`, `/api/chat/rooms/{id}/dj/{userId}` | ❌ 404 | çağrılmıyor / ölü kod |

**SORUN SINIFI:** C — **DÜZELTME:** `current-song` yerine `GET /api/chat/rooms/{id}/music` (veya DJ SSE `nowPlaying`) kullanılmalı; `music-stream` çağrıları kaldırılmalı (backend `/api/chat/youtube-stream` sağlıyor).

---

## 9. Socket.IO ↔ SSE paralel implementasyon (E / H)

| Servis | Bağlandığı origin | Orada Socket.IO var mı | Durum |
|---|---|---|---|
| `PkBattleSocketService` | `Env.siteOrigin` (canlifal.com) | ❌ yok (`/socket.io` HTML sayfaya yönleniyor) | ❌ sonsuz yeniden bağlanma |
| `VoiceRoomGiftSocket` | canlifal.com | ❌ yok | ❌ sonsuz yeniden bağlanma |
| `LiveGiftSocketBridge` | canlifal.com | ❌ yok | ❌ sonsuz yeniden bağlanma |
| `LiveNamespaceSocketService` | `Env.gamesApiBaseUrl` | ✅ var (`sid` döndü) | ✅ meşru |
| `PkMatchSseService` | games backend SSE | ✅ oyun PK odaları için ayrı sistem | ✅ meşru |

**SORUN SINIFI:** H (+E) — **DÜZELTME:** Ana siteye bağlanan üç socket servisi devre dışı bırakılmalı; bu üç kanalın verisi zaten ana backend SSE'sinden geliyor.

---

## 10. Performans (H)

| Bulgu | Dosya | Not |
|---|---|---|
| PK davet polling 3 sn, SSE'den bağımsız | `voice_pk_invite_listener.dart:33` | SSE `pk` eventi zaten var |
| PK sayfa polling 3 sn | `live_pk_battle_page.dart:112` | |
| Hediye polling 8 sn | `live_gift_realtime_service.dart:41` | ✅ SSE aktifken kapanıyor (`_sseActive`) — doğru örnek |
| Canlı yayın odasında 4 ayrı poll timer'ı | `live_broadcast_room_page.dart:1018,1034,1047,1061` | |
| PK create'te çoklu gövde × çoklu room key denemesi | `pk_battle_remote_datasource.dart:120-240` | tek çağrıya indirilmeli |
| Falcı incoming: her poll'da 4 uç (2'si 404) | `live_psychics_remote_datasource.dart:571` | |
| Koltuğa oturma: 404 alınacak uçla başlıyor | `chat_room_remote_datasource.dart:2126` | |
| Ana JWT ile oyun backend'ine 401 → her seferinde gereksiz refresh | `dio_provider.dart:106` | |

---

## 11. Gerçek cihaz testi

| Kontrol | Sonuç |
|---|---|
| Fiziksel Android cihaz (`adb devices`) | **YOK** |
| AVD / emülatör | **YOK** |
| TRTC ses/görüntü/mikrofon | **NOT PERFORMED** |
| Uçtan uca canlı yayın / sesli oda / canlı falcı oturumu | **NOT PERFORMED** |

Emülatör sonucu kullanılmadı; sahte PASS yazılmadı.

---

## 12. Sonuç tablosu

| Sistem | Backend | Flutter | E2E | Sonuç |
|---|---|---|---|---|
| TRTC | PASS | PASS (sözleşme) | NOT PERFORMED | ⚠️ DOĞRULANMADI |
| Canlı Yayın | PASS | PASS | NOT PERFORMED | ⚠️ DOĞRULANMADI |
| Canlı Falcı | PASS | FAIL (2 ölü uç her poll'da) | NOT PERFORMED | ❌ FAIL |
| Sesli Oda | PASS | PASS | NOT PERFORMED | ⚠️ DOĞRULANMADI |
| Seat | PASS | PASS (404 yedeğiyle) | NOT PERFORMED | ⚠️ DOĞRULANMADI |
| Hediye | PASS | PASS (jeton) / FAIL (`receiverAmount`,`siteAmount` SSE'de yok) | NOT PERFORMED | ❌ FAIL |
| Jeton | PASS | PASS | NOT PERFORMED | ⚠️ DOĞRULANMADI |
| PK | PASS | **FAIL (yanlış backend origin)** | NOT PERFORMED | ❌ FAIL |
| Presence | PASS | PASS | NOT PERFORMED | ⚠️ DOĞRULANMADI |
| SSE | PASS | PASS (parse) / FAIL (3 ölü socket) | NOT PERFORMED | ❌ FAIL |
| Müzik / !istek | PASS | PASS (!istek) / FAIL (`current-song`, `music-stream` 404) | NOT PERFORMED | ❌ FAIL |

---

## FLUTTER BACKEND PARITY = NOT COMPLETE

**Gerekçe:**
1. PK, Flutter'da yanlış backend origin'ine gönderildiği için uçtan uca çalışmıyor (Madde 1).
2. Oyun backend'i ana site JWT'sini kabul etmiyor; üyelik ve kişisel PK istatistikleri erişilemez (Madde 2).
3. `current-song`, `music-stream` ve 2 falcı ucu production'da 404 (Madde 7, 8).
4. Ana siteye bağlanan 3 Socket.IO servisi hiç bağlanamıyor (Madde 9).
5. Fiziksel Android cihaz bulunmadığı için **hiçbir E2E / TRTC testi yapılamadı** (Madde 11).

Backend tarafında A sınıfı (backend hatası) bulgu **yoktur**; tespit edilen tüm sorunlar B/C/D/E/H sınıfıdır ve Flutter tarafında çözülür.
