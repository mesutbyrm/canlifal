# BACKEND_FLUTTER_PARITY.md — Backend ↔ Flutter Eşleşme Raporu

> **AŞAMA A çıktısı — SALT OKUMA.** Kod değiştirilmedi.  
> Yöntem: statik kaynak taraması (1708 Dart dosyası, 454 backend route dosyası, 26 Express router dosyası).  
> **Çalışma zamanı doğrulaması yapılmadı.** Aşağıdaki "ÇALIŞIYOR" ifadesi *kod düzeyinde eşleşme var* demektir, *canlıda test edildi* demek değildir.
> **TRTC / kamera / mikrofon uçtan uca testi: `NOT PERFORMED`** (fiziksel Android cihaz yok).

## 0. Kategori anahtarı

| Etiket | Anlamı |
|---|---|
| **A** | BACKEND VAR / FLUTTER VAR / KOD DÜZEYİNDE EŞLEŞİYOR |
| **B** | BACKEND VAR / FLUTTER EKSİK (backend uç yayınlıyor, Flutter çağırmıyor) |
| **C** | BACKEND VAR / FLUTTER BOZUK (Flutter çağırıyor ama adres hiçbir backend'de yok → 404) |
| **D** | BACKEND VAR / FLUTTER FARKLI (Flutter ikinci backend'i çağırıyor; ana backend'de de aynı iş var) |

## 1. Yapısal Bulgular (kategori tablosundan önce okunmalı)

### 1.1 ÜÇ farklı backend adresi kullanılıyor

Flutter yapılandırması (`mobile/lib/core/config/env.dart`) üç taban adres tanımlıyor:

| Değişken | Adres | Açıklama (kod yorumundan) |
|---|---|---|
| `apiBaseUrl` | `https://canlifal.com` | Ana backend |
| `gamesApiBaseUrl` | `https://canlifalapi.abacusai.app` | "Oyun odası uçları (Redis / Backend-2)" |
| `gatewayApiBaseUrl` | (boş) | 502/503/504 sonrası tek denemelik yedek |

`useSplitGamesApi` açıkken istekler iki backend arasında bölünüyor. Bu, kullanıcının "TEK BACKEND" hedefinin önündeki birinci engeldir.

### 1.2 İki ayrı veritabanı şeması — **veri bütünlüğü riski**

İkinci backend'in kendi şeması var (36 model) ve yorum satırında "Paylaşılan veritabanı" yazıyor. Ancak model tanımları ana şemayla **uyuşmuyor**:

| Model | İkinci şemada alan | Ana şemada alan | Yalnız ikinci şemada olan alan örnekleri |
|---|---:|---:|---|
| `User` | 38 | 123 | `avatarUrl`, `coins`, `displayName`, `coverUrl` … |
| `Conversation` | 11 | 8 | `userAId`, `userBId`, `unreadForA`, `unreadForB` … |
| `PKBattle` | 21 | 19 | `challengerId`, `opponentId`, `battleType` … |
| `SocialPost` | 18 | 17 | `authorId`, `caption`, `likesCount` … |
| `GiftEvent` | 20 | 20 | `coinCost`, `giftId`, `ownerNet` … |

Aynı isimli 13 model ortak, **23 model yalnız ikinci şemada**. İki şema aynı veritabanına bağlanıyorsa şema çakışması; ayrı veritabanlarına bağlanıyorsa **kullanıcı ve bakiye verisi iki yerde** demektir. **Bu, Aşama B'den önce netleştirilmesi gereken 1 numaralı sorudur.**

### 1.3 110 birebir duplicate endpoint

İki backend aynı 110 adresi yayınlıyor (tam liste: `API_CLEANUP_REPORT.md` Bölüm 1). Örnek: `/api/auth/mobile-login`, `/api/wallet`, `/api/video-streams/*/gifts`, `/api/chat/rooms/*/seats`, `/api/trtc/usersig`.

### 1.4 Flutter tarafinda merkezi istemci yok

| Ölçüm | Değer |
|---|---:|
| Ayrı HTTP istemci örneği oluşturma (`Dio(`) | 49 |
| Ayrı SSE servis dosyası | 7 |
| Socket.IO istemci dosyası | 2 |
| Periyodik zamanlayıcı (`Timer.periodic`) | 62 |

Kullanıcının hedeflediği "TEK ApiClient + TEK RealtimeManager" şu anda **yok**. 62 periyodik zamanlayıcı gereksiz polling'in birincil kaynağıdır (Aşama D/E konusu).

### 1.5 Realtime mimarisi üç parçalı

- Ana backend: **19 SSE ucu**
- İkinci backend: **Socket.IO** (`giftHub`) + kendi stream uçları
- Ayrıca ikinci backend'de `POST /api/livekit/token` → **Tencent RTC dışında ikinci bir RTC sistemi izi** (Flutter'da LiveKit paketi yok)
- Agora: her iki backend'de **0 referans**, Flutter `pubspec.yaml`'da **paket yok**, kaynak kodda yalnız **23 isimlendirme kalintısı** → Agora fiilen kaldırılmış, geri getirilmeyecek

