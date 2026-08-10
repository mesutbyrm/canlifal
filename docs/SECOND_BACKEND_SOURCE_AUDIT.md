# SECOND BACKEND SOURCE AUDIT

> AŞAMA B1 — Yalnızca tespit ve envanter. Bu çalışmada hiçbir kod taşınmadı, hiçbir uç silinmedi,
> hiçbir deployment değiştirilmedi, hiçbir şema/migration uygulanmadı, Flutter kodu değiştirilmedi.
> Tarih: 2026-08-10. Yöntem: canlı HTTP probe + git/GitHub metadata sorgusu + yerel kaynak taraması.
> Kanıtlanamayan her satır `NOT VERIFIED` olarak işaretlenmiştir. Tahmin yapılmamıştır.

---

## PRODUCTION URL

| Alan | Ana backend (MAIN) | İkinci backend (SECOND) |
|---|---|---|
| URL | `https://canlifal.com` | `https://canlifalapi.abacusai.app` |
| DNS A kayıtları | 66.71.220.1 / 66.71.220.2 | 104.18.23.85 / 104.18.22.85 |
| CDN | Cloudflare | Cloudflare |
| Ara katman | `x-envoy-upstream-service-time` başlığı var | `x-envoy-upstream-service-time` başlığı var |
| Çalışma zamanı imzası | Web uygulama çatısı başlıkları (`vary: RSC, Next-Router-*`) | `x-powered-by: Express` |
| CORS | — | `access-control-allow-origin: *`, `credentials: true`, `GET,HEAD,PUT,PATCH,POST,DELETE` |
| Barındırma | Abacus.ai | Abacus.ai (`*.abacusai.app` alt alan adı) |
| Sağlık ucu | — | `GET /api/v1/health` → `{"status":"ok","redis":"connected","db":"connected","instance":"canlifal-api-1"}` |
| Realtime | — | `GET /socket.io/?EIO=4&transport=polling` → 200 (açık) |

**Sonuç:** İkinci backend canlı, ayrı bir çalışma zamanıdır ve ana backend ile aynı barındırma platformunda ayrı bir servis olarak koşmaktadır.

---

## SOURCE REPOSITORY

```
SECOND BACKEND REPOSITORY: NOT FOUND
BRANCH:                    NOT VERIFIED
DEPLOYED COMMIT:           NOT VERIFIED
DEPLOYMENT:                Abacus.ai barındırma (canlifalapi.abacusai.app) — deployment kimliği görünür değil
SOURCE VERIFIED:           NO
```

### Kontrol edilen kaynaklar ve sonuçları

| Kaynak | Kontrol | Sonuç |
|---|---|---|
| Bu projenin git remote'u | `git remote get-url origin` (maskeli) | `github.com/mesutbyrm/canlifal.git` — yalnızca ana backend |
| Bu projenin dalı/commit'i | `git rev-parse` | dal `master`, HEAD `1666ca4c` (ana backend) |
| GitHub hesabındaki tüm repolar | GitHub REST `/user/repos` | 3 repo bulundu (aşağıdaki tablo) |
| GitLab | — | Bu ortamda yapılandırılmış GitLab bağlantısı yok |
| Docker image / registry | — | Erişilebilir registry metadata yok |
| CI/CD tanımı | `Cursor-Flutter-/.github` | Yalnızca Flutter/mirror iş akışları; ikinci backend deploy adımı yok |
| Deployment metadata | Canlı servis üzerinden | Aşağıdaki "kaynak sızıntısı" probe'ları — tamamı 404 |

### Hesaptaki repoların tamamı

| Repo | Dal | HEAD commit | Tarih | Görünürlük | Üst düzey içerik |
|---|---|---|---|---|---|
| `mesutbyrm/Cursor-Flutter-` | main | `108abbd49387` | 2026-08-10 17:18 | public | `.github, api, docs, mcp-server, mobile, scripts, site, docker-compose.yml` |
| `mesutbyrm/Canlifal-flutter` | main | `e2d1630495e9` | 2026-06-11 13:28 | private | `lib, assets, pubspec.yaml, test` — eski Flutter, backend yok |
| `mesutbyrm/canlifal` | main | `1e66f2551c52` | 2026-06-07 20:20 | private | yalnızca `README.md` |

### `Cursor-Flutter-/api` neden üretim kaynağı DEĞİL (kanıt)

| # | Repo kodu | Canlı ikinci backend | Karar |
|---|---|---|---|
| 1 | `api/src/index.ts` sağlık yanıtı: `{success:true,data:{status,redis}}` | `{"status":"ok","redis":...,"db":"connected","instance":"canlifal-api-1"}` — sarmalayıcı yok, `db` ve `instance` alanları repoda yok | FARKLI |
| 2 | 404 gövdesi: `{success:false,error:{code:"NOT_FOUND",message:"Endpoint bulunamadı"}}` | `{"success":false,"statusCode":404,"message":"Cannot GET /zzz","timestamp":...,"path":"/zzz"}` | FARKLI |
| 3 | Repoda mount edilmiş: `/api/wallet`, `/api/messages`, `/api/trtc/usersig`, `/api/livekit/token`, `/api/stories`, `/api/short-videos`, `/api/social/*`, `/api/music/*`, `/api/auth/*` | Canlıda hepsi **404** | FARKLI |
| 4 | Repo şemasında `MembershipPlan`, `VideoStream`, `ChatRoom`, `GameRoom` modelleri **yok** | Canlı `/api/membership/plans`, `/api/video-streams`, `/api/chat/rooms`, `/api/games/rooms` → **200** | FARKLI |

