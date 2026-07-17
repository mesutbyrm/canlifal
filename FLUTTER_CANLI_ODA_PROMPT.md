# CanlıFal Flutter — Canlı Oda Entegrasyon Prompt'u

## 🔑 TRTC Bilgileri (Tencent Real-Time Communication)

```
SDK App ID: 20040423
Flutter SDK: trtc_sdk (trtc_sdk_v5)
UserSig API: POST /api/trtc/token
Base URL: https://canlifal.com
```

> ⚠️ **Agora tamamen kaldırılmıştır.** Tüm ses/video iletişimi TRTC üzerinden yapılır.

---

## 📡 API Genel Kuralları

### Auth Header
```
Authorization: Bearer <jwt_token>
```
JWT token → `POST /api/auth/mobile-login` ile alınır.

### Response Formatı
```json
// Başarılı
{ "success": true, "data": { ... } }

// Hata
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Türkçe mesaj" } }
```

### ⚠️ NULL GÜVENLİĞİ
**Tüm endpoint'ler artık null-safe döner:**
- `String` → `""` (boş string, asla null değil)
- `int` → `0`
- `bool` → `false`
- `List` → `[]`
- `Map` → `{}`
- `DateTime` → `""` (ISO 8601 string veya boş string)

**Flutter'da `fromJson` yazarken `null` check'e gerek yok, ama güvenlik için:**
```dart
factory MyModel.fromJson(Map<String, dynamic> json) {
  return MyModel(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? '',
    count: json['count'] as int? ?? 0,
    isActive: json['isActive'] as bool? ?? false,
    items: (json['items'] as List?)?.cast<dynamic>() ?? [],
  );
}
```

---

## 📋 Endpoint Şeması — Veri Tip Kontratları

### 1. GET /api/live/rooms — Oda Listesi

```dart
class LiveRoom {
  final String id;           // String (asla null)
  final String roomType;     // "stream" | "voice"
  final String slug;         // String
  final String title;        // String
  final String titleEn;      // String
  final String description;  // String
  final String descriptionEn;// String
  final String icon;         // String (emoji)
  final String hostId;       // String
  final String hostName;     // String
  final String hostImage;    // String (URL veya "")
  final String thumbnailUrl; // String
  final String backgroundImage; // String
  final String bannerImage;  // String
  final String roomAccessType; // "FREE" | "NORMAL" | "VIP" | ""
  final List<String> tags;   // List<String>
  final int viewerCount;     // int
  final int likeCount;       // int
  final int commentCount;    // int
  final bool isLive;         // bool
  final String startedAt;    // ISO 8601 veya ""
  final String createdAt;    // ISO 8601 veya ""
}
```

**Response:** `data.rooms: List<LiveRoom>`, `data.pagination: { page, limit, totalStreams, totalVoice, total }`

---

### 2. POST /api/live/join-room — Odaya Katıl (Compound)

**Request Body:**
```json
{ "roomId": "xxx", "roomType": "stream" | "voice", "nickname": "optional" }
```

**Response `data` yapısı:**

```dart
class JoinRoomResponse {
  final RoomInfo room;
  final TrtcCredentials trtc;
  final CurrentUser user;
  final List<Participant> participants;
  final List<SeatInfo> seats;
  final List<GiftRanking> giftRanking;
}

class RoomInfo {
  final String id;              // String
  final String roomId;          // String (TRTC room ID)
  final String slug;            // String
  final String name;            // String
  final String nameEn;          // String
  final String title;           // String (= name)
  final String description;     // String
  final String descriptionEn;   // String
  final String status;          // "live" | "active" | "ended"
  final String category;        // String
  final String icon;            // String
  final String thumbnailUrl;    // String
  final String backgroundUrl;   // String
  final String backgroundImage; // String
  final String bannerImage;     // String
  final bool isImageMode;       // bool
  final bool isMuted;           // bool
  final String roomType;        // "stream" | "voice"
  final String roomAccessType;  // "FREE" | "NORMAL" | "VIP" | ""
  final String welcomeMessage;  // String
  final String pinnedAnnouncement; // String
  final int viewerCount;        // int
  final int likeCount;          // int
  final String startedAt;       // ISO 8601 veya ""
  final HostInfo host;          // Map
}

class HostInfo {
  final String id;         // String
  final String name;       // String
  final String image;      // String (URL veya "")
  final String role;       // String
  final String membership; // String
}

class TrtcCredentials {
  final int sdkAppId;      // int (20040423)
  final String userId;     // String
  final String userSig;    // String
  final String roomId;     // String
  final int expireTime;    // int (86400)
}

class CurrentUser {
  final String id;        // String
  final String name;      // String
  final String image;     // String
  final String role;      // String
  final bool isHost;      // bool
  final bool isBanned;    // bool
}

class Participant {
  final String userId;     // String
  final String name;       // String
  final String nickname;   // String
  final String image;      // String
  final String role;       // String
  final String membership; // String
  final int seatIndex;     // int (-1 = koltuksuz)
  final String joinedAt;   // ISO 8601 veya ""
  final String lastSeen;   // ISO 8601 veya ""
  final bool isMicOn;      // bool
}

class SeatInfo {
  final int seatIndex;     // int (0-14)
  final String userId;     // String
  final String userName;   // String
  final String name;       // String (= userName)
  final String image;      // String
  final String userImage;  // String (= image)
  final bool isMicOn;      // bool
}

class GiftRanking {
  final int rank;          // int (1-10)
  final String userId;     // String
  final String name;       // String
  final String image;      // String
  final int totalAmount;   // int
}
```