---

## 2. Kategori Bazlı Parite Tablosu

Her satırda: ana backend'deki route sayısı, yalnız Flutter'ın çağırdığı route sayısı, yalnız Web'in çağırdığı route sayısı, Flutter'ın çağırıp **hiçbir backend'de bulamadığı** adres sayısı (C), Flutter'ın **ikinci backend**'e gittiği adres sayısı (D).

| Kategori | Backend route | Yalnız Flutter (A) | Yalnız Web (B) | 404 riski (C) | İkinci backend (D) |
|---|---:|---:|---:|---:|---:|
| **KİMLİK (AUTH)** | 14 | 9 | 1 | 2 | 1 |
| **PROFİL** | 30 | 10 | 1 | 10 | 8 |
| **SOSYAL (post/takİp/ünlü/fan kulüp/hashtag)** | 8 | 0 | 0 | 10 | 1 |
| **KISA VİDEO (SHORTS)** | 22 | 16 | 2 | 8 | 2 |
| **HİKAYE (STORY)** | 1 | 0 | 0 | 0 | 0 |
| **SOHBET & MESAJ** | 30 | 6 | 2 | 12 | 22 |
| **SESLİ ODA** | 10 | 0 | 4 | 1 | 0 |
| **CANLI YAYIN** | 40 | 20 | 1 | 7 | 7 |
| **CANLI FALCI** | 1 | 0 | 0 | 3 | 0 |
| **TENCENT RTC** | 4 | 1 | 0 | 0 | 0 |
| **PK (DÜELLO)** | 0 | 0 | 0 | 27 | 6 |
| **HEDİYE** | 12 | 5 | 0 | 21 | 0 |
| **CÜZDAN / JETON / ÖDEME** | 4 | 1 | 0 | 0 | 0 |
| **MÜZİK & !İSTEK** | 2 | 1 | 0 | 0 | 0 |
| **FAL / TAROT / BURÇ / RÜYA** | 30 | 1 | 24 | 1 | 0 |
| **OYUNLAR** | 20 | 1 | 5 | 1 | 6 |
| **BİLDİRİM** | 5 | 2 | 0 | 1 | 2 |
| **YÖNETİM PANELİ** | 108 | 2 | 90 | 3 | 6 |
| **MEDYA / CDN** | 2 | 0 | 0 | 0 | 0 |
| **ÖNBELLEK & İZLEME** | 2 | 0 | 0 | 0 | 0 |
| **DİĞER (listede olmayan backend özellikleri)** | 109 | 13 | 24 | 13 | 6 |

---

## 3. Kategori Detayları

### KİMLİK (AUTH)

- Ana backend route: **14** (SSE: 0, referanssız: 0)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **9** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **1**
- **C** — Flutter çağırıyor, hiçbir backend'de yok (**2** adet):
  - `/api/auth/mobile/device-token`
  - `/api/mobile/auth/web-session`
- **D** — Flutter ikinci backend'e gidiyor (**1** adet):
  - `/api/auth/mobile-sessions/$id`

### PROFİL

- Ana backend route: **30** (SSE: 0, referanssız: 0)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **10** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **1**
- **C** — Flutter çağırıyor, hiçbir backend'de yok (**10** adet):
  - `/api/user/cosmetics`
  - `/api/user/cosmetics/equip`
  - `/api/user/cosmetics/loadout`
  - `/api/user/daily-tasks`
  - `/api/user/device-token`
  - `/api/user/fortunes/$fortuneId/pin`
  - `/api/user/fortunes/$fortuneId/rate`
  - `/api/user/profile/cosmetics/equip`
  - `/api/user/story`
  - `/api/users/me/profile-visitors`
