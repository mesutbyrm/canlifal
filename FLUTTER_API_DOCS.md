# 🔮 CanLıFal Flutter API Dokümantasyonu

**Base URL:** `https://canlifal.com/api`  
**Tarih:** 2026-06-11  
**Toplam Endpoint:** ~300+ (admin dahil ~400)

---

## 📋 İçindekiler

1. [Authentication Sistemi](#1-authentication-sistemi)
2. [Auth Endpoints](#2-auth-endpoints)
3. [Kullanıcı (User) Endpoints](#3-kullanıcı-endpoints)
4. [Fallar (Fortune) Endpoints](#4-fallar-endpoints)
5. [Video Streams (Canlı Yayın)](#5-video-streams)
6. [Chat Rooms (Sohbet Odaları)](#6-chat-rooms)
7. [Hediyeler (Gifts)](#7-hediyeler)
8. [PK Battle](#8-pk-battle)
9. [Mesajlar (DM)](#9-mesajlar)
10. [Sosyal (Social)](#10-sosyal)
11. [Oyunlar (Games)](#11-oyunlar)
12. [Ünlüler (Celebrities)](#12-ünlüler)
13. [Rüya (Dreams)](#13-rüya)
14. [Blog](#14-blog)
15. [Falcılar (Fortune Tellers)](#15-falcılar)
16. [Üyelik & Jeton & Ödeme](#16-üyelik-jeton-ödeme)
17. [Ajans (Agency)](#17-ajans)
18. [Real-Time SSE Endpoints](#18-real-time-sse)
19. [WebRTC Signaling](#19-webrtc-signaling)
20. [Dosya Yükleme (File Upload)](#20-dosya-yükleme)
21. [Push Notification (FCM)](#21-push-notification)
22. [Cihaz & Presence](#22-cihaz-presence)
23. [Genel/Public Endpoints](#23-genel-public)
24. [Admin Endpoints](#24-admin-endpoints)

---

## 1. Authentication Sistemi

### Token Türü
- **JWT (JSON Web Token)** — HMAC-SHA256 ile imzalanır
- Access Token: **7 gün** geçerlilik
- Refresh Token: **30 gün** geçerlilik

### Header Formatı
```
Authorization: Bearer <accessToken>
```

### Token Payload Yapısı
```json
{
  "userId": "clx1abc123...",
  "email": "user@example.com",
  "role": "user",
  "type": "access",    // "access" veya "refresh"
  "iat": 1718100000,
  "exp": 1718704800
}
```

### Dual Auth Sistemi
Tüm endpoint'ler iki auth yöntemini destekler:
1. **Mobile JWT** → `Authorization: Bearer <accessToken>` header
2. **Web NextAuth Session** → Cookie-based (sadece web)

Flutter'da her zaman **Bearer token** kullanılır.

### Token Refresh Akışı
```
1. Kullanıcı login → accessToken + refreshToken alır
2. Her API çağrısında accessToken gönderilir
3. 401 dönerse → /api/auth/mobile-refresh ile yeni token çifti alınır
4. refreshToken da expired ise → kullanıcıyı login'e yönlendir
```

---

## 2. Auth Endpoints

### POST /api/auth/mobile-login
E-posta ve şifre ile giriş.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "clx1abc123",
    "email": "user@example.com",
    "name": "Mehmet",
    "username": "mehmet123",
    "role": "user",
    "image": "https://...",
    "credits": 100,
    "jetonBalance": 500,
    "cfcBalance": 0,
    "membership": "premium",
    "membershipExpiresAt": "2026-12-31T00:00:00.000Z",
    "preferredLanguage": "tr",
    "level": 5,
    "bio": "Merhaba!",
    "phone": "+905551234567",
    "birthDate": "1995-03-15T00:00:00.000Z",
    "zodiacSign": "balik",
    "referralCode": "A1B2C3D4"
  }
}
```

**Errors:** `400` (eksik alan), `401` (hatalı şifre), `429` (rate limit)

---

### POST /api/auth/mobile-register
Yeni hesap oluşturma.

**Request:**
```json
{
  "email": "yeni@example.com",
  "password": "guclu_sifre_123",
  "name": "Ayşe Yılmaz",
  "username": "ayse_yilmaz",
  "birthDate": "1998-07-20",
  "birthTime": "14:30",
  "referralCode": "A1B2C3D4",
  "preferredLanguage": "tr"
}
```

**Response (201):**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "clx2def456",
    "email": "yeni@example.com",
    "name": "Ayşe Yılmaz",
    "username": "ayse_yilmaz",
    "role": "user",
    "credits": 100,
    "jetonBalance": 0,
    "cfcBalance": 0,
    "membership": null,
    "referralCode": "E5F6G7H8"
  }
}
```

**Zorunlu alanlar:** email, password, name, username, birthDate, birthTime

---

### POST /api/auth/mobile-google
Google ile giriş/kayıt.

**Request:**
```json
{
  "idToken": "google_id_token_from_google_sign_in_plugin",
  "referralCode": "A1B2C3D4"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "isNewUser": false,
  "user": { ... }
}
```

---

### POST /api/auth/mobile-tiktok
TikTok ile giriş/kayıt.

**Request:**
```json
{
  "code": "tiktok_authorization_code",
  "redirectUri": "https://canlifal.com/auth/tiktok/callback",
  "referralCode": "A1B2C3D4"
}
```

**Response (200):** Aynı format (accessToken, refreshToken, isNewUser, user)

---

### POST /api/auth/mobile-refresh
Token yenileme.

**Request:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJ_yeni...",
  "refreshToken": "eyJ_yeni...",
  "user": {
    "id": "clx1abc123",
    "email": "user@example.com",
    "name": "Mehmet",
    "username": "mehmet123",
    "role": "user",
    "image": "https://...",
    "credits": 100,
    "jetonBalance": 500,
    "cfcBalance": 0,
    "membership": "premium",
    "membershipExpiresAt": "2026-12-31T00:00:00.000Z",
    "preferredLanguage": "tr",
    "level": 5
  }
}
```

---

### POST /api/auth/change-password
🔒 Auth gerekli

**Request:**
```json
{
  "currentPassword": "eski_sifre",
  "newPassword": "yeni_guclu_sifre"
}
```

---

### POST /api/auth/forgot-password
**Request:** `{ "email": "user@example.com" }`

### POST /api/auth/reset-password
**Request:** `{ "token": "reset_token", "password": "yeni_sifre" }`

---

## 3. Kullanıcı Endpoints

### GET /api/me
🔒 Auth gerekli — Kullanıcı profili (en kapsamlı)

**Response (200):**
```json
{
  "id": "clx1abc123",
  "email": "user@example.com",
  "name": "Mehmet",
  "username": "mehmet123",
  "phone": "+905551234567",
  "image": "https://...",
  "role": "user",
  "credits": 100,
  "jetonBalance": 500,
  "cfcBalance": 0,
  "membership": "premium",
  "membershipExpiresAt": "2026-12-31T00:00:00.000Z",
  "preferredLanguage": "tr",
  "bio": "Merhaba dünya!",
  "birthDate": "1995-03-15T00:00:00.000Z",
  "birthTime": "14:30",
  "zodiacSign": "balik",
  "risingSign": "aslan",
  "favoriteTeam": "galatasaray",
  "level": 5,
  "xp": 2400,
  "loginStreak": 7,
  "referralCode": "A1B2C3D4",
  "referralCreditsEarned": 150,
  "totalTimeSpentMinutes": 1240,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "specialBadges": ["vip", "early_adopter"],
  "profileEffect": "sparkle",
  "withdrawalLimit": 1000,
  "followersCount": 42,
  "followingCount": 18
}
```

---

### PATCH /api/me
🔒 Auth gerekli — Profil güncelleme

**Request:**
```json
{
  "name": "Yeni İsim",
  "username": "yeni_username",
  "phone": "+905559876543",
  "bio": "Yeni bio",
  "birthDate": "1995-03-15",
  "birthTime": "14:30",
  "zodiacSign": "koc",
  "favoriteTeam": "fenerbahce",
  "preferredLanguage": "en",
  "image": "https://cdn.example.com/avatar.jpg"
}
```

**İzin verilen alanlar:** name, username, phone, bio, birthDate, birthTime, zodiacSign, favoriteTeam, preferredLanguage, image

---

### GET /api/user/profile
🔒 Auth gerekli — Kendi profil özeti

### PATCH /api/user/profile
🔒 Auth gerekli — Profil güncelleme (alternatif)

### GET /api/user/credits
🔒 Auth gerekli — Kredi bakiyesi

**Response:**
```json
{
  "credits": 100,
  "jetonBalance": 500,
  "cfcBalance": 25
}
```

### GET /api/user/xp
🔒 Auth gerekli — XP ve level

### GET /api/user/statistics
🔒 Auth gerekli — Detaylı istatistikler

### GET /api/user/achievements
🔒 Auth gerekli — Rozetler

### GET /api/user/fortunes
🔒 Auth gerekli — Geçmiş fal yorumları

### GET /api/user/followers
🔒 Auth gerekli — Takipçi listesi

### GET /api/user/following
🔒 Auth gerekli — Takip ettikleri

### GET /api/user/received-gifts
🔒 Auth gerekli — Alınan hediyeler

### GET /api/user/broadcast-history
🔒 Auth gerekli — Yayın geçmişi

### GET /api/user/active-sessions
🔒 Auth gerekli — Aktif canlı oturumlar

---

### GET /api/users/{userId}
Public — Başka kullanıcının profili

**Response:**
```json
{
  "id": "clx...",
  "name": "Ali",
  "username": "ali_123",
  "image": "https://...",
  "bio": "...",
  "level": 3,
  "role": "user",
  "followersCount": 10,
  "followingCount": 5
}
```

### POST /api/user/{userId}/follow
🔒 Auth gerekli — Takip et

### DELETE /api/user/{userId}/follow
🔒 Auth gerekli — Takibi bırak

### GET /api/user/{userId}/follow-status
🔒 Auth gerekli — Takip durumu

### GET /api/users/search?q=mehmet
Public — Kullanıcı arama

### GET /api/users/online
Public — Online kullanıcılar

### GET /api/users/lookup/{username}
Public — Kullanıcı adıyla bulma

### GET /api/user/blocked
🔒 Auth — Engellenen kullanıcılar

### DELETE /api/user/blocked
🔒 Auth — Engeli kaldır, body: `{ "blockedUserId": "..." }`

---

## 4. Fallar (Fortune) Endpoints

Tüm fal endpoint'leri `POST` ile çalışır ve **🔒 auth gerektirir**. LLM (yapay zeka) ile yorum üretir, yanıt **SSE stream** olarak döner.

### Fortune Türleri ve Endpoint'leri

| Endpoint | Fal Türü | Request Body |
|----------|----------|-------------|
| POST /api/fortunes/kahve-fali | Kahve Falı | `{ "image": "base64_or_url" }` |
| POST /api/fortunes/coffee | Kahve Falı (EN) | Aynı |
| POST /api/fortunes/tarot-fali | Tarot | `{ "question": "..." }` |
| POST /api/fortunes/tarot | Tarot (EN) | Aynı |
| POST /api/fortunes/burc-yorumu | Burç Yorumu | `{ "zodiacSign": "koc" }` |
| POST /api/fortunes/horoscope | Horoscope (EN) | `{ "zodiacSign": "aries" }` |
| POST /api/fortunes/el-fali | El Falı | `{ "image": "base64_or_url" }` |
| POST /api/fortunes/palm | Palm (EN) | Aynı |
| POST /api/fortunes/ruya-yorumu | Rüya Yorumu | `{ "dream": "Rüyamda..." }` |
| POST /api/fortunes/dream | Dream (EN) | `{ "dream": "I dreamed..." }` |
| POST /api/fortunes/ask-uyumu | Aşk Uyumu | `{ "sign1": "koc", "sign2": "boga" }` |
| POST /api/fortunes/love | Love (EN) | Aynı |
| POST /api/fortunes/melek-kartlari | Melek Kartları | `{ "question": "..." }` |
| POST /api/fortunes/angel | Angel (EN) | Aynı |
| POST /api/fortunes/numeroloji | Numeroloji | `{ "birthDate": "1995-03-15", "name": "Mehmet" }` |
| POST /api/fortunes/numerology | Numerology (EN) | Aynı |
| POST /api/fortunes/katina | Katina | `{ "question": "..." }` |
| POST /api/fortunes/evet-hayir | Evet/Hayır | `{ "question": "..." }` |
| POST /api/fortunes/yesno | Yes/No (EN) | Aynı |
| POST /api/fortunes/aura-analizi | Aura Analizi | `{ "image": "base64_or_url" }` |
| POST /api/fortunes/aura | Aura (EN) | Aynı |
| POST /api/fortunes/dogum-haritasi | Doğum Haritası | `{ "birthDate": "...", "birthTime": "...", "birthPlace": "..." }` |
| POST /api/fortunes/birthchart | Birth Chart (EN) | Aynı |
| POST /api/fortunes/istihare | İstihare | `{ "question": "..." }` |
| POST /api/fortunes/istikhara | Istikhara (EN) | Aynı |
| POST /api/fortunes/kursundokme | Kurşun Dökme | `{}` |

### SSE Yanıt Formatı
Fal endpoint'leri `text/event-stream` döner:
```
data: {"type": "chunk", "content": "Kahvenizde "}
data: {"type": "chunk", "content": "bir yol "}
data: {"type": "chunk", "content": "görünüyor..."}
data: {"type": "done", "fortuneId": "fortune_123"}
data: [DONE]
```

Flutter'da `http` paketi ile SSE parse edilir.

---

## 5. Video Streams (Canlı Yayın)

### GET /api/video-streams
Public — Canlı yayın listesi

**Query:** `?page=1&limit=30`

**Response:**
```json
{
  "streams": [
    {
      "id": "stream_123",
      "streamId": "stream_123",
      "title": "Tarot Falı Bakıyorum",
      "status": "live",
      "isLive": true,
      "category": "tarot",
      "viewers": 42,
      "watching": 42,
      "viewerCount": 42,
      "likeCount": 150,
      "broadcasterId": "user_456",
      "hostUserId": "user_456",
      "streamerName": "Fatma Falcı",
      "thumbnailUrl": "https://...",
      "coverUrl": "https://...",
      "user": {
        "id": "user_456",
        "name": "Fatma Falcı",
        "image": "https://..."
      },
      "createdAt": "2026-06-11T10:00:00.000Z"
    }
  ],
  "items": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 30,
    "total": 5
  }
}
```

### POST /api/video-streams
🔒 Auth gerekli — Yeni yayın başlatma (sadece onaylı falcılar)

**Request:**
```json
{
  "title": "Tarot Falı Canlı",
  "description": "Sorularınızı alıyorum",
  "category": "tarot",
  "tags": ["tarot", "fal"],
  "thumbnailUrl": "https://...",
  "coverUrl": "https://..."
}
```

### GET /api/video-streams/{streamId}
Public — Yayın detayı

### PATCH /api/video-streams/{streamId}
🔒 Auth (yayıncı) — Yayın güncelleme

**Request:**
```json
{
  "status": "ended",
  "title": "Güncellenen başlık",
  "broadcastImage": "https://...",
  "isImageMode": true,
  "backgroundUrl": "https://..."
}
```

### POST /api/video-streams/{streamId}/end
🔒 Auth (yayıncı/admin) — Yayını bitir

### POST /api/video-streams/{streamId}/join
🔒 Auth — Yayına katıl (viewer olarak)

### POST /api/video-streams/{streamId}/leave
🔒 Auth — Yayından ayrıl

### GET /api/video-streams/{streamId}/viewers
Public — İzleyici listesi

### GET /api/video-streams/{streamId}/comments
Public — Yayın yorumları

### POST /api/video-streams/{streamId}/comments
🔒 Auth — Yorum gönder

**Request:**
```json
{
  "content": "Harika yayın!",
  "nickname": "Anonim",
  "isHidden": false
}
```

### POST /api/video-streams/{streamId}/like
Public — Beğeni (batch destekli)

**Request:** `{ "count": 5 }`

### GET /api/video-streams/{streamId}/gifts
Public — Son hediyeler

### POST /api/video-streams/{streamId}/gifts
🔒 Auth — Hediye gönder

**Request:**
```json
{
  "giftTypeId": "gift_type_123",
  "quantity": 1
}
```

**Response:**
```json
{
  "success": true,
  "gift": { "id": "gift_123", "giftType": {...}, "quantity": 1 },
  "newBalance": 450,
  "pkUpdate": null
}
```

### GET /api/video-streams/{streamId}/fortune-requests
🔒 Auth — Fal istekleri listesi

### POST /api/video-streams/{streamId}/fortune-requests
🔒 Auth — Fal isteği gönder

**Request:** `{ "type": "tarot", "question": "..." }`

### GET /api/video-streams/{streamId}/moderators
🔒 Auth — Moderatör listesi

### POST /api/video-streams/{streamId}/ban
🔒 Auth (yayıncı/mod) — Kullanıcı banla

### POST /api/video-streams/{streamId}/mute
🔒 Auth — Sustur

### POST /api/video-streams/{streamId}/live-started
🔒 Auth — Agora yayın başladı bildirimi

### Co-Broadcast (Ortak Yayın):
- GET/POST/PATCH /api/video-streams/{streamId}/co-broadcast
- POST /api/video-streams/{streamId}/co-broadcast/invite

---

## 6. Chat Rooms (Sohbet Odaları)

### GET /api/chat/rooms
Public — Oda listesi

**Response:**
```json
[
  {
    "id": "room_123",
    "name": "Genel Sohbet",
    "description": "Herkesin katılabileceği oda",
    "category": "genel",
    "isActive": true,
    "maxMembers": 100,
    "currentMembers": 42,
    "backgroundImage": "https://...",
    "owner": { "id": "...", "name": "..." }
  }
]
```

### POST /api/chat/rooms/create
🔒 Auth — Oda oluştur

**Request:**
```json
{
  "name": "Tarot Severler",
  "description": "Tarot hakkında sohbet",
  "category": "tarot",
  "maxMembers": 50
}
```

### GET /api/chat/rooms/{roomId}/messages
Public — Mesaj geçmişi

### POST /api/chat/rooms/{roomId}/messages
🔒 Auth — Mesaj gönder

**Request:** `{ "content": "Merhaba!" }`

### DELETE /api/chat/rooms/{roomId}/messages
🔒 Auth (mod/admin) — Mesaj sil, body: `{ "messageId": "..." }`

### POST /api/chat/rooms/{roomId}/gifts
🔒 Auth — Odada hediye gönder

### GET /api/chat/rooms/{roomId}/presence
Public — Odadaki kullanıcılar

### POST /api/chat/rooms/{roomId}/presence
🔒 Auth — Odaya katıl

### DELETE /api/chat/rooms/{roomId}/presence
🔒 Auth — Odadan ayrıl

### GET/POST /api/chat/rooms/{roomId}/dj
🔒 Auth — DJ sistemi (müzik çalma)

### POST /api/chat/rooms/{roomId}/song-request
🔒 Auth — Şarkı isteği

### GET/POST /api/chat/rooms/{roomId}/voice
🔒 Auth — Sesli sohbet

### PATCH /api/chat/rooms/{roomId}/seats
🔒 Auth — Koltuk yönetimi

### GET /api/chat/rooms/backgrounds
Public — Oda arka planları

### GET /api/chat/youtube-stream?videoId=xxx
Public — YouTube video URL çözümleme

---

## 7. Hediyeler (Gifts)

### GET /api/gifts/types
Public — Hediye türleri (cached)

**Response:**
```json
[
  {
    "id": "gift_type_1",
    "name": "Gül",
    "icon": "🌹",
    "price": 10,
    "animationUrl": "https://...",
    "category": "basic",
    "isActive": true,
    "sortOrder": 1
  }
]
```

### GET /api/video-streams/gifts
Public — Tüm hediye türleri (stream için)

### POST /api/gifts/send
🔒 Auth — Profilde hediye gönder

**Request:**
```json
{
  "recipientId": "user_456",
  "giftTypeId": "gift_type_1",
  "quantity": 1
}
```

### GET /api/gifts/recent-big
Public — Son büyük hediyeler

### POST /api/gifts/check-reciprocal
🔒 Auth — Karşılıklı hediye kontrolü

---

## 8. PK Battle

### GET /api/video-streams/pk
Public — Aktif PK listesi

### POST /api/video-streams/pk
🔒 Auth — PK daveti gönder

**Request:**
```json
{
  "opponentStreamId": "stream_456",
  "durationMinutes": 5
}
```

### POST /api/video-streams/pk/score
🔒 Auth — PK skor güncelle

**Request:** `{ "pkBattleId": "pk_123", "streamId": "stream_123", "points": 10 }`

### GET /api/video-streams/pk/list
Public — PK geçmişi

### GET /api/video-streams/{streamId}/pk-battle
Public — Stream'in aktif PK'sı

### POST /api/video-streams/{streamId}/pk-battle
🔒 Auth — PK aksiyon (accept, reject, cancel, end)

**Request:** `{ "action": "accept", "pkBattleId": "pk_123" }`

---

## 9. Mesajlar (DM)

### GET /api/messages
🔒 Auth — Mesaj konuşmaları listesi

### GET /api/messages/{userId}
🔒 Auth — Bir kullanıcıyla mesaj geçmişi

### POST /api/messages/{userId}
🔒 Auth — Mesaj gönder

**Request:** `{ "content": "Merhaba!" }`

### POST /api/messages/request
🔒 Auth — Mesaj isteği gönder

### PATCH /api/messages/request
🔒 Auth — Mesaj isteğini kabul/reddet

**Request:** `{ "requestId": "...", "action": "accept" }`

---

## 10. Sosyal (Social)

### GET /api/social/posts
Public — Sosyal medya akışı

### POST /api/social/posts
🔒 Auth — Gönderi oluştur

**Request:**
```json
{
  "content": "Bugünkü falım harika!",
  "images": ["https://..."],
  "type": "text"
}
```

### GET /api/social/posts/{postId}
Public — Gönderi detayı

### POST /api/social/posts/{postId}/likes
🔒 Auth — Beğen

### GET /api/social/posts/{postId}/comments
Public — Yorumlar

### POST /api/social/posts/{postId}/comments
🔒 Auth — Yorum yap

### GET /api/stories
Public — Hikayeler

### POST /api/stories
🔒 Auth — Hikaye paylaş

---

## 11. Oyunlar (Games)

### GET /api/games
Public — Oyun listesi

### GET /api/games/lobby
Public — Lobi

### POST /api/games/play
🔒 Auth — Oyun oyna

### POST /api/games/room
🔒 Auth — Oyun odası oluştur

### GET /api/games/room/{roomId}
Public — Oda detayı

### GET /api/games/leaderboard
Public — Sıralama

### GET /api/games/profile
🔒 Auth — Oyun profili

### POST /api/games/daily-spin
🔒 Auth — Günlük çark

### POST /api/games/lamba-cini
🔒 Auth — Lamba Cini oyunu

### SOS Oyunu:
- POST/GET /api/games/sos
- GET/POST/PATCH/DELETE /api/games/sos/{gameId}
- GET/POST /api/games/sos/{gameId}/chat

---

## 12. Ünlüler (Celebrities)

### GET /api/celebrities
Public — Ünlü listesi

### GET /api/celebrities/{slug}
Public — Ünlü detayı

### POST /api/celebrities/{slug}/follow
🔒 Auth — Takip et

### GET /api/celebrities/{slug}/fan-club
Public — Fan kulübü

### POST /api/celebrities/{slug}/fan-club/join
🔒 Auth — Fan kulübüne katıl

### GET/POST /api/celebrities/{slug}/fan-club/posts
Fan kulübü gönderileri

### GET/POST /api/celebrities/{slug}/fan-club/polls
Fan kulübü anketleri

---

## 13. Rüya (Dreams)

### GET /api/dreams
Public — Rüya sözlüğü

### GET /api/dreams/{slug}
Public — Rüya detayı

### POST /api/dreams/interpret
🔒 Auth — AI rüya yorumu (SSE stream)

**Request:** `{ "dream": "Rüyamda uçuyordum..." }`

### GET/POST /api/dream-diary
🔒 Auth — Rüya günlüğü

### GET /api/dream-symbols
Public — Rüya sembolleri

### GET /api/dream-stats
🔒 Auth — Rüya istatistikleri

### GET /api/dream-contest
Public — Rüya yarışması

---

## 14. Blog

### GET /api/blog?page=1&limit=10
Public — Blog yazıları

### GET /api/blog/categories
Public — Kategoriler

### POST /api/blog/like
🔒 Auth — Beğen, body: `{ "postId": "..." }`

### POST /api/blog/favorite
🔒 Auth — Favorilere ekle

### GET/POST /api/blog/comments
Yorumlar

---

## 15. Falcılar (Fortune Tellers)

### GET /api/fortune-tellers
Public — Falcı listesi

**Response:**
```json
[
  {
    "id": "teller_123",
    "displayName": "Fatma Falcı",
    "avatar": "https://...",
    "specialties": ["tarot", "kahve"],
    "rating": 4.8,
    "totalSessions": 150,
    "isOnline": true,
    "pricePerMinute": 10
  }
]
```

### GET /api/fortune-tellers/{tellerId}
Public — Falcı detayı

### POST /api/fortune-tellers/{tellerId}/session
🔒 Auth — Canlı seans isteği

**Request:**
```json
{
  "fortuneType": "tarot",
  "maxMinutes": 15,
  "question": "Aşk hayatım hakkında..."
}
```

### GET /api/fortune-tellers/{tellerId}/reviews
Public — Değerlendirmeler

### POST /api/fortune-tellers/apply
🔒 Auth — Falcı başvurusu

### POST /api/fortune-tellers/toggle-online
🔒 Auth (falcı) — Online/offline geçiş

### GET /api/fortune-tellers/my-profile
🔒 Auth (falcı) — Kendi profili

### GET /api/fortune-tellers/sessions
🔒 Auth (falcı) — Gelen seans istekleri

### PATCH /api/fortune-tellers/sessions/{sessionId}
🔒 Auth (falcı) — Seans kabul/reddet/tamamla

**Request:** `{ "action": "accept" }` / `"complete"` / `"reject"` / `"cancel"`

### GET /api/favorite-tellers
🔒 Auth — Favori falcılar

### POST /api/favorite-tellers
🔒 Auth — Favorilere ekle/çıkar, body: `{ "tellerId": "..." }`

---

## 16. Üyelik & Jeton & Ödeme

### GET /api/membership/packages
Public — Üyelik paketleri (Flutter uyumlu, cached)

**Response:**
```json
[
  {
    "id": "plan_gold",
    "name": "Gold Üyelik",
    "tier": "gold",
    "priceType": "fixed",
    "price": 99.99,
    "currency": "TRY",
    "durationDays": 30,
    "features": ["Sınırsız fal", "Özel badge"],
    "bonusJetons": 100,
    "discountPercent": 20,
    "prioritySupport": true,
    "exclusiveBadge": "gold_star",
    "isFeatured": true,
    "sortOrder": 1
  }
]
```

### GET /api/memberships
Public — Üyelik planları (alternatif)

### POST /api/memberships/purchase
🔒 Auth — Üyelik satın al

### GET /api/credit-packages
Public — Kredi paketleri

### GET /api/jeton?action=balance
🔒 Auth — Jeton bakiyesi

### POST /api/jeton
🔒 Auth — Jeton işlemleri

### GET /api/payment-methods
Public — Ödeme yöntemleri

### POST /api/payment/requests
🔒 Auth — Ödeme talebi oluştur

### GET /api/payment/requests
🔒 Auth — Ödeme talebi geçmişi

### GET /api/public/jeton-price
Public — Jeton fiyatı

### GET /api/withdrawals
🔒 Auth — Para çekme geçmişi

### POST /api/withdrawals
🔒 Auth — Para çekme talebi

---

## 17. Ajans (Agency)

### POST /api/agency/apply
🔒 Auth — Ajans başvurusu

### GET /api/agency/my
🔒 Auth — Kendi ajansım

### PATCH /api/agency/my
🔒 Auth — Ajans güncelle

### GET /api/agency/members
🔒 Auth — Üye listesi

### POST /api/agency/invite
🔒 Auth — Davet gönder

### POST /api/agency/join
🔒 Auth — Ajansa katıl

### GET /api/agency/earnings
🔒 Auth — Kazançlar

### GET /api/agency/leaderboard
Public — Ajans sıralaması

### GET/POST /api/agency/withdrawals
🔒 Auth — Ajans para çekme

---

## 18. Real-Time SSE Endpoints

Bu endpoint'ler `text/event-stream` döner. Flutter'da `http` paketi veya `eventsource` paketi ile dinlenir.

### GET /api/video-streams/{streamId}/stream
🔒 Auth (opsiyonel) — Canlı yayın event'leri

**Bağlantı:**
```
GET https://canlifal.com/api/video-streams/{streamId}/stream
Authorization: Bearer <accessToken>
Accept: text/event-stream
```

**Events:**
```
event: streamMessage
data: {"id":"msg_1","content":"Merhaba","user":{"id":"...","name":"Ali"}}

event: viewerCount
data: {"count":42}

event: gift
data: {"id":"gift_1","sender":{"name":"Ayşe"},"giftType":{"name":"Gül","icon":"🌹"},"quantity":1,"totalPrice":10}

event: streamEnded
data: {"streamId":"stream_123"}

event: djEvent
data: {"type":"play","song":{"title":"...","url":"..."}}
```

### GET /api/chat/rooms/{roomId}/stream
🔒 Auth (opsiyonel) — Sohbet odası event'leri

**Events:** message, typing, presence, gift, songRequest, djEvent, viewerUpdate

### Fortune SSE
Tüm `/api/fortunes/*` POST endpoint'leri SSE stream döner:
```
data: {"type":"chunk","content":"..."}
data: {"type":"done","fortuneId":"..."}
data: [DONE]
```

---

## 19. WebRTC Signaling

### Agora Token
**POST /api/agora/token** 🔒 Auth

**Request:**
```json
{
  "channelName": "stream_123",
  "role": "host",
  "uid": 0
}
```

**Response:**
```json
{
  "token": "006abc...",
  "uid": 0,
  "channelName": "stream_123",
  "appId": "abc123def456"
}
```

### TRTC UserSig
**POST /api/trtc/usersig** 🔒 Auth (opsiyonel)

**Request:** `{ "userId": "user_123", "roomId": "room_456" }`

**Response:**
```json
{
  "sdkAppId": 1400000000,
  "userId": "user_123",
  "userSig": "eJx...",
  "roomId": "room_456"
}
```

### WebRTC Signal (Fallback)
- POST /api/video-streams/signal — Sinyal gönder
- GET /api/video-streams/signal — Bekleyen sinyalleri al
- DELETE /api/video-streams/signal — Sinyalleri temizle

- POST/GET/DELETE /api/video-streams/{streamId}/signal — Stream-specific signaling
- POST/GET/DELETE /api/room/signal — Canlı oda signaling

---

## 20. Dosya Yükleme (File Upload)

### POST /api/upload/presigned
🔒 Auth — Presigned URL al (S3 direct upload)

**Request:**
```json
{
  "fileName": "avatar.jpg",
  "contentType": "image/jpeg",
  "isPublic": true
}
```

**Response:**
```json
{
  "uploadUrl": "https://s3.amazonaws.com/bucket/key?X-Amz-Signature=...",
  "cloud_storage_path": "uploads/2026/06/uuid-avatar.jpg"
}
```

**Flutter Upload Flow:**
1. `POST /api/upload/presigned` ile presigned URL al
2. `PUT uploadUrl` ile dosyayı doğrudan S3'e yükle
3. `cloud_storage_path` değerini API'ye gönder (profil fotoğrafı vs.)

**ÖNEMLİ:** Upload PUT isteğinde `Content-Type` header'ı gönderilmelidir.

### POST /api/upload/get-url
🔒 Auth — Dosya URL'i al

**Request:**
```json
{
  "cloud_storage_path": "uploads/2026/06/uuid-avatar.jpg",
  "isPublic": false
}
```

**Response:** `{ "url": "https://signed-url..." }`

---

## 21. Push Notification (FCM)

### POST /api/devices/fcm
🔒 Auth — FCM token kaydet

**Request:**
```json
{
  "token": "fcm_token_from_firebase_messaging",
  "platform": "android",
  "appVersion": "1.0.0"
}
```

**Response:** `{ "success": true, "deviceId": "device_123" }`

### DELETE /api/devices/fcm
🔒 Auth — FCM token sil (logout'ta)

**Request:** `{ "token": "fcm_token..." }`

**Response:** `{ "success": true }`

---

## 22. Cihaz & Presence

### GET /api/auth/verify-device
Cihaz doğrulama

### POST /api/auth/reclaim-device
Cihaz geri alma

### POST /api/presence
🔒 Auth — Presence güncelle

### GET /api/presence
Presence bilgisi

### GET /api/presence/sections
Bölüm bazlı presence

---

## 23. Genel/Public Endpoints

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| /api/homepage-buttons | GET | Ana sayfa butonları |
| /api/homepage-fortune-cards | GET | Ana sayfa fal kartları |
| /api/homepage-ticker | GET | Kayan yazılar |
| /api/announcements | GET | Duyurular |
| /api/popups | GET | Pop-up bildirimleri |
| /api/public-stats | GET | Site istatistikleri |
| /api/leaderboard | GET | Genel sıralama |
| /api/leaderboards | GET | Detaylı sıralama |
| /api/search?q=xxx | GET | Genel arama |
| /api/search/advanced | GET | Detaylı arama |
| /api/trends | GET | Trendler |
| /api/trend-videos | GET | Trend videolar |
| /api/tiktok-videos | GET | TikTok videoları |
| /api/football | GET | Futbol maçları |
| /api/translations | GET | Çeviriler |
| /api/settings/public | GET | Public ayarlar |
| /api/settings/themes | GET | Tema ayarları |
| /api/broadcast-images | GET | Yayın görselleri |
| /api/online-fal | GET | Online fal seçenekleri |
| /api/fortune-request-types | GET | Fal istek türleri |
| /api/membership-badges | GET | Üyelik rozetleri |
| /api/profile-frames | GET | Profil çerçeveleri |
| /api/platform/commission-rate | GET | Komisyon oranı |
| /api/daily-login | GET/POST | Günlük giriş ödülü |
| /api/daily-missions | GET/POST | Günlük görevler |
| /api/referral | GET | Referans bilgisi |
| /api/referral/validate?code=XXX | GET | Referans kodu doğrulama |
| /api/contact | POST | İletişim formu |
| /api/compatibility | POST | Burç uyumu |
| /api/activities | GET | Aktivite akışı |
| /api/notifications | GET/POST | Bildirimler |

---

## 24. Admin Endpoints

Admin endpoint'leri `/api/admin/*` altında. Tüm admin endpoint'leri **admin** veya **yonetici** rolü gerektirir.

> Flutter'da admin paneline gerek yoksa bu bölümü atlayabilirsiniz. Web admin paneli üzerinden yönetilir.

Toplam ~100 admin endpoint vardır. Detaylara ihtiyaç olursa ayrıca listelenebilir.

---

## 🔧 Flutter İmplementasyon Notları

### 1. HTTP Client Yapısı
```dart
class ApiClient {
  static const baseUrl = 'https://canlifal.com/api';
  
  String? _accessToken;
  String? _refreshToken;
  
  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
  };
  
  Future<http.Response> _request(String method, String path, {Map? body}) async {
    var response = await _makeRequest(method, path, body: body);
    
    if (response.statusCode == 401 && _refreshToken != null) {
      final refreshed = await _refreshTokens();
      if (refreshed) {
        response = await _makeRequest(method, path, body: body);
      }
    }
    
    return response;
  }
}
```

### 2. SSE Dinleme (EventSource)
```dart
import 'package:http/http.dart' as http;

Stream<String> listenSSE(String url, String token) async* {
  final request = http.Request('GET', Uri.parse(url));
  request.headers['Authorization'] = 'Bearer $token';
  request.headers['Accept'] = 'text/event-stream';
  
  final response = await http.Client().send(request);
  
  await for (final chunk in response.stream.transform(utf8.decoder)) {
    for (final line in chunk.split('\n')) {
      if (line.startsWith('data: ')) {
        yield line.substring(6);
      }
    }
  }
}
```

### 3. Dosya Yükleme
```dart
Future<String> uploadFile(File file) async {
  // 1. Presigned URL al
  final presignedRes = await apiClient.post('/upload/presigned', body: {
    'fileName': path.basename(file.path),
    'contentType': lookupMimeType(file.path),
    'isPublic': true,
  });
  
  // 2. S3'e yükle
  await http.put(
    Uri.parse(presignedRes['uploadUrl']),
    body: await file.readAsBytes(),
    headers: {'Content-Type': lookupMimeType(file.path)!},
  );
  
  return presignedRes['cloud_storage_path'];
}
```

### 4. Token Saklama
- `flutter_secure_storage` ile accessToken ve refreshToken saklanır
- App başlangıcında `/api/me` çağrılarak token geçerliliği kontrol edilir
- 401 → automatic refresh → hâlâ 401 → login ekranına yönlendir

---

## 📊 Rate Limiting

Auth endpoint'leri IP bazlı rate limit'e tabidir:
- `/api/auth/mobile-login` → 5 istek/dakika/IP
- `/api/auth/mobile-register` → 3 istek/dakika/IP
- `/api/auth/mobile-google` → 5 istek/dakika/IP
- `/api/auth/mobile-tiktok` → 5 istek/dakika/IP

Rate limit aşıldığında: `429 Too Many Requests`

---

## 📝 Hata Formatı

Tüm endpoint'ler tutarlı hata formatı döner:

```json
{
  "error": "Hata mesajı Türkçe"
}
```

HTTP Status kodları:
- `200` — Başarılı
- `201` — Oluşturuldu
- `400` — Geçersiz istek
- `401` — Kimlik doğrulama gerekli
- `403` — Yetki yok
- `404` — Bulunamadı
- `429` — Rate limit aşıldı
- `500` — Sunucu hatası

---

*Bu döküman canlifal.com backend API'sinin Flutter entegrasyonu için hazırlanmıştır.*
*Güncellenme: 2026-06-11*