---

### 3. POST /api/live/create-room — Yayın Başlat

**Request Body:**
```json
{ "title": "...", "description": "...", "category": "general", "thumbnailUrl": "..." }
```

**Response `data`:**
```dart
class CreateRoomResponse {
  final StreamInfo stream;
  final TrtcCredentials? trtc;  // null olabilir (TRTC config yoksa)
}

class StreamInfo {
  final String id;           // String
  final String roomId;       // String
  final String title;        // String
  final String description;  // String
  final String category;     // String
  final String status;       // "live"
  final String thumbnailUrl; // String
  final String startedAt;    // ISO 8601 veya ""
  final HostInfo host;       // HostInfo { id, name, image }
}
```

---

### 4. POST /api/live/message — Mesaj Gönder

**Request Body:**
```json
{ "roomId": "xxx", "roomType": "stream" | "voice", "content": "Merhaba" }
```

**Response `data`:**
```dart
class ChatMessage {
  final String id;          // String
  final String roomId;      // String
  final String roomType;    // "stream" | "voice"
  final String userId;      // String
  final String userName;    // String
  final String userImage;   // String
  final String content;     // String
  final String chatRole;    // String (veya "")
  final String roleSymbol;  // String (emoji veya "")
  final String createdAt;   // ISO 8601
}
```

### GET /api/live/message?roomId=xxx&roomType=stream|voice&after=ISO&limit=100

**Response:** `data.messages: List<ChatMessage>`, `data.totalCount: int`

---

### 5. GET /api/live/gift-types — Hediye Türleri

```dart
class GiftType {
  final String id;           // String
  final String name;         // String
  final String nameEn;       // String
  final String icon;         // String (emoji)
  final String animation;    // String
  final int price;           // int (jeton)
  final int sortOrder;       // int
  final String thumbnailUrl; // String
  final String assetUrl;     // String
  final String assetType;    // String
}
```

**Response:** `data.giftTypes: List<GiftType>`, `data.totalCount: int`

---

### 6. POST /api/live/gift/send — Hediye Gönder

**Request Body:**
```json
{
  "roomId": "xxx",
  "roomType": "stream" | "voice",
  "giftTypeId": "gift_id",
  "quantity": 1,
  "recipientId": "user_id"  // voice room'da opsiyonel
}
```

**Response `data`:**
```dart
class GiftSendResponse {
  final GiftInfo gift;       // { id, giftTypeId, giftName, giftIcon, quantity, totalPrice }
  final int newBalance;      // int (kalan jeton)
  final PkUpdate? pkUpdate;  // null veya { battleId, score1, score2 }
}

class GiftInfo {
  final String id;           // String
  final String giftTypeId;   // String
  final String giftName;     // String
  final String giftIcon;     // String
  final int quantity;        // int
  final int totalPrice;      // int
}

class PkUpdate {
  final String battleId;     // String
  final int score1;          // int
  final int score2;          // int
}
```

---

### 7. POST/GET /api/live/seats — Koltuk Yönetimi

**POST Request Body:**
```json
{
  "roomId": "xxx",
  "action": "take" | "leave" | "swap" | "force",
  "seatIndex": 0,           // 0-14 (take/swap için)
  "targetUserId": "xxx"     // swap/force için
}
```

**POST Response `data`:** `{ seatIndex: int, targetUserId: String, message: String }`

**GET /api/live/seats?roomId=xxx:**
```dart
class SeatMap {
  final String roomId;      // String
  final List<SeatInfo> seats; // List<SeatInfo>
  final int totalSeats;      // int (15)
}
// SeatInfo: { seatIndex, userId, userName, name, userImage, image, isMicOn }
```

