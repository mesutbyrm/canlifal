# CANLIFAL — BACKEND API REFERENCE (Flutter Master Contract)

> **Bu dosya Flutter'ın TEK ve GÜVENİLİR API kaynağıdır.**
> Flutter tarafı endpoint TAHMİN ETMEZ. Tüm sözleşme gerçek production backend'inden türetilmiştir.
>
> **Production ana backend:** `https://canlifal.com`
> **İkinci backend (audit):** `https://canlifalapi.abacusai.app` — yeni Flutter trafiği için KULLANILMAZ (yalnızca PK / bazı oyun uçları geçici olarak burada, bkz. §3).
>
> **Son doğrulama:** 2026-08-11 — canlifal.com üzerinde READ-ONLY smoke test + kod incelemesi.
> **Kaynak doğruluğu:** Endpoint yolları Flutter `lib/core/network/api_endpoints.dart` ve backend `app/api/**/route.ts` ile birebir eşleştirilmiştir.

---

## 0. BAKIM KURALI (ZORUNLU)

Backend'de bir API her değiştiğinde **AYNI ANDA** güncellenir:

1. Backend kodu (`app/api/**/route.ts`)
2. Bu dosya (`docs/BACKEND_API_REFERENCE.md`)

- Flutter endpoint tahmin etmez; bu dosyayı kaynak alır.
- Yeni sürüm (V1/V2) türetilmez; çalışan uç yeniden adlandırılmaz.
- API contract gerçek production backend'den türetilir, tahminle değil.

---

## 1. GLOBAL SÖZLEŞME (Tüm uçlar için geçerli)

### 1.1 Base URL
```
https://canlifal.com
```
Tüm yollar `/api/...` ile başlar. Flutter `Env.apiBaseUrl` = `https://canlifal.com`.

### 1.2 Kimlik doğrulama (Authentication)
İki yöntem desteklenir (dual-auth):
- **Mobil (Flutter):** `Authorization: Bearer <accessToken>` (JWT). `dio_provider` başlığı otomatik ekler.
- **Web:** NextAuth oturum çerezi.

JWT payload: `{ userId, email, role, type: "access" }`. `NEXTAUTH_SECRET` ile imzalanır. Access token TTL kısadır; süresi dolunca `/api/auth/mobile-refresh` ile yenilenir.

### 1.3 İstek başlıkları (Headers)
```
Authorization: Bearer <accessToken>   # korumalı uçlar
Content-Type: application/json        # POST/PATCH/PUT gövdeli istekler
```

### 1.4 Standart hata cevabı (ana backend)
Ana backend TÜM hataları şu şekilde döner:
```json
{ "error": "<Türkçe mesaj>" }
```
Örnekler (gerçek):
- `401` → `{"error":"Oturum açmanız gerekiyor"}`
- `404` → `{"error":"Hediye savaşı bulunamadı"}`
- `400` → `{"error":"context ve contextId gereklidir"}`

> **DİKKAT — backend farkı:** İkinci backend (abacus) FARKLI hata formatı döner:
> `{"success":false,"statusCode":404,"message":"..."}`. Flutter yalnızca ana backend'i
> hedeflediği için ana backend formatını (`{error}`) esas almalıdır.

### 1.5 HTTP durum kodları (genel anlam)
| Kod | Anlam |
|-----|-------|
| 200 | Başarılı (GET / idempotent tekrar POST) |
| 201 | Kaynak oluşturuldu (yeni POST) |
| 400 | Geçersiz/eksik parametre |
| 401 | Token yok / geçersiz / süresi dolmuş |
| 403 | Yetki yok (sahiplik/rol) |
| 404 | Kaynak yok |
| 405 | Yöntem desteklenmiyor |
| 429 | Hız sınırı (rate limit) |
| 500 | Sunucu hatası |

### 1.6 SSE (Server-Sent Events)
Gerçek zamanlı akışlar `GET .../stream` uçlarıdır. Bağlantı:
```
GET https://canlifal.com/api/<...>/stream
Authorization: Bearer <accessToken>
Accept: text/event-stream
```
Olaylar `data: {json}\n\n` formatında akar. Bağlantı ana backend'e yapılır (tüm SSE üreticileri ana backend'de). Kopmada exponential backoff ile yeniden bağlan.

Başlıca SSE uçları:
- `/api/notifications/stream` — bildirimler
- `/api/chat/rooms/{roomId}/stream` — oda mesaj/presence
- `/api/video-streams/{streamId}/stream` — izleyici/sohbet/hediye/yayın sonu
- `/api/room/{sessionId}/stream` — canlı fal seansı
- `/api/fortune-tellers/sessions/stream` — falcı gelen istekleri

### 1.7 Pagination
Liste uçları genelde `?page=` / `?limit=` veya `?cursor=` / `?after=` (timestamp) kullanır. Çoğu public liste doğrudan JSON dizi (`[]`) veya `{ items: [...] }` / `{ streams: [...] }` döner. İlgili uçta belirtilmiştir.

### 1.8 Multipart / dosya yükleme
Görsel/video yükleme presigned URL akışıdır (doğrudan S3/R2'ye):
1. `POST /api/upload/presigned` (veya `/api/short-videos/upload-url`) → imzalı PUT URL alınır.
2. İstemci dosyayı doğrudan o URL'e `PUT` eder.
3. Dönen `cloudStoragePath` ilgili kaynak POST'unda gönderilir.
Okuma için gerekirse `POST /api/upload/get-url` imzalı okuma URL'i verir.

### 1.9 Timeout / Retry (Flutter)
- Bağlantı/alış timeout: 15–30 sn (SSE hariç; SSE uzun ömürlü).
- Retry: yalnızca idempotent GET'lerde, en fazla 2 kez, backoff ile. POST'larda retry YAPMA (battles/goals zaten sunucu tarafında idempotent).

---

## 2. FLUTTER-KRİTİK ENDPOINT SÖZLEŞMELERİ

### AUTH

## POST /api/auth/mobile-login
- **Purpose:** E-posta/kullanıcı adı + şifre ile mobil giriş, JWT üretir.
- **Auth:** Yok (public)
- **Headers:** `Content-Type: application/json`
- **Request:** `{ "email": "a@b.com", "password": "..." }` — `email` yerine `username` de kabul edilir.
- **Response 200:**
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "user": {
    "id": "...", "email": "...", "name": "...", "username": null,
    "role": "user", "image": null, "credits": 30, "jetonBalance": 0,
    "cfcBalance": 0, "membership": "basic", "membershipExpiresAt": null,
    "preferredLanguage": "tr", "level": 1, "bio": null, "phone": null,
    "birthDate": null, "birthTime": null
  }
}
```
- **Response 400:** `{"error":"E-posta/kullanıcı adı ve şifre gereklidir"}`
- **Response 401:** `{"error":"E-posta veya şifre hatalı"}`
- **Response 429:** `{"error":"Çok fazla istek. Lütfen biraz bekleyin."}`

## POST /api/auth/mobile-register
- **Purpose:** Yeni mobil kullanıcı kaydı.
- **Auth:** Yok (public)
- **Request:** `{ email, password, name, username, birthDate, birthTime, referralCode?, preferredLanguage? }`
- **Response 200:** `{ accessToken, refreshToken, user }` (login ile aynı yapı)
- **Response 400:** `{"error":"Zorunlu alanlar: email, password, name, username, birthDate, birthTime"}` / `{"error":"Geçersiz e-posta adresi"}` / `{"error":"Bu e-posta adresi zaten kayıtlı"}` / `{"error":"Bu kullanıcı adı zaten alınmış"}`

## POST /api/auth/mobile-refresh
- **Purpose:** Access token yenileme.
- **Auth:** Gövdedeki refreshToken ile
- **Request:** `{ "refreshToken": "<jwt>" }`
- **Response 200:** `{ accessToken, refreshToken, user }`
- **Response 400:** `{"error":"Refresh token gerekli"}`
- **Response 401:** `{"error":"Geçersiz veya süresi dolmuş token"}` / `{"error":"Kullanıcı bulunamadı"}`

## Diğer auth uçları
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/mobile-google` | Google ile mobil giriş |
| POST | `/api/auth/mobile-apple` | Apple ile mobil giriş |
| POST | `/api/auth/mobile-tiktok` | TikTok ile mobil giriş |
| POST | `/api/auth/logout` | Oturumu kapat |
| POST | `/api/auth/forgot-password` | Şifre sıfırlama e-postası |
| POST | `/api/auth/reset-password` | Yeni şifre belirle |
| POST | `/api/auth/change-password` | Şifre değiştir (Bearer) |
| GET/POST | `/api/auth/verify-device` | Cihaz doğrulama |
| POST | `/api/auth/reclaim-device` | Cihaz geri alma |