- **D** — Flutter ikinci backend'e gidiyor (**8** adet):
  - `/api/user/favorites`
  - `/api/user/favorites/$id`
  - `/api/users/$userId/followers`
  - `/api/users/$userId/following`
  - `/api/users/me/activity`
  - `/api/users/me/broadcast-history`
  - `/api/users/me/gifts-received`
  - `/api/users/me/stats`

### SOSYAL (post/takİp/ünlü/fan kulüp/hashtag)

- Ana backend route: **8** (SSE: 0, referanssız: 3)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **0** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **0**
- **C** — Flutter çağırıyor, hiçbir backend'de yok (**10** adet):
  - `/api/celebrities/$id`
  - `/api/celebrities/$id/follow`
  - `/api/celebrities/$id/posts`
  - `/api/fan-clubs/$id/join`
  - `/api/fan-clubs/$id/polls`
  - `/api/fan-clubs/$id/posts`
  - `/api/fan-clubs/popular`
  - `/api/social/announcements`
  - `/api/social/fortune-tellers`
  - `/api/social/public-stats`
- **D** — Flutter ikinci backend'e gidiyor (**1** adet):
  - `/api/social/stories`

### KISA VİDEO (SHORTS)

- Ana backend route: **22** (SSE: 0, referanssız: 1)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **16** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **2**
- **C** — Flutter çağırıyor, hiçbir backend'de yok (**8** adet):
  - `/api/short-videos/$id/analytics`
  - `/api/short-videos/$id/gifts`
  - `/api/short-videos/$id/subtitles/generate`
  - `/api/short-videos/explore/nearby`
  - `/api/short-videos/hashtags/$name`
  - `/api/short-videos/hashtags/search`
  - `/api/short-videos/hashtags/trending`
  - `/api/short-videos/music/recommend`
- **D** — Flutter ikinci backend'e gidiyor (**2** adet):
  - `/api/short-videos/$id/stream`
  - `/api/short-videos/viewed/me`

### HİKAYE (STORY)

- Ana backend route: **1** (SSE: 0, referanssız: 0)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **0** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **0**
- **C** — 404 riski tespit edilmedi
- **D** — İkinci backend'e yönlenen çağrı tespit edilmedi

### SOHBET & MESAJ

- Ana backend route: **30** (SSE: 1, referanssız: 2)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **6** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **2**
- **C** — Flutter çağırıyor, hiçbir backend'de yok (**12** adet):
  - `/api/chat/rooms/$roomId`
  - `/api/chat/rooms/$roomId/join-seat`
  - `/api/chat/rooms/$roomId/kick`
  - `/api/chat/rooms/$roomId/messages/$messageId`
  - `/api/chat/rooms/$roomId/mute`
  - `/api/chat/rooms/$roomId/pk/$battleId/end`
  - `/api/chat/rooms/$roomId/pk/$inviteId/respond`
  - `/api/chat/rooms/$roomId/roles`
  - `/api/chat/rooms/cm123/pk/battle-1/end`
  - `/api/chat/rooms/cm123/pk/inv-1/respond`
  - `/api/chat/rooms/{id}/pk[...]`
  - `/api/messages/conversations/$id/stream`
- **D** — Flutter ikinci backend'e gidiyor (**22** adet):
  - `/api/chat/music/popular`
  - `/api/chat/rooms/$roomId/background`
  - `/api/chat/rooms/$roomId/banned-words`
  - `/api/chat/rooms/$roomId/bans/$userId`
  - `/api/chat/rooms/$roomId/dj/$targetUserId`
  - `/api/chat/rooms/$roomId/mentions`
  - `/api/chat/rooms/$roomId/music-request-by-query`
  - `/api/chat/rooms/$roomId/music-settings`
  - `/api/chat/rooms/$roomId/pause`
  - `/api/chat/rooms/$roomId/queue`
  - `/api/chat/rooms/$roomId/resume`
  - `/api/chat/rooms/$roomId/skip`
  - `/api/chat/rooms/$roomId/song/$queueId`
  - `/api/chat/rooms/$roomId/speak-request`
  - `/api/chat/rooms/$roomId/speak-requests`
  - `/api/chat/rooms/$roomId/speak-requests/$targetUserId/approve`
  - `/api/chat/rooms/room1/banned-words/k`
  - `/api/chat/rooms/room123/background`
  - `/api/chat/youtube-audio`
  - `/api/messages/$userId/$messageId`
  - `/api/messages/conversations/$id/messages`
  - `/api/messages/conversations/$id/typing`

