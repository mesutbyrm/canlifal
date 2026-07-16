# 🔮 CanlıFal — Flutter Backend API Referansı

> **Base URL:** `https://canlifal.com`  
> **Son Güncelleme:** 16 Temmuz 2026  
> **Auth:** Tüm endpoint'ler JWT Bearer token gerektirir

---

## 📋 İçindekiler

1. [Kimlik Doğrulama](#1-kimlik-doğrulama)
2. [TRTC Token](#2-trtc-token)
3. [Oda Yaşam Döngüsü](#3-oda-yaşam-döngüsü)
4. [Oda Keşif & Listeleme](#4-oda-keşif--listeleme)
5. [Koltuk Yönetimi](#5-koltuk-yönetimi)
6. [Mesajlaşma](#6-mesajlaşma)
7. [Hediye Sistemi](#7-hediye-sistemi)
8. [PK Battle](#8-pk-battle)
9. [Çevrimiçi Kullanıcılar](#9-çevrimiçi-kullanıcılar)
10. [Hata Kodları](#10-hata-kodları)

---

## Yanıt Formatı (Tüm Endpoint'ler)

```json
// Başarılı
{ "success": true, "data": { ... } }

// Hata
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Türkçe hata mesajı" } }
```

---

## 1. Kimlik Doğrulama

Tüm `/api/live/` ve `/api/trtc/` endpoint'leri **JWT Bearer token** gerektirir.

```
Authorization: Bearer <jwt_token>
```

Token, `/api/auth/mobile-login` endpoint'inden alınır.

---

## 2. TRTC Token

### `POST /api/trtc/token`

TRTC UserSig oluşturur. Oda katılımı öncesinde çağrılmalıdır.

**Request Body:**
```json
{
  "roomId": "string (zorunlu)",
  "role": "host | audience (opsiyonel, varsayılan: audience)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sdkAppId": 20040423,
    "userId": "user_id_string",
    "userSig": "eJw9z0FPgz...",
    "roomId": "room_id_string",
    "expireTime": 86400,
    "role": "audience"
  }
}
```

---

## 3. Oda Yaşam Döngüsü

### `POST /api/live/create-room`

Yeni canlı yayın oluşturur. Sadece onaylı falcılar kullanabilir.

**Request Body:**
```json
{
  "title": "string (opsiyonel)",
  "description": "string (opsiyonel)",
  "category": "string (opsiyonel)",
  "thumbnailUrl": "string (opsiyonel)",
  "coverUrl": "string (opsiyonel)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stream": {
      "id": "stream_id",
      "roomId": "trtc_room_id",
      "title": "Canlı Fal",
      "status": "live",
      "host": { "id": "...", "name": "...", "image": "..." },
      "startedAt": "2026-07-16T12:00:00Z"
    },
    "trtc": {
      "sdkAppId": 20040423,
      "userId": "...",
      "userSig": "...",
      "roomId": "...",
      "expireTime": 86400
    }
  }
}
```

---

### `POST /api/live/join-room`

**Compound endpoint** — tek istekle odaya katılır ve tüm gerekli veriyi döndürür.

**Request Body:**
```json
{
  "roomId": "string (zorunlu)",
  "roomType": "stream | voice (zorunlu)",
  "nickname": "string (opsiyonel, sadece voice)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "room": {
      "id": "...",
      "title": "...",
      "hostId": "...",
      "hostName": "...",
      "hostImage": "...",
      "status": "live",
      "viewerCount": 42,
      "backgroundImage": "..."  // sadece voice
    },
    "trtc": {
      "sdkAppId": 20040423,
      "userId": "...",
      "userSig": "...",
      "roomId": "...",
      "expireTime": 86400
    },
    "user": {
      "id": "...",
      "name": "...",
      "image": "...",
      "isHost": false
    },
    "participants": [
      { "userId": "...", "userName": "...", "userImage": "...", "seatIndex": 0 }
    ],
    "seats": [
      { "seatIndex": 0, "userId": "...", "userName": "...", "isMicOn": false }
    ],
    "giftRanking": [
      { "userId": "...", "userName": "...", "totalAmount": 1500 }
    ]
  }
}
```

---

### `POST /api/live/leave-room`

Odadan ayrılır. Host çıkışında stream otomatik sonlandırılır.

**Request Body:**
```json
{
  "roomId": "string (zorunlu)",
  "roomType": "stream | voice (zorunlu)"
}
```

**Response:**
```json
{
  "success": true,
  "data": { "message": "Odadan ayrıldınız" }
}
```

---

### `POST /api/live/heartbeat`

Canlılık sinyali. **10 saniyede bir** çağrılmalıdır. 60 sn sessiz kalan kullanıcılar otomatik temizlenir.

**Request Body:**
```json
{
  "roomId": "string (zorunlu)",
  "roomType": "stream | voice (zorunlu)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "onlineCount": 42,
    "staleRemoved": 2,
    "serverTime": "2026-07-16T12:00:00Z"
  }
}
```

---

## 4. Oda Keşif & Listeleme

### `GET /api/live/rooms`

Canlı yayınlar ve sesli odalar tek listede döner.

**Query Parametreleri:**
| Parametre | Tip | Varsayılan | Açıklama |
|-----------|-----|------------|----------|
| `type` | `all \| stream \| voice` | `all` | Oda türü filtresi |
| `page` | `number` | `1` | Sayfa numarası |
| `limit` | `number` | `30` | Sayfa başına (max 100) |
| `search` | `string` | — | İsme göre arama |

**Response:**
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "id": "...",
        "roomType": "stream",
        "title": "Canlı Fal",
        "hostId": "...",
        "hostName": "Ayşe Falcı",
        "hostImage": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Hudibras%2C_1859_-_Illustration_-_v1_p85.png/500px-Hudibras%2C_1859_-_Illustration_-_v1_p85.png?utm_source=en.wikisource.org&utm_campaign=parser&utm_content=thumbnail",
        "thumbnailUrl": "https://...",
        "viewerCount": 42,
        "likeCount": 150,
        "commentCount": 30,
        "isLive": true,
        "startedAt": "2026-07-16T12:00:00Z"
      },
      {
        "id": "...",
        "roomType": "voice",
        "slug": "genel-sohbet",
        "title": "Genel Sohbet",
        "titleEn": "General Chat",
        "description": "...",
        "icon": "💬",
        "hostId": "...",
        "hostName": "...",
        "backgroundImage": "https://play-lh.googleusercontent.com/_-7NH4O7O9xEAz0xMhM8HpSOY__BKyW2Fu1i5xgH-Y4eD6tHPQnBNcu3IWQmZcFb7NaklYPxHu7-18rJGRzAJw=w648-h364-rw",
        "roomAccessType": "FREE",
        "tags": ["sohbet", "eğlence"],
        "viewerCount": 15,
        "isLive": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 30,
      "totalStreams": 5,
      "totalVoice": 12,
      "total": 17
    }
  }
}
```

---

## 5. Koltuk Yönetimi

> Sadece sesli odalar (voice rooms) için geçerlidir. Toplam 15 koltuk (index 0-14).

### `POST /api/live/seats`

**Request Body:**
```json
{
  "roomId": "string (zorunlu)",
  "action": "take | leave | swap | force (zorunlu)",
  "seatIndex": "number (0-14, take/swap için zorunlu)",
  "targetUserId": "string (swap/force için zorunlu)"
}
```

**Aksiyonlar:**
| Aksiyon | Açıklama | Yetki |
|---------|----------|-------|
| `take` | Kullanıcı belirtilen koltuğa oturur | Herkes |
| `leave` | Kullanıcı koltuktan kalkar | Herkes |
| `swap` | Bir kullanıcıyı belirtilen koltuğa taşır | Admin/Owner/SOP |
| `force` | Bir kullanıcıyı koltuktan indirir | Admin/Owner/SOP |

**Response (take örneği):**
```json
{
  "success": true,
  "data": { "seatIndex": 3, "message": "Koltuk 3 alındı" }
}
```

---

### `GET /api/live/seats?roomId=xxx`

Mevcut koltuk haritasını döndürür.

**Response:**
```json
{
  "success": true,
  "data": {
    "roomId": "...",
    "totalSeats": 15,
    "seats": [
      {
        "seatIndex": 0,
        "userId": "...",
        "userName": "Mehmet",
        "userImage": "https://d2gjqh9j26unp0.cloudfront.net/profilepic/a3a8aae1a525244c264da47245187977",
        "isMicOn": false
      }
    ]
  }
}
```

---

## 6. Mesajlaşma

### `POST /api/live/message`

Stream yorumu veya sesli oda mesajı gönderir.

**Request Body:**
```json
{
  "roomId": "string (zorunlu)",
  "roomType": "stream | voice (zorunlu)",
  "content": "string (zorunlu, max 500 karakter)"
}
```

**Response (voice örneği):**
```json
{
  "success": true,
  "data": {
    "id": "msg_id",
    "roomId": "...",
    "roomType": "voice",
    "userId": "...",
    "userName": "Ayşe",
    "userImage": "https://pbs.twimg.com/profile_images/2042240982129782785/-ufKuDu5.jpg",
    "content": "Merhaba!",
    "chatRole": "admin",
    "roleSymbol": "⭐",
    "createdAt": "2026-07-16T12:00:00Z"
  }
}
```

**Olası Hatalar:**
- `CANNOT_SPEAK` — Kullanıcı banlanmış, susturulmuş veya oda sessiz modunda
- `STREAM_ENDED` — Yayın sona ermiş
- `MESSAGE_TOO_LONG` — 500 karakter limiti aşıldı

---

### `GET /api/live/message`

Mesaj geçmişini çeker. Polling için `after` parametresi kullanılır.

**Query Parametreleri:**
| Parametre | Tip | Varsayılan | Açıklama |
|-----------|-----|------------|----------|
| `roomId` | `string` | — | **Zorunlu** |
| `roomType` | `stream \| voice` | `voice` | Oda türü |
| `after` | `ISO string` | — | Bu tarihten sonraki mesajlar (polling) |
| `limit` | `number` | `100` | Max 200 |

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "...",
        "roomId": "...",
        "roomType": "voice",
        "userId": "...",
        "userName": "Mehmet",
        "userImage": "https://pbs.twimg.com/profile_images/1936122496513687552/QuTVhtfY.jpg",
        "content": "Selam!",
        "chatRole": null,
        "roleSymbol": "",
        "createdAt": "2026-07-16T12:00:00Z"
      }
    ],
    "totalCount": 1
  }
}
```

---

## 7. Hediye Sistemi

### `GET /api/live/gift-types`

Aktif hediye türlerini listeler. 60 sn cache'lenir.

**Response:**
```json
{
  "success": true,
  "data": {
    "giftTypes": [
      {
        "id": "...",
        "name": "Gül",
        "nameEn": "Rose",
        "icon": "🌹",
        "animation": "sparkle",
        "price": 20,
        "sortOrder": 4,
        "thumbnailUrl": "https://media.livewallpapers.com/images/thumbnail/rose-and-eagle-sparkling-wallpaper.webp",
        "assetUrl": "https://di39sxzlf1tl1.cloudfront.net/celclipmaterialprod/04/56/1765604/thumbnail?1582712036",
        "assetType": "image"
      }
    ],
    "totalCount": 13
  }
}
```

---

### `POST /api/live/gift/send`

Hediye gönderir. Hem stream hem voice room destekler.

**Request Body:**
```json
{
  "roomId": "string (zorunlu)",
  "roomType": "stream | voice (zorunlu)",
  "giftTypeId": "string (zorunlu)",
  "recipientId": "string (opsiyonel, varsayılan: host/owner)",
  "quantity": "number (opsiyonel, varsayılan: 1)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "gift": {
      "id": "gift_record_id",
      "giftType": { "name": "Gül", "icon": "🌹", "price": 20 },
      "quantity": 1,
      "totalPrice": 20,
      "sender": { "id": "...", "name": "Mehmet" },
      "recipient": { "id": "...", "name": "Ayşe" }
    },
    "senderBalance": 980,
    "message": "Hediye gönderildi!"
  }
}
```

**Olası Hatalar:**
- `INSUFFICIENT_BALANCE` — Yetersiz jeton bakiyesi
- `GIFT_NOT_FOUND` — Geçersiz giftTypeId
- `SELF_GIFT` — Kendine hediye gönderemezsiniz

---

## 8. PK Battle

### `GET /api/live/pk?roomId=xxx`

Bir oda için aktif PK durumunu sorgular.

**Response (aktif PK varsa):**
```json
{
  "success": true,
  "data": {
    "battle": {
      "id": "battle_id",
      "status": "active",
      "room1": { "id": "...", "name": "...", "score": 250 },
      "room2": { "id": "...", "name": "...", "score": 180 },
      "startedAt": "2026-07-16T12:00:00Z",
      "endsAt": "2026-07-16T12:05:00Z",
      "durationSeconds": 300
    }
  }
}
```

---

### `POST /api/live/pk`

PK işlemleri yapar.

**Request Body:**
```json
{
  "action": "create | accept | reject | cancel | end (zorunlu)",
  "roomId": "string (zorunlu — kendi odanız)",
  "targetRoomId": "string (create için zorunlu — rakip oda)",
  "battleId": "string (accept/reject/cancel/end için zorunlu)",
  "durationSeconds": "number (create için opsiyonel, varsayılan: 300)"
}
```

**Aksiyonlar:**
| Aksiyon | Açıklama | Kim Çağırır |
|---------|----------|-------------|
| `create` | PK daveti gönderir | Yayıncı/Oda sahibi |
| `accept` | PK davetini kabul eder | Hedef yayıncı |
| `reject` | PK davetini reddeder | Hedef yayıncı |
| `cancel` | Bekleyen PK'yı iptal eder | Davet eden |
| `end` | Aktif PK'yı sonlandırır | Her iki taraf |

---

### `POST /api/live/pk/score`

PK skorunu günceller (genellikle hediye gönderiminde otomatik çağrılır).

**Request Body:**
```json
{
  "battleId": "string (opsiyonel — battleId veya roomId ile bulunur)",
  "roomId": "string (opsiyonel)",
  "amount": "number (zorunlu — eklenecek skor)",
  "side": "room1 | room2 (opsiyonel, roomId'den otomatik belirlenir)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "battleId": "...",
    "room1Score": 320,
    "room2Score": 180
  }
}
```

---

## 9. Çevrimiçi Kullanıcılar

### `GET /api/live/online-users`

**Query Parametreleri:**
| Parametre | Tip | Varsayılan | Açıklama |
|-----------|-----|------------|----------|
| `roomId` | `string` | — | **Zorunlu** |
| `roomType` | `stream \| voice` | `voice` | Oda türü |
| `limit` | `number` | `100` | Max 500 |

**Response:**
```json
{
  "success": true,
  "data": {
    "roomId": "...",
    "roomType": "voice",
    "users": [
      {
        "userId": "...",
        "userName": "Mehmet",
        "userImage": "https://placehold.co/1200x600/e2e8f0/1e293b?text=User_avatar_or_profile_picture_for_a_user_named_Me",
        "joinedAt": "2026-07-16T12:00:00Z",
        "seatIndex": 3,
        "isMicOn": false,
        "nickname": "MasterFalcı"
      }
    ],
    "totalCount": 15
  }
}
```

---

## 10. Hata Kodları

| Kod | HTTP | Açıklama |
|-----|------|----------|
| `UNAUTHORIZED` | 401 | Geçersiz veya eksik JWT token |
| `INVALID_PARAMS` | 400 | Eksik veya hatalı parametreler |
| `ROOM_NOT_FOUND` | 404 | Oda bulunamadı |
| `STREAM_ENDED` | 400 | Yayın sona ermiş |
| `SEAT_TAKEN` | 409 | Koltuk zaten dolu |
| `INVALID_SEAT` | 400 | Geçersiz koltuk numarası (0-14 dışı) |
| `INVALID_ACTION` | 400 | Geçersiz action değeri |
| `FORBIDDEN` | 403 | Yetersiz yetki |
| `CANNOT_SPEAK` | 403 | Susturulmuş veya banlanmış |
| `INSUFFICIENT_BALANCE` | 400 | Yetersiz jeton bakiyesi |
| `GIFT_NOT_FOUND` | 404 | Geçersiz hediye türü |
| `SELF_GIFT` | 400 | Kendine hediye gönderemezsiniz |
| `NOT_HOST` | 403 | Bu işlem sadece yayıncı/oda sahibi için |
| `ALREADY_LIVE` | 409 | Zaten aktif yayın var |
| `NOT_APPROVED` | 403 | Onaylı falcı değilsiniz |
| `COOLDOWN` | 429 | Yayın oluşturma bekleme süresi |
| `PK_EXISTS` | 409 | Zaten aktif PK mevcut |
| `TARGET_INACTIVE` | 400 | Hedef oda aktif değil |
| `MESSAGE_TOO_LONG` | 400 | Mesaj 500 karakter limitini aşıyor |
| `INTERNAL_ERROR` | 500 | Sunucu hatası |

---

## 🔄 Önerilen Flutter Akışı

```
1. Kullanıcı giriş → JWT token al
2. GET /api/live/rooms → Oda listesini göster
3. GET /api/live/gift-types → Hediye paneli verisi (cache'le)
4. POST /api/live/join-room → Odaya katıl (compound: her şey tek istekte)
5. Timer: POST /api/live/heartbeat → Her 10 sn'de bir
6. Polling: GET /api/live/message?after=... → Yeni mesajları çek
7. Kullanıcı etkileşimleri:
   - POST /api/live/message → Mesaj gönder
   - POST /api/live/gift/send → Hediye gönder
   - POST /api/live/seats → Koltuk al/bırak
8. POST /api/live/leave-room → Odadan çık
```

---

## 📡 TRTC Entegrasyonu

```
SDK App ID: 20040423
SDK: trtc_sdk (Flutter plugin)

1. POST /api/trtc/token → userSig al
2. TRTC SDK → enterRoom(sdkAppId, userId, userSig, roomId)
3. Yayıncı: startLocalVideo + startLocalAudio
4. İzleyici: SDK otomatik remote stream alır
```

---

---

## 📱 Mobil Compound Endpoint'ler

Flutter uygulaması için tek istekle birden fazla veriyi dönen birleşik endpoint'ler.

### GET /api/mobile/home
Ana sayfa feed'i — tek istekle tüm ana sayfa verisini döner.

**Auth:** `Authorization: Bearer <jwt>` (zorunlu)

**Response:**
```json
{
  "success": true,
  "data": {
    "liveStreams": [{ "id", "title", "hostId", "hostName", "hostAvatar", "listenerCount", "isLive", "roomType" }],
    "voiceRooms": [{ "id", "name", "description", "imageUrl", "hostId", "hostName", "isActive", "listenerCount" }],
    "fortuneCards": [{ "id", "fortuneType", "title", "description", "iconUrl", "isActive", "sortOrder" }],
    "homepageButtons": [{ "id", "label", "iconUrl", "linkUrl", "sortOrder", "isActive" }],
    "announcements": [{ "id", "message", "type", "color", "userName", "expiresAt", "maxPasses" }],
    "liveTellers": [{ "id", "user": { "name", "profileImageUrl" }, "specialties", "pricePerSession", "rating", "isActive" }],
    "user": { "id", "name", "profileImageUrl", "jetons", "credits", "level", "unreadNotifications" }
  }
}
```

---

### GET /api/mobile/fortune-menu
Fal menüsü — tüm fal türlerini, fiyatlarını ve kullanıcı bakiyesini döner.

**Auth:** `Authorization: Bearer <jwt>` (zorunlu)

**Response:**
```json
{
  "success": true,
  "data": {
    "fortuneTypes": [{
      "id", "slug", "nameTr", "nameEn", "descriptionTr", "descriptionEn",
      "iconUrl", "creditCost", "estimatedMinutes", "isActive", "sortOrder",
      "requiredImages", "category"
    }],
    "fortuneCards": [{ "id", "fortuneType", "title", "description", "iconUrl", "isActive" }],
    "userCredits": { "jetons": 0, "credits": 0 },
    "creditsPerMinute": 1
  }
}
```

---

### GET /api/mobile/user-profile/{userId}
Kullanıcı profili — profil bilgisi, istatistikler, takip/engel durumu, başarılar.

**Auth:** `Authorization: Bearer <jwt>` (zorunlu)

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id", "name", "profileImageUrl", "bio", "gender", "birthDate",
      "level", "xp", "zodiacSign", "isOnline", "lastSeen", "role",
      "badges": [{ "id", "badgeId", "earnedAt", "badge": { "nameTr", "nameEn", "iconUrl" } }]
    },
    "stats": {
      "followerCount": 0, "followingCount": 0, "totalFortunesReceived": 0,
      "totalGiftsSent": 0, "totalGiftsReceived": 0,
      "shortVideoCount": 0, "postCount": 0
    },
    "relationship": {
      "isFollowing": false, "isFollowedBy": false, "isBlocked": false, "isBlockedBy": false
    },
    "isOwnProfile": false,
    "achievements": [{ "id", "achievementId", "earnedAt", "progress", "isCompleted" }],
    "recentActivity": {
      "shortVideos": [{ "id", "title", "thumbnailUrl", "viewCount", "createdAt" }],
      "posts": [{ "id", "content", "createdAt", "likeCount", "commentCount" }]
    }
  }
}
```

---

### 🔄 Önerilen Mobil Akış

```
1. Kullanıcı giriş → POST /api/auth/mobile-login → JWT token al
2. Ana sayfa → GET /api/mobile/home → Tek istekle tüm feed verisi
3. Fal menüsü → GET /api/mobile/fortune-menu → Fal türleri + bakiye
4. Kullanıcı profili → GET /api/mobile/user-profile/{userId}
5. Bildirimler → GET /api/notifications
6. Canlı yayın → GET /api/live/rooms → POST /api/live/join-room
```

---

*Bu döküman CanlıFal Flutter ekibi için hazırlanmıştır.*