---

### KULLANICI / PROFİL

## GET /api/me
- **Purpose:** Oturumlu kullanıcının özet profili + bakiyeleri.
- **Auth:** Bearer (zorunlu)
- **Response 200 (gerçek):**
```json
{
  "id":"cmokscu960003pnkof538lpb5","email":"test@example.com","name":"Test User",
  "username":null,"phone":null,"image":null,"role":"user","credits":30,
  "jetonBalance":0,"cfcBalance":0,"membership":"basic","membershipExpiresAt":null,
  "preferredLanguage":"en","bio":null,"birthDate":null,"zodiacSign":null,
  "level":1,"xp":0,"loginStreak":0,"followersCount":0,"followingCount":0
}
```
- **Response 401:** `{"error":"Oturum açmanız gerekiyor"}`

## GET /api/user/profile
- **Purpose:** Detaylı profil (kozmetik öğeler dahil: nameEffect, chatBubbleId, micFrameId, avatarAccessoryIds).
- **Auth:** Bearer
- **Response 200:** `id, name, username, email, image, bio, credits, jetonBalance, role, membership, profileFrameId, nameEffect, entranceEffectId, chatBubbleId, micFrameId, avatarAccessoryIds, ...`
- **Response 401:** `{"error":"Oturum açmanız gerekiyor"}`

## GET /api/user/credits
- **Purpose:** Bakiye özeti.
- **Auth:** Bearer
- **Response 200 (gerçek):** `{"credits":30,"jetonBalance":0,"cfcBalance":0,"jetonTlRate":0.5,"withdrawalLimit":0,"membership":"basic","membershipExpiresAt":null}`

## GET /api/mobile/user-profile/{userId}
- **Purpose:** Başka kullanıcının herkese açık profili.
- **Auth:** Bearer
- **Path:** `userId`

Diğer: `GET /api/user/followers`, `/api/user/following`, `/api/user/received-gifts`, `/api/user/statistics`, `/api/user/active-sessions`, `POST /api/user/block`, `POST /api/user/report`, `POST /api/user/{userId}/follow` (toggle).

---

### GIFT BATTLES  (§7 — tam doğrulanmış)

## GET /api/gifts/battles
- **Purpose:** Bir bağlam için hediye savaşları listesi.
- **Auth:** Yok (public)
- **Query:** `context` (veya `contextType`/`roomType`), `contextId` (veya `roomId`/`voiceRoomId`), `status` (`active`|`ended`|`all`, varsayılan aktif)
- **Response 200:** JSON dizi. Aktif savaş yoksa `[]`.
- **Örnek (gerçek, `?status=all`):**
```json
[{
  "id":"cmrk08mtz000uuqo9uzyhyjll","context":"voice_room","contextId":"room_1783994459",
  "status":"ended","durationSec":180,"startedAt":"2026-07-14T02:00:59.542Z",
  "endsAt":"2026-07-14T02:03:59.542Z","secondsLeft":0,"lastCallActive":false,
  "winnerId":"cmrk08mlo000suqo9tm7rmfma","totalScore":0,
  "participants":[
    {"rank":1,"participantId":"cmrk08mlo000suqo9tm7rmfma","displayName":"A","score":0,"displayScore":"0"},
    {"rank":2,"participantId":"cmrk08mrs000tuqo9ngsopcz0","displayName":"B","score":0,"displayScore":"0"}
  ]
}]
```
- **Flutter beklenen alanlar:** `id, status, context, contextId, durationSec, secondsLeft, endsAt, startedAt, winnerId, totalScore, lastCallActive, participants[]{rank, participantId, displayName, score, displayScore}`.

## GET /api/gifts/battles/{battleId}
- **Auth:** Yok (public)
- **Path:** `battleId`
- **Response 200:** Tek savaş nesnesi (yukarıdaki yapı).
- **Response 404 (gerçek):** `{"error":"Hediye savaşı bulunamadı"}`

## POST /api/gifts/battles
- **Purpose:** Yeni hediye savaşı başlat (idempotent).
- **Auth:** Bearer (zorunlu; dual-auth)
- **Request:** `{ context, contextId|roomId|voiceRoomId, durationSec|duration, participants: [{ participantId|userId, displayName }] }` (en az 2 katılımcı)
- **Response 201:** Oluşan savaş nesnesi.
- **Response 200:** Bağlamda zaten aktif savaş varsa mevcut savaş (idempotency).
- **Response 400:** `{"error":"context ve contextId gereklidir"}` / en az 2 katılımcı yoksa 400.
- **Response 401 (gerçek):** `{"error":"Oturum açmanız gerekiyor"}`

---

### GIFT GOALS  (§7 — tam doğrulanmış)

## GET /api/gifts/goals
- **Purpose:** Bir bağlam için hediye hedefleri.
- **Auth:** Yok (public)
- **Query:** `context`, `contextId`, `status`
- **Response 200:** JSON dizi (aktif hedef yoksa `[]`).
- **Flutter beklenen alanlar:** `id, title, targetAmount, currentAmount, context, contextId, status, percent`.