### SESLİ ODA

- Ana backend route: **10** (SSE: 1, referanssız: 4)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **0** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **4**
- **C** — Flutter çağırıyor, hiçbir backend'de yok (**1** adet):
  - `/api/rooms/$roomId/music/current`
- **D** — İkinci backend'e yönlenen çağrı tespit edilmedi

### CANLI YAYIN

- Ana backend route: **40** (SSE: 1, referanssız: 1)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **20** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **1**
- **C** — Flutter çağırıyor, hiçbir backend'de yok (**7** adet):
  - `/api/live/guest/`
  - `/api/live/guest/list`
  - `/api/live/pk/active`
  - `/api/live/pk/sweep`
  - `/api/live/streams`
  - `/api/video-streams/$streamId/background`
  - `/api/video-streams/$streamId/image`
- **D** — Flutter ikinci backend'e gidiyor (**7** adet):
  - `/api/live/fal-request/$requestId/complete`
  - `/api/live/fal-request/$requestId/update`
  - `/api/live/fal-request/create`
  - `/api/live/fal-requests`
  - `/api/video-streams/$streamId/fortune-requests/$requestId`
  - `/api/video-streams/$streamId/gifts/leaderboard`
  - `/api/video-streams/$streamId/moderator`

### CANLI FALCI

- Ana backend route: **1** (SSE: 0, referanssız: 0)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **0** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **0**
- **C** — Flutter çağırıyor, hiçbir backend'de yok (**3** adet):
  - `/api/live-fal/pending`
  - `/api/live-fal/request/$requestId/accept`
  - `/api/live-fal/request/$requestId/reject`
- **D** — İkinci backend'e yönlenen çağrı tespit edilmedi

### TENCENT RTC

- Ana backend route: **4** (SSE: 0, referanssız: 2)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **1** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **0**
- **C** — 404 riski tespit edilmedi
- **D** — İkinci backend'e yönlenen çağrı tespit edilmedi

### PK (DÜELLO)

- Ana backend route: **0** (SSE: 0, referanssız: 0)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **0** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **0**
- **C** — Flutter çağırıyor, hiçbir backend'de yok (**27** adet):
  - `/api/pk/$matchId`
  - `/api/pk/$matchId/cancel`
  - `/api/pk/$matchId/end`
  - `/api/pk/$matchId/events`
  - `/api/pk/$matchId/respond`
  - `/api/pk/$matchId/seats/join`
  - `/api/pk/$matchId/seats/kick`
  - `/api/pk/$matchId/seats/leave`
  - `/api/pk/$matchId/start`
  - `/api/pk/$matchId/stream`
  - `/api/pk/active`
  - `/api/pk/admin/$matchId/force-end`
  - `/api/pk/admin/$matchId/force-kick/$userId`
  - `/api/pk/admin/ban`
  - `/api/pk/admin/bans`
  - `/api/pk/admin/unban/$userId`
  - `/api/pk/cm123/stream`
  - `/api/pk/leaderboard`
  - `/api/pk/me/history`
  - `/api/pk/me/invites`
  - `/api/pk/me/matches`
  - `/api/pk/me/stats`
  - `/api/pk/request`
  - `/api/pk/room`
  - `/api/pk/stats/$userId`
  - `/api/pk/stats/:userId`
  - `/api/pk/{id}/events`
- **D** — Flutter ikinci backend'e gidiyor (**6** adet):
  - `/api/pk/battles`
  - `/api/pk/battles/$battleId`
  - `/api/pk/battles/$battleId/accept`
  - `/api/pk/battles/$battleId/end`
  - `/api/pk/battles/$battleId/reject`
  - `/api/pk/history`

### HEDİYE