### Kaynak sızıntısı probe'ları (tamamı 404 — hiçbir metadata açığa çıkmıyor)

`/package.json`, `/.git/config`, `/version`, `/api/version`, `/api/v1/version`, `/metrics`, `/robots.txt`, `/favicon.ico`

### Önceki denetim oturumlarının aynı sonucu

`Cursor-Flutter-/docs/` altındaki daha eski raporlar bu bulguyu bağımsız olarak doğruluyor:

- `PRODUCTION_ACCESS_REQUIRED.md` (2026-08-09): `SOURCE STATUS: NOT ACCESSIBLE`; `api/` klasörü açıkça **"mirror (yerel test)"** olarak tanımlanmış, üretim değil.
- `STAGE10_PRODUCTION_ACCESS_BLOCKER.md`: "hangi commit/branch'ten build edildiği doğrulanamadı".
- `API_PARITY_STAGE11_ACCESS_RECOVERY.md`: `PRODUCTION SOURCE FOUND: NO`, `ABACUS ACCESS: BLOCKED`.

Bu raporlarda geçen tek platform metadata'sı: tahmini proje numarası `27294` (varlık URL kalıbından türetilmiş, doğrulanmamış) ve barındırma hesabı. **Deployment ID / Build ID / aktif revizyon = BİLİNMİYOR.**

---

## DEPLOYED COMMIT

```
DEPLOYED COMMIT: NOT VERIFIED
```

İkinci backend hiçbir sürüm/commit bilgisi yayınlamıyor (`/version`, `/api/version`, `/metrics` → 404),
yanıt başlıklarında build kimliği yok ve kaynak repo bulunamadığı için commit karşılaştırması yapılamıyor.
Tahmin edilmemiştir.

---

## SOURCE AVAILABLE

```
SOURCE CODE = NOT AVAILABLE
SOURCE AVAILABLE: NO
SOURCE VERIFIED: NO
```

Elde olan tek Express tabanlı kod (`Cursor-Flutter-/api`) üretimdeki servisin **mirror'ı/prototipidir**;
yukarıdaki 4 maddelik kanıt setiyle üretimden farklı olduğu ölçülmüştür. Bu kod üretim davranışını temsil etmez.

---

## ACTIVE FEATURES

Canlı probe ile doğrulanmış, ikinci backend'in **fiilen servis ettiği** özellik aileleri:

