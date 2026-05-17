# 📱 CanlifalTV Flutter Mobil Uygulama — API Dokümantasyonu

> **Temel API URL:** `https://canlifal.com`
> **Tüm endpoint'ler bu base URL'nin altındadır.**
> **İçerik tipi:** `application/json`

---

## 📋 İçindekiler

1. [Kimlik Doğrulama (Auth)](#1-kimlik-doğrulama-auth)
2. [Token/JWT Sistemi](#2-tokenjwt-sistemi)
3. [Kullanıcı Profili](#3-kullanıcı-profili)
4. [Sosyal Akış (Feed)](#4-sosyal-akış-feed)
5. [Hikayeler (Stories)](#5-hikayeler-stories)
6. [Canlı Yayın (Video Streams)](#6-canlı-yayın-video-streams)
7. [Sesli Sohbet Odaları](#7-sesli-sohbet-odaları)
8. [Mesajlaşma (DM)](#8-mesajlaşma-dm)
9. [Bildirimler](#9-bildirimler)
10. [Hediye Sistemi](#10-hediye-sistemi)
11. [Jeton & CFC Bakiyesi](#11-jeton--cfc-bakiyesi)
12. [Gold Üyelik](#12-gold-üyelik)
13. [FunClub](#13-funclub)
14. [Davet (Referral) Sistemi](#14-davet-referral-sistemi)
15. [Trend / Keşfet / Arama](#15-trend--keşfet--arama)
16. [Oyunlar](#16-oyunlar)
17. [12 Fal/Yorum Türü](#17-12-falyorum-türü)
18. [Tencent RTC Entegrasyonu](#18-tencent-rtc-entegrasyonu)
19. [Dosya Yükleme](#19-dosya-yükleme)
20. [Diğer Endpoint'ler](#20-diğer-endpointler)

---

## 1. Kimlik Doğrulama (Auth)

### 1.1 Giriş (Login)

```
POST /api/auth/mobile-login
```

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "kullanici@email.com",
  "password": "sifre123"
}
```

**Başarılı Yanıt (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "clxyz123",
    "email": "kullanici@email.com",
    "name": "Ahmet Yılmaz",
    "username": "ahmetyilmaz",
    "role": "user",
    "image": "https://pbs.twimg.com/amplify_video_thumb/2053513200621031426/img/LqHd3VQYSRCU38E1.jpg",
    "credits": 150,
    "jetonBalance": 500,
    "membership": "basic",
    "membershipExpiresAt": "2025-12-31T00:00:00.000Z",
    "preferredLanguage": "tr",
    "level": 5,
    "bio": "Merhaba!",
    "phone": "+905551234567",
    "birthDate": "1990-01-15T00:00:00.000Z",
    "zodiacSign": "Oğlak",
    "referralCode": "A1B2C3D4"
  }
}
```

**Hata Yanıtları:**
```json
// 400
{ "error": "E-posta ve şifre gereklidir" }
// 401
{ "error": "E-posta veya şifre hatalı" }
// 429
{ "error": "Çok fazla istek. Lütfen biraz bekleyin." }
```

---

### 1.2 Kayıt (Register)

```
POST /api/auth/mobile-register
```

**Request Body:**
```json
{
  "email": "yeni@email.com",
  "password": "güçlüsifre123",
  "name": "Fatma Demir",
  "username": "fatmademir",
  "birthDate": "1995-06-20",
  "birthTime": "14:30",
  "referralCode": "A1B2C3D4",
  "preferredLanguage": "tr"
}
```

> `referralCode` ve `preferredLanguage` opsiyoneldir.
> Zorunlu alanlar: `email, password, name, username, birthDate, birthTime`

**Başarılı Yanıt (201):**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "clxyz456",
    "email": "yeni@email.com",
    "name": "Fatma Demir",
    "username": "fatmademir",
    "role": "user",
    "credits": 50,
    "jetonBalance": 0,
    "membership": "basic",
    "referralCode": "E5F6G7H8"
  }
}
```

**Hata Yanıtları:**
```json
// 400
{ "error": "Zorunlu alanlar: email, password, name, username, birthDate, birthTime" }
{ "error": "Bu e-posta adresi zaten kayıtlı" }
{ "error": "Bu kullanıcı adı zaten alınmış" }
{ "error": "Geçersiz e-posta adresi" }
```

---

### 1.3 Token Yenileme (Refresh)

```
POST /api/auth/mobile-refresh
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Başarılı Yanıt (200):**
```json
{
  "accessToken": "eyJ_yeni_access...",
  "refreshToken": "eyJ_yeni_refresh...",
  "user": {
    "id": "clxyz123",
    "email": "kullanici@email.com",
    "name": "Ahmet Yılmaz",
    "username": "ahmetyilmaz",
    "role": "user",
    "image": "https://pbs.twimg.com/profile_images/1901475741864443906/EHIOjIit_400x400.jpg",
    "credits": 150,
    "jetonBalance": 500,
    "membership": "gold",
    "membershipExpiresAt": "2025-12-31T...",
    "preferredLanguage": "tr",
    "level": 5
  }
}
```

### 1.4 Çıkış (Logout)

Mobil tarafta token'ları silmek yeterlidir — sunucu tarafında özel bir logout endpoint'i yoktur. `accessToken` ve `refreshToken`'ı cihaz deposundan temizleyin.

---

## 2. Token/JWT Sistemi

| Özellik | Değer |
|---------|-------|
| Token Türü | JWT (JSON Web Token) |
| Access Token Süresi | **7 gün** |
| Refresh Token Süresi | **30 gün** |
| Header Formatı | `Authorization: Bearer <accessToken>` |
| İmza Algoritması | HS256 |

**JWT Payload Yapısı:**
```json
{
  "userId": "clxyz123",
  "email": "kullanici@email.com",
  "role": "user",
  "type": "access",
  "iat": 1700000000,
  "exp": 1700604800
}
```

**Tüm korumalı endpoint'lerde şu header gönderilmelidir:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

> Backend hem Bearer token (mobil) hem NextAuth session (web) destekler. Mobil uygulama için her zaman Bearer token kullanın.

---

## 3. Kullanıcı Profili

### 3.1 Kendi Profilini Getir

```
GET /api/user/profile
Authorization: Bearer <token>
```

**Yanıt:**
```json
{
  "id": "clxyz123",
  "name": "Ahmet Yılmaz",
  "username": "ahmetyilmaz",
  "email": "ahmet@email.com",
  "phone": "+905551234567",
  "image": "https://pbs.twimg.com/profile_images/2046550538729242624/Rm2oMwpx.jpg",
  "bio": "Astroloji meraklısı",
  "birthDate": "1990-01-15T00:00:00.000Z",
  "birthTime": "14:30",
  "zodiacSign": "Oğlak",
  "risingSign": "Yay",
  "favoriteTeam": "Galatasaray",
  "credits": 150,
  "jetonBalance": 500,
  "role": "user",
  "membership": "gold",
  "membershipExpiresAt": "2025-12-31T...",
  "messagePrivacy": "followers",
  "hideProfileViews": false,
  "profileFrame": { "id": "...", "name": "Altın Çerçeve", "imageUrl": "..." },
  "followersCount": 120,
  "followingCount": 85,
  "fortunesCount": 45,
  "postsCount": 12,
  "likesCount": 340
}
```

### 3.2 Profil Güncelle

```
PUT /api/user/profile
Authorization: Bearer <token>
```

**Request Body (tümü opsiyonel):**
```json
{
  "name": "Yeni İsim",
  "username": "yeniusername",
  "bio": "Yeni biyografi",
  "phone": "+905559876543",
  "birthDate": "1990-01-15",
  "birthTime": "14:30",
  "zodiacSign": "Oğlak",
  "risingSign": "Yay",
  "favoriteTeam": "Fenerbahçe",
  "image": "https://images.ctfassets.net/cto6k7l91cv5/5EmRLFNnE44NXzY8cllCtT/49e6452bb8ead6060dc6942de25e0e87/cardinal-signs-aries-cancer-libra-capricorn.jpg",
  "messagePrivacy": "everyone",
  "hideProfileViews": true
}
```

### 3.3 Başka Kullanıcı Profili

```
GET /api/users/{userId}
```

### 3.4 Takipçiler / Takip Edilenler

```
GET /api/user/followers?userId={userId}
GET /api/user/following?userId={userId}
Authorization: Bearer <token>
```

**Yanıt:**
```json
{
  "followers": [
    { "id": "cl...", "name": "Ali", "username": "ali123", "image": "..." }
  ]
}
```

### 3.5 Takip Et / Takibi Bırak

```
POST /api/user/{userId}/follow     — Takip et
DELETE /api/user/{userId}/follow   — Takibi bırak
Authorization: Bearer <token>
```

### 3.6 Takip Durumu Kontrol

```
GET /api/user/{userId}/follow-status
Authorization: Bearer <token>
```

**Yanıt:**
```json
{ "isFollowing": true, "isFollowedBy": false }
```

### 3.7 Kullanıcı Ara

```
GET /api/users/search?q=ahmet
Authorization: Bearer <token>
```

**Yanıt:**
```json
[
  { "id": "cl...", "name": "Ahmet Yılmaz", "username": "ahmetyilmaz", "image": "..." }
]
```

### 3.8 Bakiye Bilgisi

```
GET /api/user/credits
Authorization: Bearer <token>
```

**Yanıt:**
```json
{
  "credits": 150,
  "jetonBalance": 500,
  "jetonTlRate": 0.5,
  "withdrawalLimit": 1000,
  "membership": "gold",
  "membershipExpiresAt": "2025-12-31T..."
}
```

---

## 4. Sosyal Akış (Feed)

### 4.1 Gönderileri Listele

```
GET /api/social/posts?page=1&limit=20&type=fortune
```

> `type` opsiyonel: `fortune`, `text`, `horoscope`

**Yanıt:**
```json
{
  "posts": [
    {
      "id": "post123",
      "content": "Bugünkü tarot falım harika çıktı!",
      "postType": "fortune",
      "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg/960px-RWS_Tarot_10_Wheel_of_Fortune.jpg",
      "isPublic": true,
      "createdAt": "2025-01-15T10:30:00Z",
      "user": {
        "id": "cl...", "name": "Fatma", "image": "...",
        "role": "user", "membership": "gold"
      },
      "_count": { "comments": 5, "likes": 23 },
      "likes": [{ "userId": "cl..." }],
      "comments": [
        {
          "id": "cm...", "content": "Harika!",
          "user": { "id": "cl...", "name": "Ali", "image": "..." },
          "createdAt": "2025-01-15T11:00:00Z"
        }
      ],
      "viewCount": 120
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### 4.2 Gönderi Oluştur

```
POST /api/social/posts
Authorization: Bearer <token>
```

**Body:**
```json
{
  "content": "Bugün harika bir gün!",
  "imageUrl": "https://pbs.twimg.com/media/Dh3JJxoV4AABXJN?format=jpg&name=small",
  "postType": "text",
  "isPublic": true
}
```

### 4.3 Gönderiyi Beğen / Beğeniyi Kaldır (Toggle)

```
POST /api/social/posts/{postId}/likes
Authorization: Bearer <token>
```

**Yanıt:**
```json
{ "liked": true, "likeCount": 24 }
```

### 4.4 Yorum Yap

```
POST /api/social/posts/{postId}/comments
Authorization: Bearer <token>
```

**Body:**
```json
{ "content": "Harika bir paylaşım!" }
```

### 4.5 Yorumları Getir

```
GET /api/social/posts/{postId}/comments
```

---

## 5. Hikayeler (Stories)

### 5.1 Hikayeleri Getir (Kullanıcıya göre gruplanmış)

```
GET /api/stories
Authorization: Bearer <token> (opsiyonel — takip edilen öncelikli sıralama için)
```

**Yanıt:**
```json
{
  "storyGroups": [
    {
      "user": { "id": "cl...", "name": "Fatma", "image": "...", "username": "fatma" },
      "isFollowed": true,
      "stories": [
        {
          "id": "story123",
          "mediaUrl": "https://asset.gecdesigns.com/img/wallpapers/beautiful-good-morning-image-with-golden-sunrise-over-forest-for-a-peaceful-and-positive-start-sr12102506-cover.webp",
          "mediaType": "image",
          "caption": "Günaydın ☀️",
          "viewCount": 45,
          "createdAt": "2025-01-15T08:00:00Z",
          "expiresAt": "2025-01-16T08:00:00Z"
        }
      ]
    }
  ]
}
```

### 5.2 Hikaye Paylaş

```
POST /api/stories
Authorization: Bearer <token>
```

**Body:**
```json
{
  "mediaUrl": "https://play-lh.googleusercontent.com/SdqitY7KDmSdOk7JGtm5_EDeiIq-y_T0yxELy8-Mz4-LbVlWO3XgVYHSwaJJa-3xzM8=w526-h296-rw",
  "mediaType": "image",
  "caption": "Bugünkü falım ✨",
  "textOverlay": {
    "text": "Harika!",
    "x": 50, "y": 50,
    "fontSize": 24,
    "color": "#ffffff",
    "fontFamily": "Arial"
  }
}
```

> `mediaType`: `"image"` veya `"video"`
> Hikayeler 24 saat sonra otomatik sona erer.

---

## 6. Canlı Yayın (Video Streams)

### 6.1 Aktif Yayınları Listele

```
GET /api/video-streams
```

**Yanıt:**
```json
[
  {
    "id": "stream123",
    "title": "Canlı Tarot Falı",
    "description": "Akşam seansı",
    "status": "live",
    "startedAt": "2025-01-15T20:00:00Z",
    "user": { "id": "cl...", "name": "Ayşe Falcı", "image": "..." },
    "viewerCount": 45,
    "likeCount": 120,
    "commentCount": 30
  }
]
```

### 6.2 Yayın Başlat

```
POST /api/video-streams
Authorization: Bearer <token>
```

**Body:**
```json
{
  "title": "Canlı Fal Seansı",
  "description": "Tarot ve kahve falı"
}
```

### 6.3 Yayın Detayı

```
GET /api/video-streams/{streamId}
```

### 6.4 Yayına Katıl (İzleyici)

```
POST /api/video-streams/{streamId}/join
Authorization: Bearer <token>
```

**Yanıt:**
```json
{ "viewerId": "viewer_abc123", "status": "joined" }
```

### 6.5 Yayından Ayrıl

```
DELETE /api/video-streams/{streamId}/join?viewerId=viewer_abc123
Authorization: Bearer <token>
```

### 6.6 Yayında Yorum Yap

```
POST /api/video-streams/{streamId}/comments
Authorization: Bearer <token>
```

**Body:**
```json
{ "content": "Harika yayın! 🔮" }
```

### 6.7 Yayında Beğeni (TikTok tarzı — her tıklama +1)

```
POST /api/video-streams/{streamId}/like
```

### 6.8 Yayında Hediye Gönder

```
POST /api/video-streams/{streamId}/gifts
Authorization: Bearer <token>
```

**Body:**
```json
{
  "giftTypeId": "gift_rose",
  "quantity": 1
}
```

**Yanıt:**
```json
{
  "success": true,
  "gift": {
    "id": "...",
    "giftType": { "name": "Gül", "icon": "🌹", "price": 10, "animationUrl": "..." },
    "sender": { "name": "Ahmet", "image": "..." },
    "quantity": 1,
    "totalCost": 10
  }
}
```

### 6.9 Yayını Bitir

```
PATCH /api/video-streams/{streamId}
Authorization: Bearer <token>
```

**Body:**
```json
{ "status": "ended" }
```

### 6.10 WebRTC Sinyal (Signaling)

```
POST /api/video-streams/signal
Authorization: Bearer <token>
```

**Body:**
```json
{
  "streamId": "stream123",
  "recipientId": "user456",
  "signalType": "offer",
  "signalData": "{...SDP data...}"
}
```

```
GET /api/video-streams/signal?streamId=stream123&recipientId=myUserId
```

### 6.11 PK (Player vs Player) Yayın

```
GET  /api/video-streams/pk/list          — Aktif PK listesi
POST /api/video-streams/pk               — PK başlat/kabul et
POST /api/video-streams/pk/score         — PK skor güncelle
```

### 6.12 Co-Broadcast (Ortak Yayın)

```
POST /api/video-streams/{streamId}/co-broadcast
GET  /api/user/co-broadcast-invites
```

---

## 7. Sesli Sohbet Odaları

### 7.1 Odaları Listele

```
GET /api/chat/rooms
GET /api/chat/rooms?withCounts=true
```

**Yanıt:**
```json
[
  {
    "id": "room123",
    "slug": "astroloji-sohbet",
    "nameTr": "Astroloji Sohbet",
    "icon": "🔮",
    "ownerId": "cl...",
    "owner": { "name": "Admin", "image": "..." },
    "onlineCount": 12,
    "recentUsers": [...]
  }
]
```

### 7.2 Oda Oluştur

```
POST /api/chat/rooms/create
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "Fal Sohbeti",
  "description": "Canlı fal tartışmaları",
  "icon": "🔮",
  "paymentType": "jeton"
}
```

### 7.3 Oda Mesajları

```
GET  /api/chat/rooms/{roomId}/messages?limit=50
POST /api/chat/rooms/{roomId}/messages
Authorization: Bearer <token>
```

**Mesaj Gönder Body:**
```json
{ "content": "Merhaba herkese!" }
```

### 7.4 Oda Presence (Çevrimiçi Durumu)

```
POST /api/chat/rooms/{roomId}/presence
Authorization: Bearer <token>
```

### 7.5 Koltuk Yönetimi (Sesli Oda)

```
GET  /api/chat/rooms/{roomId}/seats
POST /api/chat/rooms/{roomId}/seats
```

**Body:**
```json
{ "action": "sit", "seatIndex": 2 }
```

> `action`: `"sit"`, `"leave"`, `"lock"`, `"unlock"`, `"kick"`

### 7.6 Sesli Oda Yayın Kontrolü

```
POST /api/chat/rooms/{roomId}/voice
Authorization: Bearer <token>
```

### 7.7 Odada Hediye Gönder

```
POST /api/chat/rooms/{roomId}/gifts
Authorization: Bearer <token>
```

### 7.8 Moderasyon

```
POST /api/chat/rooms/{roomId}/moderation
Authorization: Bearer <token>
```

**Body:**
```json
{ "action": "mute", "targetUserId": "cl...", "duration": 300 }
```

---

## 8. Mesajlaşma (DM)

### 8.1 Sohbet Listesi

```
GET /api/messages
Authorization: Bearer <token>
```

**Yanıt:**
```json
{
  "conversations": [
    {
      "id": "conv123",
      "user": { "id": "cl...", "name": "Fatma", "username": "fatma", "image": "..." },
      "lastMessage": "Merhaba!",
      "lastMessageAt": "2025-01-15T10:30:00Z",
      "unreadCount": 2
    }
  ],
  "messageRequests": [...]
}
```

### 8.2 Okunmamış Mesaj Sayısı

```
GET /api/messages?unreadCount=true
Authorization: Bearer <token>
```

**Yanıt:**
```json
{ "unreadCount": 5 }
```

### 8.3 Sohbet Mesajları

```
GET /api/messages/{userId}
Authorization: Bearer <token>
```

### 8.4 Mesaj Gönder

```
POST /api/messages/{userId}
Authorization: Bearer <token>
```

**Body:**
```json
{ "content": "Merhaba, nasılsın?" }
```

### 8.5 Mesaj İsteği (Takip etmediğiniz kişiye)

```
POST /api/messages/request
Authorization: Bearer <token>
```

**Body:**
```json
{ "receiverId": "cl...", "message": "Merhaba!" }
```

---

## 9. Bildirimler

### 9.1 Bildirimleri Getir

```
GET /api/notifications
GET /api/notifications?unreadOnly=true
Authorization: Bearer <token>
```

**Yanıt:**
```json
{
  "notifications": [
    {
      "id": "notif123",
      "type": "stream_live",
      "title": "🔴 Canlı Yayın Başladı!",
      "message": "Ayşe canlı yayına başladı: Canlı Fal",
      "isRead": false,
      "fromUserId": "cl...",
      "fromUserName": "Ayşe",
      "data": "{\"streamId\": \"stream123\"}",
      "createdAt": "2025-01-15T20:00:00Z"
    }
  ],
  "unreadCount": 3
}
```

### 9.2 Bildirimleri Okundu İşaretle

```
POST /api/notifications
Authorization: Bearer <token>
```

**Body:**
```json
{ "markAll": true }
```

veya spesifik:
```json
{ "notificationIds": ["notif123", "notif456"] }
```

---

## 10. Hediye Sistemi

### 10.1 Hediye Türlerini Getir

```
GET /api/gifts/types
```

**Yanıt:**
```json
[
  {
    "id": "gift_rose",
    "name": "Gül",
    "icon": "🌹",
    "price": 10,
    "imageUrl": "https://i.pinimg.com/736x/94/2d/96/942d96249704f2c45119bcdef4eef635.jpg",
    "animationUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Rosa_rubiginosa_1.jpg/1280px-Rosa_rubiginosa_1.jpg",
    "soundUrl": "https://t4.ftcdn.net/jpg/04/33/48/97/360_F_433489775_5RFLAFPIukFMpwXcjByc6PWsqWOAnGAj.jpg",
    "category": "basic",
    "sortOrder": 1,
    "isActive": true
  },
  {
    "id": "gift_crown",
    "name": "Taç",
    "icon": "👑",
    "price": 500,
    "imageUrl": "https://www.shutterstock.com/image-vector/gift-box-crown-representing-premium-600w-2732794115.jpg",
    "animationUrl": "https://placehold.co/1200x600/e2e8f0/1e293b?text=Image_of_a_crown_icon_representing_the__Ta__premiu",
    "soundUrl": "https://static.vecteezy.com/system/resources/previews/048/925/084/non_2x/premium-quality-label-crown-icon-premium-quality-illustration-for-product-packaging-logo-sign-symbol-or-emblem-vector.jpg",
    "category": "premium",
    "sortOrder": 10
  }
]
```

> `animationUrl` → Hediye animasyonu (Lottie/GIF)
> `soundUrl` → Hediye ses efekti
> `imageUrl` → Hediye görseli

### 10.2 Hediye / Jeton Gönder

```
POST /api/gifts/send
Authorization: Bearer <token>
```

**Body (Hediye gönder):**
```json
{
  "recipientUsername": "fatmademir",
  "giftTypeId": "gift_rose",
  "type": "gift"
}
```

**Body (Jeton gönder):**
```json
{
  "recipientUsername": "ahmetyilmaz",
  "jetonAmount": 100,
  "type": "jeton"
}
```

### 10.3 Canlı Yayında Hediye

Canlı yayında hediye **API üzerinden** gönderilir:
```
POST /api/video-streams/{streamId}/gifts
```
Hediye görsel/animasyon URL'leri `GET /api/gifts/types` yanıtından alınır.
Yayın sayfası bu bilgiyi ekranda gösterir. **WebSocket veya Tencent IM kullanılmaz** — hediyeler polling ile çekilir.

### 10.4 Son Büyük Hediyeler

```
GET /api/gifts/recent-big
```

### 10.5 Alınan Hediyeler

```
GET /api/user/received-gifts
Authorization: Bearer <token>
```

---

## 11. Jeton & CFC Bakiyesi

### 11.1 Jeton Bilgisi

```
GET /api/jeton
Authorization: Bearer <token>
```

**Yanıt:**
```json
{
  "jetonBalance": 500,
  "streak": { "currentStreak": 7, "longestStreak": 15, "totalFortunes": 120 },
  "todayTasks": ["login"],
  "recentHistory": [...],
  "loginBonusAvailable": true
}
```

### 11.2 Günlük Bonus Al

```
POST /api/jeton
Authorization: Bearer <token>
```

**Body:**
```json
{ "action": "daily_login" }
```

### 11.3 CFC Paketleri

```
GET /api/credit-packages
```

**Yanıt:**
```json
[
  {
    "id": "pkg1",
    "name": "Başlangıç Paketi",
    "credits": 100,
    "price": 49.99,
    "currency": "TRY",
    "bonusCredits": 10,
    "isActive": true
  }
]
```

### 11.4 Ödeme Yöntemleri

```
GET /api/payment-methods
```

### 11.5 Çekim Talebi

```
GET  /api/withdrawals                — Çekim geçmişi
POST /api/withdrawals                — Yeni çekim talebi
Authorization: Bearer <token>
```

**Body:**
```json
{
  "amount": 500,
  "method": "papara",
  "accountDetails": "1234567890"
}
```

---

## 12. Gold Üyelik

### 12.1 Üyelik Planları

```
GET /api/memberships
```

**Yanıt:**
```json
[
  {
    "id": "plan_gold",
    "name": "Gold Üyelik",
    "tier": "gold",
    "price": 999,
    "durationDays": 30,
    "features": ["Özel çerçeve", "Reklamsız", "Öncelikli destek"],
    "sortOrder": 1,
    "isActive": true
  }
]
```

### 12.2 Üyelik Satın Al

```
POST /api/memberships/purchase
Authorization: Bearer <token>
```

**Body:**
```json
{
  "planId": "plan_gold",
  "paymentMethod": "jeton"
}
```

> `paymentMethod`: `"jeton"` veya `"cfc"`

### 12.3 Üyelik Rozetleri

```
GET /api/membership-badges
```

---

## 13. FunClub

### 13.1 Popüler Kulüpler

```
GET /api/fan-clubs/popular
```

**Yanıt:**
```json
{
  "fanClubs": [
    {
      "id": "fc123",
      "celebrityId": "cel...",
      "memberCount": 500,
      "postCount": 120,
      "coverImage": "https://m.media-amazon.com/images/I/714Bwzh6rOL._AC_UF894,1000_QL80_.jpg",
      "celebrity": {
        "name": "Ünlü Falcı",
        "slug": "unlu-falci",
        "profileImage": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/ChristopherMeloni-byPhilipRomano.jpg/960px-ChristopherMeloni-byPhilipRomano.jpg",
        "category": "astroloji"
      }
    }
  ]
}
```

### 13.2 Kulüp Detayı

```
GET /api/celebrities/{slug}/fan-club
```

### 13.3 Kulübe Katıl

```
POST /api/celebrities/{slug}/fan-club/join
Authorization: Bearer <token>
```

### 13.4 Kulüp Paylaşımları

```
GET  /api/celebrities/{slug}/fan-club/posts
POST /api/celebrities/{slug}/fan-club/posts
Authorization: Bearer <token>
```

### 13.5 Kulüp Anketleri

```
GET  /api/celebrities/{slug}/fan-club/polls
POST /api/celebrities/{slug}/fan-club/polls
```

### 13.6 Kulüp Üyeleri

```
GET /api/celebrities/{slug}/fan-club/members
```

### 13.7 Kulüp Seviyesi

```
GET /api/celebrities/{slug}/fan-club/level
```

---

## 14. Davet (Referral) Sistemi

### 14.1 Davet Bilgileri

```
GET /api/referral
Authorization: Bearer <token>
```

**Yanıt:**
```json
{
  "referralCode": "A1B2C3D4",
  "referralLink": "https://canlifal.com/kayit-ol?ref=A1B2C3D4",
  "totalReferrals": 12,
  "totalCreditsEarned": 600,
  "referrals": [
    { "id": "cl...", "name": "Fatma", "createdAt": "2025-01-10T..." }
  ],
  "milestones": [
    { "count": 1, "reward": "free_reading", "rewardText": { "tr": "Ücretsiz Fal" }, "achieved": true },
    { "count": 5, "reward": "credits_200", "rewardText": { "tr": "200 CFC" }, "achieved": true },
    { "count": 20, "reward": "vip_fortune", "rewardText": { "tr": "VIP Fal" }, "achieved": false },
    { "count": 50, "reward": "credits_1000", "rewardText": { "tr": "1000 CFC" }, "achieved": false }
  ]
}
```

### 14.2 Davet Kodu Doğrula

```
GET /api/referral/validate?code=A1B2C3D4
```

---

## 15. Trend / Keşfet / Arama

### 15.1 Trendler

```
GET /api/trends?category=hepsi&limit=20&page=1
```

**Yanıt:**
```json
{
  "trends": [
    {
      "id": "trend123",
      "title": "Merkür Retrosu",
      "description": "...",
      "category": "astroloji",
      "trendScore": 95,
      "isPinned": true
    }
  ],
  "total": 50,
  "page": 1,
  "totalPages": 3
}
```

### 15.2 Trend Detay

```
GET /api/trends/{slug}
```

### 15.3 Trend Beğen

```
POST /api/trends/{slug}/like
Authorization: Bearer <token>
```

### 15.4 Genel Arama

```
GET /api/search?q=tarot&lang=tr
```

**Yanıt:**
```json
{
  "results": [
    { "type": "fortune", "id": "tarot", "title": "Tarot Falı", "href": "/fallar/tarot-fali", "icon": "🃏" },
    { "type": "user", "id": "cl...", "title": "Tarot Ustası", "href": "/profil/cl...", "image": "..." }
  ]
}
```

### 15.5 Gelişmiş Arama

```
GET /api/search/advanced?q=falcı&type=user&page=1
```

### 15.6 Trend Videolar

```
GET /api/trend-videos
GET /api/trend-videos?category=astroloji
```

### 15.7 Liderlik Tablosu

```
GET /api/leaderboard
```

### 15.8 Ünlüler

```
GET /api/celebrities?category=astroloji&page=1&limit=20&sortBy=followerCount
GET /api/celebrities/{slug}
```

---

## 16. Oyunlar

### 16.1 Oyun Listesi

```
GET /api/games
```

**Yanıt:**
```json
[
  {
    "id": "game1",
    "name": "Tarot Eşleştirme",
    "slug": "tarot-eslestirme",
    "description": "Tarot kartlarını eşleştir!",
    "icon": "🃏",
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/9/9d/Print%2C_playing-card_%28BM_1904%2C0511.47.1-78_3%29.jpg",
    "isActive": true,
    "sortOrder": 1,
    "entryFee": 0,
    "maxPlayers": 2
  }
]
```

### 16.2 Oyun Oyna

```
POST /api/games/play
Authorization: Bearer <token>
```

**Body:**
```json
{ "gameId": "game1", "action": "start" }
```

### 16.3 Oyun Odası

```
POST /api/games/room                  — Oda oluştur
GET  /api/games/room/{roomId}          — Oda detayı
POST /api/games/room/{roomId}/chat     — Oyun sohbeti
GET  /api/games/room/{roomId}/viewers   — İzleyiciler
```

### 16.4 Oyun Lobisi

```
GET /api/games/lobby
```

### 16.5 Günlük Çark / Ödül

```
POST /api/games/daily-spin
POST /api/games/daily-reward
GET  /api/games/leaderboard
GET  /api/games/profile
GET  /api/games/quests
```

### 16.6 SOS Oyunu

```
POST /api/games/sos
GET  /api/games/sos/{gameId}
POST /api/games/sos/{gameId}/chat
```

### 16.7 Lamba Cini

```
POST /api/games/lamba-cini
Authorization: Bearer <token>
```

---

## 17. 12 Fal/Yorum Türü

Tüm fal endpoint'leri `POST` metodunu kullanır ve `Authorization: Bearer <token>` gerektirir.
Kayıtsız kullanıcılar IP bazlı sınırlı erişime sahiptir.

| # | Fal Türü | Endpoint | Ek Parametreler |
|---|----------|----------|-----------------|
| 1 | Kahve Falı | `POST /api/fortunes/kahve-fali` | `description` (fincan açıklaması) |
| 2 | Tarot Falı | `POST /api/fortunes/tarot-fali` | `question`, `cardCount` (1/3/5/7) |
| 3 | Burç Yorumu | `POST /api/fortunes/burc-yorumu` | `zodiacSign`, `period` (daily/weekly/monthly) |
| 4 | Aşk Uyumu | `POST /api/fortunes/ask-uyumu` | `sign1`, `sign2` |
| 5 | El Falı | `POST /api/fortunes/el-fali` | `imageUrl` (el fotoğrafı) |
| 6 | Rüya Yorumu | `POST /api/fortunes/ruya-yorumu` | `dream` (rüya anlatımı) |
| 7 | Numeroloji | `POST /api/fortunes/numeroloji` | `fullName`, `birthDate` |
| 8 | Melek Kartları | `POST /api/fortunes/melek-kartlari` | `question` |
| 9 | Aura Analizi | `POST /api/fortunes/aura-analizi` | `imageUrl` (selfie) |
| 10 | Doğum Haritası | `POST /api/fortunes/dogum-haritasi` | `birthDate`, `birthTime`, `birthPlace` |
| 11 | Katina Falı | `POST /api/fortunes/katina` | `question` |
| 12 | Evet/Hayır | `POST /api/fortunes/evet-hayir` | `question` |
| 13 | Kurşun Dökme | `POST /api/fortunes/kursundokme` | `concern` (dert/sorun) |
| 14 | İstihare | `POST /api/fortunes/istihare` | `question`, `intention` |

**Genel Request Body Formatı:**
```json
{
  "question": "İş hayatımda ne gibi değişiklikler olacak?",
  "language": "tr",
  "adWatched": false
}
```

> `adWatched: true` → reklam izleyerek ücretsiz fal (CFC düşülmez)

**Genel Yanıt Formatı:**
```json
{
  "fortune": {
    "id": "fortune123",
    "fortuneType": "tarot",
    "content": "Tarot kartlarınız şunu gösteriyor...",
    "summary": "Olumlu bir dönem başlıyor",
    "createdAt": "2025-01-15T..."
  }
}
```

### 17.1 Kullanıcı Fal Geçmişi

```
GET /api/user/fortunes
Authorization: Bearer <token>
```

### 17.2 Fal Detayı

```
GET /api/user/fortunes/{fortuneId}
Authorization: Bearer <token>
```

### 17.3 Canlı Falcılar

```
GET  /api/fortune-tellers?specialty=tarot&onlineOnly=true&sort=top_rated
GET  /api/fortune-tellers/{tellerId}
POST /api/fortune-tellers/{tellerId}/session — Seans talebi oluştur
```

**Seans Talebi Body:**
```json
{
  "fortuneType": "coffee",
  "duration": 10
}
```

### 17.4 Falcı Değerlendirmeleri

```
GET /api/fortune-tellers/{tellerId}/reviews
```

### 17.5 Günlük Burç

```
POST /api/horoscope/daily
Authorization: Bearer <token>
```

**Body:**
```json
{ "sign": "koc", "language": "tr" }
```

---

## 18. Tencent RTC Entegrasyonu

### 18.1 Genel Bilgiler

| Özellik | Değer |
|---------|-------|
| Servis | Tencent Real-Time Communication (TRTC) |
| SDK Paketi (Flutter) | `tencent_rtc_sdk` |
| SDKAppID | Backend'den `POST /api/trtc/usersig` yanıtında döner |
| UserSig Süresi | 24 saat (86400 saniye) |

### 18.2 UserSig Alma

```
POST /api/trtc/usersig
```

**Body:**
```json
{
  "userId": "user_clxyz123",
  "roomId": "stream_abc456"
}
```

**Yanıt:**
```json
{
  "sdkAppId": 1400XXXXXX,
  "userId": "user_clxyz123",
  "userSig": "eJwtzMEKgkAUheF3mXWE...",
  "roomId": "stream_abc456"
}
```

> ⚠️ `sdkAppId` sunucudan gelir — mobilde hardcode etmeyin.
> ⚠️ `userSig` sunucudan alınmalıdır — mobilde üretmeyin (SecretKey client'ta olmamalı).

### 18.3 RoomID Nasıl Oluşturulur?

- **Canlı Yayın:** `POST /api/video-streams` ile yayın oluşturulduğunda dönen `streamId` = `roomId`
- **Canlı Fal Seansı:** `POST /api/fortune-tellers/{tellerId}/session` ile dönen `session.id` = `roomId`
- **Sesli Oda:** Chat room'un `id`'si = `roomId`

### 18.4 UserId Nasıl Gelir?

- **Oturum açmış kullanıcı:** Kullanıcının `user.id` değeri (örn: `clxyz123`)
- **Misafir izleyici:** `viewer_` prefix'i + rastgele UUID (örn: `viewer_abc123def456`)

### 18.5 Canlı Yayın Rolleri

| Rol | TRTC Rolü | Açıklama |
|-----|-----------|----------|
| Yayıncı (Host) | `TRTCRoleAnchor` | Kamera + mikrofon açık, yayın yapıyor |
| İzleyici (Viewer) | `TRTCRoleAudience` | Sadece izliyor, mikrofon/kamera kapalı |
| Co-Broadcaster | `TRTCRoleAnchor` | Yayıncı davet etti, kamera/mikrofon açabilir |

### 18.6 Sesli Oda Rolleri

| Rol | TRTC Rolü | Mikrofon | Kamera |
|-----|-----------|----------|--------|
| Oda Sahibi | `TRTCRoleAnchor` | ✅ Açık | ❌ Kapalı |
| Koltuktaki Konuşmacı | `TRTCRoleAnchor` | ✅ Açık | ❌ Kapalı |
| Dinleyici | `TRTCRoleAudience` | ❌ Kapalı | ❌ Kapalı |

### 18.7 Mikrofon/Kamera Açma/Kapatma Tablosu

| Senaryo | Mikrofon | Kamera | Video Kalitesi |
|---------|----------|--------|----------------|
| Canlı yayın — yayıncı | ✅ | ✅ | 720p/1080p |
| Canlı yayın — izleyici | ❌ | ❌ | — |
| Canlı yayın — co-host | ✅ | ✅ | 720p |
| Sesli oda — koltuktaki | ✅ | ❌ | — |
| Sesli oda — dinleyici | ❌ | ❌ | — |
| Canlı fal seansı — her iki taraf | ✅ | ✅ | 720p |

### 18.8 Flutter TRTC Entegrasyon Örneği

```dart
// 1. UserSig al
final response = await dio.post('/api/trtc/usersig', data: {
  'userId': currentUser.id,
  'roomId': streamId,
});
final sdkAppId = response.data['sdkAppId'];
final userSig = response.data['userSig'];

// 2. TRTC'ye bağlan
await trtcCloud.enterRoom(
  TRTCParams(
    sdkAppId: sdkAppId,
    userId: currentUser.id,
    userSig: userSig,
    roomId: int.parse(roomId), // veya strRoomId kullan
    role: isHost ? TRTCRoleType.anchor : TRTCRoleType.audience,
  ),
  isHost ? TRTCAppScene.live : TRTCAppScene.live,
);

// 3. Yayıncı: kamera ve mikrofon aç
if (isHost) {
  await trtcCloud.startLocalPreview(true, videoView);
  await trtcCloud.startLocalAudio(TRTCAudioQuality.music);
}
```

---

## 19. Dosya Yükleme

### 19.1 Presigned URL Al

```
POST /api/upload/presigned
Authorization: Bearer <token>
```

**Body:**
```json
{
  "fileName": "profil.jpg",
  "contentType": "image/jpeg",
  "isPublic": true
}
```

**Yanıt:**
```json
{
  "uploadUrl": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dXNlciUyMHByb2ZpbGV8ZW58MHx8MHx8fDA%3D",
  "cloud_storage_path": "uploads/abc123/profil.jpg"
}
```

> 1. `uploadUrl`'ye `PUT` ile dosyayı yükleyin
> 2. `cloud_storage_path`'i veritabanına kaydedin

### 19.2 Dosya URL'si Al

```
POST /api/upload/get-url
Authorization: Bearer <token>
```

**Body:**
```json
{
  "cloud_storage_path": "uploads/abc123/profil.jpg",
  "isPublic": true
}
```

**Yanıt:**
```json
{ "url": "https://images.unsplash.com/photo-1527203561188-dae1bc1a417f?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8cHJvZmlsZSUyMHBvcnRyYWl0fGVufDB8fDB8fHww" }
```

---

## 20. Diğer Endpoint'ler

### 20.1 Anasayfa Butonları

```
GET /api/homepage-buttons
```

### 20.2 Anasayfa Fal Kartları

```
GET /api/homepage-fortune-cards
```

### 20.3 Duyurular

```
GET /api/announcements
GET /api/announcements/event
```

### 20.4 Günlük Görevler

```
GET  /api/daily-missions
POST /api/daily-missions
Authorization: Bearer <token>
```

**Yanıt:**
```json
{
  "missions": [
    { "type": "login", "title": "Günlük Giriş", "reward": 5, "icon": "👋", "completed": true },
    { "type": "open_fortune", "title": "Fal Baktır", "reward": 10, "icon": "🔮", "completed": false }
  ],
  "totalReward": 5,
  "allCompleted": false
}
```

### 20.5 Günlük Giriş

```
POST /api/daily-login
Authorization: Bearer <token>
```

### 20.6 Online Fal Sayfası

```
GET /api/online-fal
```

### 20.7 Presence (Çevrimiçi)

```
POST /api/presence
```

### 20.8 Profil Çerçeveleri

```
GET /api/profile-frames
```

### 20.9 Popup'lar

```
GET /api/popups
```

### 20.10 Rüya Yorumlama

```
GET  /api/dreams?page=1&limit=20              — Rüya sözlüğü
GET  /api/dreams/{slug}                        — Rüya detayı
POST /api/dreams/interpret                     — Yapay zeka rüya yorumu
GET  /api/dream-symbols                        — Rüya sembolleri
GET  /api/dream-diary                          — Rüya günlüğü
POST /api/dream-diary                          — Rüya kaydet
```

### 20.11 Blog

```
GET /api/blog?page=1&limit=20
GET /api/blog/categories
GET /api/blog/zodiac
```

### 20.12 Bana Özel

```
GET  /api/bana-ozel
POST /api/bana-ozel/open
Authorization: Bearer <token>
```

### 20.13 Futbol

```
GET /api/football
```

### 20.14 Reklam İzle / Jeton Kazan

```
POST /api/user/watch-ad
POST /api/ads/reward
GET  /api/ads/active
Authorization: Bearer <token>
```

### 20.15 Ajans Sistemi

```
POST /api/agency/apply        — Ajansa başvur
GET  /api/agency/my            — Ajans bilgileri
GET  /api/agency/members       — Ajans üyeleri
GET  /api/agency/earnings      — Kazançlar
GET  /api/agency/leaderboard   — Ajans sıralaması
POST /api/agency/invite        — Üye davet et
POST /api/agency/join          — Ajansa katıl
POST /api/agency/leave         — Ajanstan ayrıl
```

### 20.16 Ticker (Kayan Yazı)

```
GET /api/homepage-ticker
```

### 20.17 İletişim

```
POST /api/contact
```

---

## 🔒 Güvenlik Notları

1. **Gizli anahtarlar mobilde OLMAMALI:**
   - `TRTC_SDK_SECRET_KEY` → Sadece backend'de
   - `NEXTAUTH_SECRET` (JWT signing) → Sadece backend'de
   - `YOUTUBE_API_KEY` → Sadece backend'de

2. **Rate Limiting:**
   - Login: IP başına sınırlı
   - Kayıt: IP başına sınırlı
   - Hediye gönderme: Kullanıcı başına 10/dakika

3. **Token güvenliği:**
   - Access token'ı güvenli depolama alanında saklayın (Flutter Secure Storage)
   - Refresh token'ı ayrı bir güvenli alanda saklayın
   - 401 hatası alındığında otomatik refresh yapın

---

## 📡 Polling Stratejisi

Platformda WebSocket/Tencent IM **kullanılmıyor**. Tüm gerçek zamanlı veriler **HTTP polling** ile çekilir:

| Veri | Endpoint | Önerilen Polling Süresi |
|------|----------|------------------------|
| Canlı yayın yorumları | `GET /api/video-streams/{id}/comments` | 2-3 saniye |
| Canlı yayın hediyeleri | `GET /api/video-streams/{id}/gifts` | 3-5 saniye |
| Canlı yayın izleyici sayısı | `GET /api/video-streams/{id}/viewers` | 5 saniye |
| Oda mesajları | `GET /api/chat/rooms/{id}/messages` | 2-3 saniye |
| DM mesajları | `GET /api/messages/{userId}` | 3-5 saniye |
| Bildirimler | `GET /api/notifications` | 15-30 saniye |
| Aktif yayınlar | `GET /api/video-streams` | 10 saniye |
| WebRTC sinyalleri | `GET /api/video-streams/signal` | 1-2 saniye |

---

> **Son Güncelleme:** Mayıs 2026
> **Base URL:** `https://canlifal.com`
> **Tüm tarihler ISO 8601 formatında (UTC)**