- Ana backend route: **12** (SSE: 0, referanssız: 3)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **5** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **0**
- **C** — Flutter çağırıyor, hiçbir backend'de yok (**21** adet):
  - `/api/gifts/battles`
  - `/api/gifts/battles/$id`
  - `/api/gifts/goals`
  - `/api/gifts/insights/`
  - `/api/gifts/insights/album/$userId`
  - `/api/gifts/insights/album/{userId}`
  - `/api/gifts/insights/badge/$userId`
  - `/api/gifts/insights/badge/{id}`
  - `/api/gifts/insights/collection/$userId`
  - `/api/gifts/insights/collection/{userId}`
  - `/api/gifts/insights/feed`
  - `/api/gifts/insights/first-gifter/$context/$contextId`
  - `/api/gifts/insights/first-gifter/{ctx}/{id}`
  - `/api/gifts/insights/leaderboard`
  - `/api/gifts/insights/map`
  - `/api/gifts/insights/me/badge`
  - `/api/gifts/insights/me/history`
  - `/api/gifts/insights/me/recommendations`
  - `/api/gifts/missions`
  - `/api/gifts/missions/$id/claim`
  - `/api/gifts/missions/me`
- **D** — İkinci backend'e yönlenen çağrı tespit edilmedi

### CÜZDAN / JETON / ÖDEME

- Ana backend route: **4** (SSE: 0, referanssız: 0)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **1** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **0**
- **C** — 404 riski tespit edilmedi
- **D** — İkinci backend'e yönlenen çağrı tespit edilmedi

### MÜZİK & !İSTEK

- Ana backend route: **2** (SSE: 0, referanssız: 1)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **1** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **0**
- **C** — 404 riski tespit edilmedi
- **D** — İkinci backend'e yönlenen çağrı tespit edilmedi

### FAL / TAROT / BURÇ / RÜYA

- Ana backend route: **30** (SSE: 14, referanssız: 4)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **1** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **24**
- **C** — Flutter çağırıyor, hiçbir backend'de yok (**1** adet):
  - `/api/fortunes/$slug`
- **D** — İkinci backend'e yönlenen çağrı tespit edilmedi

### OYUNLAR

- Ana backend route: **20** (SSE: 0, referanssız: 1)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **1** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **5**
- **C** — Flutter çağırıyor, hiçbir backend'de yok (**1** adet):
  - `/api/games/quests/$questId`
- **D** — Flutter ikinci backend'e gidiyor (**6** adet):
  - `/api/games/auto-match`
  - `/api/games/history`
  - `/api/games/mini-scores`
  - `/api/games/room/$roomId/join`
  - `/api/games/room/abc123/join`
  - `/api/games/rooms`

### BİLDİRİM

- Ana backend route: **5** (SSE: 1, referanssız: 1)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **2** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **0**
- **C** — Flutter çağırıyor, hiçbir backend'de yok (**1** adet):
  - `/api/notifications/unread`
- **D** — Flutter ikinci backend'e gidiyor (**2** adet):
  - `/api/notifications/$id/read`
  - `/api/notifications/payment`

### YÖNETİM PANELİ

- Ana backend route: **108** (SSE: 0, referanssız: 5)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **2** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **90**
- **C** — Flutter çağırıyor, hiçbir backend'de yok (**3** adet):
  - `/api/admin/gifts/revenue/rules`
  - `/api/admin/mobile-auth`
  - `/api/admin/voice-room-backgrounds`
- **D** — Flutter ikinci backend'e gidiyor (**6** adet):
  - `/api/admin/payment-notifications`
  - `/api/admin/payment-requests`
  - `/api/admin/payment-requests/dismiss-pending`
  - `/api/admin/payments/stream`
  - `/api/admin/voice-room-finance-audit`
  - `/api/admin/voice-room-settings`

### MEDYA / CDN

- Ana backend route: **2** (SSE: 0, referanssız: 0)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **0** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **0**
- **C** — 404 riski tespit edilmedi
- **D** — İkinci backend'e yönlenen çağrı tespit edilmedi

### ÖNBELLEK & İZLEME

- Ana backend route: **2** (SSE: 0, referanssız: 2)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **0** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **0**
- **C** — 404 riski tespit edilmedi
- **D** — İkinci backend'e yönlenen çağrı tespit edilmedi