---

### 8. GET/POST /api/live/pk — PK Battle

**GET /api/live/pk?roomId=xxx:**
```dart
class PkBattle {
  final String id;           // String
  final String status;       // "pending" | "active" | "completed" | "expired"
  final String room1Id;      // String
  final String room2Id;      // String
  final String user1Id;      // String
  final String user2Id;      // String
  final int score1;          // int
  final int score2;          // int
  final int duration;        // int (saniye)
  final String startedAt;    // ISO 8601 veya ""
  final String endedAt;      // ISO 8601 veya ""
  final String winnerId;     // String veya ""
  final String createdAt;    // ISO 8601
  final PkUser user1;        // { id, name, image } — asla null değil
  final PkUser user2;        // { id, name, image } — asla null değil
}

class PkUser {
  final String id;           // String
  final String name;         // String
  final String image;        // String
}
```

**POST Actions:** `create`, `accept`, `reject`, `cancel`, `end`

---

### 9. POST /api/live/heartbeat — Canlılık Bildirimi

**Request Body:**
```json
{ "roomId": "xxx", "roomType": "stream" | "voice" }
```

**Response `data`:** `{ onlineCount: int, staleRemoved: int, serverTime: String }`

> ⏱ Her **10 saniye**de bir gönderilmeli.

---

### 10. POST /api/live/leave-room — Odadan Çık

**Request Body:**
```json
{ "roomId": "xxx", "roomType": "stream" | "voice" }
```

**Response `data`:** `{ message: String }`

---

### 11. GET /api/live/online-users — Çevrimiçi Kullanıcılar

**Query:** `?roomId=xxx&roomType=stream|voice&limit=100`

```dart
class OnlineUser {
  final String userId;       // String
  final String userName;     // String
  final String userImage;    // String
  final String joinedAt;     // ISO 8601
  final int seatIndex;       // int (-1 = koltuksuz)
  final bool isMicOn;        // bool
  final String nickname;     // String
}
```

**Response:** `data.users: List<OnlineUser>`, `data.totalCount: int`

---

### 12. POST /api/trtc/token — TRTC UserSig Al

**Request Body:**
```json
{ "roomId": "xxx", "role": "host" | "audience" }
```

**Response `data`:**
```dart
class TrtcToken {
  final int sdkAppId;       // int (20040423)
  final String userId;      // String
  final String userSig;     // String
  final String roomId;      // String
  final int expireTime;     // int (86400)
  final String role;        // "host" | "audience"
}
```

---

## 🔄 Önerilen Flutter Akışı

```
1. Giriş → POST /api/auth/mobile-login → JWT token kaydet
2. Ana sayfa → GET /api/mobile/home → Tüm feed (tek istek)
3. Oda listesi → GET /api/live/rooms
4. Odaya gir → POST /api/live/join-room → room + trtc + participants + seats + gifts
5. TRTC bağlan → TRTCCloud.enterRoom(sdkAppId, userSig, roomId)
6. Timer başlat → Her 10s POST /api/live/heartbeat
7. Mesaj polling → GET /api/live/message?after=...
8. Hediye gönder → POST /api/live/gift/send
9. Koltuk al → POST /api/live/seats { action: 'take', seatIndex: 0 }
10. Çıkış → POST /api/live/leave-room + TRTCCloud.exitRoom()
```

---

## 🛡️ Hata Kodları

| Kod | HTTP | Açıklama |
|---|---|---|
| UNAUTHORIZED | 401 | JWT eksik/geçersiz |
| MISSING_PARAMS | 400 | Zorunlu alan eksik |
| INVALID_ROOM_TYPE | 400 | roomType stream/voice değil |
| ROOM_NOT_FOUND | 404 | Oda bulunamadı |
| STREAM_ENDED | 410 | Yayın bitti |
| BANNED | 403 | Kullanıcı yasaklı |
| SEAT_TAKEN | 409 | Koltuk dolu |
| INSUFFICIENT_BALANCE | 400 | Yetersiz jeton |
| SELF_GIFT | 400 | Kendine hediye |
| ALREADY_LIVE | 409 | Zaten yayında |
| NOT_APPROVED | 403 | Falcı onaylanmamış |
| COOLDOWN_ACTIVE | 429 | Yayın bekleme süresi |
| PK_EXISTS | 409 | Zaten aktif PK var |
| INTERNAL_ERROR | 500 | Sunucu hatası |

---

*CanlıFal Flutter Ekibi — Canlı Oda Entegrasyon Kılavuzu*
*Tarih: 17 Temmuz 2026*