## POST /api/gifts/goals
- **Purpose:** Yeni hediye hedefi (idempotent).
- **Auth:** Bearer (zorunlu; dual-auth)
- **Request:** `{ context, contextId|roomId, title, targetAmount }`
- **Response 201:** Oluşan hedef (`percent` dahil).
- **Response 200:** Bağlamda zaten aktif hedef varsa mevcut hedef.
- **Response 400:** `{"error":"context ve contextId gereklidir"}` / `targetAmount <= 0` → 400.
- **Response 401 (gerçek):** `{"error":"Oturum açmanız gerekiyor"}`

---

### GIFT (send / catalog / insights / missions)

## GET /api/gifts/version
- **Auth:** Yok. **Response 200 (gerçek):** `{"giftVersion":14,"themeVersion":2,"giftCount":25,"themeCount":1,"timestamp":"..."}` — Flutter katalog önbelleğini bu sürümle geçersiz kılar.

## GET /api/gifts/types
- **Auth:** Yok. **Response 200:** Aktif hediye türleri dizisi. Örnek öğe: `{id, name, nameEn, icon, animation, price, tier, assetUrl, assetType, soundUrl, isFullscreen, ...}` (medya URL'leri tam CDN).

## POST /api/gifts/send
- **Purpose:** Hediye gönder. **Auth:** Bearer. **DEĞİŞTİRİLMEDİ / DOKUNULMADI** (çalışan sistem — bkz. §8).

Diğer gift uçları:
| Method | Endpoint | Auth | Not |
|--------|----------|------|-----|
| GET | `/api/gifts/catalog` | dual | CMS tam katalog |
| GET | `/api/gifts/insights/feed` | Bearer | son hediye akışı (`{items:[...]}`) |
| GET | `/api/gifts/insights/leaderboard` | opsiyonel | liderlik |
| GET | `/api/gifts/insights/me/badge` | Bearer | kendi rozet |
| GET | `/api/gifts/missions` / `/me` | Bearer | görevler |
| POST | `/api/gifts/missions/{id}/claim` | Bearer | ödül al |
| GET/POST | `/api/gifts/lucky/config` `/send` `/history` | Bearer | şanslı hediye |
| GET | `/api/gifts/recent-big` | opsiyonel | son büyük hediyeler |
| GET | `/api/gifts/check-reciprocal?userId=` | Bearer | karşılıklı hediye |

---

### VOICE ROOM (Sesli sohbet odaları — /api/chat/rooms)

## GET /api/chat/rooms
- **Purpose:** Sesli/metin oda listesi. **Auth:** Yok (public).
- **Response 200 (gerçek öğe):** `{id, slug, nameTr, nameEn, icon, ownerId, owner{id,name,username,image}, roomType("FREE"|...), backgroundImage, djUserIds, ...}`

## GET /api/chat/rooms/{roomId}/state
- **Purpose:** Tek kaynaklı oda durumu — katılımcılar, koltuklar, TRTC, owner. **Auth:** Bearer.

Başlıca oda uçları:
| Method | Endpoint | Amaç |
|--------|----------|------|
| POST | `/api/chat/rooms/create` | oda aç (normal 2500 / VIP 5000 jeton) |
| GET/POST | `/api/chat/rooms/{id}/messages` | mesaj listele/gönder |
| GET/POST | `/api/chat/rooms/{id}/seats` | koltuk yönetimi (`action`, `seatIndex`) |
| GET/POST | `/api/chat/rooms/{id}/voice` | seste olanlar (join/leave) |
| GET/POST | `/api/chat/rooms/{id}/music` | DJ müzik durumu |
| POST | `/api/chat/rooms/{id}/song-request` | şarkı isteği |
| GET/POST | `/api/chat/rooms/{id}/pk` | **sesli oda PK (ANA backend)** |
| POST | `/api/chat/rooms/{id}/pk/score` | PK skor |
| POST | `/api/chat/rooms/{id}/transfer-ownership` | sahiplik devri |
| GET | `/api/chat/rooms/{id}/gifts` | oda hediye akışı |
| GET (SSE) | `/api/chat/rooms/{id}/stream` | anlık mesaj/presence |
| GET | `/api/chat/rooms/backgrounds` | arka planlar |

> **NOT:** Sesli oda PK'sı (`/api/chat/rooms/{id}/pk*`) ANA backend'dedir. Birleşik PK sistemi (`/api/pk/*`) ise ikinci backend'dedir (bkz. §3).

---

### LIVE / VIDEO STREAMS

## GET /api/video-streams
- **Purpose:** Canlı yayın listesi. **Auth:** Yok (public).
- **Response 200 (gerçek):** `{"streams":[{id, userId, title, status, viewerCount, likeCount, roomId, category, thumbnailUrl, user{id,name,image}, _count{comments,likes}, streamId, isLive, ...}]}`

## GET /api/video-streams/{streamId}
- **Auth:** dual. Flutter-uyumlu: `streamId, isLive, viewers, watching, broadcasterId, hostUserId, streamerName, thumbnailUrl, coverUrl`.

Başlıca live/video uçları:
| Method | Endpoint | Amaç |
|--------|----------|------|
| POST | `/api/video-streams` | yayın oluştur |
| PATCH | `/api/video-streams/{id}` | güncelle/bitir |
| POST | `/api/video-streams/{id}/join` `/leave` | katıl/ayrıl |
| GET/POST | `/api/video-streams/{id}/messages` | sohbet |
| GET/POST | `/api/video-streams/{id}/comments` | yorum |
| POST | `/api/video-streams/{id}/like` | beğeni (`count` opsiyonel, max 100) |
| GET | `/api/video-streams/{id}/gifts` / `/api/video-streams/gifts` | hediye kataloğu |
| GET (SSE) | `/api/video-streams/{id}/stream` | izleyici/sohbet/hediye/yayın sonu |
| POST | `/api/video-streams/{id}/media-heartbeat` | medya kalp atışı (auto-close) |
| GET/POST | `/api/live/create-room` `/join-room` `/leave-room` `/heartbeat` | canlı oda yaşam döngüsü |
| POST | `/api/live/gift/send` | **canlı hediye (DOKUNULMADI, §8)** |

---

### TRTC (Tencent RTC)

## POST /api/trtc/token  (önerilen)
- **Purpose:** TRTC oda token'ı. **Auth:** Bearer. **Request:** `{ roomId, role? }`.
## POST /api/trtc/usersig  (eski)
- **Request:** `{ userId, roomId }`. **DOKUNULMADI (§8).**

---

### FAL (Fortune)

## GET /api/fortune-tellers
- **Purpose:** Canlı falcı listesi. **Auth:** Yok (public). **Response 200:** falcı dizisi.

## GET /api/fortune-request-types
- **Auth:** Yok. **Response 200 (gerçek öğe):** `{id, name, nameEn, icon, jetonCost, description, sortOrder, isActive, ...}`

Başlıca fal uçları:
| Method | Endpoint | Amaç |
|--------|----------|------|
| POST | `/api/fortune-tellers/{tellerId}/session` | seans isteği oluştur |
| GET | `/api/fortune-tellers/sessions?status=pending` | falcı gelen istekler |
| GET (SSE) | `/api/fortune-tellers/sessions/stream` | bekleyen istekler akışı |
| GET/PATCH | `/api/room/{sessionId}` | canlı fal oda (timer/extend/end) |
| GET/POST | `/api/room/{sessionId}/messages` | seans mesajları |
| GET (SSE) | `/api/room/{sessionId}/stream` | seans akışı |
| POST | `/api/fortunes/{slug}` | AI fal (kahve, tarot, rüya vb.) |
| GET | `/api/fortune-access/check?fortuneType=` | erişim kontrolü |
| GET | `/api/user/fortunes` | fal geçmişi |

AI fal slug'ları: `kahve-fali, tarot-fali, ruya-yorumu, el-fali, burc-yorumu, dogum-haritasi, evet-hayir, istihare, katina, kursundokme, melek-kartlari, numeroloji, aura-analizi, ask-uyumu`.

---

### SOCIAL

| Method | Endpoint | Auth | Amaç |
|--------|----------|------|------|
| GET | `/api/social/posts` | opsiyonel | sosyal akış |
| GET | `/api/social/posts/{postId}` | opsiyonel | tek gönderi |
| POST | `/api/social/posts/{postId}/likes` | Bearer | beğeni toggle |
| GET/POST | `/api/social/posts/{postId}/comments` | dual | yorum |
| POST | `/api/social/posts/{postId}/view` | opsiyonel | görüntülenme |
| GET | `/api/users/{userId}/posts` | opsiyonel | kullanıcı paylaşımları |
| GET | `/api/stories` | opsiyonel | hikayeler/feed |

---

### CHAT (DM)

| Method | Endpoint | Auth | Amaç |
|--------|----------|------|------|
| GET | `/api/messages` | Bearer | DM konuşma listesi |
| GET/POST | `/api/messages/{userId}` | Bearer | kullanıcı ile mesajlar |
| POST | `/api/messages/request` | Bearer | mesaj isteği |

---

### JETON / GOLD / ÜYELİK

| Method | Endpoint | Auth | Amaç |
|--------|----------|------|------|
| GET | `/api/jeton` | Bearer | jeton paketleri/fiyat |
| GET | `/api/credit-packages` | Yok | kredi paketleri (gerçek: dizi, `{id,name,credits,price,currency,isActive,...}`) |
| GET | `/api/memberships/packages` | Yok | üyelik paketleri (`{success:true,packages:[...]}`) |
| POST | `/api/memberships/purchase` | Bearer | üyelik satın al (ana backend) |
| GET | `/api/wallet` | Bearer | cüzdan |
| GET/POST | `/api/withdrawals` | Bearer | para çekme |
| GET | `/api/payments/methods` `/config` | dual | ödeme yöntemleri |

> **DİKKAT:** Çoğul `/api/memberships*` ANA backend'dedir. Yalnızca tekil `/api/membership/plans` + `/api/membership/purchase` ikinci backend'dedir (bkz. §3).

---

### GAMES (Oyunlar)

| Method | Endpoint | Backend | Amaç |
|--------|----------|---------|------|
| GET | `/api/games` | ANA | oyun listesi |
| POST/GET | `/api/games/room` `/api/games/room/{id}` | ANA | oda oluştur/katıl/durum |
| POST | `/api/games/play` | ANA | hamle |
| GET | `/api/games/leaderboard` | ANA | liderlik |
| GET | `/api/games/profile` | ANA | oyun profili |
| GET | `/api/games/rooms` (çoğul liste) | **İKİNCİ** | oda listesi |
| GET | `/api/games/lobby` | ANA (200) | lobi |
| GET | `/api/tournaments` | ANA | turnuvalar |

---

### PK (Birleşik PK sistemi)

> **Birleşik PK (`/api/pk/*`) hâlâ İKİNCİ backend'dedir** (canlifal.com'da 404). Sesli oda PK'sı (`/api/chat/rooms/{id}/pk`) ve video-stream PK'sı (`/api/video-streams/pk`) ise ANA backend'dedir. **DOKUNULMADI (§8).**