### DİĞER (listede olmayan backend özellikleri)

- Ana backend route: **109** (SSE: 1, referanssız: 12)
- **A** — Flutter'ın çağırdığı ve ana backend'de karşılığı olan route: **13** (yalnız Flutter) + web ile ortak olanlar
- **B** — Backend'de olup Flutter'ın hiç çağırmadığı route: **24**
- **C** — Flutter çağırıyor, hiçbir backend'de yok (**13** adet):
  - `/api/`
  - `/api/blog/$slug`
  - `/api/blog/recent`
  - `/api/fortune-access/consume`
  - `/api/fortune-access/settings`
  - `/api/membership/plans`
  - `/api/teller/gifts`
  - `/api/teller/reviews`
  - `/api/v1/$trimmed`
  - `/api/v1/${trimmed.substring`
  - `/api/v1/...`
  - `/api/v1/auth/mobile-login`
  - `/api/v1/me`
- **D** — Flutter ikinci backend'e gidiyor (**6** adet):
  - `/api/advisors/online`
  - `/api/fortune-tellers/session/$sessionId`
  - `/api/fortune-tellers/session/$sessionId/respond`
  - `/api/membership/packages`
  - `/api/platform/voice-room-settings`
  - `/api/tournaments/join`

---

## 4. En Kritik Parite Boşlukları (öncelik sırasıyla)

1. **PK (düello) — 27 adres hiçbir backend'de yok.** İlgili 8 veritabanı tablosu (`PkSeat`, `PkGift`, `PkParticipant`, `PkStat`, `PkBan`, `PkEvent`, `PkScore`, `PkBattle`) şemada var ama kodda hiç sorgulanmıyor. Bu özellik Flutter'da yazılmış, backend'de **yazılmamış**.
2. **Hediye (GIFTS) — 21 adres eksik.** `gifts/insights/*`, `gifts/battles`, `gifts/goals`, `gifts/missions` tamamen karşılıksız; `GiftBattle`, `GiftGoal`, `GiftMission` tabloları kullanılmıyor.
3. **Sohbet/mesaj — 22 adres ikinci backend'e gidiyor**, aynı işin bir kısmı ana backend'de de var → en büyük duplicate yığını.
4. **Sosyal — ünlü profilleri ve fan kulüpleri** (`/api/celebrities/*`, `/api/fan-clubs/*`) hiçbir backend'de yok; `Celebrity*` ve `FanClub*` tabloları kullanılmıyor.
5. **Profil kozmetikleri** (`/api/user/cosmetics*`, avatar aksesuarı, mikrofon çerçevesi, isim efekti, giriş efekti, sohbet balonu, emoji paketi) — Flutter çağırıyor, uç yok; ilgili 6 tablo boşta.
6. **Kimlik (AUTH)** — `mobile-login`, `mobile-register`, `mobile-refresh`, `mobile-google`, `mobile-tiktok` **iki backend'de birden** var. Tek auth hedefi için hangisinin gerçekte kullanıldığı canlı kanıtla belirlenmelidir.
7. **Kısa video (SHORTS)** — 8 adres eksik (hashtag, altyazı üretimi, yakınımdakiler, müzik önerisi, analitik).

## 5. Doğrulanmamış / Açık Sorular (Aşama B'den önce yanıtlanmalı)

1. İkinci backend (`canlifalapi.abacusai.app`) canlıda gerçekten çalışıyor mu, hangi uçları fiilen sunuyor? (canlı probe yapılmadı → `NOT PERFORMED`)
2. İki şema aynı veritabanına mı bağlı? Aynıysa hangi tarafın migration geçmişi geçerli?
3. Mobil uygulamanın yayındaki sürümü hangi taban adresi kullanıyor (derleme bayrağına bağlı)?
4. 42 referanssız route'un webhook/cron/mağaza çağrısı olanları hangileri? (sunucu erişim kaydı incelenmeli)

## 6. Dürüstlük notu

Bu raporda **hiçbir özellik "çalışıyor" olarak işaretlenmemiştir.** Tüm sonuçlar kaynak kod eşleşmesine dayanır.
Canlı uçtan uca test, TRTC/ses/kamera testi ve yük testi **yapılmadı** — `NOT PERFORMED`.