| Özellik ailesi | Durum | Kanıt (örnek) |
|---|---|---|
| PK (yayın düellosu) | AKTİF — yalnızca ikinci backend | `/api/pk/active` 200, `/api/pk/leaderboard` 200, `/api/pk/me/*` 401 (kimlik gerekli = uç var) |
| PK X1 + SSE | AKTİF | `/api/pk/stats/x1` 200, `/api/pk/x1/events` 200, `/api/pk/x1/stream` 200 (SSE) |
| PK moderasyon | AKTİF | `/api/pk/admin/bans` 401 |
| Hediye savaşları / hedefleri | AKTİF — yalnızca ikinci backend | `/api/gifts` 200, `/api/gifts/battles` 200, `/api/gifts/goals` 200 |
| Hediye içgörüleri (insights) | AKTİF — yalnızca ikinci backend | `/api/gifts/insights/feed|leaderboard|map` 200, `/api/gifts/insights/me/*` 401 |
| Hediye görevleri (missions) | AKTİF — yalnızca ikinci backend | `/api/gifts/missions` 200, `/api/gifts/missions/me` 401 |
| Üyelik planları | AKTİF (kısmi) | `/api/membership/plans` 200 |
| Canlı PK / misafir (guest) | AKTİF — yalnızca ikinci backend | `/api/live/pk/active` 200, `/api/live/guest/list` 200 |
| Oyun odaları | AKTİF (kısmi) | `/api/games` 200, `/api/games/rooms` 200 |
| Sohbet odaları (okuma) | AKTİF (her iki backend'de) | `/api/chat/rooms` 200, `/api/chat/rooms/{id}` 200 |
| Video yayın listesi | AKTİF (her iki backend'de) | `/api/video-streams` 200 |
| Bildirimler | AKTİF (her iki backend'de) | `/api/notifications` 401 |
| Kredi paketleri / ödeme yöntemleri | AKTİF (her iki backend'de) | `/api/credit-packages` 200, `/api/payments/methods` 200 |
| Socket / realtime | AKTİF — yalnızca ikinci backend | `/socket.io/?EIO=4&transport=polling` 200 |
| Admin hediye geliri kuralları | AKTİF | `/api/admin/gifts/revenue/rules` 401 |

**İkinci backend'de OLMAYAN (ana backend'de olan):** kimlik doğrulama (`/api/auth/*`), cüzdan (`/api/wallet`), hikâyeler (`/api/stories`), kısa videolar (`/api/short-videos`), müzik (`/api/music/*`), görüntülü altyapı imzası (`/api/trtc/usersig`), üyelik satın alma ailesi (`/api/memberships*`, `/api/membership-badges`), `/api/games/room`, `/api/games/play`.

---

## ACTIVE ROUTES

Canlı probe matrisi. `SECOND` = `canlifalapi.abacusai.app`, `MAIN` = `canlifal.com`.
Probe'lar GET ile yapılmıştır; POST-only uçlar GET'te 404/405 döndürebilir (satırlarda belirtildi).

### PK

| Yol | SECOND | MAIN | Sınıf |
|---|---|---|---|
| `/api/pk/active` | 200 | 404 | PK |
| `/api/pk/leaderboard` | 200 | 404 | PK |
| `/api/pk/me/stats` | 401 | 404 | PK / AUTH |
| `/api/pk/me/matches` | 401 | 404 | PK / AUTH |
| `/api/pk/me/invites` | 401 | 404 | PK / AUTH |
| `/api/pk/me/history` | 401 | 404 | PK / AUTH |
| `/api/pk/stats/x1` | 200 | 404 | PK |
| `/api/pk/x1/events` | 200 | 404 | PK / SOCKET(SSE) |
| `/api/pk/x1/stream` | 200 | 404 | PK / SOCKET(SSE) |
| `/api/pk/admin/bans` | 401 | 404 | PK / AUTH |
| `/api/pk`, `/api/pk/battles`, `/api/pk/room`, `/api/pk/request` | 404 (GET) | 404 | PK — POST-only olabilir, GET probe kesin değil |

### GIFTS

| Yol | SECOND | MAIN | Sınıf |
|---|---|---|---|
| `/api/gifts` | 200 | 404 | GIFTS |
| `/api/gifts/battles` | 200 | 404 | GIFTS |
| `/api/gifts/goals` | 200 | 404 | GIFTS |
| `/api/gifts/insights/feed` | 200 | 404 | GIFTS |
| `/api/gifts/insights/leaderboard` | 200 | 404 | GIFTS |
| `/api/gifts/insights/map` | 200 | 404 | GIFTS |
| `/api/gifts/insights/me/badge` | 401 | 404 | GIFTS / AUTH |
| `/api/gifts/insights/me/history` | 401 | 404 | GIFTS / AUTH |
| `/api/gifts/insights/me/recommendations` | 401 | 404 | GIFTS / AUTH |
| `/api/gifts/missions` | 200 | 404 | GIFTS |
| `/api/gifts/missions/me` | 401 | 404 | GIFTS / AUTH |

### MEMBERSHIP

| Yol | SECOND | MAIN | Sınıf | Not |
|---|---|---|---|---|
| `/api/membership/plans` | 200 | 404 | MEMBERSHIP | yalnızca ikinci backend |
| `/api/memberships` | 404 | 200 | MEMBERSHIP | 🔴 yanlış yönlendirme |
| `/api/memberships/packages` | 404 | 200 | MEMBERSHIP | 🔴 yanlış yönlendirme |
| `/api/membership-badges` | 404 | 200 | MEMBERSHIP | 🔴 yanlış yönlendirme |
| `/api/membership`, `/api/membership/packages` | 404 | 404 | MEMBERSHIP | yönlendirici öneki, gerçek uç değil |

### LIVE GUEST

| Yol | SECOND | MAIN | Sınıf |
|---|---|---|---|
| `/api/live/pk/active` | 200 | 404 | LIVE GUEST / PK |
| `/api/live/guest/list` | 200 | 404 | LIVE GUEST |
| `/api/live/guest` | 404 | 404 | LIVE GUEST (önek) |

### GAME

| Yol | SECOND | MAIN | Sınıf | Not |
|---|---|---|---|---|
| `/api/games` | 200 | 200 | GAME | her ikisinde |
| `/api/games/rooms` | 200 | 404 | GAME | yalnızca ikinci |
| `/api/games/room` | 404 | 200 | GAME | 🔴 yanlış yönlendirme |
| `/api/games/play` | 404 | 405 | GAME | 🔴 yanlış yönlendirme (MAIN'de POST) |
| `/api/games/auto-match` | 404 | 404 | GAME | 🔴 hiçbir yerde yok |

### SOCKET / REDIS

| Yol | SECOND | MAIN | Sınıf |
|---|---|---|---|
| `/socket.io/?EIO=4&transport=polling` | 200 | — | SOCKET |
| `/api/pk/x1/stream` | 200 | 404 | SOCKET (SSE) |
| `/api/v1/health` → `redis:"connected"` | 200 | — | REDIS |

### AUTH / USER / BALANCE / JETON / PAYMENT

| Yol | SECOND | MAIN | Sınıf | Otorite |
|---|---|---|---|---|
| `/api/auth/login` | 404 | 400 | AUTH | MAIN |
| `/api/auth/register` | 404 | 400 | AUTH | MAIN |
| `/api/auth/mobile-login` | 404 | 405 | AUTH | MAIN |
| `/api/auth/refresh` | 404 | 400 | AUTH | MAIN |
| `/api/v1/auth/mobile-login` | 404 | 405 | AUTH | MAIN |
| `/api/v1/me` | 404 | 401 | USER | MAIN |
| `/api/users/me` | 401 | 404 | USER | SECOND |
| `/api/user/profile` | 401 | 401 | USER | her ikisi |
| `/api/me` | 404 | 401 | USER | MAIN |
| `/api/wallet` | 404 | 401 | BALANCE | MAIN |
| `/api/wallet/balance`, `/api/balance`, `/api/credits`, `/api/transactions` | 404 | 404 | BALANCE/JETON | yok |
| `/api/credit-packages` | 200 | 200 | JETON | her ikisi |
| `/api/payments/methods` | 200 | 200 | PAYMENT | her ikisi |
| `/api/payment/methods`, `/api/payment/config` | 404 | 404 | PAYMENT | yok |

**Kritik gözlem:** Kimlik doğrulama tamamen ana backend'de, ancak ikinci backend `401` döndürerek
aynı oturum belirtecini doğruluyor. Bu, iki servisin ortak bir kimlik/oturum kabulü olduğunu gösterir
(mekanizması doğrulanmadı — `NOT VERIFIED`).

---

## ACTIVE REDIS USAGE

> Uyarı: Bu bölüm mirror kaynak kodundan (`Cursor-Flutter-/api/src/lib/redis/`) çıkarılmıştır.
> Üretim kaynağı elde olmadığı için üretimdeki gerçek kullanım **NOT VERIFIED**'dir.
> Doğrulanan tek üretim gerçeği: `/api/v1/health` → `redis: "connected"` (yani üretimde Redis bağlı ve kullanılıyor).
> Bağlantı adresi, portu ve kimlik bilgileri bu rapora **bilinçli olarak yazılmamıştır**.

| Özellik | Modül | Zorunlu mu? |
|---|---|---|
| Socket / pubsub yayını | `pubsub.ts` | Tek örnekte opsiyonel, **çok örnekte ZORUNLU** |
| Kullanıcı varlığı (presence) | `presence.ts` | Bellek yedeği var; çok örnekte fiilen ZORUNLU |
| Sesli oda durumu (konuşmacı/yönetici/dinleyici) | `voiceRoomState.ts` | Bellek yedeği var; çok örnekte fiilen ZORUNLU |
| PK önbelleği | `lib/pkCache.ts` | Opsiyonel (L1 bellek + Redis) |
| Hediye kuyruğu (worker) | `giftQueue.ts` + `bootstrap.ts` | Opsiyonel (bellek akışı yedeği) |
| Bildirim kuyruğu | `notificationQueue.ts` | Opsiyonel |
| Oturum saklama | `session.ts` | Opsiyonel |
| Hız sınırlama (login/message/gift/api) | `rateLimit.ts` | Opsiyonel |
| Müzik kuyruğu | `musicQueue.ts`, `lib/musicQueueService.ts` | Opsiyonel |
| Kısa video trendleri | `shortsTrending.ts` | Opsiyonel |
| Canlı yayın metrikleri | `liveStreamMetrics.ts` | Opsiyonel |
| Yapay zekâ önbelleği | `aiCache.ts` | Opsiyonel |
| Genel önbellek | `cache.ts` | Opsiyonel |
| Yedek katman | `memoryKv.ts` (TTL destekli bellek KV) | — |

Redis'e dokunan rotalar/kütüphaneler: `routes/short_videos.ts, chat_rooms.ts, social.ts, auth.ts, games.ts,
profileExtras.ts, auth_mobile.ts, gifts.ts, home.ts, index.ts` ve `lib/authRedisHooks.ts, lib/pkCache.ts,
lib/musicQueueService.ts, lib/chatRoomStore.ts`.

**Ana backend'de karşılığı olan paylaşımlı durum katmanı YOKTUR** (AŞAMA B0'da doğrulandı).
Bu, tek backend hedefinin en büyük teknik boşluğudur.

---

## DATABASE

```
SAME DATABASE
```

AŞAMA B0'da kanıtlandı: iki backend de aynı veritabanını okuyor (aynı kayıt kimliklerinin her iki
servisten de dönmesiyle doğrulandı). Bu raporda tekrar doğrulanan destekleyici gerçek:
ikinci backend sağlık ucu `db: "connected"` bildiriyor ve ana backend'de oluşturulmuş sohbet odası
kimliği ikinci backend'den de 200 ile okunabiliyor (`/api/chat/rooms/cmokyb9o9007iod09gi6pb1tb`).

Bağlantı dizgisi, kullanıcı adı ve parola bu rapora **yazılmamıştır**.

**Risk:** Tek veritabanı, iki farklı veri modeli tanımı. Hangi servisin yazma otoritesi olduğu
şema düzeyinde tanımlı değil — `NOT VERIFIED`.

---

## SCHEMA DIFFERENCES

Karşılaştırma: ana backend veri modeli (**196 model**) ↔ mirror veri modeli (**36 model**).
Mirror üretimi temsil etmediği için bu tablo *yalnızca yön gösterici*dir.

| Model | SECOND BACKEND MODEL | MAIN BACKEND MODEL | FIELD DIFFERENCE |
|---|---|---|---|
| User | VAR (38 alan) | VAR (123 alan) | Yalnızca ikincide: `avatarUrl, coins, conversationsA/B, coverUrl, displayName, emailVerificationCode, emailVerificationExpiresAt, emailVerifiedAt, favorites, followerCount, followingCount, fortuneTeller, googleId, language, passwordHash, refreshTokens, tiktokId, updatedAt` (19) · Yalnızca anada: 104 alan |
| Conversation | VAR (11) | VAR (8) | Yalnızca ikincide: `lastMessage, messages, unreadForA, unreadForB, updatedAt, userA, userAId, userB, userBId` (9) · Yalnızca anada: 6 alan |
| PKBattle | VAR (21) | VAR (19) | Yalnızca ikincide: `battleType, challengerId, challengerScore, durationSeconds, endTime, gifts, liveStreamId, opponentId, opponentLiveStreamId, opponentScore, opponentVoiceRoomId, participants, result, startTime, targetScore, updatedAt, voiceRoomId` (17) · Yalnızca anada: 15 alan |
| SocialPost | VAR (18) | VAR (17) | Yalnızca ikincide: `author, authorId, caption, commentsCount, fortuneCount, fortuneLink, isAutoShare, likesCount, mediaUrl, viewCount` (10) · Yalnızca anada: 9 alan |
| Gift | VAR (15) | **YOK** (ana tarafta karşılığı `GiftType`, 89 alan) | Model adı ve yapısı uyumsuz — doğrudan eşleme yok |
| GiftEvent | VAR (20) | VAR (20) | Yalnızca ikincide: `coinCost, combo, gift, giftId, ownerGross, ownerNet, platform, receiverGross, receiverName, receiverNet, roomId, roomType, senderName, streamId` (14) |
| GiftBattle | **YOK** | VAR (12) | Canlı ikinci backend `/api/gifts/battles` servis ediyor ama mirror'da model yok → mirror ≠ üretim |
| Membership / UserMembership | **YOK** | **YOK** (ana tarafta `MembershipPlan`, 21 alan) | — |
| MembershipPlan | **YOK** | VAR (21) | Canlı ikinci backend `/api/membership/plans` servis ediyor ama mirror'da model yok |
| Live / LiveSession | **YOK** | VAR (23) | — |
| VideoStream | **YOK** | VAR (24) | Canlı ikinci backend `/api/video-streams` servis ediyor |
| Room / ChatRoom | **YOK** | VAR (37) | Canlı ikinci backend `/api/chat/rooms` servis ediyor |
| GameRoom | **YOK** | VAR (25) | Canlı ikinci backend `/api/games/rooms` servis ediyor |
| Balance | **YOK** | **YOK** | Bakiye ayrı model değil, kullanıcı alanlarında tutuluyor |
| Transaction | **YOK** | **YOK** (ana tarafta `CreditTransaction`, 8 alan) | Model adı uyumsuz |

**Mirror'ın 36 modeli:** AppNotification, CfcPaymentRequest, CfcSettings, Conversation, DevicePushToken,
DirectMessage, Follow, FortuneTeller, Gift, GiftEvent, MusicActionLog, MusicQueue, PKBattle, PKGift,
PKParticipant, PKResult, PaymentAuditLog, RefreshToken, RoomCurrentSong, RoomSongHistory, RoomSongQueue,
ShortVideo, ShortVideoComment, ShortVideoLike, ShortVideoSave, ShortVideoView, SocialFortunePost,
SocialPost, SocialPostComment, SocialPostLike, User, UserFavorite, UserFortune, VoiceRoom,
VoiceRoomFinanceAuditLog, VoiceRoomSettings.

🔴 **Kanıt:** Mirror'da `VideoStream`, `ChatRoom`, `GameRoom`, `MembershipPlan`, `GiftBattle` modelleri yok,
ama canlı ikinci backend bu kaynakların hepsini 200 ile servis ediyor. Bu, mirror şemasının üretim
şemasını temsil etmediğinin doğrudan kanıtıdır.

---

## FLUTTER CALLS

Uygulamanın toplam 521 farklı uç çağrısından **463'ü ana backend'e**, **58'i ikinci backend'e** yönlendiriliyor
(yönlendirme kuralı: `mobile/lib/core/network/api_backend_router.dart`).

Yöntem çıkarımı: `_dio.safeGet/safePost/safePut/safePatch/safeDelete(ApiEndpoints.X, ...)` çağrı kalıbı
taranarak. Çıkarılamayanlar dürüstçe `UNKNOWN` bırakılmıştır — tahmin edilmemiştir.

| FEATURE | METHOD | PATH | SECOND | CANONICAL MAIN BACKEND EQUIVALENT | STATUS |
|---|---|---|---|---|---|
| GAME | POST | `/api/games/auto-match` | 404 | yok | MISSING BOTH |
| GAME | POST | `/api/games/play` | 404 | `/api/games/play` (405=POST var) | MISROUTED |
| GAME | POST | `/api/games/room` | 404 | `/api/games/room` (200) | MISROUTED |
| GAME | GET,POST | `/api/games/room/$roomId` | — | ana backend'de var | MISROUTED |
| GAME | POST | `/api/games/room/$roomId/chat` | — | ana backend'de var | MISROUTED |
| GAME | POST | `/api/games/room/$roomId/join` | — | ana backend'de var | MISROUTED |
| GAME | UNKNOWN | `/api/games/room/$roomId/viewers` | — | — | DECLARED ONLY |
| GAME | — | `/api/games/room/abc123`, `/api/games/room/abc123/join` | — | — | TEST ARTIFACT |
| GAME | GET,POST | `/api/games/rooms` | 200 | yok | NEEDS MIGRATION |
| GIFTS | GET,POST | `/api/gifts/battles` | 200 | yok | NEEDS MIGRATION |
| GIFTS | GET | `/api/gifts/battles/$id` | 200 (aile) | yok | NEEDS MIGRATION |
| GIFTS | GET,POST | `/api/gifts/goals` | 200 | yok | NEEDS MIGRATION |
| LIVE GUEST | GET | `/api/live/guest/list` | 200 | yok | NEEDS MIGRATION |
| LIVE GUEST | — | `/api/live/guest/` | 404 | — | ROUTER PREFIX (uç değil) |
| LIVE GUEST | GET | `/api/live/pk/active` | 200 | yok | NEEDS MIGRATION |
| MEMBERSHIP | GET | `/api/membership-badges` | 404 | `/api/membership-badges` (200) | MISROUTED |
| MEMBERSHIP | GET | `/api/memberships` | 404 | `/api/memberships` (200) | MISROUTED |
| MEMBERSHIP | GET | `/api/memberships/packages` | 404 | `/api/memberships/packages` (200) | MISROUTED |
| MEMBERSHIP | POST | `/api/memberships/purchase` | 404 | ana backend ailesi | MISROUTED |
| MEMBERSHIP | — | `/api/membership`, `/api/membership/packages`, `/api/membership/plans` | — | — | ROUTER PREFIX / DECLARED ONLY |
| PK | — | `/api/pk`, `/api/pk/` | — | — | ROUTER PREFIX (uç değil) |
| PK | GET | `/api/pk/$matchId` | aile 200 | yok | NEEDS MIGRATION |
| PK | POST | `/api/pk/$matchId/cancel` | aile | yok | NEEDS MIGRATION |
| PK | POST | `/api/pk/$matchId/end` | aile | yok | NEEDS MIGRATION |
| PK | GET,POST | `/api/pk/$matchId/events` | 200 (x1) | yok | NEEDS MIGRATION |
| PK | POST | `/api/pk/$matchId/respond` | aile | yok | NEEDS MIGRATION |
| PK | POST | `/api/pk/$matchId/seats/join` | aile | yok | NEEDS MIGRATION |
| PK | POST | `/api/pk/$matchId/seats/kick` | aile | yok | NEEDS MIGRATION |
| PK | POST | `/api/pk/$matchId/seats/leave` | aile | yok | NEEDS MIGRATION |
| PK | POST | `/api/pk/$matchId/start` | aile | yok | NEEDS MIGRATION |
| PK | GET (SSE) | `/api/pk/$matchId/stream` | 200 (x1) | yok | NEEDS MIGRATION — SSE |
| PK | GET | `/api/pk/active` | 200 | yok | NEEDS MIGRATION |
| PK | POST | `/api/pk/admin/$matchId/force-end` | aile | yok | NEEDS MIGRATION |
| PK | POST | `/api/pk/admin/$matchId/force-kick/$userId` | aile | yok | NEEDS MIGRATION |
| PK | POST | `/api/pk/admin/ban` | POST-only | yok | NEEDS MIGRATION |
| PK | GET | `/api/pk/admin/bans` | 401 | yok | NEEDS MIGRATION |
| PK | POST | `/api/pk/admin/unban/$userId` | aile | yok | NEEDS MIGRATION |
| PK | UNKNOWN | `/api/pk/battles` | 404 (GET) | yok | DECLARED ONLY |
| PK | GET | `/api/pk/battles/$battleId` | aile | yok | NEEDS MIGRATION |
| PK | UNKNOWN | `/api/pk/battles/$battleId/accept|end|reject` | — | — | DECLARED ONLY |
| PK | GET | `/api/pk/history` | — | yok | NEEDS MIGRATION (yedek yol) |
| PK | GET | `/api/pk/leaderboard` | 200 | yok | NEEDS MIGRATION |
| PK | GET | `/api/pk/me/history` | 401 | yok | NEEDS MIGRATION |
| PK | GET | `/api/pk/me/invites` | 401 | yok | NEEDS MIGRATION |
| PK | GET | `/api/pk/me/matches` | 401 | yok | NEEDS MIGRATION |
| PK | GET | `/api/pk/me/stats` | 401 | yok | NEEDS MIGRATION |
| PK | POST | `/api/pk/request` | POST-only | yok | NEEDS MIGRATION |
| PK | POST | `/api/pk/room` | POST-only | yok | NEEDS MIGRATION |
| PK | GET | `/api/pk/stats/$userId` | 200 (x1 örneği) | yok | NEEDS MIGRATION |
| PK | — | `/api/pk/stats/:userId`, `/api/pk/{id}/events`, `/api/pk/cm123/stream` | — | — | DOC/TEST ARTIFACT |

Özet: 58 çağrının **32'sinde HTTP yöntemi kanıtlanarak çıkarıldı**, 8'i yönlendirici öneki veya
doküman/test kalıntısı, 8'i yalnızca tanımlı (çağrılmıyor), 10'unda yöntem `UNKNOWN`.

---

## ROUTES TO MIGRATE

İkinci backend'de **canlı olarak çalışan ve ana backend'de karşılığı bulunmayan** uçlar.
Bunlar tek backend hedefinde ana backend'e taşınmak zorundadır (bu aşamada TAŞINMADI).

**PK ailesi (SSE dahil):** `/api/pk/active`, `/api/pk/leaderboard`, `/api/pk/me/stats`, `/api/pk/me/matches`,
`/api/pk/me/invites`, `/api/pk/me/history`, `/api/pk/history`, `/api/pk/stats/{userId}`, `/api/pk/request`,
`/api/pk/room`, `/api/pk/{matchId}` ve alt uçları (`start, cancel, end, respond, events, stream,
seats/join, seats/kick, seats/leave`), `/api/pk/battles/{id}`, `/api/pk/admin/*`, `/api/pk/x1/*`

**Hediye ailesi:** `/api/gifts`, `/api/gifts/battles`, `/api/gifts/battles/{id}`, `/api/gifts/goals`,
`/api/gifts/insights/feed`, `/api/gifts/insights/leaderboard`, `/api/gifts/insights/map`,
`/api/gifts/insights/me/badge`, `/api/gifts/insights/me/history`, `/api/gifts/insights/me/recommendations`,
`/api/gifts/insights/album/{userId}`, `/api/gifts/insights/badge/{id}`, `/api/gifts/insights/collection/{userId}`,
`/api/gifts/insights/first-gifter/{ctx}/{id}`, `/api/gifts/missions`, `/api/gifts/missions/me`,
`/api/gifts/missions/{id}/claim`, `/api/admin/gifts/revenue/rules`

**Canlı yayın / misafir:** `/api/live/pk/active`, `/api/live/guest/list`

**Oyun:** `/api/games/rooms`

**Üyelik:** `/api/membership/plans`

**Kullanıcı:** `/api/users/me`

**Realtime altyapısı:** `/socket.io/*` ve SSE akışları — bunlar rota taşımasıyla bitmez; ana backend'de
paylaşımlı durum katmanı gerektirir (bkz. MIGRATION BLOCKERS).

> Taşıma için üretim kaynak kodu gereklidir. Kaynak olmadan bu uçların iş kuralları,
> doğrulamaları ve yan etkileri yeniden üretilemez.

---

## ROUTES TO RETIRE

Silme işlemi bu aşamada YAPILMAMIŞTIR. Aşağıdakiler yalnızca *aday* olarak işaretlenmiştir.

### 120 "hiçbir backend'de bulunamayan" ucun sınıflandırması

Yöntem: her yol için sabit tanımı (`api_endpoints.dart`) çözüldü, ardından `ApiEndpoints.X` kullanımı
üretim kodunda (test klasörü, yönlendirici ve sabit dosyası hariç) aranıp, somut yollar canlı probe edildi.

| Kategori | Sayı | Anlamı | Karar |
|---|---|---|---|
| **A — gerçekten gerekli, hiçbir yerde yok** | 25 | Üretim ekranından/veri kaynağından çağrılıyor, her iki backend'de de 404 | Uygulanmalı (AŞAMA B kapsamı) |
| **B — kullanılmıyor** | 27 | Yalnızca sabit tanımı veya test dosyasında geçiyor | Emeklilik adayı |
| **C — ikinci backend/başka servis nedeniyle eksik görünüyor** | 68 | Çağrılıyor ve canlıda karşılığı var (çoğunlukla ikinci backend'de), envanter taraması görmemişti | Silinmeyecek — taşınacak/eşlenecek |

#### Kategori A — gerçekten eksik (canlı probe: her iki backend 404, üretim kodundan çağrılıyor)

`/api/admin/mobile-auth`, `/api/admin/voice-room-backgrounds`, `/api/blog/recent`,
`/api/fortune-access/consume`, `/api/fortune-access/settings`, `/api/mobile/auth/web-session`,
`/api/notifications/unread`, `/api/short-videos/explore/nearby`, `/api/short-videos/hashtags/search`,
`/api/short-videos/hashtags/trending`, `/api/short-videos/music/recommend`, `/api/social/announcements`,
`/api/social/fortune-tellers`, `/api/teller/gifts`, `/api/teller/reviews`, `/api/user/cosmetics`,
`/api/user/cosmetics/equip`, `/api/user/cosmetics/loadout`, `/api/user/profile/cosmetics/equip`,
`/api/user/daily-tasks`, `/api/user/device-token`, `/api/users/me/profile-visitors`,
`/api/short-videos/$id/analytics`, `/api/short-videos/$id/gifts`, `/api/short-videos/$id/subtitles/generate`

#### Kategori C — ikinci backend veya başka servis nedeniyle eksik görünenler (örnekler)

Canlı kanıtla çalışıyor: `/api/gifts/battles` (200), `/api/gifts/goals` (200),
`/api/gifts/insights/feed|leaderboard|map` (200), `/api/gifts/insights/me/*` (401),
`/api/gifts/missions` (200), `/api/gifts/missions/me` (401), `/api/admin/gifts/revenue/rules` (401),
`/api/live/guest/list` (200), `/api/live/pk/active` (200), `/api/pk/active` (200),
`/api/pk/leaderboard` (200), `/api/pk/me/*` (401), `/api/pk/admin/bans` (401) — hepsi ikinci backend'de.
Ana backend'de bulunanlar: `/api/auth/mobile/device-token` (400), `/api/v1/auth/mobile-login` (405),
`/api/v1/me` (401), `/api/chat/rooms/$roomId` ailesi, `/api/video-streams/$streamId/*`,
`/api/messages/conversations/$id/stream`, `/api/fortunes/$slug`.
`/api/`, `/api/v1/...`, `/api/v1/$trimmed` gibi kayıtlar ise yol önek oluşturucu kodundan gelen
tarama kalıntılarıdır — gerçek uç değildir.

> Kural uygulandı: kodda çağrılmayan hiçbir uç, yalnızca raporda eksik göründüğü için "gerekli" sayılmamıştır.

### Kategori B — kodda çağrılmıyor (yalnızca sabit tanımı veya test) — 27 uç

`/api/blog/$slug`, `/api/celebrities/$id`, `/api/celebrities/$id/follow`, `/api/celebrities/$id/posts`,
`/api/chat/rooms/$roomId/messages/$messageId`, `/api/chat/rooms/$roomId/pk/$battleId/end`,
`/api/chat/rooms/$roomId/pk/$inviteId/respond`, `/api/chat/rooms/{id}/pk[...]`,
`/api/chat/rooms/cm123/pk/battle-1/end` (test), `/api/chat/rooms/cm123/pk/inv-1/respond` (test),
`/api/fan-clubs/$id/join`, `/api/fan-clubs/$id/polls`, `/api/fan-clubs/$id/posts`, `/api/fan-clubs/popular`,
`/api/games/quests/$questId`, `/api/live-fal/pending`, `/api/live-fal/request/$requestId/accept`,
`/api/live-fal/request/$requestId/reject`, `/api/live/pk/sweep` (test), `/api/live/streams` (test),
`/api/membership/plans` (yalnızca yönlendirici yorumu), `/api/pk/cm123/stream` (test),
`/api/rooms/$roomId/music/current` (test), `/api/social/public-stats`, `/api/user/fortunes/$fortuneId/pin`,
`/api/user/fortunes/$fortuneId/rate`, `/api/user/story`

**Karar:** Emeklilik adayı. Hiçbiri üretim akışından çağrılmıyor. Yine de silinmeden önce
ürün tarafında "planlanan özellik mi" sorusu yanıtlanmalı.

---

## DATA RISK

| # | Risk | Şiddet | Gerekçe |
|---|---|---|---|
| 1 | Tek veritabanı, iki farklı model tanımı | **YÜKSEK** | Aynı tablolara iki farklı alan kümesiyle yazım. Yazma otoritesi tanımsız. |
| 2 | `Gift` ↔ `GiftType`, `Transaction` ↔ `CreditTransaction` model adı uyumsuzluğu | **YÜKSEK** | Hediye ve jeton hareketleri finansal veridir; yanlış eşleme para kaybı/çift kayıt üretir. |
| 3 | `User` modelinde 19 alan yalnızca ikinci tarafta, 104 alan yalnızca ana tarafta | **YÜKSEK** | Kimlik/bakiye alanları (`coins`, `passwordHash`, `refreshTokens`) ayrışmış. |
| 4 | Üretim kaynak kodu bilinmiyor | **KRİTİK** | Hangi servisin hangi tabloya yazdığı statik olarak doğrulanamıyor. |
| 5 | Redis'te tutulan geçici durum (presence, oda durumu, kuyruklar) | **ORTA** | İkinci backend kapatılırsa devam eden PK/oda oturumları kaybolur. |
| 6 | Hediye kuyruğu worker'ı | **YÜKSEK** | Kuyruk işlenmeden servis durursa hediye/jeton hareketleri düşebilir. |
| 7 | Yanlış yönlendirilen 5 uç | **ORTA** | `/api/memberships*`, `/api/membership-badges`, `/api/games/room`, `/api/games/play` şu anda 404 alıyor olabilir → kullanıcıya bozuk ekran. |

---

## MIGRATION BLOCKERS

```
BLOCKED — SECOND BACKEND SOURCE CODE REQUIRED
```

1. **Üretim kaynak kodu yok.** İkinci backend'in hangi repodan, hangi daldan, hangi commit'ten
   deploy edildiği doğrulanamadı. Elde olan `api/` klasörü kanıtlanmış şekilde farklı bir mirror'dır.
2. **Tek veritabanı, iki şema, tanımsız otorite.** Hangi servisin hangi tabloda yazma yetkisi olduğu
   belirlenmeden taşıma veri bozar.
3. **Ana backend'de paylaşımlı durum katmanı yok.** İkinci backend Redis üzerinde presence, oda durumu,
   pubsub ve kuyruk çalıştırıyor; ana backend'de karşılığı yok. Socket/SSE taşıması bu katman olmadan mümkün değil.
4. **120 tanımsız uç.** Uygulamanın çağırdığı 120 yolun hiçbir backend envanterinde karşılığı yoktu;
   bu raporda 93'ünün gerçekten çağrıldığı, 51 somut yolun canlı durumu ölçüldü. 25 tanesi
   her iki backend'de de 404 → gerçek eksik.
5. **5 yanlış yönlendirme.** `/api/memberships`, `/api/memberships/packages`, `/api/membership-badges`,
   `/api/games/room`, `/api/games/play` uygulamada ikinci backend'e gönderiliyor ama yalnızca ana backend'de var.
6. **Deployment kontrolü yok.** İkinci backend'in build/deploy hattı bu ortamdan görünmüyor;
   değişiklik yapılsa bile yayına alınamaz.

### KRİTİK DURDURMA

```
DO NOT MIGRATE
DO NOT DELETE
DO NOT DISABLE
```

İkinci backend şu anda PK, hediye savaşları/hedefleri/içgörüleri/görevleri, canlı misafir listesi,
oyun odaları, üyelik planları ve socket/SSE trafiğini fiilen taşımaktadır. Kaynak kodu elde edilmeden
yapılacak herhangi bir kapatma, silme veya taşıma **üretimde özellik kaybına** yol açar.

---

## NEXT STEP

Hedef mimari (değişmedi):

```
Flutter → ONE API CLIENT → https://canlifal.com → ONE AUTHORITATIVE BACKEND → ONE DATABASE
```

Bu hedefe geçebilmek için sırasıyla gerekenler:

1. **Üretim kaynağının açılması (ZORUNLU / BLOKE EDİCİ).** İkinci backend'in barındırma
   projesine erişim verilmesi veya üretim kodunun bir repoya export edilip dal + commit bilgisiyle
   paylaşılması. Bu olmadan AŞAMA B başlatılamaz.
2. Kaynak geldiğinde: rota rota API sözleşmesinin (istek/yanıt şeması, kimlik, hata biçimi) çıkarılması.
3. Veri modeli otoritesinin tablo bazında karara bağlanması (hangi servis yazar).
4. Ana backend'e paylaşımlı durum katmanının eklenmesi (presence, oda durumu, pubsub, kuyruklar).
5. Yanlış yönlendirilen 5 ucun düzeltilmesi (tek satırlık yönlendirme değişikliği, düşük risk —
   ayrı ve bağımsız olarak yapılabilir).
6. Sonra AŞAMA B (tek API sözleşmesi) → C (tekrar temizliği) → D (performans) → E (uygulama bağlama) → F (kabul testi).

**Bu aşama burada durur. Onay verilmeden hiçbir taşıma/silme/kapatma yapılmayacaktır.**