| Method | Endpoint | Backend |
|--------|----------|---------|
| GET | `/api/pk/active`, `/api/pk/leaderboard`, `/api/pk/battles`, `/api/pk/{matchId}` ... | İKİNCİ |
| GET (SSE) | `/api/pk/{matchId}/stream` | İKİNCİ |
| GET/POST | `/api/chat/rooms/{id}/pk`, `/api/chat/rooms/{id}/pk/score` | ANA |
| GET/POST | `/api/video-streams/pk`, `/api/video-streams/pk/score` | ANA |

---

## 3. İKİNCİ BACKEND AUDIT (`canlifalapi.abacusai.app`)

> Yalnızca AUDIT — bu aşamada kapatılmaz/silinmez. İkinci backend NestJS tarzıdır ve hata formatı `{success,statusCode,message}` döner.

### Karşılaştırmalı probe sonuçları (2026-08-11, gerçek)
| Endpoint | main (canlifal.com) | games (abacus) | Sınıf |
|----------|---------------------|----------------|-------|
| `/api/gifts/battles` | **200** | 200 | **MIGRATED** (artık main kullanılıyor) |
| `/api/gifts/goals` | **200** | 200 | **MIGRATED** |
| `/api/pk/active` | 404 | 200 | **NOT MIGRATED** (yalnızca ikinci) |
| `/api/pk/leaderboard` | 404 | 200 | **NOT MIGRATED** |
| `/api/live/pk/active` | 404 | 200 | **NOT MIGRATED** |
| `/api/live/guest/list` | 404 | 200 | **NOT MIGRATED** |
| `/api/games/rooms` (liste) | 404 | 200 | **NOT MIGRATED** |
| `/api/membership/plans` (tekil) | 404 | 200 | **NOT MIGRATED** |
| `/api/games/auto-match` | 404 | 404 | **DEPRECATED/UNKNOWN** (iki tarafta da yok) |
| `/api/games/lobby` | 400 (auth/param) | 200 | main'de var (MIGRATED) |

