# 🎙️ Sesli Sohbet Odası (Voice Chat Room) — Tam API Dokümantasyonu

> **Base URL:** `https://canlifal.com`  
> **Versiyon:** 1.0  
> **Son Güncelleme:** 27 Haziran 2026  
> **Hedef:** Flutter mobil uygulama entegrasyonu  

---

## İçindekiler

1. [Kimlik Doğrulama (Authentication)](#1-kimlik-doğrulama)
2. [API Endpoint Listesi](#2-api-endpoint-listesi)
3. [Oda Açma Akışı (Room Creation Flow)](#3-oda-açma-akışı)
4. [Ses Bağlantı Sistemi (Voice Connection)](#4-ses-bağlantı-sistemi)
5. [SSE Stream Endpoint'leri](#5-sse-stream-endpointleri)
6. [Odaya Giriş Akışı (Room Entry Flow)](#6-odaya-giriş-akışı)
7. [Odadan Çıkış Akışı (Room Exit Flow)](#7-odadan-çıkış-akışı)
8. [Mikrofon / Hoparlör / Mute Sistemi](#8-mikrofon-hoparlör-mute)
9. [DJ Sistemi](#9-dj-sistemi)
10. [Admin & Moderasyon](#10-admin-moderasyon)
11. [Mesaj Sistemi (Chat)](#11-mesaj-sistemi)
12. [Müzik Sistemi](#12-müzik-sistemi)
13. [Veritabanı Modelleri (Prisma Schema)](#13-veritabanı-modelleri)
14. [İş Mantığı (Business Logic)](#14-iş-mantığı)
15. [Flutter Entegrasyon Rehberi](#15-flutter-entegrasyon-rehberi)

---

## 1. Kimlik Doğrulama

### 1.1 Giriş (Login)

```
POST /api/auth/mobile-login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "kullanici@example.com",
  "password": "sifre123"
}
```

> Not: `email` yerine `username` ile de giriş yapılabilir.

**Başarılı Yanıt (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "clxx1234567890",
    "email": "kullanici@example.com",
    "name": "Mesut",
    "username": "mesut42",
    "role": "user",
    "image": "https://example.com/avatar.jpg",
    "credits": 100,
    "jetonBalance": 500,
    "cfcBalance": 0,
    "membership": "gold",
    "membershipExpiresAt": "2026-12-31T23:59:59.000Z",
    "preferredLanguage": "tr",
    "level": 5,
    "bio": "Merhaba!",
    "phone": "+905551234567",
    "birthDate": "1990-01-15T00:00:00.000Z",
    "zodiacSign": "Oğlak",
    "referralCode": "MST42"
  }
}
```

**Hata Yanıtları:**
| Status | Body | Açıklama |
|--------|------|----------|
| 400 | `{"error": "E-posta/kullanıcı adı ve şifre gereklidir"}` | Eksik parametre |
| 401 | `{"error": "E-posta veya şifre hatalı"}` | Yanlış kimlik bilgileri |
| 429 | `{"error": "Çok fazla istek. Lütfen biraz bekleyin."}` | Rate limit |
| 500 | `{"error": "Giriş başarısız"}` | Sunucu hatası |

### 1.2 Token Yenileme (Refresh)

```
POST /api/auth/mobile-refresh
Content-Type: application/json
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
  "accessToken": "eyJhbGciOiJIUzI1NiIs...(yeni)",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...(yeni)",
  "user": {
    "id": "clxx1234567890",
    "email": "kullanici@example.com",
    "name": "Mesut",
    "username": "mesut42",
    "role": "user",
    "image": null,
    "credits": 100,
    "jetonBalance": 500,
    "cfcBalance": 0,
    "membership": "gold",
    "membershipExpiresAt": "2026-12-31T23:59:59.000Z",
    "preferredLanguage": "tr",
    "level": 5
  }
}
```

**Hata Yanıtları:**
| Status | Body | Açıklama |
|--------|------|----------|
| 400 | `{"error": "Refresh token gerekli"}` | Eksik token |
| 401 | `{"error": "Geçersiz veya süresi dolmuş token"}` | Geçersiz/süresi dolmuş |
| 401 | `{"error": "Kullanıcı bulunamadı"}` | Kullanıcı silinmiş |

### 1.3 Token Bilgileri

| Token | Süre | Kullanım |
|-------|------|----------|
| `accessToken` | 7 gün | Tüm API isteklerinde `Authorization` header'ında |
| `refreshToken` | 30 gün | Sadece token yenileme endpoint'inde |

### 1.4 Header Formatı

Tüm korumalı API isteklerinde:

```
Authorization: Bearer <accessToken>
```

### 1.5 JWT Payload Yapısı

```json
{
  "userId": "clxx1234567890",
  "email": "kullanici@example.com",
  "role": "user",
  "type": "access",
  "iat": 1719480000,
  "exp": 1720084800
}
```

---

## 2. API Endpoint Listesi

### Kimlik Doğrulama
| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| POST | `/api/auth/mobile-login` | ❌ | Giriş yap |
| POST | `/api/auth/mobile-refresh` | ❌ | Token yenile |

### Oda Yönetimi
| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/api/chat/rooms` | ❌ | Tüm odaları listele |
| POST | `/api/chat/rooms/create` | ✅ | Yeni oda oluştur |
| GET | `/api/chat/rooms/backgrounds` | ❌ | Oda arka planlarını getir |
| GET | `/api/chat/rooms/{roomId}/settings` | ✅ | Oda ayarlarını getir |
| PATCH | `/api/chat/rooms/{roomId}/settings` | ✅ | Oda ayarlarını güncelle |

### Kullanıcı Varlığı (Presence)
| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/api/chat/rooms/{roomId}/presence` | ❌ | Aktif kullanıcıları getir |
| POST | `/api/chat/rooms/{roomId}/presence` | ✅ | Heartbeat / Odaya giriş |
| POST | `/api/chat/rooms/{roomId}/presence?_delete=1` | ✅ | sendBeacon ile çıkış |
| POST | `/api/chat/rooms/{roomId}/presence?_delete=1&leave=1` | ✅ | Kasıtlı çıkış |
| DELETE | `/api/chat/rooms/{roomId}/presence` | ✅ | Odadan ayrıl |
| DELETE | `/api/chat/rooms/{roomId}/presence?leave=1` | ✅ | Kasıtlı odadan ayrıl |

### Mesajlar
| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/api/chat/rooms/{roomId}/messages` | ❌ | Mesajları getir |
| POST | `/api/chat/rooms/{roomId}/messages` | ✅ | Mesaj gönder |
| DELETE | `/api/chat/rooms/{roomId}/messages?messageId={id}` | ✅ | Tek mesaj sil |
| DELETE | `/api/chat/rooms/{roomId}/messages` | ✅ | Tüm mesajları temizle |

### SSE Stream
| Method | Endpoint | Auth | ❌/✅ | Açıklama |
|--------|----------|------|------|----------|
| GET | `/api/chat/rooms/{roomId}/stream` | ✅ (opsiyonel) | SSE bağlantısı |

### Yazıyor Göstergesi
| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/api/chat/rooms/{roomId}/typing` | ❌ | Yazan kullanıcıları getir |
| POST | `/api/chat/rooms/{roomId}/typing` | ✅ | Yazıyor durumunu güncelle |

### Ses (Voice)
| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/api/chat/rooms/{roomId}/voice` | ❌ | Seste olanları getir |
| POST | `/api/chat/rooms/{roomId}/voice` | ✅ | Sese katıl/ayrıl |

### Koltuklar (Seats)
| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| PATCH | `/api/chat/rooms/{roomId}/seats` | ✅ | Koltuk değiştir |

### Hediye (Gift)
| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/api/chat/rooms/{roomId}/gifts` | ❌ | Lider tablosu + son hediyeler |
| POST | `/api/chat/rooms/{roomId}/gifts` | ✅ | Hediye gönder |

### Moderasyon
| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/api/chat/rooms/{roomId}/moderation` | ✅ | Moderasyon bilgisi |
| POST | `/api/chat/rooms/{roomId}/moderation` | ✅ | Moderasyon işlemi yap |

### DJ Sistemi
| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/api/chat/rooms/{roomId}/dj` | ❌ | DJ listesi + müzik durumu |
| POST | `/api/chat/rooms/{roomId}/dj` | ✅ | DJ ekle/çıkar/aktif yap |

### Müzik
| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/api/chat/rooms/{roomId}/music` | ❌ | Şu an çalanı getir |
| POST | `/api/chat/rooms/{roomId}/music` | ✅ | Müzik çal |
| DELETE | `/api/chat/rooms/{roomId}/music` | ✅ | Müziği durdur |

### Şarkı İsteği
| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/api/chat/rooms/{roomId}/song-request` | ❌ | Sıradaki şarkılar |
| POST | `/api/chat/rooms/{roomId}/song-request` | ✅ | Şarkı isteği gönder |
| PATCH | `/api/chat/rooms/{roomId}/song-request` | ✅ | Sıradaki şarkıyı çal |

### Müzik Kuyruğu (Flutter alias)
| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/api/chat/rooms/{roomId}/music-queue` | ✅ | Kuyruk + çalan bilgisi |

### YouTube Arama
| Method | Endpoint | Auth | Açıklama |
|--------|----------|------|----------|
| GET | `/api/youtube/search?q={query}` | ✅ | YouTube video ara |


---

## 3. Oda Açma Akışı

### 3.1 Akış Diyagramı

```
Login → Token Al → GET /api/chat/rooms (mevcut odaları gör)
                 → POST /api/chat/rooms/create (yeni oda aç)
                 → POST /api/chat/rooms/{roomId}/presence (odaya gir)
                 → GET /api/chat/rooms/{roomId}/stream (SSE bağlan)
```

### 3.2 Oda Listesi

```
GET /api/chat/rooms
GET /api/chat/rooms?withCounts=true
```

**Auth:** Gerekmez  
**Cache:** 10 saniye sunucu tarafı cache

**Query Parametreleri:**
| Param | Tip | Varsayılan | Açıklama |
|-------|-----|------------|----------|
| withCounts | string | "false" | "true" → tüm aktif kullanıcıları say |

**Başarılı Yanıt (200):**
```json
[
  {
    "id": "clxx_room_id_1",
    "slug": "genel-sohbet",
    "nameEn": "General Chat",
    "nameTr": "Genel Sohbet",
    "descEn": "Chat room for everyone",
    "descTr": "Herkes için sohbet odası",
    "icon": "💬",
    "ownerId": "clxx_user_id",
    "owner": {
      "id": "clxx_user_id",
      "name": "Mesut",
      "username": "mesut42",
      "image": null
    },
    "roomType": "FREE",
    "backgroundImage": "https://example.com/bg.jpg",
    "bannedWords": null,
    "djUserIds": "[\"userId1\",\"userId2\"]",
    "activeDjId": "userId1",
    "whitelistedWords": null,
    "messageCount": 1234,
    "onlineCount": 5,
    "userCount": 5,
    "recentUsers": [
      { "id": "u1", "name": "Ali", "image": null },
      { "id": "u2", "name": "Ayşe", "image": "https://..." }
    ]
  }
]
```

### 3.3 Oda Oluşturma

```
POST /api/chat/rooms/create
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Müzik Severler",
  "description": "Müzik dinleme ve sohbet odası",
  "icon": "🎵",
  "paymentType": "jeton",
  "roomType": "FREE"
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| name | string | ✅ | Oda adı |
| description | string | ✅ | Oda açıklaması |
| icon | string | ✅ | Emoji ikon |
| paymentType | string | ✅ | `"jeton"` veya `"cfc"` |
| roomType | string | ❌ | `"FREE"`, `"NORMAL"`, `"VIP"` (varsayılan: FREE) |

**Maliyet:** Platform ayarlarında belirlenir (varsayılan: 100 jeton/cfc). Staff kullanıcılar ücretsiz.

**Başarılı Yanıt (200):**
```json
{
  "success": true,
  "room": {
    "id": "clxx_new_room_id",
    "slug": "muzik-severler",
    "nameTr": "Müzik Severler",
    "roomType": "FREE"
  },
  "cost": 100,
  "paymentType": "jeton"
}
```

**Hata Yanıtları:**
| Status | error | Açıklama |
|--------|-------|----------|
| 400 | `"Name, description and icon are required"` | Eksik alan |
| 400 | `"Invalid payment type"` | paymentType jeton/cfc değil |
| 400 | `"insufficient_jeton"` | Yetersiz jeton |
| 400 | `"insufficient_cfc"` | Yetersiz CFC |
| 401 | `"Oturum açmanız gerekiyor"` | Auth gerekli |
| 404 | `"Kullanıcı bulunamadı"` | Geçersiz kullanıcı |

### 3.4 Oda Arka Planları

```
GET /api/chat/rooms/backgrounds
```

**Auth:** Gerekmez  
**Cache:** 120 saniye

**Başarılı Yanıt (200):**
```json
{
  "success": true,
  "backgrounds": [
    {
      "roomId": "clxx_room_id",
      "slug": "genel-sohbet",
      "name": "Genel Sohbet",
      "backgroundImage": "https://example.com/bg.jpg"
    },
    {
      "roomId": "clxx_room_id_2",
      "slug": "muzik",
      "name": "Müzik Odası",
      "backgroundImage": null
    }
  ]
}
```

---

## 4. Ses Bağlantı Sistemi

### 4.1 Mimari

Sistem **Agora SDK** kullanır. Sunucu tarafında Agora token üretimi **YOKTUR** — client doğrudan Agora App ID ile bağlanır.

| Bilgi | Değer |
|-------|-------|
| SDK | Agora RTC SDK |
| App ID | `f1cf983a38114b04a4e9102c303ba63e` |
| Token Modu | App ID Only (token yok) |
| Kanal Adı | `roomId` değeri |

> ⚠️ TRTC SDK App ID (`20040277`) de tanımlı ama aktif olarak Agora kullanılıyor.

### 4.2 Sese Katılma

```
POST /api/chat/rooms/{roomId}/voice
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "join"
}
```

**Başarılı Yanıt (200):**
```json
{
  "success": true,
  "timestamp": 1719480000000
}
```

**Yetki:** Şu rollerden birine sahip olmalı: `voice`, `op`, `sop`, `admin`, `founder`, `superadmin` veya oda sahibi veya global admin.

**Hata Yanıtları:**
| Status | error | Açıklama |
|--------|-------|----------|
| 401 | `"Oturum açmanız gerekiyor"` | Auth gerekli |
| 403 | `"No voice permission"` | Ses yetkisi yok |

### 4.3 Sesten Ayrılma

```
POST /api/chat/rooms/{roomId}/voice
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "leave"
}
```

**Başarılı Yanıt (200):**
```json
{
  "success": true,
  "timestamp": 1719480000000
}
```

### 4.4 Seste Olanları Getir

```
GET /api/chat/rooms/{roomId}/voice
Authorization: Bearer <accessToken> (opsiyonel)
```

**Başarılı Yanıt (200):**
```json
{
  "voiceUsers": [
    {
      "id": "clxx_user_id",
      "name": "Mesut",
      "agoraUid": 123456789,
      "joinedAt": 1719480000000
    }
  ],
  "timestamp": 1719480000000
}
```

> Not: Bu endpoint aynı zamanda çağıranın `lastPing`'ini günceller (30 sn inaktiflik → otomatik temizlik).

### 4.5 Flutter Agora Entegrasyonu

```dart
// Flutter'da Agora bağlantısı
import 'package:agora_rtc_engine/agora_rtc_engine.dart';

const String agoraAppId = 'f1cf983a38114b04a4e9102c303ba63e';

// 1) Sunucuya join bildir
await api.post('/api/chat/rooms/$roomId/voice', body: {'type': 'join'});

// 2) Agora Engine başlat
final engine = createAgoraRtcEngine();
await engine.initialize(RtcEngineContext(appId: agoraAppId));

// 3) Kanala katıl (token yok, App ID ile)
await engine.joinChannel(
  token: '',  // Boş - App ID only mode
  channelId: roomId,  // Oda ID'si kanal adı olarak
  uid: 0,  // Otomatik atanır
  options: ChannelMediaOptions(
    channelProfile: ChannelProfileType.channelProfileCommunication,
    clientRoleType: ClientRoleType.clientRoleBroadcaster,
  ),
);

// 4) Ayrılırken
await engine.leaveChannel();
await api.post('/api/chat/rooms/$roomId/voice', body: {'type': 'leave'});
```

---

## 5. SSE Stream Endpoint'leri

### 5.1 Bağlantı

```
GET /api/chat/rooms/{roomId}/stream
Authorization: Bearer <accessToken> (opsiyonel - anonim de olabilir)
```

**Response Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

### 5.2 Event Tipleri

#### `connected` — İlk bağlantı onayı
```json
{"type": "connected", "roomId": "clxx_room_id"}
```

#### `messages` — Yeni mesajlar (toplu)
```json
{
  "type": "messages",
  "messages": [
    {
      "id": "clxx_msg_id",
      "roomId": "clxx_room_id",
      "userId": "clxx_user_id",
      "content": "Merhaba!",
      "createdAt": "2026-06-27T12:00:00.000Z",
      "user": {
        "id": "clxx_user_id",
        "name": "Mesut",
        "role": "user",
        "membership": "gold",
        "chatRole": "op",
        "roleSymbol": "@"
      }
    }
  ]
}
```

#### `system` — Sistem olayları
```json
// Kullanıcı susturuldu
{"type": "system", "event": "USER_MUTED", "userId": "...", "userName": "Ali", "duration": 10, "moderator": "Admin"}

// Kullanıcı susturması kaldırıldı
{"type": "system", "event": "USER_UNMUTED", "userId": "...", "moderator": "Admin"}

// Kullanıcı atıldı
{"type": "system", "event": "USER_KICKED", "userId": "...", "userName": "Ali", "reason": "Kural ihlali", "kickCount": 2, "moderator": "Admin"}

// Kullanıcı banlandı
{"type": "system", "event": "USER_BANNED", "userId": "...", "userName": "Ali", "reason": "Spam", "moderator": "Admin"}

// Oda sessiz
{"type": "system", "event": "ROOM_MUTED", "moderator": "Admin"}

// Oda sessizi kaldırıldı
{"type": "system", "event": "ROOM_UNMUTED", "moderator": "Admin"}

// Mesajlar temizlendi
{"type": "system", "event": "CHAT_CLEARED", "moderator": "Admin"}

// Duyuru
{"type": "system", "event": "ANNOUNCEMENT", "text": "Yarın etkinlik var!", "ttl": 15, "moderator": "Admin", "timestamp": 1719480000000}
```

#### `gift` — Hediye gönderildi
```json
{
  "type": "gift",
  "senderId": "clxx_sender",
  "senderName": "Ali",
  "recipientId": "clxx_recipient",
  "recipientName": "Ayşe",
  "giftTypeId": "clxx_gift_type",
  "giftName": "Gül",
  "giftIcon": "🌹",
  "quantity": 1,
  "amount": 50,
  "currencyType": "jeton"
}
```

#### `presence` — Aktif kullanıcı listesi (her ~10 saniye)
```json
{
  "type": "presence",
  "users": [
    {
      "id": "clxx_user_id",
      "name": "Mesut",
      "nickname": "Mesut42",
      "lastSeen": "2026-06-27T12:00:00.000Z",
      "chatRole": "founder",
      "roleSymbol": "~",
      "roleLevel": 4,
      "isAdmin": false
    }
  ]
}
```

#### `typing` — Yazan kullanıcılar
```json
{
  "type": "typing",
  "users": ["Ali", "Ayşe"]
}
```

#### `dj` — DJ / Müzik durumu
```json
{
  "type": "dj",
  "event": "QUEUE_UPDATED",
  "playing": true,
  "nowPlaying": {
    "videoId": "dQw4w9WgXcQ",
    "title": "Never Gonna Give You Up",
    "startedAt": "2026-06-27T12:00:00.000Z",
    "duration": "3:33"
  },
  "musicUrl": "https://pipedapi.kavin.rocks/...",
  "musicQueue": [
    {
      "id": "clxx_msg_id",
      "videoId": "abc123",
      "title": "Şarkı 2",
      "dedication": "Ayşe'ye",
      "note": "Güzel şarkı",
      "duration": "4:20",
      "requestType": "audio",
      "isPaid": true,
      "userId": "clxx_user",
      "userName": "Ali",
      "createdAt": "2026-06-27T12:01:00.000Z"
    }
  ],
  "queueLength": 1
}
```

### 5.3 Zamanlama

| Parametre | Değer |
|-----------|-------|
| Polling interval | 2 saniye |
| Heartbeat | 15 saniye (`: heartbeat\n\n`) |
| Presence DB kontrolü | Her 10 saniye (5 × 2s) |
| DJ ilk payload | İlk poll cycle'da (2s sonra) |

### 5.4 SSE Veri Formatı

Tüm eventler standart SSE formatındadır:
```
data: {"type":"messages","messages":[...]}\n\n
```

Heartbeat:
```
: heartbeat\n\n
```

### 5.5 Flutter SSE Bağlantısı

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<void> connectSSE(String roomId, String? accessToken) async {
  final url = Uri.parse('https://canlifal.com/api/chat/rooms/$roomId/stream');
  final request = http.Request('GET', url);
  
  if (accessToken != null) {
    request.headers['Authorization'] = 'Bearer $accessToken';
  }
  
  final response = await http.Client().send(request);
  
  response.stream
    .transform(utf8.decoder)
    .transform(const LineSplitter())
    .listen((line) {
      if (line.startsWith('data: ')) {
        final json = jsonDecode(line.substring(6));
        handleSSEEvent(json);
      }
    }, onError: (e) {
      // Yeniden bağlan (3-5 sn bekle)
      Future.delayed(Duration(seconds: 3), () => connectSSE(roomId, accessToken));
    });
}

void handleSSEEvent(Map<String, dynamic> event) {
  switch (event['type']) {
    case 'connected': print('Bağlandı!'); break;
    case 'messages': handleMessages(event['messages']); break;
    case 'system': handleSystemEvent(event); break;
    case 'gift': handleGift(event); break;
    case 'presence': handlePresence(event['users']); break;
    case 'typing': handleTyping(event['users']); break;
    case 'dj': handleDjUpdate(event); break;
  }
}
```

### 5.6 Yeniden Bağlanma Stratejisi

| Durum | Eylem |
|-------|-------|
| Bağlantı koptu | 3 saniye bekle → yeniden bağlan |
| 403 (banned) | Kullanıcıya "Banlandınız" göster, yeniden bağlanma |
| 404 (room not found) | Oda listesine dön |
| Ard arda hata | Exponential backoff (3s, 6s, 12s, max 30s) |

---

## 6. Odaya Giriş Akışı

### 6.1 Adım Adım

```
1. GET /api/chat/rooms → Oda listesini getir
2. Kullanıcı bir oda seçer
3. POST /api/chat/rooms/{roomId}/presence → Odaya giriş (heartbeat)
   Body: { "nickname": "Mesut42", "seatIndex": 3 }
4. GET /api/chat/rooms/{roomId}/messages → Son mesajları getir
5. GET /api/chat/rooms/{roomId}/stream → SSE bağlantısı aç
6. Her 25 saniyede POST /api/chat/rooms/{roomId}/presence → Heartbeat
```

### 6.2 Presence POST Detayları

```
POST /api/chat/rooms/{roomId}/presence
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "nickname": "Mesut42",
  "seatIndex": 3
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| nickname | string | ❌ | Odadaki takma ad |
| seatIndex | int | ❌ | Koltuk (0-14), -1=koltuğa oturmak istemiyorum |

**Başarılı Yanıt (200):**
```json
{
  "users": [
    {
      "id": "clxx_user_id",
      "name": "Mesut",
      "nickname": "Mesut42",
      "image": "https://...",
      "lastSeen": "2026-06-27T12:00:00.000Z",
      "chatRole": "founder",
      "roleSymbol": "~",
      "roleLevel": 4,
      "isAdmin": false,
      "seatIndex": 3
    }
  ],
  "roomMuted": false
}
```

**Hata Yanıtları:**
| Status | error | Açıklama |
|--------|-------|----------|
| 401 | `"Oturum açmanız gerekiyor"` | Auth gerekli |
| 403 | `"You are banned from this room"` | Banlı |
| 403 | `"Bu oda dolu. Maksimum 15 kişi."` | Oda dolu |
| 409 | `"Bu koltuk zaten dolu"` | Koltuk meşgul |

### 6.3 Yeni Giriş Algılama

Sunucu, kullanıcının son `lastSeen` değeri 30 saniyeden eski ise bunu **yeni giriş** olarak algılar ve:

1. `[SYSTEM_JOIN]` veya `[SYSTEM_VIP_JOIN:TYPE]` mesajı oluşturur
2. Aktivite loguna kaydeder
3. Event announcement tetikler

**Giriş Tipleri:**
| entryType | Kimler | Mesaj Formatı |
|-----------|--------|---------------|
| `ADMIN` | admin, yönetici | `[SYSTEM_VIP_JOIN:ADMIN]%Mesut` |
| `OWNER` | Oda sahibi | `[SYSTEM_VIP_JOIN:OWNER]👑Mesut` |
| `SUPERADMIN` | superadmin role | `[SYSTEM_VIP_JOIN:SUPERADMIN]%Mesut` |
| `FOUNDER` | founder role | `[SYSTEM_VIP_JOIN:FOUNDER]~Mesut` |
| `MODERATOR` | sop/admin role | `[SYSTEM_VIP_JOIN:MODERATOR]&Mesut` |
| `OP` | op role | `[SYSTEM_VIP_JOIN:OP]@Mesut` |
| `DIAMOND` | diamond üyelik | `[SYSTEM_VIP_JOIN:DIAMOND]Mesut` |
| `GOLD` | gold üyelik | `[SYSTEM_VIP_JOIN:GOLD]Mesut` |
| `PREMIUM` | premium üyelik | `[SYSTEM_VIP_JOIN:PREMIUM]Mesut` |
| (normal) | Diğerleri | `[SYSTEM_JOIN]Mesut` |

### 6.4 Oda Kapasiteleri

| Oda Tipi | Maks. Kullanıcı | Ayar Anahtarı |
|----------|-----------------|---------------|
| FREE | 15 | `vr_free_room_max_users` |
| NORMAL | 100 | `vr_normal_room_max_users` |
| VIP | 500 | `vr_vip_room_max_users` |


---

## 7. Odadan Çıkış Akışı

### 7.1 Yöntem 1: DELETE (Normal Çıkış)

```
DELETE /api/chat/rooms/{roomId}/presence?leave=1
Authorization: Bearer <accessToken>
```

**İşlem Sırası:**
1. Kullanıcının `lastSeen` = epoch (0) olarak ayarlanır
2. `seatIndex` = -1 (koltuk boşaltılır, sadece `leave=1` ise)
3. `[SYSTEM_LEAVE]Mesut42` mesajı oluşturulur
4. VoiceSession güncellenmez — ayrıca `/voice` endpoint'ine leave gönderin

**Başarılı Yanıt (200):**
```json
{ "success": true }
```

### 7.2 Yöntem 2: sendBeacon (Sayfa Kapatma)

```
POST /api/chat/rooms/{roomId}/presence?_delete=1&leave=1
Authorization: Bearer <accessToken>
```

Bu yöntem web'de `navigator.sendBeacon()` ile kullanılır, Flutter'da normal POST olarak gönderebilirsiniz.

### 7.3 Flutter Çıkış Kodu

```dart
Future<void> leaveRoom(String roomId) async {
  // 1) Sesten ayrıl
  await api.post('/api/chat/rooms/$roomId/voice', body: {'type': 'leave'});
  
  // 2) Agora kanaldan çık
  await agoraEngine.leaveChannel();
  
  // 3) Presence kaldır
  await api.delete('/api/chat/rooms/$roomId/presence?leave=1');
  
  // 4) SSE bağlantısını kapat
  sseSubscription?.cancel();
}
```

### 7.4 Otomatik Temizlik

| Mekanizma | Süre | Açıklama |
|-----------|------|----------|
| Presence timeout | 5 dakika (300s) | lastSeen > 5dk → kullanıcı listesinden çıkar |
| Voice cleanup | 30 saniye | lastPing > 30s → voiceSession inactive |
| Chat events TTL | 2 dakika | In-memory eventler temizlenir |

---

## 8. Mikrofon / Hoparlör / Mute

### 8.1 Sunucu Tarafı Mute (Chat Susturma)

Kullanıcıyı sohbette susturmak (mesaj yazamaz):

```
POST /api/chat/rooms/{roomId}/moderation
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "action": "mute_user",
  "targetUserId": "clxx_target",
  "reason": "Spam yapıyor",
  "duration": 10
}
```

| Alan | Tip | Açıklama |
|------|-----|----------|
| duration | int (dakika) | Süre. null = süresiz |

**Yanıt:**
```json
{ "success": true, "message": "User muted" }
```

### 8.2 Oda Sessiz Modu

```json
{ "action": "mute_room" }
```

Oda sessiz modda iken sadece `voice` (+) ve üstü roller mesaj yazabilir.

### 8.3 Mikrofon Kontrolü (Client-Side)

Sunucuda mikrofon açma/kapama endpoint'i **yoktur**. Bu tamamen client-side Agora SDK ile yapılır:

```dart
// Mikrofon kapat
await agoraEngine.muteLocalAudioStream(true);

// Mikrofon aç
await agoraEngine.muteLocalAudioStream(false);

// Hoparlör kapat (uzaktan gelen sesi kapat)
await agoraEngine.muteAllRemoteAudioStreams(true);

// Belirli bir kullanıcının sesini kapat
await agoraEngine.muteRemoteAudioStream(uid: remoteUid, mute: true);
```

---

## 9. DJ Sistemi

### 9.1 DJ Listesi

```
GET /api/chat/rooms/{roomId}/dj
Authorization: Bearer <accessToken> (opsiyonel)
```

**Başarılı Yanıt (200):**
```json
{
  "djUsers": [
    {
      "id": "clxx_dj_id",
      "name": "DJ Ali",
      "image": "https://...",
      "isPresent": true
    }
  ],
  "activeDjId": "clxx_dj_id",
  "ownerPresent": true,
  "canPlayMusic": true,
  "isOwner": false,
  "playing": true,
  "nowPlaying": {
    "videoId": "abc123",
    "title": "Şarkı Adı",
    "startedAt": "2026-06-27T12:00:00.000Z",
    "duration": "3:45"
  },
  "musicUrl": "https://pipedapi.kavin.rocks/...",
  "musicQueue": []
}
```

### 9.2 DJ Ekleme

```
POST /api/chat/rooms/{roomId}/dj
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "action": "add_dj",
  "userId": "clxx_target_user"
}
```

**Hata Yanıtları:**
| Status | error |
|--------|-------|
| 400 | `"En fazla 5 DJ ekleyebilirsiniz"` |
| 400 | `"Bu kullanıcı zaten DJ"` |
| 403 | `"Bu işlem için yetkiniz yok"` |

### 9.3 DJ Çıkarma

```json
{
  "action": "remove_dj",
  "userId": "clxx_target_user"
}
```

### 9.4 Aktif DJ Ayarlama

```json
{
  "action": "set_active_dj",
  "userId": "clxx_target_user"
}
```

> `userId: null` → Aktif DJ'yi temizle (kimse çalamaz)

### 9.5 DJ Yetki Hiyerarşisi

```
1. Oda sahibi odada ise:
   → Sadece activeDjId olan DJ müzik çalabilir
   → Oda sahibi her zaman çalabilir
   
2. Oda sahibi odada değilse:
   → DJ listesindeki sıralamaya göre, odada bulunan ilk DJ çalabilir
   
3. Global admin → Her zaman çalabilir
```

### 9.6 DJ Limitleri

| Limit | Değer |
|-------|-------|
| Maks DJ sayısı | 5 |
| DJ yönetimi yetkisi | Sadece oda sahibi + global admin |

---

## 10. Admin & Moderasyon

### 10.1 Rol Hiyerarşisi

```
Seviye 5: % superadmin — Site admin/moderator/site_manager
Seviye 4: ~ founder — Oda sahibi (owner)
Seviye 3: & sop — Süper Operatör
Seviye 2: @ op — Operatör
Seviye 1: + voice — Ses yetkisi
Seviye 0: (yok) — Normal kullanıcı
```

### 10.2 Yetki Matrisi

| Yetki | voice(1) | op(2) | sop(3) | founder(4) | superadmin(5) |
|-------|----------|-------|--------|------------|---------------|
| Susturabilir | ❌ | ✅ | ✅ | ✅ | ✅ |
| Atabilir | ❌ | ❌ | ✅ | ✅ | ✅ |
| Banlayabilir | ❌ | ❌ | ✅ | ✅ | ✅ |
| Oda sessize alabilir | ❌ | ❌ | ✅ | ✅ | ✅ |
| voice verebilir | ❌ | ✅ | ✅ | ✅ | ✅ |
| op verebilir | ❌ | ❌ | ❌ | ✅ | ✅ |
| sop verebilir | ❌ | ❌ | ❌ | ✅ | ✅ |
| founder verebilir | ❌ | ❌ | ❌ | ❌ | ✅ |
| Oda ayarları | ❌ | ❌ | ❌ | ✅ | ✅ |
| Sessiz odada konuşma | ✅ | ✅ | ✅ | ✅ | ✅ |

### 10.3 Moderasyon Bilgisi

```
GET /api/chat/rooms/{roomId}/moderation
Authorization: Bearer <accessToken>
```

**Yetki:** op ve üstü

**Başarılı Yanıt (200):**
```json
{
  "roomMuted": false,
  "ownerId": "clxx_owner",
  "owner": { "id": "clxx_owner", "name": "Mesut", "username": "mesut42" },
  "mutes": [
    {
      "id": "clxx_mute_id",
      "roomId": "clxx_room",
      "userId": "clxx_user",
      "mutedBy": "clxx_mod",
      "reason": "Spam",
      "expiresAt": "2026-06-27T13:00:00.000Z",
      "createdAt": "2026-06-27T12:00:00.000Z",
      "user": { "id": "clxx_user", "name": "Ali" }
    }
  ],
  "bans": [
    {
      "id": "clxx_ban_id",
      "roomId": "clxx_room",
      "userId": "clxx_user2",
      "bannedBy": "clxx_mod",
      "reason": "Hakaret",
      "expiresAt": null,
      "createdAt": "2026-06-27T11:00:00.000Z",
      "user": { "id": "clxx_user2", "name": "Veli" }
    }
  ],
  "roles": [
    {
      "id": "clxx_role_id",
      "roomId": "clxx_room",
      "userId": "clxx_user3",
      "role": "op",
      "grantedBy": "clxx_owner",
      "user": { "id": "clxx_user3", "name": "Fatma" }
    }
  ],
  "myPermissions": {
    "role": "founder",
    "isGlobalAdmin": false,
    "isRoomOwner": true,
    "canMuteUsers": true,
    "canKickUsers": true,
    "canBanUsers": true,
    "canMuteRoom": true,
    "canGiveVoice": true,
    "canGiveOp": true,
    "canGiveSop": true,
    "canGiveFounder": false,
    "canManageRoom": true,
    "canSpeakInMutedRoom": true
  }
}
```

### 10.4 Moderasyon İşlemleri

```
POST /api/chat/rooms/{roomId}/moderation
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Tüm action tipleri:**

| action | Açıklama | Gerekli Yetki | Ek Alanlar |
|--------|----------|---------------|------------|
| `mute_user` | Kullanıcıyı sustur | op+ | `targetUserId`, `reason?`, `duration?` (dk) |
| `unmute_user` | Susturmayı kaldır | op+ | `targetUserId` |
| `kick_user` | Kullanıcıyı at | sop+ | `targetUserId`, `reason?` |
| `ban_user` | Kullanıcıyı banla | sop+ | `targetUserId`, `reason?`, `duration?` (dk) |
| `unban_user` | Banı kaldır | sop+ | `targetUserId` |
| `mute_room` | Odayı sessize al | sop+ | — |
| `unmute_room` | Oda sessize almayı kaldır | sop+ | — |
| `set_role` | Rol ver | ilgili yetki | `targetUserId`, `role` |
| `remove_role` | Rolü kaldır | hedeften yüksek rol | `targetUserId` |
| `clear_messages` | Tüm mesajları sil | op+ | — |
| `set_owner` | Oda sahibini değiştir | superadmin | `targetUserId` |
| `remove_owner` | Oda sahibini kaldır | superadmin | — |
| `announce` | Duyuru gönder | op+ | `message`, `ttl?` (sn, varsayılan 15) |

### 10.5 3-Strike Kick → Ban Kuralı

```
1. kick → kickCount: 1, uyarı
2. kick → kickCount: 2, uyarı
3. kick → kickCount: 3, OTOMATİK BAN
```

Kick sayacı 30 dakika sonra sıfırlanır.

**Otomatik ban yanıtı:**
```json
{
  "success": true,
  "message": "User auto-banned after 3 kicks",
  "autoBanned": true,
  "kickCount": 3
}
```

### 10.6 Korumalı Kullanıcı Sistemi

Site admin/moderator/site_manager rolündeki kullanıcılara moderasyon işlemi yapılmaya çalışılırsa, işlem **tersine döner**:

| Denenen İşlem | Sonuç |
|---------------|-------|
| kick → admin | Saldırgan odadan atılır |
| mute → admin | Saldırgan 30dk susturulur |
| ban → admin | Saldırgan odadan atılır |

**Yanıt:**
```json
{
  "error": "Bu kullanıcıyı atamazsınız! Odadan çıkarıldınız.",
  "reversed": true,
  "reverseAction": "kicked"
}
```

### 10.7 Oda Ayarları

#### GET

```
GET /api/chat/rooms/{roomId}/settings
Authorization: Bearer <accessToken>
```

**Yetki:** founder+ veya oda sahibi

**Yanıt:** Oda bilgileri + `myPermissions`

#### PATCH

```
PATCH /api/chat/rooms/{roomId}/settings
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Güncellenebilir Alanlar:**
```json
{
  "nameTr": "Yeni İsim",
  "nameEn": "New Name",
  "descTr": "Yeni açıklama",
  "descEn": "New description",
  "icon": "🎵",
  "isMuted": false,
  "isActive": true,
  "backgroundImage": "https://...",
  "bannedWords": "[\"kötüsöz1\",\"kötüsöz2\"]",
  "whitelistedWords": "[\"normalkelime\"]",
  "welcomeMessage": "Hoş geldiniz!",
  "pinnedAnnouncement": "Kuralları okuyun",
  "tags": "müzik,sohbet",
  "bannerImage": "https://...",
  "password": "oda123",
  "roomType": "NORMAL",
  "giftCommissionPercent": 30
}
```

> `roomType` ve `giftCommissionPercent` sadece global admin değiştirebilir.

**Başarılı Yanıt (200):**
```json
{
  "success": true,
  "room": { ...güncel oda bilgileri }
}
```


---

## 11. Mesaj Sistemi

### 11.1 Mesajları Getir

```
GET /api/chat/rooms/{roomId}/messages
GET /api/chat/rooms/{roomId}/messages?after=2026-06-27T12:00:00.000Z
GET /api/chat/rooms/{roomId}/messages?limit=50
Authorization: Bearer <accessToken> (opsiyonel)
```

| Param | Tip | Varsayılan | Açıklama |
|-------|-----|------------|----------|
| after | ISO string | null | Bu tarihten sonraki mesajlar (polling) |
| limit | int | 100 | İlk yükleme mesaj limiti |

**Başarılı Yanıt (200):**
```json
{
  "messages": [
    {
      "id": "clxx_msg_id",
      "roomId": "clxx_room_id",
      "userId": "clxx_user_id",
      "content": "Merhaba herkese! 👋",
      "createdAt": "2026-06-27T12:00:00.000Z",
      "user": {
        "id": "clxx_user_id",
        "name": "Mesut",
        "role": "user",
        "membership": "gold",
        "nickname": "Mesut42",
        "chatRole": "op",
        "roleSymbol": "@"
      }
    }
  ],
  "roomMuted": false,
  "myPermissions": {
    "role": "op",
    "canMuteUsers": true,
    "canKickUsers": false,
    ...
  },
  "myNickname": "Mesut42"
}
```

> İlk yüklemede mesajlar en eskiden en yeniye sıralı (ASC).  
> `after` ile polling'de de ASC sıralı, max 100 mesaj.

### 11.2 Mesaj Gönder

```
POST /api/chat/rooms/{roomId}/messages
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Merhaba! 😊",
  "nickname": "Mesut42"
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| content | string | ✅ | Mesaj (max 500 karakter) |
| nickname | string | ❌ | Gönderenin takma adı |

**Başarılı Yanıt (200):**
```json
{
  "id": "clxx_new_msg",
  "roomId": "clxx_room_id",
  "userId": "clxx_user_id",
  "content": "Merhaba! 😊",
  "createdAt": "2026-06-27T12:05:00.000Z",
  "user": {
    "id": "clxx_user_id",
    "name": "Mesut",
    "role": "user",
    "membership": "gold",
    "chatRole": "op",
    "roleSymbol": "@"
  }
}
```

**Hata Yanıtları:**
| Status | error | Açıklama |
|--------|-------|----------|
| 400 | `"Message content is required"` | Boş mesaj |
| 400 | `"Message too long (max 500 characters)"` | Çok uzun |
| 403 | `"You are banned from this room"` | Banlı |
| 403 | `"You are muted in this room"` | Susturulmuş |
| 403 | `"Room is muted. Only users with voice (+) or higher can speak."` | Oda sessiz modda |

### 11.3 Mesaj Silme

**Tek mesaj sil (op+):**
```
DELETE /api/chat/rooms/{roomId}/messages?messageId=clxx_msg_id
Authorization: Bearer <accessToken>
```

**Yanıt:**
```json
{ "success": true, "deletedUserId": "clxx_user_id" }
```

**Tüm mesajları temizle (op+):**
```
DELETE /api/chat/rooms/{roomId}/messages
Authorization: Bearer <accessToken>
```

**Yanıt:**
```json
{ "success": true }
```

### 11.4 Sistem Mesajları Formatları

| Prefix | Açıklama | Örnek |
|--------|----------|-------|
| `[SYSTEM_JOIN]` | Normal kullanıcı girişi | `[SYSTEM_JOIN]Mesut` |
| `[SYSTEM_VIP_JOIN:ADMIN]` | Admin girişi | `[SYSTEM_VIP_JOIN:ADMIN]%Mesut` |
| `[SYSTEM_VIP_JOIN:OWNER]` | Oda sahibi girişi | `[SYSTEM_VIP_JOIN:OWNER]👑Mesut` |
| `[SYSTEM_VIP_JOIN:FOUNDER]` | Kurucu girişi | `[SYSTEM_VIP_JOIN:FOUNDER]~Mesut` |
| `[SYSTEM_VIP_JOIN:MODERATOR]` | Moderatör girişi | `[SYSTEM_VIP_JOIN:MODERATOR]&Mesut` |
| `[SYSTEM_VIP_JOIN:OP]` | Operatör girişi | `[SYSTEM_VIP_JOIN:OP]@Mesut` |
| `[SYSTEM_VIP_JOIN:GOLD]` | Gold üye girişi | `[SYSTEM_VIP_JOIN:GOLD]Mesut` |
| `[SYSTEM_VIP_JOIN:DIAMOND]` | Diamond üye girişi | `[SYSTEM_VIP_JOIN:DIAMOND]Mesut` |
| `[SYSTEM_VIP_JOIN:PREMIUM]` | Premium üye girişi | `[SYSTEM_VIP_JOIN:PREMIUM]Mesut` |
| `[SYSTEM_LEAVE]` | Ayrılma | `[SYSTEM_LEAVE]Mesut` |
| `🎁` | Hediye mesajı | `🎁 Ali → Ayşe: 🌹 Gül [50 💎]` |
| `🎶` | Müzik çalıyor | `🎶 Şu an çalıyor: Never Gonna...` |
| `🎧` | DJ sıraya ekledi | `🎧 DJ Ali sıraya şarkı ekledi: ...` |
| `🎵` | Şarkı isteği | `🎵 Ali şarkı isteği gönderdi: ... [10 💎 🎧]` |
| `[ANNOUNCEMENT]` | Duyuru | `[ANNOUNCEMENT]Yarın etkinlik var!` |
| `[SONG_REQUEST_PAID]` | Ücretli istek (gizli) | İç format, kullanıcıya gösterilmez |
| `[SONG_REQUEST_FREE]` | Ücretsiz istek (gizli) | İç format, kullanıcıya gösterilmez |

### 11.5 Yazıyor Göstergesi

**Durum Güncelleme:**
```
POST /api/chat/rooms/{roomId}/typing
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{ "isTyping": true }
```

**Yanıt:**
```json
{ "success": true }
```

**Yazan Kullanıcıları Getir:**
```
GET /api/chat/rooms/{roomId}/typing
```

```json
{
  "typingUsers": [
    { "id": "clxx_user", "name": "Ali" }
  ]
}
```

> Typing 3 saniye sonra otomatik olarak düşer. SSE'de de `typing` event'i gönderilir.

---

## 12. Müzik Sistemi

### 12.1 YouTube Arama

```
GET /api/youtube/search?q=tarkan+kuzu+kuzu
Authorization: Bearer <accessToken>
```

| Param | Tip | Zorunlu | Açıklama |
|-------|-----|---------|----------|
| q | string | ✅ | Arama terimi (min 2 karakter) |

**Başarılı Yanıt (200):**
```json
{
  "videos": [
    {
      "id": "dQw4w9WgXcQ",
      "title": "Tarkan - Kuzu Kuzu",
      "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hq720.jpg",
      "duration": "3:45",
      "channel": "Tarkan",
      "views": 150000000
    }
  ]
}
```

### 12.2 Şarkı İsteği Gönder

```
POST /api/chat/rooms/{roomId}/song-request
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "videoId": "dQw4w9WgXcQ",
  "title": "Tarkan - Kuzu Kuzu",
  "duration": "3:45",
  "requestType": "audio",
  "dedication": "Ayşe'ye",
  "note": "Güzel şarkı"
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| videoId | string | ✅ | YouTube video ID |
| title | string | ✅ | Şarkı adı |
| duration | string | ❌ | Süre (max 6 dakika zorunlu) |
| requestType | string | ❌ | `"audio"` (10💎) veya `"video"` (20💎) |
| dedication | string | ❌ | İthaf |
| note | string | ❌ | Not |
| priority | boolean | ❌ | true → mevcut şarkıyı durdurup bunu çal |

**Maliyet:**
| Tip | Maliyet |
|-----|---------|
| Audio (🎧) | 10 jeton |
| Video (🎬) | 20 jeton |

> Staff (admin/yönetici) ücretsiz gönderir.

**Başarılı Yanıt (200):**
```json
{
  "success": true,
  "newBalance": 490,
  "queued": true,
  "startedImmediately": false,
  "queuePosition": 3,
  "playing": true,
  "nowPlaying": {
    "videoId": "abc123",
    "title": "Mevcut Şarkı",
    "startedAt": "2026-06-27T12:00:00.000Z",
    "duration": "4:00"
  },
  "musicUrl": "https://pipedapi.kavin.rocks/...",
  "queue": [...],
  "musicQueue": [...],
  "queueLength": 3
}
```

**Hata Yanıtları:**
| Status | error |
|--------|-------|
| 400 | `"Şarkı bilgisi eksik"` |
| 400 | `"Şarkı 6 dakikadan uzun olamaz. Daha kısa bir şarkı seçin."` |
| 400 | `"Yetersiz jeton. 10 jeton gerekiyor."` |

### 12.3 Şu An Çalan Müzik

```
GET /api/chat/rooms/{roomId}/music
```

**Başarılı Yanıt (200):**
```json
{
  "videoId": "dQw4w9WgXcQ",
  "title": "Tarkan - Kuzu Kuzu",
  "startedAt": "2026-06-27T12:00:00.000Z",
  "duration": "3:45",
  "requestType": "audio",
  "playing": true,
  "nowPlaying": {
    "videoId": "dQw4w9WgXcQ",
    "title": "Tarkan - Kuzu Kuzu",
    "startedAt": "2026-06-27T12:00:00.000Z",
    "duration": "3:45"
  },
  "musicUrl": "https://pipedapi.kavin.rocks/...",
  "musicQueue": [...]
}
```

> Müzik yoksa `videoId: null`, `playing: false`

### 12.4 Müzik Çal (DJ)

```
POST /api/chat/rooms/{roomId}/music
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "videoId": "dQw4w9WgXcQ",
  "title": "Tarkan - Kuzu Kuzu",
  "duration": "3:45"
}
```

**Davranış:**
- Müzik çalmıyorsa → hemen çalmaya başlar
- Müzik çalıyorsa → sıraya ekler (FREE request olarak)

**Yanıt:**
```json
{ "success": true, "queued": false }
// veya
{ "success": true, "queued": true }
```

### 12.5 Müzik Durdur

```
DELETE /api/chat/rooms/{roomId}/music
Authorization: Bearer <accessToken>
```

**Davranış:**
- Mevcut şarkıyı durdurur
- Sırada şarkı varsa otomatik olarak sonraki çalar (auto-advance)

**Yanıt:**
```json
{ "success": true, "autoAdvanced": true }
```

### 12.6 Sıradaki Şarkıyı Çal

```
PATCH /api/chat/rooms/{roomId}/song-request
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{ "requestId": "clxx_request_msg_id" }
```

### 12.7 Kuyruk

```
GET /api/chat/rooms/{roomId}/song-request
GET /api/chat/rooms/{roomId}/music-queue
```

İkisi de aynı veriyi döner:
```json
{
  "queue": [...],
  "playing": true,
  "nowPlaying": { ... },
  "musicUrl": "...",
  "musicQueue": [...],
  "queueLength": 3,
  "requestCosts": { "audio": 10, "video": 20 }
}
```

### 12.8 Otomatik İlerleme (Auto-Advance)

Sunucu tarafında şarkı süresi bitince:
1. `GET /music` endpoint'i kontrol eder (elapsed > duration + 5s buffer)
2. Sırada şarkı varsa → sonraki çalar
3. Sıra boşsa → müziği durdurur
4. DJ update SSE event'i emit edilir

### 12.9 Müzik URL Çözümleme

```
1. Piped API dene: https://pipedapi.kavin.rocks/streams/{videoId}
   → audioStreams'den audio/ ile başlayan stream URL al
   → 3 saniye timeout
2. Piped başarısızsa: https://www.youtube.com/watch?v={videoId}
```

### 12.10 Gelir Dağılımı

**Müzik İsteği (10 jeton):**

| Oda Tipi | Oda Sahibi Payı | Site Payı |
|----------|-----------------|-----------|
| FREE | %0 (0 jeton) | %100 (10 jeton) |
| NORMAL | %50 (5 jeton) | %50 (5 jeton) |
| VIP | %70 (7 jeton) | %30 (3 jeton) |

---

## 13. Veritabanı Modelleri

### 13.1 ChatRoom

```prisma
model ChatRoom {
  id                    String         @id @default(cuid())
  slug                  String         @unique
  nameEn                String
  nameTr                String
  descEn                String
  descTr                String
  icon                  String
  isActive              Boolean        @default(true)
  isMuted               Boolean        @default(false)
  ownerId               String?
  giftCommissionPercent Int            @default(0)
  giftBeneficiaryId     String?
  backgroundImage       String?
  bannedWords           String?        @db.Text
  currentMusicVideoId   String?
  currentMusicTitle     String?
  currentMusicStartedAt DateTime?
  currentMusicDuration  String?
  djUserIds             String?        @db.Text  // JSON array
  activeDjId            String?
  whitelistedWords      String?        @db.Text
  roomType              String         @default("FREE")  // FREE, NORMAL, VIP
  password              String?
  welcomeMessage        String?
  pinnedAnnouncement    String?
  tags                  String?
  bannerImage           String?
  createdAt             DateTime       @default(now())
}
```

### 13.2 ChatPresence

```prisma
model ChatPresence {
  id         String    @id @default(cuid())
  roomId     String
  userId     String
  nickname   String?
  isTyping   Boolean   @default(false)
  lastTyping DateTime?
  lastSeen   DateTime  @default(now())
  seatIndex  Int       @default(-1)  // -1=koltuk yok, 0-14=koltuk pozisyonu

  @@unique([roomId, userId])
  @@index([roomId])
  @@map("chat_presences")
}
```

### 13.3 ChatMessage

```prisma
model ChatMessage {
  id        String   @id @default(cuid())
  roomId    String
  userId    String
  content   String
  createdAt DateTime @default(now())

  @@index([roomId, createdAt])
  @@index([userId])
  @@map("chat_messages")
}
```

### 13.4 ChatUserRole

```prisma
model ChatUserRole {
  id        String   @id @default(cuid())
  roomId    String
  userId    String
  role      String   // superadmin, founder, sop, op, voice
  grantedBy String?
  createdAt DateTime @default(now())

  @@unique([roomId, userId])
  @@index([roomId])
  @@map("chat_user_roles")
}
```

### 13.5 ChatMute

```prisma
model ChatMute {
  id        String    @id @default(cuid())
  roomId    String
  userId    String
  mutedBy   String
  reason    String?
  expiresAt DateTime?
  createdAt DateTime  @default(now())

  @@unique([roomId, userId])
  @@index([roomId])
  @@map("chat_mutes")
}
```

### 13.6 ChatBan

```prisma
model ChatBan {
  id        String    @id @default(cuid())
  roomId    String
  userId    String
  bannedBy  String
  reason    String?
  expiresAt DateTime?
  createdAt DateTime  @default(now())

  @@unique([roomId, userId])
  @@index([roomId])
  @@map("chat_bans")
}
```

### 13.7 ChatRoomGift

```prisma
model ChatRoomGift {
  id               String   @id @default(cuid())
  roomId           String
  senderId         String
  recipientId      String
  giftTypeId       String
  quantity         Int      @default(1)
  totalPrice       Int
  currencyType     String   @default("jeton")
  commissionAmount Int      @default(0)
  beneficiaryId    String?
  createdAt        DateTime @default(now())

  @@index([roomId])
  @@index([senderId])
  @@index([recipientId])
  @@index([roomId, senderId])
  @@map("chat_room_gifts")
}
```

### 13.8 VoiceSession

```prisma
model VoiceSession {
  id        String   @id @default(cuid())
  roomId    String
  userId    String
  userName  String
  agoraUid  Int      @default(0)
  joinedAt  DateTime @default(now())
  lastPing  DateTime @default(now())
  isActive  Boolean  @default(true)

  @@unique([roomId, userId])
  @@index([roomId])
  @@index([isActive])
  @@index([lastPing])
  @@map("voice_sessions")
}
```

### 13.9 RoomRevenueLog

```prisma
model RoomRevenueLog {
  id              String   @id @default(cuid())
  roomId          String
  eventType       String   // gift, music_request
  totalAmount     Int
  receiverAmount  Int      @default(0)
  ownerAmount     Int      @default(0)
  siteAmount      Int      @default(0)
  senderId        String?
  receiverId      String?
  ownerId         String?
  metadata        String?  @db.Text  // JSON
  createdAt       DateTime @default(now())

  @@index([roomId, createdAt])
  @@index([eventType])
  @@map("room_revenue_logs")
}
```

### 13.10 İlişki Diyagramı

```
User ─┬─ 1:N ─── ChatPresence (hangi odalarda?)
      ├─ 1:N ─── ChatMessage
      ├─ 1:N ─── ChatUserRole (her odada farklı rol)
      ├─ 1:N ─── ChatMute
      ├─ 1:N ─── ChatBan
      ├─ 1:N ─── VoiceSession
      ├─ 1:N ─── ChatRoomGift (sender/recipient)
      └─ 1:N ─── ChatRoom (owner olarak)

ChatRoom ─┬─ 1:N ─── ChatPresence
           ├─ 1:N ─── ChatMessage
           ├─ 1:N ─── ChatUserRole
           ├─ 1:N ─── ChatMute
           ├─ 1:N ─── ChatBan
           ├─ 1:N ─── VoiceSession
           ├─ 1:N ─── ChatRoomGift
           └─ 1:N ─── RoomRevenueLog
```


---

## 11. Mesaj Sistemi

### 11.1 Mesajları Getir

```
GET /api/chat/rooms/{roomId}/messages
GET /api/chat/rooms/{roomId}/messages?after=2026-06-27T12:00:00.000Z
GET /api/chat/rooms/{roomId}/messages?limit=50
Authorization: Bearer <accessToken> (opsiyonel)
```

| Param | Tip | Varsayılan | Açıklama |
|-------|-----|------------|----------|
| after | ISO string | null | Bu tarihten sonraki mesajlar (polling) |
| limit | int | 100 | İlk yükleme mesaj limiti |

**Başarılı Yanıt (200):**
```json
{
  "messages": [
    {
      "id": "clxx_msg_id",
      "roomId": "clxx_room_id",
      "userId": "clxx_user_id",
      "content": "Merhaba herkese! 👋",
      "createdAt": "2026-06-27T12:00:00.000Z",
      "user": {
        "id": "clxx_user_id",
        "name": "Mesut",
        "role": "user",
        "membership": "gold",
        "nickname": "Mesut42",
        "chatRole": "op",
        "roleSymbol": "@"
      }
    }
  ],
  "roomMuted": false,
  "myPermissions": {
    "role": "op",
    "canMuteUsers": true,
    "canKickUsers": false,
    ...
  },
  "myNickname": "Mesut42"
}
```

> İlk yüklemede mesajlar en eskiden en yeniye sıralı (ASC).  
> `after` ile polling'de de ASC sıralı, max 100 mesaj.

### 11.2 Mesaj Gönder

```
POST /api/chat/rooms/{roomId}/messages
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Merhaba! 😊",
  "nickname": "Mesut42"
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| content | string | ✅ | Mesaj (max 500 karakter) |
| nickname | string | ❌ | Gönderenin takma adı |

**Başarılı Yanıt (200):**
```json
{
  "id": "clxx_new_msg",
  "roomId": "clxx_room_id",
  "userId": "clxx_user_id",
  "content": "Merhaba! 😊",
  "createdAt": "2026-06-27T12:05:00.000Z",
  "user": {
    "id": "clxx_user_id",
    "name": "Mesut",
    "role": "user",
    "membership": "gold",
    "chatRole": "op",
    "roleSymbol": "@"
  }
}
```

**Hata Yanıtları:**
| Status | error | Açıklama |
|--------|-------|----------|
| 400 | `"Message content is required"` | Boş mesaj |
| 400 | `"Message too long (max 500 characters)"` | Çok uzun |
| 403 | `"You are banned from this room"` | Banlı |
| 403 | `"You are muted in this room"` | Susturulmuş |
| 403 | `"Room is muted. Only users with voice (+) or higher can speak."` | Oda sessiz modda |

### 11.3 Mesaj Silme

**Tek mesaj sil (op+):**
```
DELETE /api/chat/rooms/{roomId}/messages?messageId=clxx_msg_id
Authorization: Bearer <accessToken>
```

**Yanıt:**
```json
{ "success": true, "deletedUserId": "clxx_user_id" }
```

**Tüm mesajları temizle (op+):**
```
DELETE /api/chat/rooms/{roomId}/messages
Authorization: Bearer <accessToken>
```

**Yanıt:**
```json
{ "success": true }
```

### 11.4 Sistem Mesajları Formatları

| Prefix | Açıklama | Örnek |
|--------|----------|-------|
| `[SYSTEM_JOIN]` | Normal kullanıcı girişi | `[SYSTEM_JOIN]Mesut` |
| `[SYSTEM_VIP_JOIN:ADMIN]` | Admin girişi | `[SYSTEM_VIP_JOIN:ADMIN]%Mesut` |
| `[SYSTEM_VIP_JOIN:OWNER]` | Oda sahibi girişi | `[SYSTEM_VIP_JOIN:OWNER]👑Mesut` |
| `[SYSTEM_VIP_JOIN:FOUNDER]` | Kurucu girişi | `[SYSTEM_VIP_JOIN:FOUNDER]~Mesut` |
| `[SYSTEM_VIP_JOIN:MODERATOR]` | Moderatör girişi | `[SYSTEM_VIP_JOIN:MODERATOR]&Mesut` |
| `[SYSTEM_VIP_JOIN:OP]` | Operatör girişi | `[SYSTEM_VIP_JOIN:OP]@Mesut` |
| `[SYSTEM_VIP_JOIN:GOLD]` | Gold üye girişi | `[SYSTEM_VIP_JOIN:GOLD]Mesut` |
| `[SYSTEM_VIP_JOIN:DIAMOND]` | Diamond üye girişi | `[SYSTEM_VIP_JOIN:DIAMOND]Mesut` |
| `[SYSTEM_VIP_JOIN:PREMIUM]` | Premium üye girişi | `[SYSTEM_VIP_JOIN:PREMIUM]Mesut` |
| `[SYSTEM_LEAVE]` | Ayrılma | `[SYSTEM_LEAVE]Mesut` |
| `🎁` | Hediye mesajı | `🎁 Ali → Ayşe: 🌹 Gül [50 💎]` |
| `🎶` | Müzik çalıyor | `🎶 Şu an çalıyor: Never Gonna...` |
| `🎧` | DJ sıraya ekledi | `🎧 DJ Ali sıraya şarkı ekledi: ...` |
| `🎵` | Şarkı isteği | `🎵 Ali şarkı isteği gönderdi: ... [10 💎 🎧]` |
| `[ANNOUNCEMENT]` | Duyuru | `[ANNOUNCEMENT]Yarın etkinlik var!` |
| `[SONG_REQUEST_PAID]` | Ücretli istek (gizli) | İç format, kullanıcıya gösterilmez |
| `[SONG_REQUEST_FREE]` | Ücretsiz istek (gizli) | İç format, kullanıcıya gösterilmez |

### 11.5 Yazıyor Göstergesi

**Durum Güncelleme:**
```
POST /api/chat/rooms/{roomId}/typing
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{ "isTyping": true }
```

**Yanıt:**
```json
{ "success": true }
```

**Yazan Kullanıcıları Getir:**
```
GET /api/chat/rooms/{roomId}/typing
```

```json
{
  "typingUsers": [
    { "id": "clxx_user", "name": "Ali" }
  ]
}
```

> Typing 3 saniye sonra otomatik olarak düşer. SSE'de de `typing` event'i gönderilir.

---

## 12. Müzik Sistemi

### 12.1 YouTube Arama

```
GET /api/youtube/search?q=tarkan+kuzu+kuzu
Authorization: Bearer <accessToken>
```

| Param | Tip | Zorunlu | Açıklama |
|-------|-----|---------|----------|
| q | string | ✅ | Arama terimi (min 2 karakter) |

**Başarılı Yanıt (200):**
```json
{
  "videos": [
    {
      "id": "dQw4w9WgXcQ",
      "title": "Tarkan - Kuzu Kuzu",
      "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hq720.jpg",
      "duration": "3:45",
      "channel": "Tarkan",
      "views": 150000000
    }
  ]
}
```

### 12.2 Şarkı İsteği Gönder

```
POST /api/chat/rooms/{roomId}/song-request
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "videoId": "dQw4w9WgXcQ",
  "title": "Tarkan - Kuzu Kuzu",
  "duration": "3:45",
  "requestType": "audio",
  "dedication": "Ayşe'ye",
  "note": "Güzel şarkı"
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| videoId | string | ✅ | YouTube video ID |
| title | string | ✅ | Şarkı adı |
| duration | string | ❌ | Süre (max 6 dakika zorunlu) |
| requestType | string | ❌ | `"audio"` (10💎) veya `"video"` (20💎) |
| dedication | string | ❌ | İthaf |
| note | string | ❌ | Not |
| priority | boolean | ❌ | true → mevcut şarkıyı durdurup bunu çal |

**Maliyet:**
| Tip | Maliyet |
|-----|---------|
| Audio (🎧) | 10 jeton |
| Video (🎬) | 20 jeton |

> Staff (admin/yönetici) ücretsiz gönderir.

**Başarılı Yanıt (200):**
```json
{
  "success": true,
  "newBalance": 490,
  "queued": true,
  "startedImmediately": false,
  "queuePosition": 3,
  "playing": true,
  "nowPlaying": {
    "videoId": "abc123",
    "title": "Mevcut Şarkı",
    "startedAt": "2026-06-27T12:00:00.000Z",
    "duration": "4:00"
  },
  "musicUrl": "https://pipedapi.kavin.rocks/...",
  "queue": [...],
  "musicQueue": [...],
  "queueLength": 3
}
```

**Hata Yanıtları:**
| Status | error |
|--------|-------|
| 400 | `"Şarkı bilgisi eksik"` |
| 400 | `"Şarkı 6 dakikadan uzun olamaz. Daha kısa bir şarkı seçin."` |
| 400 | `"Yetersiz jeton. 10 jeton gerekiyor."` |

### 12.3 Şu An Çalan Müzik

```
GET /api/chat/rooms/{roomId}/music
```

**Başarılı Yanıt (200):**
```json
{
  "videoId": "dQw4w9WgXcQ",
  "title": "Tarkan - Kuzu Kuzu",
  "startedAt": "2026-06-27T12:00:00.000Z",
  "duration": "3:45",
  "requestType": "audio",
  "playing": true,
  "nowPlaying": {
    "videoId": "dQw4w9WgXcQ",
    "title": "Tarkan - Kuzu Kuzu",
    "startedAt": "2026-06-27T12:00:00.000Z",
    "duration": "3:45"
  },
  "musicUrl": "https://pipedapi.kavin.rocks/...",
  "musicQueue": [...]
}
```

> Müzik yoksa `videoId: null`, `playing: false`

### 12.4 Müzik Çal (DJ)

```
POST /api/chat/rooms/{roomId}/music
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "videoId": "dQw4w9WgXcQ",
  "title": "Tarkan - Kuzu Kuzu",
  "duration": "3:45"
}
```

**Davranış:**
- Müzik çalmıyorsa → hemen çalmaya başlar
- Müzik çalıyorsa → sıraya ekler (FREE request olarak)

**Yanıt:**
```json
{ "success": true, "queued": false }
// veya
{ "success": true, "queued": true }
```

### 12.5 Müzik Durdur

```
DELETE /api/chat/rooms/{roomId}/music
Authorization: Bearer <accessToken>
```

**Davranış:**
- Mevcut şarkıyı durdurur
- Sırada şarkı varsa otomatik olarak sonraki çalar (auto-advance)

**Yanıt:**
```json
{ "success": true, "autoAdvanced": true }
```

### 12.6 Sıradaki Şarkıyı Çal

```
PATCH /api/chat/rooms/{roomId}/song-request
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{ "requestId": "clxx_request_msg_id" }
```

### 12.7 Kuyruk

```
GET /api/chat/rooms/{roomId}/song-request
GET /api/chat/rooms/{roomId}/music-queue
```

İkisi de aynı veriyi döner:
```json
{
  "queue": [...],
  "playing": true,
  "nowPlaying": { ... },
  "musicUrl": "...",
  "musicQueue": [...],
  "queueLength": 3,
  "requestCosts": { "audio": 10, "video": 20 }
}
```

### 12.8 Otomatik İlerleme (Auto-Advance)

Sunucu tarafında şarkı süresi bitince:
1. `GET /music` endpoint'i kontrol eder (elapsed > duration + 5s buffer)
2. Sırada şarkı varsa → sonraki çalar
3. Sıra boşsa → müziği durdurur
4. DJ update SSE event'i emit edilir

### 12.9 Müzik URL Çözümleme

```
1. Piped API dene: https://pipedapi.kavin.rocks/streams/{videoId}
   → audioStreams'den audio/ ile başlayan stream URL al
   → 3 saniye timeout
2. Piped başarısızsa: https://www.youtube.com/watch?v={videoId}
```

### 12.10 Gelir Dağılımı

**Müzik İsteği (10 jeton):**

| Oda Tipi | Oda Sahibi Payı | Site Payı |
|----------|-----------------|-----------|
| FREE | %0 (0 jeton) | %100 (10 jeton) |
| NORMAL | %50 (5 jeton) | %50 (5 jeton) |
| VIP | %70 (7 jeton) | %30 (3 jeton) |

---

## 13. Veritabanı Modelleri

### 13.1 ChatRoom

```prisma
model ChatRoom {
  id                    String         @id @default(cuid())
  slug                  String         @unique
  nameEn                String
  nameTr                String
  descEn                String
  descTr                String
  icon                  String
  isActive              Boolean        @default(true)
  isMuted               Boolean        @default(false)
  ownerId               String?
  giftCommissionPercent Int            @default(0)
  giftBeneficiaryId     String?
  backgroundImage       String?
  bannedWords           String?        @db.Text
  currentMusicVideoId   String?
  currentMusicTitle     String?
  currentMusicStartedAt DateTime?
  currentMusicDuration  String?
  djUserIds             String?        @db.Text  // JSON array
  activeDjId            String?
  whitelistedWords      String?        @db.Text
  roomType              String         @default("FREE")  // FREE, NORMAL, VIP
  password              String?
  welcomeMessage        String?
  pinnedAnnouncement    String?
  tags                  String?
  bannerImage           String?
  createdAt             DateTime       @default(now())
}
```

### 13.2 ChatPresence

```prisma
model ChatPresence {
  id         String    @id @default(cuid())
  roomId     String
  userId     String
  nickname   String?
  isTyping   Boolean   @default(false)
  lastTyping DateTime?
  lastSeen   DateTime  @default(now())
  seatIndex  Int       @default(-1)  // -1=koltuk yok, 0-14=koltuk pozisyonu

  @@unique([roomId, userId])
  @@index([roomId])
  @@map("chat_presences")
}
```

### 13.3 ChatMessage

```prisma
model ChatMessage {
  id        String   @id @default(cuid())
  roomId    String
  userId    String
  content   String
  createdAt DateTime @default(now())

  @@index([roomId, createdAt])
  @@index([userId])
  @@map("chat_messages")
}
```

### 13.4 ChatUserRole

```prisma
model ChatUserRole {
  id        String   @id @default(cuid())
  roomId    String
  userId    String
  role      String   // superadmin, founder, sop, op, voice
  grantedBy String?
  createdAt DateTime @default(now())

  @@unique([roomId, userId])
  @@index([roomId])
  @@map("chat_user_roles")
}
```

### 13.5 ChatMute

```prisma
model ChatMute {
  id        String    @id @default(cuid())
  roomId    String
  userId    String
  mutedBy   String
  reason    String?
  expiresAt DateTime?
  createdAt DateTime  @default(now())

  @@unique([roomId, userId])
  @@index([roomId])
  @@map("chat_mutes")
}
```

### 13.6 ChatBan

```prisma
model ChatBan {
  id        String    @id @default(cuid())
  roomId    String
  userId    String
  bannedBy  String
  reason    String?
  expiresAt DateTime?
  createdAt DateTime  @default(now())

  @@unique([roomId, userId])
  @@index([roomId])
  @@map("chat_bans")
}
```

### 13.7 ChatRoomGift

```prisma
model ChatRoomGift {
  id               String   @id @default(cuid())
  roomId           String
  senderId         String
  recipientId      String
  giftTypeId       String
  quantity         Int      @default(1)
  totalPrice       Int
  currencyType     String   @default("jeton")
  commissionAmount Int      @default(0)
  beneficiaryId    String?
  createdAt        DateTime @default(now())

  @@index([roomId])
  @@index([senderId])
  @@index([recipientId])
  @@index([roomId, senderId])
  @@map("chat_room_gifts")
}
```

### 13.8 VoiceSession

```prisma
model VoiceSession {
  id        String   @id @default(cuid())
  roomId    String
  userId    String
  userName  String
  agoraUid  Int      @default(0)
  joinedAt  DateTime @default(now())
  lastPing  DateTime @default(now())
  isActive  Boolean  @default(true)

  @@unique([roomId, userId])
  @@index([roomId])
  @@index([isActive])
  @@index([lastPing])
  @@map("voice_sessions")
}
```

### 13.9 RoomRevenueLog

```prisma
model RoomRevenueLog {
  id              String   @id @default(cuid())
  roomId          String
  eventType       String   // gift, music_request
  totalAmount     Int
  receiverAmount  Int      @default(0)
  ownerAmount     Int      @default(0)
  siteAmount      Int      @default(0)
  senderId        String?
  receiverId      String?
  ownerId         String?
  metadata        String?  @db.Text  // JSON
  createdAt       DateTime @default(now())

  @@index([roomId, createdAt])
  @@index([eventType])
  @@map("room_revenue_logs")
}
```

### 13.10 İlişki Diyagramı

```
User ─┬─ 1:N ─── ChatPresence (hangi odalarda?)
      ├─ 1:N ─── ChatMessage
      ├─ 1:N ─── ChatUserRole (her odada farklı rol)
      ├─ 1:N ─── ChatMute
      ├─ 1:N ─── ChatBan
      ├─ 1:N ─── VoiceSession
      ├─ 1:N ─── ChatRoomGift (sender/recipient)
      └─ 1:N ─── ChatRoom (owner olarak)

ChatRoom ─┬─ 1:N ─── ChatPresence
           ├─ 1:N ─── ChatMessage
           ├─ 1:N ─── ChatUserRole
           ├─ 1:N ─── ChatMute
           ├─ 1:N ─── ChatBan
           ├─ 1:N ─── VoiceSession
           ├─ 1:N ─── ChatRoomGift
           └─ 1:N ─── RoomRevenueLog
```



---

## 14. Is Mantigi (Business Logic)

### 14.1 Hediye Gonderme Akisi

```
1. POST /api/chat/rooms/{roomId}/gifts
   Auth dogrula
   recipientId yoksa oda sahibine gonder
   Kendine gonderemezsin kontrolu
   Oda var mi kontrol
   GiftType var mi kontrol
   Bakiye kontrol (staff atlar)
   calculateGiftDistribution(price, roomType) cagir
     receiverGross = price * receiverPct / 100  (varsayilan %70)
     ownerGross = price * ownerPct / 100  (varsayilan %30, FREE=0)
     receiverCommission = receiverGross * commissionPct / 100  (%50)
     ownerCommission = ownerGross * commissionPct / 100  (%50)
     receiverNet = receiverGross - receiverCommission
     ownerNet = ownerGross - ownerCommission
     siteAmount = totalAmount - receiverNet - ownerNet
   Gonderenden dus (JetonTransaction kaydet)
   Aliciya net ekle (admin gonderici degilse)
   Oda sahibine net ekle (NORMAL/VIP, admin degilse)
   Ajans komisyonu isle (processAgencyCommission)
   RoomRevenueLog kaydet
   ChatRoomGift kaydi olustur
   Sistem mesaji olustur
   Bildirim gonder (createNotificationWithPush)
   Event announcement tetikle
   PK Battle varsa skoru guncelle
   emitChatEvent(roomId, 'gift', ...) SSE'ye aktar
```

### 14.2 Hediye Gelir Ornegi (100 jeton, NORMAL oda)

```
Toplam: 100 jeton
  Alici brut: 70 jeton (%70)
    Komisyon: 35 jeton (%50)
    Net: 35 jeton -> alicinin bakiyesine
  Oda sahibi brut: 30 jeton (%30)
    Komisyon: 15 jeton (%50)
    Net: 15 jeton -> sahibinin bakiyesine
  Site: 50 jeton (komisyonlar toplami)
```

### 14.3 Mesaj Gonderme Akisi

```
1. POST /api/chat/rooms/{roomId}/messages
   Auth dogrula
   canUserSpeak(roomId, userId) kontrol
     Ban kontrolu (varsa ve aktifse -> banned)
     Mute kontrolu (varsa ve aktifse -> muted)
     Room muted kontrolu (oda sessizse -> voice+ gerekli)
   Icerik dogrulama (bos degil, max 500 karakter)
   Oda var mi kontrol
   getUserRole -> roleSymbol al
   ChatMessage olustur
   ChatPresence guncelle (lastSeen)
   emitChatEvent(roomId, 'message', ...) -> SSE'ye aktar
```

### 14.4 Odaya Giris Akisi (Sunucu Tarafi)

```
1. POST /api/chat/rooms/{roomId}/presence
   Auth dogrula
   sendBeacon delete mi? -> lastSeen=epoch, cik
   isUserBanned kontrolu
   Yeni giris mi? (lastSeen > 30s eski)
     Evet -> Oda kapasitesi kontrol (FREE:15, NORMAL:100, VIP:500)
   Koltuk dogrulama (0-14, bos mu?)
   ChatPresence upsert
   Yeni giris ise:
     Aktivite logu
     Event announcement
     5dk icinde daha once duyurulmadiysa:
       getUserSpecialRole -> giris tipi belirle
       Eski join mesajlarini sil
       [SYSTEM_JOIN] veya [SYSTEM_VIP_JOIN:TYPE] mesaji olustur
   Aktif kullanici listesini dondur
```

### 14.5 Event Bus Mimarisi

```
API Route -> emitChatEvent(roomId, type, data) -> In-memory buffer
SSE Stream (2s polling) -> getChatEventsSince(roomId, lastTimestamp) -> Client'a gonder

Buffer Limitleri:
- MAX_EVENTS_PER_ROOM: 200
- EVENT_TTL_MS: 2 dakika
- Temizlik: Her 30 saniyede
```

### 14.6 DJ Event Store

```
API Route -> emitDjUpdate(roomId) -> buildDjPayload() -> In-memory store
SSE Stream -> getLatestDjEvent(roomId, sinceTimestamp) -> Client'a gonder

Temizlik: Her 5 dakikada, 5dk'dan eski eventler silinir
```

### 14.7 Oda Tipi Ozellikleri

**FREE:**
open_room, microphone, chat, emoji, music_request, room_image, room_name, basic_moderation, share_room

**NORMAL (FREE +):**
gift_income, music_income, moderator, room_description, room_tags, room_banner, room_password, room_stats, daily_report, weekly_report, welcome_message, pinned_announcement, mute_user, ban_user, room_ranking

**VIP (NORMAL +):**
vip_badge, gold_name, animated_background, 3d_background, premium_entrance, crystal_ball, custom_themes, vip_frame, homepage_showcase, sponsor_support, banner_upload, multi_moderator, vip_sounds, custom_gift_animations, ai_assistant, auto_dj, room_raffle, gift_leaderboard, bulk_notification, push_on_open, vip_stats, monthly_report, mini_games, room_poll


---

## 15. Flutter Entegrasyon Rehberi

### 15.1 API Service Sinifi

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class VoiceRoomApi {
  static const String baseUrl = 'https://canlifal.com';
  String? accessToken;
  String? refreshTokenVal;

  Map<String, String> get authHeaders => {
    'Content-Type': 'application/json',
    if (accessToken != null) 'Authorization': 'Bearer $accessToken',
  };

  // === Auth ===
  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/auth/mobile-login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode == 200) {
      accessToken = data['accessToken'];
      refreshTokenVal = data['refreshToken'];
    }
    return data;
  }

  Future<bool> doRefreshToken() async {
    if (refreshTokenVal == null) return false;
    final res = await http.post(
      Uri.parse('$baseUrl/api/auth/mobile-refresh'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': refreshTokenVal}),
    );
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      accessToken = data['accessToken'];
      refreshTokenVal = data['refreshToken'];
      return true;
    }
    return false;
  }

  // === Otomatik Retry (401 -> refresh -> retry) ===
  Future<http.Response> authReq(
    String method, String path, {Map<String, dynamic>? body}
  ) async {
    var res = await rawReq(method, path, body: body);
    if (res.statusCode == 401) {
      final ok = await doRefreshToken();
      if (ok) res = await rawReq(method, path, body: body);
    }
    return res;
  }

  Future<http.Response> rawReq(
    String method, String path, {Map<String, dynamic>? body}
  ) async {
    final uri = Uri.parse('$baseUrl$path');
    switch (method) {
      case 'GET': return http.get(uri, headers: authHeaders);
      case 'POST': return http.post(uri, headers: authHeaders, body: body != null ? jsonEncode(body) : null);
      case 'PATCH': return http.patch(uri, headers: authHeaders, body: body != null ? jsonEncode(body) : null);
      case 'DELETE': return http.delete(uri, headers: authHeaders);
      default: throw Exception('Unknown method');
    }
  }

  // === Oda Islemleri ===
  Future<List<dynamic>> getRooms() async {
    final res = await http.get(Uri.parse('$baseUrl/api/chat/rooms?withCounts=true'));
    return jsonDecode(res.body);
  }

  Future<Map<String, dynamic>> createRoom({
    required String name, required String description,
    required String icon, required String paymentType,
    String roomType = 'FREE',
  }) async {
    final res = await authReq('POST', '/api/chat/rooms/create', body: {
      'name': name, 'description': description, 'icon': icon,
      'paymentType': paymentType, 'roomType': roomType,
    });
    return jsonDecode(res.body);
  }

  // === Presence ===
  Future<Map<String, dynamic>> joinRoom(String roomId, {String? nickname, int? seatIndex}) async {
    final body = <String, dynamic>{};
    if (nickname != null) body['nickname'] = nickname;
    if (seatIndex != null) body['seatIndex'] = seatIndex;
    final res = await authReq('POST', '/api/chat/rooms/$roomId/presence', body: body);
    return jsonDecode(res.body);
  }

  Future<void> heartbeat(String roomId) async {
    await authReq('POST', '/api/chat/rooms/$roomId/presence', body: {});
  }

  Future<void> leaveRoom(String roomId) async {
    await authReq('DELETE', '/api/chat/rooms/$roomId/presence?leave=1');
  }

  // === Mesajlar ===
  Future<Map<String, dynamic>> getMessages(String roomId, {String? after, int limit = 100}) async {
    var path = '/api/chat/rooms/$roomId/messages?limit=$limit';
    if (after != null) path += '&after=$after';
    final res = await authReq('GET', path);
    return jsonDecode(res.body);
  }

  Future<Map<String, dynamic>> sendMessage(String roomId, String content) async {
    final res = await authReq('POST', '/api/chat/rooms/$roomId/messages', body: {'content': content});
    return jsonDecode(res.body);
  }

  // === Voice ===
  Future<void> joinVoice(String roomId) async {
    await authReq('POST', '/api/chat/rooms/$roomId/voice', body: {'type': 'join'});
  }

  Future<void> leaveVoice(String roomId) async {
    await authReq('POST', '/api/chat/rooms/$roomId/voice', body: {'type': 'leave'});
  }

  // === Seats ===
  Future<Map<String, dynamic>> updateSeat(String roomId, int seatIndex, {String? targetUserId}) async {
    final body = <String, dynamic>{'seatIndex': seatIndex};
    if (targetUserId != null) body['targetUserId'] = targetUserId;
    final res = await authReq('PATCH', '/api/chat/rooms/$roomId/seats', body: body);
    return jsonDecode(res.body);
  }

  // === Hediye ===
  Future<Map<String, dynamic>> sendGift(String roomId, {
    required String giftTypeId, required String recipientId, int quantity = 1,
  }) async {
    final res = await authReq('POST', '/api/chat/rooms/$roomId/gifts', body: {
      'giftTypeId': giftTypeId, 'recipientId': recipientId, 'quantity': quantity,
    });
    return jsonDecode(res.body);
  }

  // === Muzik ===
  Future<List<dynamic>> searchYouTube(String query) async {
    final res = await authReq('GET', '/api/youtube/search?q=${Uri.encodeComponent(query)}');
    return (jsonDecode(res.body)['videos'] ?? []) as List;
  }

  Future<Map<String, dynamic>> requestSong(String roomId, {
    required String videoId, required String title,
    String? duration, String requestType = 'audio',
    String? dedication, String? note,
  }) async {
    final res = await authReq('POST', '/api/chat/rooms/$roomId/song-request', body: {
      'videoId': videoId, 'title': title,
      if (duration != null) 'duration': duration,
      'requestType': requestType,
      if (dedication != null) 'dedication': dedication,
      if (note != null) 'note': note,
    });
    return jsonDecode(res.body);
  }

  Future<void> stopMusic(String roomId) async {
    await authReq('DELETE', '/api/chat/rooms/$roomId/music');
  }

  // === Moderasyon ===
  Future<Map<String, dynamic>> moderate(String roomId, {
    required String action, String? targetUserId, String? role,
    String? reason, int? duration, String? message,
  }) async {
    final body = <String, dynamic>{'action': action};
    if (targetUserId != null) body['targetUserId'] = targetUserId;
    if (role != null) body['role'] = role;
    if (reason != null) body['reason'] = reason;
    if (duration != null) body['duration'] = duration;
    if (message != null) body['message'] = message;
    final res = await authReq('POST', '/api/chat/rooms/$roomId/moderation', body: body);
    return jsonDecode(res.body);
  }

  // === Typing ===
  Future<void> setTyping(String roomId, bool isTyping) async {
    await authReq('POST', '/api/chat/rooms/$roomId/typing', body: {'isTyping': isTyping});
  }

  // === DJ ===
  Future<Map<String, dynamic>> manageDj(String roomId, String action, {String? userId}) async {
    final body = <String, dynamic>{'action': action};
    if (userId != null) body['userId'] = userId;
    final res = await authReq('POST', '/api/chat/rooms/$roomId/dj', body: body);
    return jsonDecode(res.body);
  }
}
```

### 15.2 Dart Model Siniflari

```dart
class ChatUserModel {
  final String id;
  final String name;
  final String? nickname;
  final String? image;
  final String? chatRole;
  final String? roleSymbol;
  final int roleLevel;
  final bool isAdmin;
  final int seatIndex;

  ChatUserModel.fromJson(Map<String, dynamic> json)
      : id = json['id'],
        name = json['name'] ?? '',
        nickname = json['nickname'],
        image = json['image'],
        chatRole = json['chatRole'],
        roleSymbol = json['roleSymbol'],
        roleLevel = json['roleLevel'] ?? 0,
        isAdmin = json['isAdmin'] ?? false,
        seatIndex = json['seatIndex'] ?? -1;
}

class ChatMessageModel {
  final String id;
  final String roomId;
  final String userId;
  final String content;
  final DateTime createdAt;
  final Map<String, dynamic> user;

  ChatMessageModel.fromJson(Map<String, dynamic> json)
      : id = json['id'],
        roomId = json['roomId'],
        userId = json['userId'],
        content = json['content'],
        createdAt = DateTime.parse(json['createdAt']),
        user = json['user'] ?? {};
}

class RoomModel {
  final String id;
  final String slug;
  final String nameTr;
  final String nameEn;
  final String? descTr;
  final String icon;
  final String? ownerId;
  final String roomType;
  final String? backgroundImage;
  final int onlineCount;
  final int messageCount;

  RoomModel.fromJson(Map<String, dynamic> json)
      : id = json['id'],
        slug = json['slug'],
        nameTr = json['nameTr'] ?? '',
        nameEn = json['nameEn'] ?? '',
        descTr = json['descTr'],
        icon = json['icon'] ?? '',
        ownerId = json['ownerId'],
        roomType = json['roomType'] ?? 'FREE',
        backgroundImage = json['backgroundImage'],
        onlineCount = json['onlineCount'] ?? 0,
        messageCount = json['messageCount'] ?? 0;
}

class NowPlayingModel {
  final String videoId;
  final String title;
  final DateTime? startedAt;
  final String duration;

  NowPlayingModel.fromJson(Map<String, dynamic> json)
      : videoId = json['videoId'],
        title = json['title'] ?? '',
        startedAt = json['startedAt'] != null ? DateTime.parse(json['startedAt']) : null,
        duration = json['duration'] ?? '';
}

class QueueItemModel {
  final String id;
  final String videoId;
  final String title;
  final String? dedication;
  final String? note;
  final String duration;
  final String requestType;
  final bool isPaid;
  final String userId;
  final String userName;

  QueueItemModel.fromJson(Map<String, dynamic> json)
      : id = json['id'],
        videoId = json['videoId'] ?? '',
        title = json['title'] ?? '',
        dedication = json['dedication'],
        note = json['note'],
        duration = json['duration'] ?? '',
        requestType = json['requestType'] ?? 'audio',
        isPaid = json['isPaid'] ?? false,
        userId = json['userId'] ?? '',
        userName = json['userName'] ?? '';
}

class VoiceUserModel {
  final String id;
  final String name;
  final int agoraUid;
  final int joinedAt;

  VoiceUserModel.fromJson(Map<String, dynamic> json)
      : id = json['id'],
        name = json['name'] ?? '',
        agoraUid = json['agoraUid'] ?? 0,
        joinedAt = json['joinedAt'] ?? 0;
}

class PermissionsModel {
  final String role;
  final bool canMuteUsers;
  final bool canKickUsers;
  final bool canBanUsers;
  final bool canMuteRoom;
  final bool canGiveVoice;
  final bool canGiveOp;
  final bool canGiveSop;
  final bool canGiveFounder;
  final bool canManageRoom;
  final bool canSpeakInMutedRoom;
  final bool isGlobalAdmin;
  final bool isRoomOwner;

  PermissionsModel.fromJson(Map<String, dynamic> json)
      : role = json['role'] ?? 'none',
        canMuteUsers = json['canMuteUsers'] ?? false,
        canKickUsers = json['canKickUsers'] ?? false,
        canBanUsers = json['canBanUsers'] ?? false,
        canMuteRoom = json['canMuteRoom'] ?? false,
        canGiveVoice = json['canGiveVoice'] ?? false,
        canGiveOp = json['canGiveOp'] ?? false,
        canGiveSop = json['canGiveSop'] ?? false,
        canGiveFounder = json['canGiveFounder'] ?? false,
        canManageRoom = json['canManageRoom'] ?? false,
        canSpeakInMutedRoom = json['canSpeakInMutedRoom'] ?? false,
        isGlobalAdmin = json['isGlobalAdmin'] ?? false,
        isRoomOwner = json['isRoomOwner'] ?? false;
}
```

### 15.3 Timeout ve Retry Stratejisi

```dart
class ApiConfig {
  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sseReconnectDelay = Duration(seconds: 3);
  static const Duration heartbeatInterval = Duration(seconds: 25);
  static const int maxRetries = 3;

  static Duration getBackoff(int attempt) {
    final seconds = 3 * (1 << attempt);
    return Duration(seconds: seconds.clamp(3, 30));
  }
}
```

### 15.4 SSE Stream Manager

```dart
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

class SSEManager {
  StreamSubscription? sub;
  int retryCount = 0;
  bool active = false;

  final Function(Map<String, dynamic>) onEvent;
  final String roomId;
  final String? token;

  SSEManager({required this.roomId, this.token, required this.onEvent});

  Future<void> connect() async {
    active = true;
    retryCount = 0;
    await doConnect();
  }

  Future<void> doConnect() async {
    if (!active) return;
    try {
      final url = Uri.parse('https://canlifal.com/api/chat/rooms/$roomId/stream');
      final request = http.Request('GET', url);
      if (token != null) request.headers['Authorization'] = 'Bearer $token';

      final response = await http.Client().send(request);
      if (response.statusCode == 403) {
        onEvent({'type': 'error', 'code': 'BANNED'});
        return;
      }

      retryCount = 0;
      sub = response.stream
        .transform(utf8.decoder)
        .transform(const LineSplitter())
        .listen(
          (line) {
            if (line.startsWith('data: ')) {
              try { onEvent(jsonDecode(line.substring(6))); } catch (_) {}
            }
          },
          onError: (_) => doReconnect(),
          onDone: () => doReconnect(),
        );
    } catch (e) {
      doReconnect();
    }
  }

  void doReconnect() {
    if (!active) return;
    retryCount++;
    final delaySec = (3 * (1 << retryCount)).clamp(3, 30);
    Future.delayed(Duration(seconds: delaySec), doConnect);
  }

  void disconnect() {
    active = false;
    sub?.cancel();
  }
}
```

### 15.5 Koltuk Sistemi (15 Seats)

```
Koltuk 0: Taht (en ust, merkez) — Genellikle oda sahibi/admin icin
Koltuk 1-14: Normal koltuklar

seatIndex = -1  -> Koltukta oturmuyor (ayakta/izleyici)
seatIndex = 0-14 -> Belirli koltukta oturuyor
```

### 15.6 Cache Stratejisi

| Endpoint | Oneri |
|----------|-------|
| Oda listesi | 10-30 sn cache (sunucu 10s) |
| Arka planlar | 2 dk cache (sunucu 120s) |
| Mesajlar (ilk yukleme) | Cache etme |
| Presence | SSE'den al |
| DJ/Muzik | SSE'den al, GET ile yedekle |
| Hediye leaderboard | 15-30 sn cache |

### 15.7 Tam Oda Yasam Dongusu

```dart
class VoiceRoomController {
  final VoiceRoomApi api;
  late SSEManager sseManager;
  Timer? heartbeatTimer;

  Future<void> enterRoom(String roomId, String nickname) async {
    await api.joinRoom(roomId, nickname: nickname);
    await api.getMessages(roomId);
    sseManager = SSEManager(
      roomId: roomId,
      token: api.accessToken,
      onEvent: handleSSEEvent,
    );
    await sseManager.connect();
    heartbeatTimer = Timer.periodic(
      Duration(seconds: 25),
      (_) => api.heartbeat(roomId),
    );
  }

  Future<void> joinVoice(String roomId) async {
    await api.joinVoice(roomId);
    // Agora SDK ile kanala katil
  }

  Future<void> exitRoom(String roomId) async {
    heartbeatTimer?.cancel();
    sseManager.disconnect();
    await api.leaveVoice(roomId);
    await api.leaveRoom(roomId);
  }

  void handleSSEEvent(Map<String, dynamic> event) {
    switch (event['type']) {
      case 'connected': break;
      case 'messages': break;
      case 'system': break;
      case 'gift': break;
      case 'presence': break;
      case 'typing': break;
      case 'dj': break;
    }
  }
}
```

---

## Ek: Hizli Referans

### HTTP Status Kodlari

| Kod | Anlam |
|-----|-------|
| 200 | Basarili |
| 400 | Kotu istek / Eksik parametre |
| 401 | Kimlik dogrulama gerekli / Token gecersiz |
| 403 | Yetki yok / Banli |
| 404 | Bulunamadi |
| 409 | Cakisma (koltuk dolu) |
| 429 | Rate limit |
| 500 | Sunucu hatasi |

### Onemli Sabitler

| Sabit | Deger |
|-------|-------|
| Access Token Suresi | 7 gun |
| Refresh Token Suresi | 30 gun |
| Presence Timeout | 5 dakika (300s) |
| Voice Ping Timeout | 30 saniye |
| SSE Polling | 2 saniye |
| SSE Heartbeat | 15 saniye |
| Heartbeat Gonderme | 25 saniye onerilen |
| Typing Timeout | 3 saniye |
| Max Mesaj Uzunlugu | 500 karakter |
| Max DJ Sayisi | 5 |
| Max Koltuk | 15 (0-14) |
| Max Sarki Suresi | 6 dakika (360s) |
| Sarki Istegi (Audio) | 10 jeton |
| Sarki Istegi (Video) | 20 jeton |
| Kick -> Ban Esigi | 3 kick (30dk icinde) |
| Event Buffer | 200 event/oda |
| Event TTL | 2 dakika |
| Agora App ID | f1cf983a38114b04a4e9102c303ba63e |

---

> Bu dokumantasyon canlifal.com Sesli Sohbet Odasi API'si icin kapsamli bir Flutter entegrasyon rehberidir.
> Son guncelleme: 27 Haziran 2026