### Özet
- **MIGRATED (ana backend'e taşındı, ikinci artık gereksiz):** `/api/gifts/battles`, `/api/gifts/battles/{id}`, `/api/gifts/goals` + zaten ana backend'de olan tüm diğer uçlar (auth, profil, fal, sosyal, chat, video-streams, jeton/üyelik çoğul, sesli oda, sesli oda PK, video PK).
- **NOT MIGRATED (yalnızca ikinci backend):**
  - `/api/pk/*` — Birleşik PK sistemi (match, leaderboard, battles, seats, stream SSE, admin)
  - `/api/live/pk/active`, `/api/live/guest/*` — canlı PK/misafir listesi
  - `/api/games/rooms` (çoğul liste), `/api/games/auto-match` (yalnızca kod referansı; iki tarafta da 404)
  - `/api/membership/plans`, `/api/membership/purchase` (tekil) — aynı DB, aynı plan kimlikleri
- **DEPRECATED / UNKNOWN:** `/api/games/auto-match` (iki backend'de de 404 — Flutter kodunda tanımlı ama sunucuda yok). `/api/warmup` ikinci backend'de bağlantı vermedi (route yok).

### Sonuç: İkinci backend hâlâ gerekli mi?
**EVET** — yalnızca `/api/pk/*`, `/api/live/pk/active`, `/api/live/guest/*`, `/api/games/rooms`, `/api/membership/*` (tekil) için. Battles/goals için **HAYIR** (tamamen ana backend'e taşındı). Bu grupların da göçü ayrı bir faz olarak planlanmalıdır.

---

## 4. FEATURE → ENDPOINT HARİTASI

| Feature | Flutter Modülü | Method | Endpoint | Backend | Auth |
|---------|----------------|--------|----------|---------|------|
| Gift Battles | GiftBattleStrip / voice-room / live | GET | `/api/gifts/battles` | ANA | public |
| Gift Battles | battle detay | GET | `/api/gifts/battles/{id}` | ANA | public |
| Gift Battles | battle oluştur | POST | `/api/gifts/battles` | ANA | Bearer |
| Gift Goals | GiftGoalBar | GET | `/api/gifts/goals` | ANA | public |
| Gift Goals | goal oluştur | POST | `/api/gifts/goals` | ANA | Bearer |
| Gift Send | hediye paneli | POST | `/api/gifts/send` | ANA | Bearer |
| Live | canlı yayın listesi/izleme | GET | `/api/video-streams`, `/{id}` | ANA | public/dual |
| Live | canlı hediye | POST | `/api/live/gift/send` | ANA | Bearer |
| Voice Rooms | oda listesi/durum | GET | `/api/chat/rooms`, `/{id}/state` | ANA | public/Bearer |
| Voice Rooms | koltuk/ses/müzik | GET/POST | `/api/chat/rooms/{id}/seats|voice|music` | ANA | Bearer |
| PK (oda) | sesli oda PK | GET/POST | `/api/chat/rooms/{id}/pk` | ANA | dual |
| PK (birleşik) | PK ekranı | GET | `/api/pk/active`, `/api/pk/{id}` | İKİNCİ | dual |
| TRTC | RTC bağlantı | POST | `/api/trtc/token` | ANA | Bearer |
| SSE | bildirim/oda/yayın/seans | GET | `.../stream` | ANA | Bearer |
| Chat (DM) | mesajlar | GET/POST | `/api/messages`, `/{userId}` | ANA | Bearer |
| Profile | profil | GET | `/api/me`, `/api/user/profile` | ANA | Bearer |
| Social | akış/gönderi | GET/POST | `/api/social/posts...` | ANA | dual |
| Fal | falcı/seans/AI fal | GET/POST | `/api/fortune-tellers...`, `/api/fortunes/{slug}` | ANA | dual |
| Auth | giriş/kayıt/refresh | POST | `/api/auth/mobile-*` | ANA | public |
| Jeton | bakiye/paket | GET | `/api/user/credits`, `/api/jeton`, `/api/credit-packages` | ANA | Bearer/public |
| Gold/Üyelik | üyelik | GET/POST | `/api/memberships/packages`, `/purchase` | ANA | public/Bearer |
| Games | oyun/oda | GET/POST | `/api/games`, `/api/games/room` | ANA | dual |
| Games (liste) | oda listesi | GET | `/api/games/rooms` | İKİNCİ | dual |

---

# FLUTTER INTEGRATION CONTRACT

### Base URL
```dart
Env.apiBaseUrl = 'https://canlifal.com';   // TÜM battle/goal/gift/live/fal/auth trafiği
Env.gamesApiBaseUrl = 'https://canlifalapi.abacusai.app'; // yalnızca /api/pk/*, /api/live/pk/active, /api/live/guest/*, /api/games/rooms, /api/membership/* (tekil)
```
`ApiBackendRouter.resolve(path)` yalnızca yukarıdaki ikinci-backend yollarını `game`'e yönlendirir; **battles/goals dahil geri kalan her şey `main`'e gider.**

### JWT gönderimi
```dart
headers: {
  'Authorization': 'Bearer $accessToken',
  'Content-Type': 'application/json',
}
```
`dio_provider` Bearer + JSON başlıklarını otomatik ekler.

### Login / token akışı
1. `POST /api/auth/mobile-login` (veya register/google/apple/tiktok) → `{accessToken, refreshToken, user}`.
2. `accessToken` güvenli depoda saklanır, her isteğe eklenir.
3. `401 {"error":"Oturum açmanız gerekiyor"}` alınırsa → `POST /api/auth/mobile-refresh {refreshToken}` ile yenile, isteği bir kez tekrarla.
4. Refresh de 401 verirse → oturumu kapat, login ekranına dön.

### Timeout / Retry
- connect/receive timeout: 15–30 sn (SSE hariç).
- Retry: yalnızca idempotent GET, en fazla 2, exponential backoff. POST'ta retry yok.

### Error handling
- Ana backend hataları daima `{ "error": "<mesaj>" }`. Flutter bu alanı kullanıcıya gösterir.
- İkinci backend (`/api/pk/*` vb.) `{ success, statusCode, message }` döner — o modüller `message` alanını okur.

### SSE bağlantısı
- `GET .../stream`, `Accept: text/event-stream`, `Authorization: Bearer`.
- `data: {json}` satırlarını ayrıştır; kopmada backoff ile yeniden bağlan. Tüm SSE ana backend'e bağlanır.

### Multipart / upload
- `POST /api/upload/presigned` → imzalı PUT URL → istemci doğrudan S3/R2'ye PUT → dönen `cloudStoragePath` kaynağa gönderilir.
- Kısa video: `POST /api/short-videos/upload-url` → PUT → `POST /api/short-videos/register`.

### Pagination
- Public listeler doğrudan dizi (`[]`) veya `{items|streams|packages: [...]}`. Sayfalama gereken uçlar `?page=&limit=` veya `?after=` (timestamp) kullanır.

### Request/response modelleri (kritik)
- **Battle:** `{id, status, context, contextId, durationSec, secondsLeft, endsAt, startedAt, winnerId, totalScore, lastCallActive, participants[]{rank, participantId, displayName, score, displayScore}}`
- **Goal:** `{id, title, targetAmount, currentAmount, context, contextId, status, percent}`
- **User (login):** `{id, email, name, username, role, image, credits, jetonBalance, cfcBalance, membership, membershipExpiresAt, preferredLanguage, level}`
- Battle/Goal modelleri değiştirilmedi — tek backend geçişinde alanlar birebir korundu.

---

## 5. DOKUNULMAYAN SİSTEMLER (§8)
Bu görevde AŞAĞIDAKİLER DEĞİŞTİRİLMEDİ:
`/api/gifts/send`, `/api/live/gift/send`, PK (`/api/pk/*`, oda/video PK üretim mantığı), Live, TRTC, SSE üreticileri, `stream_gifts` şeması, `chat_room_gifts` şeması, Prisma migration. Yalnızca API sözleşmesi çıkarıldı ve bu doküman oluşturuldu.

---

## 6. TAM ENDPOINT ENVANTERİ (470 route)
Aşağıdaki liste `app/api/**/route.ts` taramasından otomatik üretilmiştir (metod | yol). `[param]` = path parametresi.

<!-- INVENTORY_START -->
```
DELETE,GET,PATCH,POST,PUT | /api/[...unmatched]
GET | /api/activities
GET,POST | /api/admin/activity-feed
DELETE,GET,POST | /api/admin/ad-networks
DELETE,GET,PATCH | /api/admin/agencies
GET,POST | /api/admin/announcement-sections
? | /api/admin/avatar-accessories
DELETE,GET,POST | /api/admin/awards
GET | /api/admin/backup
DELETE,GET,POST,PUT | /api/admin/badges
GET,PATCH,POST | /api/admin/bana-ozel
DELETE,PATCH,PUT | /api/admin/blog/[postId]
GET | /api/admin/blog/analytics
PATCH | /api/admin/blog/bulk-category
POST | /api/admin/blog/bulk-delete
POST | /api/admin/blog/bulk-generate
POST | /api/admin/blog/bulk-import
PATCH | /api/admin/blog/bulk-publish
DELETE,GET,POST | /api/admin/blog/categories
GET,PATCH | /api/admin/blog/comments
POST | /api/admin/blog/generate
POST | /api/admin/blog/import
GET,POST | /api/admin/blog
POST | /api/admin/blog/schedule-publish
GET,PATCH | /api/admin/bots
GET,POST | /api/admin/bots/simulate-fortune
GET,POST | /api/admin/bots/simulate-master
GET,POST | /api/admin/bots/simulate-social
GET,POST | /api/admin/bots/simulate
DELETE,GET,PATCH,POST | /api/admin/broadcast-images
GET,POST | /api/admin/button-order
DELETE,GET | /api/admin/cache
GET,PATCH | /api/admin/cfc-payment-requests
GET,POST | /api/admin/cfc-settings
? | /api/admin/chat-bubbles
DELETE,GET,POST,PUT | /api/admin/chat-rooms
DELETE,GET,PATCH,POST | /api/admin/contests
DELETE,PATCH | /api/admin/credit-packages/[packageId]
GET,POST | /api/admin/credit-packages
POST | /api/admin/credits
GET,POST,PUT | /api/admin/currency-config
PATCH | /api/admin/dreams/bulk-category
POST | /api/admin/dreams/bulk-delete
POST | /api/admin/dreams/bulk-import
PATCH | /api/admin/dreams/bulk-publish
POST | /api/admin/dreams/generate
DELETE,GET,POST,PUT | /api/admin/dreams
? | /api/admin/emoji-packs
? | /api/admin/entrance-effects
GET,POST | /api/admin/finance
DELETE,GET,PATCH,POST | /api/admin/fortune-request-types
GET | /api/admin/fortunes
DELETE,GET | /api/admin/games/rooms
DELETE,GET,POST,PUT | /api/admin/games
GET,PUT | /api/admin/games/settings
GET,PATCH,POST | /api/admin/gift-collections
POST | /api/admin/gift-upload
DELETE,GET,PATCH | /api/admin/gifts/[giftId]
GET,POST | /api/admin/gifts
GET | /api/admin/gifts/stats
DELETE,GET,PATCH,POST | /api/admin/homepage-buttons
DELETE,GET,PATCH,POST,PUT | /api/admin/homepage-fortune-cards
POST | /api/admin/live-tellers/[tellerId]/approve
POST | /api/admin/live-tellers/[tellerId]/ban
POST | /api/admin/live-tellers/[tellerId]/bonus
POST | /api/admin/live-tellers/[tellerId]/freeze
PUT | /api/admin/live-tellers/[tellerId]/permissions
DELETE,GET,PUT | /api/admin/live-tellers/[tellerId]
DELETE,POST | /api/admin/live-tellers/[tellerId]/warning
GET,POST | /api/admin/live-tellers
DELETE,GET,PATCH,POST | /api/admin/lucky-gifts/tiers
DELETE,GET,PATCH,POST | /api/admin/membership-badges
GET,PATCH,POST | /api/admin/memberships/purchases
DELETE,GET,POST,PUT | /api/admin/memberships
? | /api/admin/mic-frames
GET,POST | /api/admin/moderation
? | /api/admin/name-effects
DELETE,GET,POST | /api/admin/notifications
DELETE,GET,PATCH,POST | /api/admin/online-fal/buttons
GET,PATCH,POST | /api/admin/online-fal/sections
GET,POST | /api/admin/payment-methods
GET,PATCH,POST | /api/admin/payments
GET | /api/admin/pending-counts
DELETE,GET,POST,PUT | /api/admin/popups
POST | /api/admin/profile-frames/assign
DELETE,GET,POST | /api/admin/profile-frames
GET,PATCH,POST | /api/admin/room-themes/backgrounds
? | /api/admin/room-themes
GET,PATCH | /api/admin/rooms
GET,POST | /api/admin/seo-settings
GET,POST | /api/admin/settings
DELETE,GET,POST,PUT | /api/admin/site-pages
GET | /api/admin/statistics
POST | /api/admin/teller-levels
GET | /api/admin/teller-performance
GET,POST | /api/admin/teller-verification
DELETE,PATCH | /api/admin/ticker-messages/[messageId]
GET,POST | /api/admin/ticker-messages
DELETE,GET,PATCH,POST | /api/admin/tiktok-categories
DELETE,GET,PATCH,POST,PUT | /api/admin/tiktok-videos
GET,POST | /api/admin/trend-videos
POST | /api/admin/trend-videos/youtube
DELETE,GET,POST | /api/admin/trends
DELETE,GET,PATCH | /api/admin/users/[userId]
GET | /api/admin/users
GET | /api/admin/users/search
POST | /api/admin/users/withdrawal-limit
DELETE,GET,PATCH | /api/admin/video-streams
GET | /api/admin/visitor-stats
GET,POST | /api/admin/withdrawals
GET | /api/ads/active
POST | /api/ads/reward
POST | /api/agency/apply
GET | /api/agency/earnings
GET,POST | /api/agency/invite
POST | /api/agency/join
GET | /api/agency/leaderboard
DELETE,POST | /api/agency/leave
DELETE,GET,POST | /api/agency/members
GET,PATCH | /api/agency/my
GET | /api/agency/tasks
GET,POST | /api/agency/withdrawals
POST | /api/announcements/event
GET,POST | /api/announcements
GET,POST | /api/anonymous
POST | /api/anonymous/watch-ad
GET | /api/astrology-panel
? | /api/auth/[...nextauth]
POST | /api/auth/change-password
POST | /api/auth/forgot-password
POST | /api/auth/logout
POST | /api/auth/mobile-apple
POST | /api/auth/mobile-google
POST | /api/auth/mobile-login
POST | /api/auth/mobile-refresh
POST | /api/auth/mobile-register
POST | /api/auth/mobile-tiktok
POST | /api/auth/reclaim-device
POST | /api/auth/reset-password
GET | /api/auth/verify-device
? | /api/avatar-accessories
POST | /api/bana-ozel/open
GET | /api/bana-ozel
GET | /api/blog/categories
DELETE,GET,POST | /api/blog/comments
POST | /api/blog/favorite
GET | /api/blog/interactions
POST | /api/blog/like
GET | /api/blog/related
GET | /api/blog
GET | /api/blog/zodiac
GET | /api/broadcast-images
GET,POST | /api/cache
? | /api/chat-bubbles
GET | /api/chat/broadcast-images
DELETE,GET,POST | /api/chat/cleanup
GET,POST | /api/chat/rooms/[roomId]/dj
GET,POST | /api/chat/rooms/[roomId]/gifts
DELETE,GET,POST | /api/chat/rooms/[roomId]/messages
GET,POST | /api/chat/rooms/[roomId]/moderation
GET | /api/chat/rooms/[roomId]/music-queue
DELETE,GET,POST | /api/chat/rooms/[roomId]/music
POST | /api/chat/rooms/[roomId]/music/stop
GET,POST | /api/chat/rooms/[roomId]/pk
POST | /api/chat/rooms/[roomId]/pk/score
DELETE,GET,POST | /api/chat/rooms/[roomId]/presence
GET,PATCH | /api/chat/rooms/[roomId]/seats
GET,PATCH | /api/chat/rooms/[roomId]/settings
GET,PATCH,POST | /api/chat/rooms/[roomId]/song-request
GET | /api/chat/rooms/[roomId]/state
GET | /api/chat/rooms/[roomId]/stream
POST | /api/chat/rooms/[roomId]/transfer-ownership
GET,POST | /api/chat/rooms/[roomId]/typing
GET,POST | /api/chat/rooms/[roomId]/voice
GET | /api/chat/rooms/backgrounds
POST | /api/chat/rooms/create
GET | /api/chat/rooms/pk-list
GET | /api/chat/rooms
GET | /api/chat/youtube-stream
POST | /api/compatibility
POST | /api/contact
GET | /api/credit-packages
GET,POST | /api/daily-login
GET,POST | /api/daily-missions
DELETE,POST | /api/devices/fcm
GET,POST | /api/dream-contest/[contestId]/entries
POST | /api/dream-contest/[contestId]/vote
GET | /api/dream-contest
DELETE,GET,POST | /api/dream-diary
GET | /api/dream-stats
GET | /api/dream-symbols/[slug]
GET | /api/dream-symbols
DELETE,GET,POST | /api/dreams/[slug]/comments
GET,POST | /api/dreams/[slug]/favorite
GET | /api/dreams/[slug]
POST | /api/dreams/[slug]/view
GET | /api/dreams/favorites
POST | /api/dreams/generate
POST | /api/dreams/interpret
POST | /api/dreams/morning-reminder
GET | /api/dreams/recommendations
GET | /api/dreams
GET | /api/dreams/trends
? | /api/emoji-packs
? | /api/entrance-effects
GET,POST | /api/favorite-tellers
GET | /api/football
POST | /api/fortune-access/check
GET | /api/fortune-access/ip-status
GET | /api/fortune-request-types
GET | /api/fortune-tellers/[tellerId]/reviews
GET,PATCH | /api/fortune-tellers/[tellerId]
GET,POST | /api/fortune-tellers/[tellerId]/session
POST | /api/fortune-tellers/apply
GET | /api/fortune-tellers/awards
GET | /api/fortune-tellers/gifts
GET | /api/fortune-tellers/my-profile
GET,POST | /api/fortune-tellers
GET,POST | /api/fortune-tellers/session
PATCH | /api/fortune-tellers/sessions/[sessionId]
GET | /api/fortune-tellers/sessions
GET | /api/fortune-tellers/sessions/stream
GET,POST | /api/fortune-tellers/toggle-online
POST | /api/fortunes/ask-uyumu
POST | /api/fortunes/aura-analizi
POST | /api/fortunes/burc-yorumu
POST | /api/fortunes/dogum-haritasi
POST | /api/fortunes/el-fali
POST | /api/fortunes/evet-hayir
POST | /api/fortunes/istihare
POST | /api/fortunes/kahve-fali-image
POST | /api/fortunes/kahve-fali
POST | /api/fortunes/katina
POST | /api/fortunes/kursundokme
POST | /api/fortunes/melek-kartlari
POST | /api/fortunes/numeroloji
POST | /api/fortunes/ruya-yorumu
POST | /api/fortunes/tarot-fali
GET,POST | /api/games/daily-reward
POST | /api/games/daily-spin
GET | /api/games/grid-settings
GET,POST | /api/games/lamba-cini
GET | /api/games/leaderboard
GET | /api/games/lobby
POST | /api/games/play
GET | /api/games/profile
GET,POST | /api/games/quests
GET,PATCH,POST | /api/games/room/[roomId]/chat
POST | /api/games/room/[roomId]/replace-ai
DELETE,GET,PATCH,POST | /api/games/room/[roomId]
DELETE,GET,POST | /api/games/room/[roomId]/viewers
GET,POST | /api/games/room
GET | /api/games
GET,PATCH,POST | /api/games/sos/[gameId]/chat
DELETE,GET,PATCH,POST | /api/games/sos/[gameId]
DELETE,GET,POST | /api/games/sos/[gameId]/viewers
GET,POST | /api/games/sos
POST | /api/gift-engine/finish
GET | /api/gift-engine/gifts
GET | /api/gift-engine/queue
GET | /api/gifts/battles/[battleId]
GET,POST | /api/gifts/battles
GET | /api/gifts/catalog
POST | /api/gifts/check-reciprocal
GET,POST | /api/gifts/goals
GET | /api/gifts/insights/album/[userId]
GET | /api/gifts/insights/badge/[userId]
GET | /api/gifts/insights/collection/[userId]
GET | /api/gifts/insights/feed
GET | /api/gifts/insights/first-gifter/[context]/[contextId]
GET | /api/gifts/insights/leaderboard
GET | /api/gifts/insights/map
GET | /api/gifts/insights/me/badge
GET | /api/gifts/insights/me/history
GET | /api/gifts/insights/me/recommendations
GET | /api/gifts/lucky/config
GET | /api/gifts/lucky/history
POST | /api/gifts/lucky/send
POST | /api/gifts/missions/[missionId]/claim
GET | /api/gifts/missions/me
GET | /api/gifts/missions
GET | /api/gifts/recent-big
POST | /api/gifts/send
GET | /api/gifts/types
GET | /api/gifts/version
GET | /api/hashtags/[name]
GET | /api/hashtags/search
GET | /api/hashtags/trending
GET | /api/homepage-buttons
GET | /api/homepage-fortune-cards
GET | /api/homepage-ticker
GET | /api/horoscope/daily
GET,POST | /api/jeton
GET | /api/leaderboards
GET | /api/legal/child-safety
POST | /api/live/create-room
GET | /api/live/gift-types
POST | /api/live/gift/send
POST | /api/live/heartbeat
POST | /api/live/join-room
POST | /api/live/leave-room
GET,POST | /api/live/message
GET | /api/live/online-users
GET,POST | /api/live/pk
POST | /api/live/pk/score
GET | /api/live/rooms
GET,POST | /api/live/seats
GET,PATCH | /api/me
GET | /api/membership-badges
GET | /api/memberships/packages
POST | /api/memberships/purchase
GET | /api/memberships
GET,POST | /api/messages/[userId]
PATCH,POST | /api/messages/request
GET | /api/messages
? | /api/mic-frames
GET | /api/mobile/config
GET | /api/mobile/fortune-menu
GET | /api/mobile/home
GET | /api/mobile/user-profile/[userId]
GET | /api/monitoring
GET | /api/music/history
GET | /api/music/search
? | /api/name-effects
DELETE,GET,POST | /api/notifications
GET | /api/notifications/stream
GET | /api/online-fal
GET | /api/payments/config
GET | /api/payments/methods
GET,POST | /api/payments/notify
GET,POST | /api/payments/requests
GET | /api/payments/settings
GET | /api/platform/commission-rate
GET | /api/popups
GET,POST | /api/presence
GET | /api/presence/sections
GET,POST | /api/profile-frames
GET | /api/public-stats
GET | /api/public/announcement-settings
GET | /api/public/jeton-price
GET | /api/referral
GET | /api/referral/validate
GET | /api/room-themes/catalog
? | /api/room-themes
GET,POST | /api/room/[sessionId]/messages
GET,POST | /api/room/[sessionId]/review
GET,PATCH | /api/room/[sessionId]
GET | /api/room/[sessionId]/stream
GET | /api/room/[sessionId]/summary
POST | /api/room/[sessionId]/tip
DELETE,GET,POST | /api/room/signal
GET | /api/search/advanced
GET | /api/search
GET | /api/seo-settings
GET | /api/settings/ads
GET | /api/settings/canlidark-hero
GET | /api/settings/public
GET | /api/settings/themes
GET | /api/share-card
POST | /api/short-videos/[id]/comments/[commentId]/like
POST | /api/short-videos/[id]/comments/[commentId]/pin
DELETE | /api/short-videos/[id]/comments/[commentId]
GET,POST | /api/short-videos/[id]/comments
GET | /api/short-videos/[id]/duets
POST | /api/short-videos/[id]/like
DELETE,GET | /api/short-videos/[id]
POST | /api/short-videos/[id]/save
POST | /api/short-videos/[id]/share
POST | /api/short-videos/[id]/view
GET | /api/short-videos/explore
GET | /api/short-videos/mentions/search
GET | /api/short-videos/music
GET | /api/short-videos/profile/[userId]
POST | /api/short-videos/register
GET | /api/short-videos
POST | /api/short-videos/upload-url
POST | /api/short-videos/upload
GET | /api/short-videos/user/[userId]
POST | /api/signup
GET | /api/site-pages/[slug]
DELETE,GET,POST | /api/social/posts/[postId]/comments
POST | /api/social/posts/[postId]/likes
DELETE,GET | /api/social/posts/[postId]
POST | /api/social/posts/[postId]/view
GET,POST | /api/social/posts
DELETE,GET,POST | /api/stories
GET,POST | /api/teller-chat/[sessionId]
GET | /api/teller-chat
GET | /api/teller/analytics
GET | /api/teller/level
GET,POST | /api/teller/verification
POST | /api/tencent/webhook
GET | /api/tiktok-videos/[id]
GET | /api/tiktok-videos/oembed
GET | /api/tiktok-videos
GET | /api/tmdb
GET | /api/tournaments
GET | /api/translations
GET,POST | /api/trend-videos
POST | /api/trends/[slug]/like
GET | /api/trends/[slug]
GET | /api/trends
POST | /api/trtc/token
POST | /api/trtc/usersig
POST | /api/trtc/webhook
GET,POST | /api/upload/get-url
POST | /api/upload/presigned
GET | /api/user/[userId]/achievements
GET | /api/user/[userId]/follow-status
DELETE,POST | /api/user/[userId]/follow
GET | /api/user/achievements
GET | /api/user/active-sessions
GET,PATCH | /api/user/activity
GET,POST | /api/user/block
DELETE,GET | /api/user/blocked
GET | /api/user/broadcast-history
GET | /api/user/co-broadcast-invites
GET | /api/user/credits
GET | /api/user/followers
GET | /api/user/following
PATCH | /api/user/fortunes/[fortuneId]
GET | /api/user/fortunes
GET | /api/user/likers
GET,PATCH | /api/user/profile
GET | /api/user/received-gifts
POST | /api/user/report
GET | /api/user/statistics
GET,POST | /api/user/stats
GET,PATCH | /api/user/theme
GET,POST | /api/user/watch-ad
GET | /api/user/xp
GET,POST | /api/users/[userId]/follow
GET | /api/users/[userId]/posts
GET | /api/users/[userId]
GET | /api/users/lookup/[username]
GET | /api/users/online
GET | /api/users/search
GET,POST | /api/video-streams/[streamId]/auto-close
DELETE,GET,POST | /api/video-streams/[streamId]/ban
POST | /api/video-streams/[streamId]/co-broadcast/invite
GET,PATCH,POST | /api/video-streams/[streamId]/co-broadcast
GET,POST | /api/video-streams/[streamId]/comments
POST | /api/video-streams/[streamId]/end
GET | /api/video-streams/[streamId]/fortune-requests/my-status
DELETE,GET,PATCH,POST | /api/video-streams/[streamId]/fortune-requests
GET,POST | /api/video-streams/[streamId]/gifts
DELETE,POST | /api/video-streams/[streamId]/join
POST | /api/video-streams/[streamId]/leave
GET,POST | /api/video-streams/[streamId]/like
POST | /api/video-streams/[streamId]/live-started
POST | /api/video-streams/[streamId]/media-heartbeat
GET,POST | /api/video-streams/[streamId]/messages
DELETE,GET,POST | /api/video-streams/[streamId]/moderators
DELETE,GET,POST | /api/video-streams/[streamId]/mute
GET,POST | /api/video-streams/[streamId]/pk-battle
GET,PATCH | /api/video-streams/[streamId]
DELETE,GET,POST | /api/video-streams/[streamId]/signal
GET | /api/video-streams/[streamId]/stream
GET | /api/video-streams/[streamId]/viewers
GET | /api/video-streams/gifts
GET | /api/video-streams/pk/list
GET,POST | /api/video-streams/pk
POST | /api/video-streams/pk/score
GET,POST | /api/video-streams
DELETE,GET,POST | /api/video-streams/signal
GET | /api/wallet
GET | /api/warmup
GET,POST | /api/weekly-dream-report
GET,POST | /api/withdrawals
GET | /api/youtube/search
```
<!-- INVENTORY_END -->
