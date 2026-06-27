# CanlıFal Flutter Entegrasyon Kılavuzu

> **Tarih:** 27 Haziran 2026  
> **Base URL:** `https://canlifal.com`  
> **API Prefix:** `/api`  
> **Auth:** JWT Bearer Token  
> **Format:** Tüm request/response JSON  

---

## İÇİNDEKİLER

1. [Authentication Akışı](#1-authentication-akışı)
2. [Flutter DTO Modelleri](#2-flutter-dto-modelleri)
3. [Repository Yapısı](#3-repository-yapısı)
4. [Provider / BLoC Servisleri](#4-provider--bloc-servisleri)
5. [SSE (Server-Sent Events) Bağlantısı](#5-sse-server-sent-events-bağlantısı)
6. [Reconnect Mantığı](#6-reconnect-mantığı)
7. [Retry Mantığı](#7-retry-mantığı)
8. [Hata Yönetimi](#8-hata-yönetimi)
9. [Endpoint Referansı (Repository Grupları)](#9-endpoint-referansı)

---

## 1. Authentication Akışı

### 1.1 Token Yapısı

Sunucu JWT tabanlı authentication kullanır. İki token tipi vardır:

| Token | Süre | Kullanım |
|-------|------|----------|
| `accessToken` | 7 gün | Her API isteğinde `Authorization: Bearer <token>` header'ı |
| `refreshToken` | 30 gün | Access token süresi dolduğunda yeni token çifti almak için |

### 1.2 Login Akışı

```
┌─────────────┐         ┌──────────────┐
│   Flutter    │         │   Backend    │
└──────┬──────┘         └──────┬───────┘
       │                       │
       │  POST /api/auth/mobile-login
       │  {email, password}    │
       │──────────────────────>│
       │                       │
       │  {accessToken,        │
       │   refreshToken,       │
       │   user: {...}}        │
       │<──────────────────────│
       │                       │
       │  SecureStorage'a      │
       │  token kaydet         │
       │                       │
       │  GET /api/me          │
       │  Authorization: Bearer│
       │──────────────────────>│
       │                       │
       │  {user profile}       │
       │<──────────────────────│
```

### 1.3 Login Endpoint'leri

#### E-posta/Şifre ile Giriş
```
POST /api/auth/mobile-login
Content-Type: application/json

Body:
{
  "email": "user@example.com",    // veya "username"
  "password": "password123"
}

Response 200:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "name": "Kullanıcı Adı",
    "username": "kullanici",
    "role": "user",
    "image": "https://...",
    "credits": 100,
    "jetonBalance": 50,
    "cfcBalance": 0,
    "membership": "free",
    "membershipExpiresAt": null,
    "preferredLanguage": "tr",
    "level": 1,
    "bio": null,
    "phone": null,
    "birthDate": "1990-01-15T00:00:00.000Z",
    "zodiacSign": "Oğlak",
    "referralCode": "A1B2C3D4"
  }
}

Hata Yanıtları:
- 400: {"error": "E-posta/kullanıcı adı ve şifre gereklidir"}
- 401: {"error": "E-posta veya şifre hatalı"}
- 429: {"error": "Çok fazla istek. Lütfen biraz bekleyin."}
```

#### Google ile Giriş
```
POST /api/auth/mobile-google
Content-Type: application/json

Body:
{
  "idToken": "google_id_token_from_flutter_plugin",
  "referralCode": "ABC123"  // opsiyonel
}

Response 200:
{
  "accessToken": "...",
  "refreshToken": "...",
  "isNewUser": true,
  "user": { ... }  // aynı user objesi
}
```

#### TikTok ile Giriş
```
POST /api/auth/mobile-tiktok
Content-Type: application/json

Body:
{
  "code": "tiktok_authorization_code",
  "redirectUri": "your-app://callback",
  "referralCode": "ABC123"  // opsiyonel
}

Response 200:
{
  "accessToken": "...",
  "refreshToken": "...",
  "isNewUser": true,
  "user": { ... }
}
```

#### Kayıt Ol
```
POST /api/auth/mobile-register
Content-Type: application/json

Body:
{
  "email": "yeni@user.com",
  "password": "sifre123",
  "name": "Yeni Kullanıcı",
  "username": "yenikullanici",
  "birthDate": "1995-06-15",
  "birthTime": "14:30",
  "referralCode": "ABC123",        // opsiyonel
  "preferredLanguage": "tr"         // opsiyonel, default: "tr"
}

Response 201:
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "...",
    "email": "yeni@user.com",
    "name": "Yeni Kullanıcı",
    "username": "yenikullanici",
    "role": "user",
    "credits": 100,
    "jetonBalance": 0,
    "cfcBalance": 0,
    "membership": "free",
    "referralCode": "GENERATED"
  }
}

Hata Yanıtları:
- 400: {"error": "Zorunlu alanlar: email, password, name, username, birthDate, birthTime"}
- 400: {"error": "Bu e-posta adresi zaten kayıtlı"}
- 400: {"error": "Bu kullanıcı adı zaten alınmış"}
```

### 1.4 Token Yenileme (Refresh)

```
POST /api/auth/mobile-refresh
Content-Type: application/json

Body:
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

Response 200:
{
  "accessToken": "yeni_access_token",
  "refreshToken": "yeni_refresh_token",
  "user": { ... }
}

Hata Yanıtları:
- 400: {"error": "Refresh token gerekli"}
- 401: {"error": "Geçersiz veya süresi dolmuş token"}
```

### 1.5 Token Kullanım Kuralları

1. **Her istekte** `Authorization: Bearer <accessToken>` header'ı gönder
2. **401 yanıtı** alındığında otomatik olarak refresh token ile yeni token al
3. Refresh token da geçersizse → login ekranına yönlendir
4. Token'ları `flutter_secure_storage` ile sakla
5. Uygulama başlangıcında `GET /api/me` ile token geçerliliğini kontrol et


---

## 2. Flutter DTO Modelleri

### 2.1 Auth Modelleri

```dart
// lib/models/auth/auth_response.dart
class AuthResponse {
  final String accessToken;
  final String refreshToken;
  final bool? isNewUser;
  final UserProfile user;

  AuthResponse({
    required this.accessToken,
    required this.refreshToken,
    this.isNewUser,
    required this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      isNewUser: json['isNewUser'] as bool?,
      user: UserProfile.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}

// lib/models/auth/login_request.dart
class LoginRequest {
  final String? email;
  final String? username;
  final String password;

  LoginRequest({this.email, this.username, required this.password});

  Map<String, dynamic> toJson() => {
    if (email != null) 'email': email,
    if (username != null) 'username': username,
    'password': password,
  };
}

// lib/models/auth/register_request.dart
class RegisterRequest {
  final String email;
  final String password;
  final String name;
  final String username;
  final String birthDate;
  final String birthTime;
  final String? referralCode;
  final String preferredLanguage;

  RegisterRequest({
    required this.email,
    required this.password,
    required this.name,
    required this.username,
    required this.birthDate,
    required this.birthTime,
    this.referralCode,
    this.preferredLanguage = 'tr',
  });

  Map<String, dynamic> toJson() => {
    'email': email,
    'password': password,
    'name': name,
    'username': username,
    'birthDate': birthDate,
    'birthTime': birthTime,
    if (referralCode != null) 'referralCode': referralCode,
    'preferredLanguage': preferredLanguage,
  };
}
```

### 2.2 Kullanıcı Modelleri

```dart
// lib/models/user/user_profile.dart
class UserProfile {
  final String id;
  final String email;
  final String name;
  final String? username;
  final String role;
  final String? image;
  final int credits;
  final int jetonBalance;
  final int cfcBalance;
  final String? membership;
  final DateTime? membershipExpiresAt;
  final String? preferredLanguage;
  final int? level;
  final String? bio;
  final String? phone;
  final DateTime? birthDate;
  final String? birthTime;
  final String? zodiacSign;
  final String? referralCode;
  final int? xp;
  final int? followersCount;
  final int? followingCount;

  UserProfile({
    required this.id,
    required this.email,
    required this.name,
    this.username,
    required this.role,
    this.image,
    this.credits = 0,
    this.jetonBalance = 0,
    this.cfcBalance = 0,
    this.membership,
    this.membershipExpiresAt,
    this.preferredLanguage,
    this.level,
    this.bio,
    this.phone,
    this.birthDate,
    this.birthTime,
    this.zodiacSign,
    this.referralCode,
    this.xp,
    this.followersCount,
    this.followingCount,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      email: json['email'] as String? ?? '',
      name: json['name'] as String? ?? '',
      username: json['username'] as String?,
      role: json['role'] as String? ?? 'user',
      image: json['image'] as String?,
      credits: (json['credits'] as num?)?.toInt() ?? 0,
      jetonBalance: (json['jetonBalance'] as num?)?.toInt() ?? 0,
      cfcBalance: (json['cfcBalance'] as num?)?.toInt() ?? 0,
      membership: json['membership'] as String?,
      membershipExpiresAt: json['membershipExpiresAt'] != null
          ? DateTime.tryParse(json['membershipExpiresAt'].toString())
          : null,
      preferredLanguage: json['preferredLanguage'] as String?,
      level: (json['level'] as num?)?.toInt(),
      bio: json['bio'] as String?,
      phone: json['phone'] as String?,
      birthDate: json['birthDate'] != null
          ? DateTime.tryParse(json['birthDate'].toString())
          : null,
      birthTime: json['birthTime'] as String?,
      zodiacSign: json['zodiacSign'] as String?,
      referralCode: json['referralCode'] as String?,
      xp: (json['xp'] as num?)?.toInt(),
      followersCount: (json['followersCount'] as num?)?.toInt(),
      followingCount: (json['followingCount'] as num?)?.toInt(),
    );
  }
}

// lib/models/user/user_summary.dart
class UserSummary {
  final String id;
  final String? name;
  final String? username;
  final String? image;
  final String? role;
  final String? membership;

  UserSummary({
    required this.id,
    this.name,
    this.username,
    this.image,
    this.role,
    this.membership,
  });

  factory UserSummary.fromJson(Map<String, dynamic> json) {
    return UserSummary(
      id: json['id'] as String,
      name: json['name'] as String? ?? json['displayName'] as String?,
      username: json['username'] as String?,
      image: json['image'] as String? ?? json['avatar'] as String?,
      role: json['role'] as String?,
      membership: json['membership'] as String?,
    );
  }
}
```

### 2.3 Chat Room Modelleri

```dart
// lib/models/chat/chat_room.dart
class ChatRoom {
  final String id;
  final String name;
  final String? description;
  final String type;           // 'voice', 'text', 'radio'
  final String? background;
  final String? category;
  final bool isLocked;
  final String? password;
  final int maxUsers;
  final int seatCount;
  final String ownerId;
  final UserSummary? owner;
  final int onlineCount;
  final DateTime createdAt;

  ChatRoom({
    required this.id,
    required this.name,
    this.description,
    required this.type,
    this.background,
    this.category,
    this.isLocked = false,
    this.password,
    this.maxUsers = 15,
    this.seatCount = 8,
    required this.ownerId,
    this.owner,
    this.onlineCount = 0,
    required this.createdAt,
  });

  factory ChatRoom.fromJson(Map<String, dynamic> json) {
    return ChatRoom(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      type: json['type'] as String? ?? 'voice',
      background: json['background'] as String?,
      category: json['category'] as String?,
      isLocked: json['isLocked'] as bool? ?? false,
      password: json['password'] as String?,
      maxUsers: (json['maxUsers'] as num?)?.toInt() ?? 15,
      seatCount: (json['seatCount'] as num?)?.toInt() ?? 8,
      ownerId: json['ownerId'] as String,
      owner: json['owner'] != null
          ? UserSummary.fromJson(json['owner'] as Map<String, dynamic>)
          : null,
      onlineCount: (json['onlineCount'] as num?)?.toInt() ??
          (json['_count']?['presences'] as num?)?.toInt() ?? 0,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

// lib/models/chat/chat_message.dart
class ChatMessage {
  final String id;
  final String roomId;
  final String userId;
  final String content;
  final String? type;          // 'text', 'system', 'gift', 'emoji'
  final String? nickname;
  final String? avatar;
  final String? role;
  final String? userRole;      // 'admin', 'moderator', 'dj', 'vip'
  final String? membership;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.roomId,
    required this.userId,
    required this.content,
    this.type,
    this.nickname,
    this.avatar,
    this.role,
    this.userRole,
    this.membership,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] as String? ?? '',
      roomId: json['roomId'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      content: json['content'] as String? ?? '',
      type: json['type'] as String?,
      nickname: json['nickname'] as String? ?? json['user']?['name'] as String?,
      avatar: json['avatar'] as String? ?? json['user']?['image'] as String?,
      role: json['role'] as String?,
      userRole: json['userRole'] as String?,
      membership: json['membership'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }
}

// lib/models/chat/chat_presence.dart
class ChatPresence {
  final String id;
  final String userId;
  final String? nickname;
  final String? avatar;
  final String? role;
  final String? membership;
  final int? seatIndex;
  final bool isMuted;

  ChatPresence({
    required this.id,
    required this.userId,
    this.nickname,
    this.avatar,
    this.role,
    this.membership,
    this.seatIndex,
    this.isMuted = false,
  });

  factory ChatPresence.fromJson(Map<String, dynamic> json) {
    return ChatPresence(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String,
      nickname: json['nickname'] as String? ?? json['user']?['name'] as String?,
      avatar: json['avatar'] as String? ?? json['user']?['image'] as String?,
      role: json['role'] as String?,
      membership: json['membership'] as String? ?? json['user']?['membership'] as String?,
      seatIndex: (json['seatIndex'] as num?)?.toInt(),
      isMuted: json['isMuted'] as bool? ?? false,
    );
  }
}

// lib/models/chat/seat.dart
class Seat {
  final int index;
  final String? userId;
  final String? nickname;
  final String? avatar;
  final bool isMuted;
  final bool isLocked;

  Seat({
    required this.index,
    this.userId,
    this.nickname,
    this.avatar,
    this.isMuted = false,
    this.isLocked = false,
  });

  bool get isEmpty => userId == null;

  factory Seat.fromJson(Map<String, dynamic> json) {
    return Seat(
      index: (json['index'] as num?)?.toInt() ?? (json['seatIndex'] as num?)?.toInt() ?? 0,
      userId: json['userId'] as String?,
      nickname: json['nickname'] as String? ?? json['user']?['name'] as String?,
      avatar: json['avatar'] as String? ?? json['user']?['image'] as String?,
      isMuted: json['isMuted'] as bool? ?? false,
      isLocked: json['isLocked'] as bool? ?? false,
    );
  }
}
```

### 2.4 Live Stream Modelleri

```dart
// lib/models/stream/video_stream.dart
class VideoStream {
  final String id;
  final String? title;
  final String? description;
  final String status;         // 'live', 'ended'
  final String userId;
  final UserSummary? user;
  final String? thumbnailUrl;
  final String? coverUrl;
  final int viewerCount;
  final int likeCount;
  final int commentCount;
  final DateTime createdAt;

  // Flutter-compatible aliases from API
  final String? streamId;
  final bool isLive;
  final String? streamerName;

  VideoStream({
    required this.id,
    this.title,
    this.description,
    this.status = 'live',
    required this.userId,
    this.user,
    this.thumbnailUrl,
    this.coverUrl,
    this.viewerCount = 0,
    this.likeCount = 0,
    this.commentCount = 0,
    required this.createdAt,
    this.streamId,
    this.isLive = true,
    this.streamerName,
  });

  factory VideoStream.fromJson(Map<String, dynamic> json) {
    return VideoStream(
      id: json['id'] as String? ?? json['streamId'] as String? ?? '',
      title: json['title'] as String?,
      description: json['description'] as String?,
      status: json['status'] as String? ?? 'live',
      userId: json['userId'] as String? ?? json['hostUserId'] as String? ?? '',
      user: json['user'] != null
          ? UserSummary.fromJson(json['user'] as Map<String, dynamic>)
          : null,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      coverUrl: json['coverUrl'] as String?,
      viewerCount: (json['viewerCount'] as num?)?.toInt() ??
          (json['viewers'] as num?)?.toInt() ??
          (json['watching'] as num?)?.toInt() ?? 0,
      likeCount: (json['likeCount'] as num?)?.toInt() ?? 0,
      commentCount: (json['commentCount'] as num?)?.toInt() ??
          (json['_count']?['comments'] as num?)?.toInt() ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      streamId: json['streamId'] as String?,
      isLive: json['isLive'] as bool? ?? json['status'] == 'live',
      streamerName: json['streamerName'] as String?,
    );
  }
}

// lib/models/stream/stream_comment.dart
class StreamComment {
  final String id;
  final String userId;
  final String content;
  final String? nickname;
  final String? avatar;
  final String? role;
  final String? membership;
  final DateTime createdAt;

  StreamComment({
    required this.id,
    required this.userId,
    required this.content,
    this.nickname,
    this.avatar,
    this.role,
    this.membership,
    required this.createdAt,
  });

  factory StreamComment.fromJson(Map<String, dynamic> json) {
    return StreamComment(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      content: json['content'] as String? ?? '',
      nickname: json['nickname'] as String? ?? json['userName'] as String?,
      avatar: json['avatar'] as String? ?? json['userImage'] as String?,
      role: json['role'] as String?,
      membership: json['membership'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }
}
```

### 2.5 Fortune (Fal) Modelleri

```dart
// lib/models/fortune/fortune_teller.dart
class FortuneTeller {
  final String id;
  final String userId;
  final String? displayName;
  final String? avatar;
  final String? bio;
  final String? specialties;
  final double rating;
  final int reviewCount;
  final int sessionCount;
  final bool isOnline;
  final int? creditsPerMinute;
  final String? status;        // 'approved', 'pending', 'banned'

  FortuneTeller({
    required this.id,
    required this.userId,
    this.displayName,
    this.avatar,
    this.bio,
    this.specialties,
    this.rating = 0.0,
    this.reviewCount = 0,
    this.sessionCount = 0,
    this.isOnline = false,
    this.creditsPerMinute,
    this.status,
  });

  factory FortuneTeller.fromJson(Map<String, dynamic> json) {
    return FortuneTeller(
      id: json['id'] as String,
      userId: json['userId'] as String,
      displayName: json['displayName'] as String?,
      avatar: json['avatar'] as String? ?? json['user']?['image'] as String?,
      bio: json['bio'] as String?,
      specialties: json['specialties'] as String?,
      rating: (json['rating'] as num?)?.toDouble() ?? 0.0,
      reviewCount: (json['reviewCount'] as num?)?.toInt() ?? 0,
      sessionCount: (json['sessionCount'] as num?)?.toInt() ?? 0,
      isOnline: json['isOnline'] as bool? ?? false,
      creditsPerMinute: (json['creditsPerMinute'] as num?)?.toInt(),
      status: json['status'] as String?,
    );
  }
}

// lib/models/fortune/live_session.dart
class LiveSession {
  final String id;
  final String userId;
  final String tellerId;
  final String? fortuneType;
  final String status;         // 'pending', 'active', 'completed', 'cancelled'
  final int maxMinutes;
  final int minutesUsed;
  final int? creditsPerMinute;
  final int? creditsCharged;
  final DateTime createdAt;
  final DateTime? startedAt;
  final String? roomId;
  final FortuneTeller? teller;

  LiveSession({
    required this.id,
    required this.userId,
    required this.tellerId,
    this.fortuneType,
    required this.status,
    this.maxMinutes = 0,
    this.minutesUsed = 0,
    this.creditsPerMinute,
    this.creditsCharged,
    required this.createdAt,
    this.startedAt,
    this.roomId,
    this.teller,
  });

  factory LiveSession.fromJson(Map<String, dynamic> json) {
    return LiveSession(
      id: json['id'] as String,
      userId: json['userId'] as String? ?? '',
      tellerId: json['tellerId'] as String? ?? '',
      fortuneType: json['fortuneType'] as String?,
      status: json['status'] as String? ?? 'pending',
      maxMinutes: (json['maxMinutes'] as num?)?.toInt() ?? 0,
      minutesUsed: (json['minutesUsed'] as num?)?.toInt() ?? 0,
      creditsPerMinute: (json['creditsPerMinute'] as num?)?.toInt(),
      creditsCharged: (json['creditsCharged'] as num?)?.toInt(),
      createdAt: DateTime.parse(json['createdAt'] as String),
      startedAt: json['startedAt'] != null
          ? DateTime.tryParse(json['startedAt'].toString())
          : null,
      roomId: json['roomId'] as String?,
      teller: json['teller'] != null
          ? FortuneTeller.fromJson(json['teller'] as Map<String, dynamic>)
          : null,
    );
  }
}

// lib/models/fortune/fortune_result.dart
class FortuneResult {
  final String id;
  final String fortuneType;
  final String? result;
  final String? imageUrl;
  final DateTime createdAt;

  FortuneResult({
    required this.id,
    required this.fortuneType,
    this.result,
    this.imageUrl,
    required this.createdAt,
  });

  factory FortuneResult.fromJson(Map<String, dynamic> json) {
    return FortuneResult(
      id: json['id'] as String,
      fortuneType: json['fortuneType'] as String? ?? json['type'] as String? ?? '',
      result: json['result'] as String?,
      imageUrl: json['imageUrl'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }
}
```

### 2.6 Ortak Modeller

```dart
// lib/models/common/gift_type.dart
class GiftType {
  final String id;
  final String name;
  final String? emoji;
  final String? imageUrl;
  final int price;
  final String? category;
  final int? sortOrder;

  GiftType({
    required this.id,
    required this.name,
    this.emoji,
    this.imageUrl,
    required this.price,
    this.category,
    this.sortOrder,
  });

  factory GiftType.fromJson(Map<String, dynamic> json) {
    return GiftType(
      id: json['id'] as String,
      name: json['name'] as String,
      emoji: json['emoji'] as String?,
      imageUrl: json['imageUrl'] as String?,
      price: (json['price'] as num?)?.toInt() ?? 0,
      category: json['category'] as String?,
      sortOrder: (json['sortOrder'] as num?)?.toInt(),
    );
  }
}

// lib/models/common/notification_item.dart
class NotificationItem {
  final String id;
  final String title;
  final String? body;
  final String? type;
  final bool isRead;
  final DateTime createdAt;
  final Map<String, dynamic>? data;

  NotificationItem({
    required this.id,
    required this.title,
    this.body,
    this.type,
    this.isRead = false,
    required this.createdAt,
    this.data,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? json['message'] as String?,
      type: json['type'] as String?,
      isRead: json['isRead'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      data: json['data'] as Map<String, dynamic>?,
    );
  }
}

// lib/models/common/paginated_response.dart
class PaginatedResponse<T> {
  final List<T> items;
  final int total;
  final int page;
  final int totalPages;
  final bool hasMore;

  PaginatedResponse({
    required this.items,
    required this.total,
    required this.page,
    required this.totalPages,
    required this.hasMore,
  });
}

// lib/models/common/credit_package.dart
class CreditPackage {
  final String id;
  final String name;
  final int credits;
  final double price;
  final String? currency;
  final String? description;
  final bool isPopular;

  CreditPackage({
    required this.id,
    required this.name,
    required this.credits,
    required this.price,
    this.currency,
    this.description,
    this.isPopular = false,
  });

  factory CreditPackage.fromJson(Map<String, dynamic> json) {
    return CreditPackage(
      id: json['id'] as String,
      name: json['name'] as String,
      credits: (json['credits'] as num?)?.toInt() ?? 0,
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency'] as String?,
      description: json['description'] as String?,
      isPopular: json['isPopular'] as bool? ?? false,
    );
  }
}

// lib/models/common/agora_token.dart
class AgoraToken {
  final String token;
  final int uid;
  final String channelName;
  final String appId;

  AgoraToken({
    required this.token,
    required this.uid,
    required this.channelName,
    required this.appId,
  });

  factory AgoraToken.fromJson(Map<String, dynamic> json) {
    return AgoraToken(
      token: json['token'] as String,
      uid: (json['uid'] as num?)?.toInt() ?? 0,
      channelName: json['channelName'] as String,
      appId: json['appId'] as String,
    );
  }
}

// lib/models/common/api_error.dart
class ApiError {
  final String message;
  final int statusCode;
  final String? field;

  ApiError({
    required this.message,
    required this.statusCode,
    this.field,
  });

  factory ApiError.fromJson(Map<String, dynamic> json, int statusCode) {
    return ApiError(
      message: json['error'] as String? ?? json['message'] as String? ?? 'Bilinmeyen hata',
      statusCode: statusCode,
      field: json['field'] as String?,
    );
  }

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isNotFound => statusCode == 404;
  bool get isRateLimited => statusCode == 429;
  bool get isServerError => statusCode >= 500;
}
```

### 2.7 Social Modeller

```dart
// lib/models/social/social_post.dart
class SocialPost {
  final String id;
  final String userId;
  final String? content;
  final String? imageUrl;
  final int likeCount;
  final int commentCount;
  final int viewCount;
  final bool isLiked;
  final UserSummary? user;
  final DateTime createdAt;

  SocialPost({
    required this.id,
    required this.userId,
    this.content,
    this.imageUrl,
    this.likeCount = 0,
    this.commentCount = 0,
    this.viewCount = 0,
    this.isLiked = false,
    this.user,
    required this.createdAt,
  });

  factory SocialPost.fromJson(Map<String, dynamic> json) {
    return SocialPost(
      id: json['id'] as String,
      userId: json['userId'] as String,
      content: json['content'] as String?,
      imageUrl: json['imageUrl'] as String?,
      likeCount: (json['likeCount'] as num?)?.toInt() ??
          (json['_count']?['likes'] as num?)?.toInt() ?? 0,
      commentCount: (json['commentCount'] as num?)?.toInt() ??
          (json['_count']?['comments'] as num?)?.toInt() ?? 0,
      viewCount: (json['viewCount'] as num?)?.toInt() ?? 0,
      isLiked: json['isLiked'] as bool? ?? false,
      user: json['user'] != null
          ? UserSummary.fromJson(json['user'] as Map<String, dynamic>)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

// lib/models/social/short_video.dart
class ShortVideo {
  final String id;
  final String userId;
  final String videoUrl;
  final String? thumbnailUrl;
  final String? description;
  final double? durationSec;
  final int viewsCount;
  final int likesCount;
  final int commentsCount;
  final bool isLiked;
  final UserSummary? user;
  final DateTime createdAt;

  ShortVideo({
    required this.id,
    required this.userId,
    required this.videoUrl,
    this.thumbnailUrl,
    this.description,
    this.durationSec,
    this.viewsCount = 0,
    this.likesCount = 0,
    this.commentsCount = 0,
    this.isLiked = false,
    this.user,
    required this.createdAt,
  });

  factory ShortVideo.fromJson(Map<String, dynamic> json) {
    return ShortVideo(
      id: json['id'] as String,
      userId: json['userId'] as String,
      videoUrl: json['videoUrl'] as String,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      description: json['description'] as String?,
      durationSec: (json['durationSec'] as num?)?.toDouble(),
      viewsCount: (json['viewsCount'] as num?)?.toInt() ?? 0,
      likesCount: (json['likesCount'] as num?)?.toInt() ?? 0,
      commentsCount: (json['commentsCount'] as num?)?.toInt() ?? 0,
      isLiked: json['isLiked'] as bool? ?? false,
      user: json['user'] != null
          ? UserSummary.fromJson(json['user'] as Map<String, dynamic>)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
```

### 2.8 SSE Event Modelleri

```dart
// lib/models/sse/sse_event.dart
class SseEvent {
  final String type;
  final Map<String, dynamic> data;
  final DateTime receivedAt;

  SseEvent({
    required this.type,
    required this.data,
    DateTime? receivedAt,
  }) : receivedAt = receivedAt ?? DateTime.now();

  factory SseEvent.fromRawData(String rawData) {
    try {
      final json = jsonDecode(rawData) as Map<String, dynamic>;
      return SseEvent(
        type: json['type'] as String? ?? 'unknown',
        data: json,
      );
    } catch (e) {
      return SseEvent(type: 'parse_error', data: {'raw': rawData});
    }
  }

  // Chat Room SSE event types
  bool get isConnected => type == 'connected';
  bool get isMessage => type == 'message';
  bool get isPresence => type == 'presence';
  bool get isTyping => type == 'typing';
  bool get isGift => type == 'gift';
  bool get isSystem => type == 'system';
  bool get isDjUpdate => type == 'dj_update';
  bool get isPk => type == 'pk';

  // Live Session SSE event types
  bool get isTimerStarted => type == 'timer_started';
  bool get isTimeExtended => type == 'time_extended';
  bool get isSessionEnded => type == 'session_ended';

  // Video Stream SSE event types
  bool get isStreamMessage => type == 'streamMessage';
  bool get isViewerCount => type == 'viewerCount';
  bool get isStreamEnded => type == 'streamEnded';

  // Notification SSE event types
  bool get isNotification => type == 'notification';
}
```

---

## 3. Repository Yapısı

Flutter uygulama mimarisinde tüm API çağrılarını Repository katmanında topluyoruz. Her repository bir feature domain'i temsil eder.

### 3.1 Dizin Yapısı

```
lib/
├── core/
│   ├── network/
│   │   ├── api_client.dart           # HTTP istemcisi (Dio)
│   │   ├── api_interceptor.dart      # Auth, retry, error interceptor
│   │   ├── sse_client.dart           # SSE bağlantı yöneticisi
│   │   └── api_constants.dart        # Base URL, endpoint sabitleri
│   ├── error/
│   │   ├── exceptions.dart           # Custom exception'lar
│   │   └── failure.dart              # Failure modelleri
│   └── storage/
│       └── secure_storage.dart       # Token saklama
│
├── models/                           # 2. bölümdeki DTO'lar
│   ├── auth/
│   ├── user/
│   ├── chat/
│   ├── stream/
│   ├── fortune/
│   ├── social/
│   ├── sse/
│   └── common/
│
├── repositories/
│   ├── auth_repository.dart
│   ├── user_repository.dart
│   ├── chat_room_repository.dart
│   ├── live_stream_repository.dart
│   ├── fortune_repository.dart
│   ├── fortune_teller_repository.dart
│   ├── live_session_repository.dart
│   ├── notification_repository.dart
│   ├── gift_repository.dart
│   ├── social_repository.dart
│   ├── short_video_repository.dart
│   ├── game_repository.dart
│   ├── payment_repository.dart
│   ├── search_repository.dart
│   ├── celebrity_repository.dart
│   ├── dream_repository.dart
│   ├── blog_repository.dart
│   ├── agency_repository.dart
│   ├── upload_repository.dart
│   └── device_repository.dart
│
├── providers/  (veya blocs/)
│   ├── auth_provider.dart
│   ├── user_provider.dart
│   ├── chat_room_provider.dart
│   ├── live_stream_provider.dart
│   ├── fortune_provider.dart
│   ├── notification_provider.dart
│   └── ...
│
└── services/
    ├── sse_service.dart              # SSE bağlantı servisi
    ├── agora_service.dart            # Agora RTC servisi
    ├── push_notification_service.dart # FCM/OneSignal servisi
    └── deep_link_service.dart
```

### 3.2 Repository → Endpoint Eşleştirme Tablosu

| Repository | Endpoint Grubu | Metotlar |
|-----------|---------------|----------|
| **AuthRepository** | `/api/auth/*` | login, register, googleLogin, tiktokLogin, refreshToken, logout |
| **UserRepository** | `/api/user/*`, `/api/me`, `/api/users/*` | getMe, getProfile, updateProfile, getCredits, getFollowers, getFollowing, follow, unfollow, block, getStats, getAchievements |
| **ChatRoomRepository** | `/api/chat/rooms/*` | getRooms, createRoom, getMessages, sendMessage, joinRoom, leaveRoom, getSeats, takeSeat, leaveSeat, muteUser, banUser, setDj, getPresence, updateSettings |
| **LiveStreamRepository** | `/api/video-streams/*` | getStreams, createStream, getStreamDetail, endStream, joinStream, leaveStream, sendComment, getComments, likeStream, sendGift, getViewers, getAgoraToken |
| **FortuneRepository** | `/api/fortunes/*` | getCoffeeReading, getTarotReading, getHoroscope, getDreamInterpretation, getPalmReading, getNumerology, getAngelCards, getLoveCompatibility, getAuraAnalysis, getBirthChart |
| **FortuneTellerRepository** | `/api/fortune-tellers/*` | getTellers, getTellerDetail, getReviews, createSession, toggleOnline, getMyProfile, applyAsTeller |
| **LiveSessionRepository** | `/api/room/*`, `/api/fortune-tellers/sessions/*` | getSessionInfo, sendMessage, getMessages, startTimer, extendTime, endSession, sendTip, acceptSession, rejectSession |
| **NotificationRepository** | `/api/notifications/*` | getNotifications, markAsRead |
| **GiftRepository** | `/api/gifts/*` | getGiftTypes, sendGift, getRecentBigGifts |
| **SocialRepository** | `/api/social/posts/*` | getPosts, createPost, likePost, commentOnPost, getComments |
| **ShortVideoRepository** | `/api/short-videos/*` | getVideos, uploadVideo, likeVideo, commentOnVideo, viewVideo, getUserVideos |
| **GameRepository** | `/api/games/*` | getGames, createRoom, joinRoom, play, getLeaderboard, dailySpin, dailyReward |
| **PaymentRepository** | `/api/credit-packages`, `/api/payment/*`, `/api/jeton`, `/api/wallet` | getCreditPackages, getPaymentMethods, createPaymentRequest, getWallet, getJetonBalance |
| **SearchRepository** | `/api/search/*` | search, advancedSearch |
| **CelebrityRepository** | `/api/celebrities/*` | getCelebrities, getCelebrityDetail, followCelebrity, getFanClub, joinFanClub |
| **DreamRepository** | `/api/dreams/*` | getDreams, getDreamDetail, interpretDream, getDreamDiary, getDreamSymbols |
| **BlogRepository** | `/api/blog/*` | getPosts, getPost, likePost, comment, getCategories |
| **AgencyRepository** | `/api/agency/*` | applyForAgency, getMyAgency, getMembers, getEarnings, getLeaderboard |
| **UploadRepository** | `/api/upload/*` | getPresignedUrl, uploadFile |
| **DeviceRepository** | `/api/devices/*` | registerFcmToken |


---

## 4. Provider / BLoC Servisleri

### 4.1 Riverpod Provider Yapısı (Önerilen)

```dart
// lib/providers/auth_provider.dart
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.read(apiClientProvider));
});

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(authRepositoryProvider), ref.read(secureStorageProvider));
});

// AuthState
enum AuthStatus { initial, authenticated, unauthenticated, loading }

class AuthState {
  final AuthStatus status;
  final UserProfile? user;
  final String? error;

  const AuthState({this.status = AuthStatus.initial, this.user, this.error});
}

// AuthNotifier
class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repo;
  final SecureStorage _storage;

  AuthNotifier(this._repo, this._storage) : super(const AuthState());

  Future<void> login(String email, String password) async { ... }
  Future<void> googleLogin(String idToken) async { ... }
  Future<void> register(RegisterRequest request) async { ... }
  Future<void> refreshToken() async { ... }
  Future<void> logout() async { ... }
  Future<void> checkAuthStatus() async { ... }  // app startup
}
```

### 4.2 Provider Listesi

| Provider | State | Sorumluluk |
|----------|-------|------------|
| `authStateProvider` | `AuthState` | Login/register/logout, token yönetimi |
| `currentUserProvider` | `UserProfile?` | Oturumdaki kullanıcı bilgisi |
| `chatRoomListProvider` | `List<ChatRoom>` | Oda listesi |
| `chatRoomDetailProvider(roomId)` | `ChatRoomDetail` | Tek oda detayı (presence, seats, messages) |
| `chatSseProvider(roomId)` | `Stream<SseEvent>` | Chat room SSE stream |
| `liveStreamListProvider` | `List<VideoStream>` | Canlı yayın listesi |
| `liveStreamDetailProvider(streamId)` | `VideoStream` | Tek yayın detayı |
| `streamSseProvider(streamId)` | `Stream<SseEvent>` | Video stream SSE |
| `fortuneTellerListProvider` | `List<FortuneTeller>` | Falcı listesi |
| `liveSessionProvider(sessionId)` | `LiveSession` | Aktif seans bilgisi |
| `sessionSseProvider(sessionId)` | `Stream<SseEvent>` | Seans SSE |
| `notificationListProvider` | `List<NotificationItem>` | Bildirimler |
| `notificationSseProvider` | `Stream<SseEvent>` | Bildirim SSE |
| `tellerSessionSseProvider` | `Stream<SseEvent>` | Falcı gelen talep SSE |
| `walletProvider` | `WalletState` | Bakiye durumu (credits, jeton, cfc) |
| `giftTypesProvider` | `List<GiftType>` | Hediye tipleri |

### 4.3 BLoC Alternatifi

```dart
// Chat Room BLoC örneği
class ChatRoomBloc extends Bloc<ChatRoomEvent, ChatRoomState> {
  final ChatRoomRepository _repo;
  final SseService _sseService;
  StreamSubscription? _sseSubscription;

  ChatRoomBloc(this._repo, this._sseService) : super(ChatRoomInitial()) {
    on<LoadChatRoom>(_onLoadChatRoom);
    on<SendMessage>(_onSendMessage);
    on<SseEventReceived>(_onSseEvent);
    on<JoinRoom>(_onJoinRoom);
    on<LeaveRoom>(_onLeaveRoom);
  }

  void _onLoadChatRoom(LoadChatRoom event, Emitter<ChatRoomState> emit) async {
    emit(ChatRoomLoading());
    try {
      final room = await _repo.getRoomDetail(event.roomId);
      final messages = await _repo.getMessages(event.roomId);
      emit(ChatRoomLoaded(room: room, messages: messages));

      // SSE bağlantısı başlat
      _sseSubscription?.cancel();
      _sseSubscription = _sseService
          .connect('/api/chat/rooms/${event.roomId}/stream')
          .listen((event) => add(SseEventReceived(event)));
    } catch (e) {
      emit(ChatRoomError(e.toString()));
    }
  }

  @override
  Future<void> close() {
    _sseSubscription?.cancel();
    return super.close();
  }
}
```

---

## 5. SSE (Server-Sent Events) Bağlantısı

### 5.1 SSE Endpoint'leri

Platform 5 farklı SSE endpoint'i sunar:

| Endpoint | Amaç | Event Tipleri |
|----------|-------|---------------|
| `GET /api/chat/rooms/{roomId}/stream` | Chat room gerçek zamanlı | `connected`, `message`, `presence`, `typing`, `gift`, `system`, `dj_update`, `pk` |
| `GET /api/video-streams/{streamId}/stream` | Canlı yayın gerçek zamanlı | `connected`, `streamMessage`, `viewerCount`, `streamEnded`, `gift` |
| `GET /api/room/{sessionId}/stream` | Falcı seansı gerçek zamanlı | `connected`, `message`, `timer_started`, `time_extended`, `session_ended` |
| `GET /api/fortune-tellers/sessions/stream` | Falcıya gelen talepler | `connected`, `session_request`, `session_cancelled` |
| `GET /api/notifications/stream` | Bildirimler gerçek zamanlı | `connected`, `notification` |

### 5.2 SSE İstemci Implementasyonu

```dart
// lib/services/sse_service.dart
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

class SseService {
  final String baseUrl;
  final String Function() getAccessToken;

  // Aktif bağlantılar
  final Map<String, _SseConnection> _connections = {};

  SseService({required this.baseUrl, required this.getAccessToken});

  /// SSE bağlantısı başlat
  Stream<SseEvent> connect(String path, {String? connectionId}) {
    final id = connectionId ?? path;

    // Mevcut bağlantı varsa kapat
    _connections[id]?.close();

    final controller = StreamController<SseEvent>.broadcast();
    final connection = _SseConnection(
      path: path,
      controller: controller,
      sseService: this,
    );

    _connections[id] = connection;
    connection.start();

    return controller.stream;
  }

  /// Bağlantıyı kapat
  void disconnect(String connectionId) {
    _connections[connectionId]?.close();
    _connections.remove(connectionId);
  }

  /// Tüm bağlantıları kapat
  void disconnectAll() {
    for (final conn in _connections.values) {
      conn.close();
    }
    _connections.clear();
  }
}

class _SseConnection {
  final String path;
  final StreamController<SseEvent> controller;
  final SseService sseService;

  http.Client? _client;
  bool _isActive = true;
  int _reconnectAttempt = 0;
  Timer? _reconnectTimer;

  // Reconnect ayarları
  static const _initialDelay = Duration(seconds: 1);
  static const _maxDelay = Duration(seconds: 30);
  static const _maxAttempts = 20;

  _SseConnection({
    required this.path,
    required this.controller,
    required this.sseService,
  });

  Future<void> start() async {
    while (_isActive && _reconnectAttempt < _maxAttempts) {
      try {
        await _connect();
      } catch (e) {
        if (!_isActive) break;

        _reconnectAttempt++;
        final delay = _calculateBackoff();

        controller.add(SseEvent(
          type: 'reconnecting',
          data: {
            'attempt': _reconnectAttempt,
            'maxAttempts': _maxAttempts,
            'delaySeconds': delay.inSeconds,
          },
        ));

        await Future.delayed(delay);
      }
    }

    if (_reconnectAttempt >= _maxAttempts && _isActive) {
      controller.add(SseEvent(
        type: 'connection_failed',
        data: {'reason': 'Max reconnect attempts reached'},
      ));
    }
  }

  Future<void> _connect() async {
    _client = http.Client();
    final token = sseService.getAccessToken();

    final request = http.Request('GET', Uri.parse('${sseService.baseUrl}$path'));
    request.headers['Authorization'] = 'Bearer $token';
    request.headers['Accept'] = 'text/event-stream';
    request.headers['Cache-Control'] = 'no-cache';

    final response = await _client!.send(request);

    if (response.statusCode == 401) {
      throw UnauthorizedException('SSE auth failed');
    }

    if (response.statusCode != 200) {
      throw SseConnectionException('SSE connection failed: ${response.statusCode}');
    }

    // Bağlantı başarılı — sayaç sıfırla
    _reconnectAttempt = 0;

    // SSE stream'i parse et
    String buffer = '';
    await for (final chunk in response.stream.transform(utf8.decoder)) {
      if (!_isActive) break;

      buffer += chunk;
      final lines = buffer.split('\n');
      buffer = lines.removeLast(); // son satır tamamlanmamış olabilir

      for (final line in lines) {
        if (line.startsWith('data: ')) {
          final data = line.substring(6).trim();
          if (data.isNotEmpty) {
            try {
              final event = SseEvent.fromRawData(data);
              controller.add(event);
            } catch (e) {
              // Parse hatası — atla
            }
          }
        }
        // Heartbeat satırlarını (": heartbeat") sessizce atla
      }
    }

    // Stream kapandı — reconnect gerekebilir
    if (_isActive) {
      throw SseConnectionException('Stream closed by server');
    }
  }

  Duration _calculateBackoff() {
    // Exponential backoff with jitter
    final baseDelay = _initialDelay.inMilliseconds *
        (1 << (_reconnectAttempt - 1).clamp(0, 5));
    final jitter = (baseDelay * 0.3 * (DateTime.now().millisecond / 1000)).toInt();
    final totalMs = (baseDelay + jitter).clamp(
      _initialDelay.inMilliseconds,
      _maxDelay.inMilliseconds,
    );
    return Duration(milliseconds: totalMs);
  }

  void close() {
    _isActive = false;
    _reconnectTimer?.cancel();
    _client?.close();
    if (!controller.isClosed) {
      controller.close();
    }
  }
}
```

### 5.3 SSE Event İşleme (Chat Room Örneği)

```dart
// Provider içinde SSE event'lerini dinleme
void _listenToSse(String roomId) {
  _sseSubscription = _sseService
      .connect('/api/chat/rooms/$roomId/stream', connectionId: 'chat_$roomId')
      .listen(
    (event) {
      switch (event.type) {
        case 'connected':
          // Bağlantı kuruldu
          state = state.copyWith(isConnected: true);
          break;

        case 'message':
          final message = ChatMessage.fromJson(event.data);
          state = state.copyWith(
            messages: [...state.messages, message],
          );
          break;

        case 'presence':
          _handlePresenceUpdate(event.data);
          break;

        case 'typing':
          _handleTypingUpdate(event.data);
          break;

        case 'gift':
          _handleGiftEvent(event.data);
          break;

        case 'dj_update':
          _handleDjUpdate(event.data);
          break;

        case 'system':
          _handleSystemMessage(event.data);
          break;

        case 'reconnecting':
          state = state.copyWith(
            isConnected: false,
            reconnectAttempt: event.data['attempt'] as int,
          );
          break;

        case 'connection_failed':
          state = state.copyWith(
            isConnected: false,
            error: 'Bağlantı kurulamadı',
          );
          break;
      }
    },
    onError: (error) {
      state = state.copyWith(isConnected: false, error: error.toString());
    },
  );
}
```


---

## 6. Reconnect Mantığı

### 6.1 SSE Reconnect Stratejisi

```
Bağlantı Kopması
       │
       ▼
  ┌─────────────────┐
  │ Exponential      │
  │ Backoff          │
  │ Hesapla          │
  └────────┬────────┘
           │
  attempt=1 → 1s bekle
  attempt=2 → 2s bekle
  attempt=3 → 4s bekle
  attempt=4 → 8s bekle
  attempt=5 → 16s bekle
  attempt=6+ → 30s bekle (max)
           │
           ▼
  ┌─────────────────┐
  │ Yeni SSE         │
  │ Bağlantısı Aç    │
  └────────┬────────┘
           │
     ┌─────┴─────┐
     │           │
   Başarılı    Başarısız
     │           │
 attempt=0    attempt++
 sıfırla        │
     │      attempt >= 20?
     │      ┌────┴────┐
     │     Evet      Hayır
     │      │         │
     │   HATA       Tekrar
     │   göster      dene
     ▼
  Normal akış
```

### 6.2 Reconnect Kuralları

1. **İlk bağlantı kopması:** 1 saniye bekle, yeniden bağlan
2. **Art arda kopmalar:** Exponential backoff (1s → 2s → 4s → 8s → 16s → 30s max)
3. **Jitter ekleme:** Her delay'e %30 rastgele süre ekle (thundering herd önleme)
4. **Başarılı bağlantı:** Sayaç sıfırlanır
5. **Maksimum deneme:** 20 denemeden sonra bağlantı kesilir, kullanıcıya hata gösterilir
6. **Token yenileme:** Reconnect sırasında 401 alınırsa önce token yenile, sonra SSE'ye bağlan
7. **Ağ durumu:** Cihaz offline'dayken reconnect denemesi yapma, online olunca başla

### 6.3 Uygulama Yaşam Döngüsü Yönetimi

```dart
class AppLifecycleHandler with WidgetsBindingObserver {
  final SseService sseService;
  final AuthProvider authProvider;

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.paused:
      case AppLifecycleState.inactive:
        // Arka plana geçiş — SSE bağlantılarını kapat
        sseService.disconnectAll();
        break;

      case AppLifecycleState.resumed:
        // Ön plana geçiş — bağlantıları yeniden aç
        _reconnectActiveStreams();
        break;

      case AppLifecycleState.detached:
        sseService.disconnectAll();
        break;

      default:
        break;
    }
  }

  void _reconnectActiveStreams() async {
    // Token kontrolü yap
    final isValid = await authProvider.validateToken();
    if (!isValid) {
      await authProvider.refreshToken();
    }

    // Aktif olan ekrana göre SSE'leri yeniden bağla
    // (Bu bilgiyi NavigationService'den al)
  }
}
```

---

## 7. Retry Mantığı

### 7.1 HTTP İstek Retry Stratejisi

```dart
// lib/core/network/api_interceptor.dart
class RetryInterceptor extends Interceptor {
  final Dio dio;
  final SecureStorage storage;
  final int maxRetries;
  final Duration retryDelay;

  RetryInterceptor({
    required this.dio,
    required this.storage,
    this.maxRetries = 3,
    this.retryDelay = const Duration(seconds: 1),
  });

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final statusCode = err.response?.statusCode;

    // 1) 401 Unauthorized → Token yenile ve tekrar dene
    if (statusCode == 401) {
      try {
        final newTokens = await _refreshTokens();
        if (newTokens != null) {
          // İsteği yeni token ile tekrar et
          err.requestOptions.headers['Authorization'] =
              'Bearer ${newTokens.accessToken}';
          final response = await dio.fetch(err.requestOptions);
          return handler.resolve(response);
        }
      } catch (_) {
        // Refresh de başarısız — login ekranına yönlendir
        _forceLogout();
        return handler.reject(err);
      }
    }

    // 2) 429 Rate Limited → Biraz bekle ve tekrar dene
    if (statusCode == 429) {
      final retryAfter = err.response?.headers.value('retry-after');
      final delay = retryAfter != null
          ? Duration(seconds: int.tryParse(retryAfter) ?? 5)
          : const Duration(seconds: 5);
      await Future.delayed(delay);
      try {
        final response = await dio.fetch(err.requestOptions);
        return handler.resolve(response);
      } catch (_) {
        return handler.reject(err);
      }
    }

    // 3) 500+ Server Error → Retry with backoff
    if (statusCode != null && statusCode >= 500) {
      final retryCount = err.requestOptions.extra['retryCount'] ?? 0;
      if (retryCount < maxRetries) {
        err.requestOptions.extra['retryCount'] = retryCount + 1;
        await Future.delayed(retryDelay * (retryCount + 1));
        try {
          final response = await dio.fetch(err.requestOptions);
          return handler.resolve(response);
        } catch (_) {
          return handler.reject(err);
        }
      }
    }

    // 4) Network error (timeout, connection refused) → Retry
    if (err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError) {
      final retryCount = err.requestOptions.extra['retryCount'] ?? 0;
      if (retryCount < maxRetries) {
        err.requestOptions.extra['retryCount'] = retryCount + 1;
        await Future.delayed(retryDelay * (retryCount + 1));
        try {
          final response = await dio.fetch(err.requestOptions);
          return handler.resolve(response);
        } catch (_) {
          return handler.reject(err);
        }
      }
    }

    return handler.reject(err);
  }
}
```

### 7.2 Retry Kuralları Tablosu

| Durum | Retry? | Max Deneme | Bekleme | Aksiyon |
|-------|--------|------------|---------|---------|
| **401 Unauthorized** | Evet | 1 | 0s | Token yenile → isteği tekrar et |
| **401 (refresh fail)** | Hayır | - | - | Login ekranına yönlendir |
| **403 Forbidden** | Hayır | - | - | Hata mesajı göster |
| **404 Not Found** | Hayır | - | - | Hata mesajı göster |
| **429 Rate Limited** | Evet | 1 | `Retry-After` header veya 5s | Bekle → tekrar dene |
| **500 Server Error** | Evet | 3 | 1s, 2s, 3s | Exponential backoff |
| **502/503/504** | Evet | 3 | 1s, 2s, 3s | Exponential backoff |
| **Network Timeout** | Evet | 3 | 1s, 2s, 3s | Exponential backoff |
| **Connection Error** | Evet | 3 | 1s, 2s, 3s | Exponential backoff |
| **400 Bad Request** | Hayır | - | - | Validation hatası göster |

### 7.3 Token Yenileme Akışı (Detaylı)

```
API İsteği (herhangi bir endpoint)
       │
       ▼
   401 yanıtı?
   ┌───┴───┐
  Hayır   Evet
   │       │
Normal  Refresh token
akış    ile yenile
           │
      POST /api/auth/mobile-refresh
           │
     ┌─────┴─────┐
   Başarılı    Başarısız
     │            │
  Yeni token   401 yanıtı?
  sakla          │
     │        ┌──┴──┐
  Orijinal   Evet  Hayır
  isteği       │     │
  tekrar et  Login  Hata
              ekranı göster
```

---

## 8. Hata Yönetimi

### 8.1 Exception Hiyerarşisi

```dart
// lib/core/error/exceptions.dart

/// Tüm API hatalarının base class'ı
abstract class AppException implements Exception {
  final String message;
  final int? statusCode;
  final String? errorCode;

  const AppException(this.message, {this.statusCode, this.errorCode});
}

/// 401 — Token geçersiz veya süresi dolmuş
class UnauthorizedException extends AppException {
  const UnauthorizedException([String message = 'Oturum süreniz doldu'])
      : super(message, statusCode: 401);
}

/// 403 — Erişim yetkisi yok
class ForbiddenException extends AppException {
  const ForbiddenException([String message = 'Bu işlem için yetkiniz yok'])
      : super(message, statusCode: 403);
}

/// 404 — Kaynak bulunamadı
class NotFoundException extends AppException {
  const NotFoundException([String message = 'İçerik bulunamadı'])
      : super(message, statusCode: 404);
}

/// 400 — Geçersiz istek (validation hatası)
class ValidationException extends AppException {
  final Map<String, String>? fieldErrors;

  const ValidationException(String message, {this.fieldErrors})
      : super(message, statusCode: 400);
}

/// 429 — Rate limit aşıldı
class RateLimitException extends AppException {
  final Duration? retryAfter;

  const RateLimitException({this.retryAfter})
      : super('Çok fazla istek. Lütfen biraz bekleyin.', statusCode: 429);
}

/// 500+ — Sunucu hatası
class ServerException extends AppException {
  const ServerException([String message = 'Sunucu hatası oluştu'])
      : super(message, statusCode: 500);
}

/// Ağ bağlantısı hatası
class NetworkException extends AppException {
  const NetworkException([String message = 'İnternet bağlantısı yok'])
      : super(message, statusCode: null);
}

/// SSE bağlantı hatası
class SseConnectionException extends AppException {
  const SseConnectionException([String message = 'Canlı bağlantı kurulamadı'])
      : super(message);
}

/// Yeterli bakiye yok
class InsufficientBalanceException extends AppException {
  const InsufficientBalanceException([String message = 'Yetersiz bakiye'])
      : super(message, statusCode: 400);
}
```

### 8.2 Hata Dönüşüm Tablosu

Sunucu tüm hataları şu formatta döner:

```json
{
  "error": "Türkçe hata mesajı"
}
```

| HTTP Kodu | Sunucu Mesajı (Örnekler) | Flutter Exception |
|-----------|-------------------------|-------------------|
| 400 | `"E-posta/kullanıcı adı ve şifre gereklidir"` | `ValidationException` |
| 400 | `"Bu e-posta adresi zaten kayıtlı"` | `ValidationException` |
| 400 | `"Bu kullanıcı adı zaten alınmış"` | `ValidationException` |
| 400 | `"Yetersiz bakiye"` | `InsufficientBalanceException` |
| 401 | `"E-posta veya şifre hatalı"` | `UnauthorizedException` |
| 401 | `"Oturum açmanız gerekiyor"` | `UnauthorizedException` |
| 401 | `"Geçersiz veya süresi dolmuş token"` | `UnauthorizedException` |
| 403 | `"Bu odaya erişiminiz yasaklanmış"` | `ForbiddenException` |
| 404 | `"Oda bulunamadı"` | `NotFoundException` |
| 429 | `"Çok fazla istek. Lütfen biraz bekleyin."` | `RateLimitException` |
| 500 | `"Sunucu hatası"` | `ServerException` |

### 8.3 Global Error Handler

```dart
// lib/core/error/error_handler.dart
class ErrorHandler {
  /// API response'u parse et ve uygun exception fırlat
  static Never throwFromResponse(http.Response response) {
    final body = _parseBody(response.body);
    final message = body['error'] as String? ?? 'Bilinmeyen hata';

    switch (response.statusCode) {
      case 400:
        if (message.contains('bakiye') || message.contains('kredi') || message.contains('jeton')) {
          throw InsufficientBalanceException(message);
        }
        throw ValidationException(message);
      case 401:
        throw UnauthorizedException(message);
      case 403:
        throw ForbiddenException(message);
      case 404:
        throw NotFoundException(message);
      case 429:
        throw const RateLimitException();
      default:
        if (response.statusCode >= 500) {
          throw ServerException(message);
        }
        throw AppException(message, statusCode: response.statusCode) as Never;
    }
  }

  /// Kullanıcıya gösterilecek mesajı oluştur
  static String getUserMessage(AppException exception) {
    // Sunucu zaten Türkçe mesaj döndüğü için doğrudan kullan
    return exception.message;
  }

  static Map<String, dynamic> _parseBody(String body) {
    try {
      return jsonDecode(body) as Map<String, dynamic>;
    } catch (_) {
      return {'error': body};
    }
  }
}
```

### 8.4 UI'da Hata Gösterimi

```dart
// Kullanım örneği
try {
  await chatRepository.sendMessage(roomId, content);
} on InsufficientBalanceException catch (e) {
  // Bakiye yükleme ekranına yönlendir
  showCreditPurchaseDialog();
} on RateLimitException catch (e) {
  // Rate limit uyarısı
  showSnackBar('Çok hızlı mesaj gönderiyorsunuz. Biraz bekleyin.');
} on ForbiddenException catch (e) {
  // Ban/mute uyarısı
  showSnackBar(e.message);
} on UnauthorizedException catch (_) {
  // Token yenileme başarısız — login ekranına yönlendir
  navigateToLogin();
} on NetworkException catch (_) {
  // Offline göstergesi
  showOfflineBanner();
} catch (e) {
  // Genel hata
  showSnackBar('Bir hata oluştu. Tekrar deneyin.');
}
```


---

## 9. Endpoint Referansı

Tüm endpoint'ler `BASE_URL = https://canlifal.com` üzerine kuruludur.  
Auth gerektiren endpoint'ler `Authorization: Bearer <accessToken>` header'ı bekler.

### 9.1 AuthRepository

| Metot | HTTP | Endpoint | Auth | Body / Query |
|-------|------|----------|------|--------------|
| `login` | POST | `/api/auth/mobile-login` | ❌ | `{email/username, password}` |
| `register` | POST | `/api/auth/mobile-register` | ❌ | `{email, password, name, username, birthDate, birthTime, referralCode?, preferredLanguage?}` |
| `googleLogin` | POST | `/api/auth/mobile-google` | ❌ | `{idToken, referralCode?}` |
| `tiktokLogin` | POST | `/api/auth/mobile-tiktok` | ❌ | `{code, redirectUri, referralCode?}` |
| `refreshToken` | POST | `/api/auth/mobile-refresh` | ❌ | `{refreshToken}` |
| `logout` | POST | `/api/auth/logout` | ✅ | - |
| `changePassword` | POST | `/api/auth/change-password` | ✅ | `{currentPassword, newPassword}` |
| `forgotPassword` | POST | `/api/auth/forgot-password` | ❌ | `{email}` |
| `resetPassword` | POST | `/api/auth/reset-password` | ❌ | `{token, password}` |

### 9.2 UserRepository

| Metot | HTTP | Endpoint | Auth | Body / Query |
|-------|------|----------|------|--------------|
| `getMe` | GET | `/api/me` | ✅ | - |
| `getProfile` | GET | `/api/user/profile` | ✅ | - |
| `updateProfile` | PATCH | `/api/user/profile` | ✅ | `{name?, bio?, image?, phone?, birthDate?, birthTime?, zodiacSign?}` |
| `getCredits` | GET | `/api/user/credits` | ✅ | - |
| `getStats` | GET | `/api/user/stats` | ✅ | - |
| `getStatistics` | GET | `/api/user/statistics` | ✅ | - |
| `getFollowers` | GET | `/api/user/followers` | ✅ | `?page=1&limit=20` |
| `getFollowing` | GET | `/api/user/following` | ✅ | `?page=1&limit=20` |
| `followUser` | POST | `/api/user/{userId}/follow` | ✅ | - |
| `getFollowStatus` | GET | `/api/user/{userId}/follow-status` | ✅ | - |
| `getOtherUser` | GET | `/api/users/{userId}` | ✅ | - |
| `getUserByUsername` | GET | `/api/users/lookup/{username}` | ✅ | - |
| `blockUser` | POST | `/api/user/blocked` | ✅ | `{blockedUserId}` |
| `getBlockedUsers` | GET | `/api/user/blocked` | ✅ | - |
| `getAchievements` | GET | `/api/user/achievements` | ✅ | - |
| `getXp` | GET | `/api/user/xp` | ✅ | - |
| `getActiveSessions` | GET | `/api/user/active-sessions` | ✅ | - |
| `getFortunes` | GET | `/api/user/fortunes` | ✅ | `?page=1` |
| `getFortuneById` | GET | `/api/user/fortunes/{fortuneId}` | ✅ | - |
| `getActivity` | GET | `/api/user/activity` | ✅ | - |
| `getWallet` | GET | `/api/wallet` | ✅ | - |
| `getUserTheme` | GET | `/api/user/theme` | ✅ | - |
| `updateTheme` | POST | `/api/user/theme` | ✅ | `{theme}` |
| `dailyLogin` | POST | `/api/daily-login` | ✅ | - |
| `getDailyMissions` | GET | `/api/daily-missions` | ✅ | - |
| `getReceivedGifts` | GET | `/api/user/received-gifts` | ✅ | - |
| `getLikers` | GET | `/api/user/likers` | ✅ | - |
| `getReferralInfo` | GET | `/api/referral` | ✅ | - |
| `getProfileFrames` | GET | `/api/profile-frames` | ✅ | - |
| `getOnlineUsers` | GET | `/api/users/online` | ✅ | - |
| `searchUsers` | GET | `/api/users/search` | ✅ | `?q=term` |
| `getPresence` | POST | `/api/presence` | ✅ | - |
| `watchAd` | POST | `/api/user/watch-ad` | ✅ | - |

### 9.3 ChatRoomRepository

| Metot | HTTP | Endpoint | Auth | Body / Query |
|-------|------|----------|------|--------------|
| `getRooms` | GET | `/api/chat/rooms` | ✅ | `?category=&type=voice` |
| `createRoom` | POST | `/api/chat/rooms/create` | ✅ | `{name, description?, type, category?, password?, maxUsers?, seatCount?, background?}` |
| `getBackgrounds` | GET | `/api/chat/rooms/backgrounds` | ✅ | - |
| `getMessages` | GET | `/api/chat/rooms/{roomId}/messages` | ✅ | `?limit=50` |
| `sendMessage` | POST | `/api/chat/rooms/{roomId}/messages` | ✅ | `{content, type?, nickname?}` |
| `joinRoom` | POST | `/api/chat/rooms/{roomId}/presence` | ✅ | `{action: "join", nickname?, password?}` |
| `leaveRoom` | POST | `/api/chat/rooms/{roomId}/presence` | ✅ | `{action: "leave"}` |
| `getPresence` | GET | `/api/chat/rooms/{roomId}/presence` | ✅ | - |
| `getSeats` | GET | `/api/chat/rooms/{roomId}/seats` | ✅ | - |
| `takeSeat` | POST | `/api/chat/rooms/{roomId}/seats` | ✅ | `{action: "take", seatIndex: 0}` |
| `leaveSeat` | POST | `/api/chat/rooms/{roomId}/seats` | ✅ | `{action: "leave"}` |
| `lockSeat` | POST | `/api/chat/rooms/{roomId}/seats` | ✅ | `{action: "lock", seatIndex: 0}` |
| `kickFromSeat` | POST | `/api/chat/rooms/{roomId}/seats` | ✅ | `{action: "kick", seatIndex: 0}` |
| `getVoiceToken` | POST | `/api/chat/rooms/{roomId}/voice` | ✅ | `{action: "join"}` |
| `muteUser` | POST | `/api/chat/rooms/{roomId}/moderation` | ✅ | `{action: "mute", targetUserId}` |
| `banUser` | POST | `/api/chat/rooms/{roomId}/moderation` | ✅ | `{action: "ban", targetUserId, reason?}` |
| `setDj` | POST | `/api/chat/rooms/{roomId}/dj` | ✅ | `{action: "assign"/"remove", targetUserId?}` |
| `sendTyping` | POST | `/api/chat/rooms/{roomId}/typing` | ✅ | - |
| `updateSettings` | PATCH | `/api/chat/rooms/{roomId}/settings` | ✅ | `{name?, description?, background?, isLocked?, password?}` |
| `sendGift` | POST | `/api/chat/rooms/{roomId}/gifts` | ✅ | `{giftId, receiverUserId, quantity?}` |
| `getMusic` | GET | `/api/chat/rooms/{roomId}/music` | ✅ | - |
| `playMusic` | POST | `/api/chat/rooms/{roomId}/music` | ✅ | `{action: "play"/"pause"/"skip", videoId?, title?}` |
| `getMusicQueue` | GET | `/api/chat/rooms/{roomId}/music-queue` | ✅ | - |
| `addToQueue` | POST | `/api/chat/rooms/{roomId}/music-queue` | ✅ | `{videoId, title, thumbnail?}` |
| `requestSong` | POST | `/api/chat/rooms/{roomId}/song-request` | ✅ | `{videoId, title}` |
| `transferOwnership` | POST | `/api/chat/rooms/{roomId}/transfer-ownership` | ✅ | `{newOwnerId}` |
| **SSE** | GET | `/api/chat/rooms/{roomId}/stream` | ✅ | - |

### 9.4 LiveStreamRepository

| Metot | HTTP | Endpoint | Auth | Body / Query |
|-------|------|----------|------|--------------|
| `getStreams` | GET | `/api/video-streams` | ❌ | `?page=1&limit=30` |
| `createStream` | POST | `/api/video-streams` | ✅ | `{title, description?, category?, thumbnailUrl?, coverUrl?}` |
| `getStreamDetail` | GET | `/api/video-streams/{streamId}` | ❌ | - |
| `updateStream` | PATCH | `/api/video-streams/{streamId}` | ✅ | `{status?, title?, description?, broadcastImage?, isImageMode?, backgroundUrl?}` |
| `endStream` | POST | `/api/video-streams/{streamId}/end` | ✅ | - |
| `joinStream` | POST | `/api/video-streams/{streamId}/join` | ✅ | `{nickname?}` |
| `leaveStream` | POST | `/api/video-streams/{streamId}/leave` | ✅ | - |
| `getComments` | GET | `/api/video-streams/{streamId}/comments` | ❌ | - |
| `sendComment` | POST | `/api/video-streams/{streamId}/comments` | ✅ | `{content, nickname?, isHidden?}` |
| `likeStream` | POST | `/api/video-streams/{streamId}/like` | ❌ | `{count?: 1}` |
| `getLikeCount` | GET | `/api/video-streams/{streamId}/like` | ❌ | - |
| `getViewers` | GET | `/api/video-streams/{streamId}/viewers` | ❌ | - |
| `sendGift` | POST | `/api/video-streams/{streamId}/gifts` | ✅ | `{giftId, quantity?}` |
| `getGifts` | GET | `/api/video-streams/gifts` | ❌ | - |
| `getMessages` | GET | `/api/video-streams/{streamId}/messages` | ✅ | - |
| `sendMessage` | POST | `/api/video-streams/{streamId}/messages` | ✅ | `{content}` |
| `muteViewer` | POST | `/api/video-streams/{streamId}/mute` | ✅ | `{userId}` |
| `banViewer` | POST | `/api/video-streams/{streamId}/ban` | ✅ | `{userId, reason?}` |
| `getModerators` | GET | `/api/video-streams/{streamId}/moderators` | ✅ | - |
| `addModerator` | POST | `/api/video-streams/{streamId}/moderators` | ✅ | `{userId}` |
| `getSignal` | GET | `/api/video-streams/{streamId}/signal` | ✅ | - |
| `sendSignal` | POST | `/api/video-streams/{streamId}/signal` | ✅ | `{type, data, targetUserId?}` |
| `coBroadcast` | POST | `/api/video-streams/{streamId}/co-broadcast` | ✅ | `{action, userId?}` |
| `inviteCoBroadcast` | POST | `/api/video-streams/{streamId}/co-broadcast/invite` | ✅ | `{userId}` |
| `getFortuneRequests` | GET | `/api/video-streams/{streamId}/fortune-requests` | ✅ | - |
| `sendFortuneRequest` | POST | `/api/video-streams/{streamId}/fortune-requests` | ✅ | `{fortuneType, message?}` |
| `getMyFortuneStatus` | GET | `/api/video-streams/{streamId}/fortune-requests/my-status` | ✅ | - |
| `startPkBattle` | POST | `/api/video-streams/{streamId}/pk-battle` | ✅ | `{opponentStreamId, durationMinutes?}` |
| **SSE** | GET | `/api/video-streams/{streamId}/stream` | ✅ | - |

### 9.5 FortuneRepository

| Metot | HTTP | Endpoint | Auth | Body / Query |
|-------|------|----------|------|--------------|
| `getCoffeeReading` | POST | `/api/fortunes/kahve-fali` | ✅ | `{images: [base64...], question?}` |
| `getTarotReading` | POST | `/api/fortunes/tarot-fali` | ✅ | `{question?, spread?}` |
| `getHoroscope` | POST | `/api/fortunes/burc-yorumu` | ✅ | `{zodiacSign, period?}` |
| `getDreamInterpretation` | POST | `/api/fortunes/ruya-yorumu` | ✅ | `{dream}` |
| `getPalmReading` | POST | `/api/fortunes/el-fali` | ✅ | `{images: [base64...]}` |
| `getNumerology` | POST | `/api/fortunes/numeroloji` | ✅ | `{birthDate, name}` |
| `getAngelCards` | POST | `/api/fortunes/melek-kartlari` | ✅ | `{question?}` |
| `getLoveCompatibility` | POST | `/api/fortunes/ask-uyumu` | ✅ | `{sign1, sign2}` |
| `getAuraAnalysis` | POST | `/api/fortunes/aura-analizi` | ✅ | `{birthDate}` |
| `getBirthChart` | POST | `/api/fortunes/dogum-haritasi` | ✅ | `{birthDate, birthTime, birthPlace}` |
| `getYesNo` | POST | `/api/fortunes/evet-hayir` | ✅ | `{question}` |
| `getIstikhara` | POST | `/api/fortunes/istihare` | ✅ | `{question}` |
| `getKatina` | POST | `/api/fortunes/katina` | ✅ | `{question?}` |
| `getKursunDokme` | POST | `/api/fortunes/kursundokme` | ✅ | `{concern?}` |
| `getDailyHoroscope` | POST | `/api/horoscope/daily` | ✅ | `{zodiacSign}` |
| `getFortuneCards` | GET | `/api/homepage-fortune-cards` | ❌ | - |
| `getFortuneAccess` | GET | `/api/fortune-access/check` | ✅ | `?fortuneType=kahve` |
| `getFortuneRequestTypes` | GET | `/api/fortune-request-types` | ❌ | - |

> **Not:** Fal endpoint'leri SSE (streaming) yanıt döner. Response `text/event-stream` formatında gelir. Her `data:` satırı metin parçası içerir. Son event `[DONE]` ile biter.

### 9.6 FortuneTellerRepository

| Metot | HTTP | Endpoint | Auth | Body / Query |
|-------|------|----------|------|--------------|
| `getTellers` | GET | `/api/fortune-tellers` | ❌ | `?page=1&online=true` |
| `getTellerDetail` | GET | `/api/fortune-tellers/{tellerId}` | ❌ | - |
| `getReviews` | GET | `/api/fortune-tellers/{tellerId}/reviews` | ❌ | `?page=1` |
| `createSession` | POST | `/api/fortune-tellers/{tellerId}/session` | ✅ | `{fortuneType, maxMinutes}` |
| `applyAsTeller` | POST | `/api/fortune-tellers/apply` | ✅ | `{displayName, bio, specialties}` |
| `getMyProfile` | GET | `/api/fortune-tellers/my-profile` | ✅ | - |
| `toggleOnline` | POST | `/api/fortune-tellers/toggle-online` | ✅ | - |
| `getFavoriteTellers` | GET | `/api/favorite-tellers` | ✅ | - |
| `toggleFavoriteTeller` | POST | `/api/favorite-tellers` | ✅ | `{tellerId}` |
| `getTellerAwards` | GET | `/api/fortune-tellers/awards` | ✅ | - |
| `getTellerGifts` | GET | `/api/fortune-tellers/gifts` | ✅ | - |
| `getIncomingSessions` | GET | `/api/fortune-tellers/sessions` | ✅ | - |
| `updateSessionStatus` | PATCH | `/api/fortune-tellers/sessions/{sessionId}` | ✅ | `{action: "accept"/"reject"/"cancel"/"complete"}` |
| **SSE** | GET | `/api/fortune-tellers/sessions/stream` | ✅ | Falcıya gelen talepler |

### 9.7 LiveSessionRepository

| Metot | HTTP | Endpoint | Auth | Body / Query |
|-------|------|----------|------|--------------|
| `getSessionInfo` | GET | `/api/room/{sessionId}` | ✅ | - |
| `updateSession` | PATCH | `/api/room/{sessionId}` | ✅ | `{action: "start_timer"/"extend"/"end"/"teller_add_time"/"ping", minutes?}` |
| `getMessages` | GET | `/api/room/{sessionId}/messages` | ✅ | `?after=timestamp` |
| `sendMessage` | POST | `/api/room/{sessionId}/messages` | ✅ | `{content}` |
| `sendTip` | POST | `/api/room/{sessionId}/tip` | ✅ | `{amount}` |
| `getSignal` | GET | `/api/room/signal` | ✅ | `?sessionId=xxx` |
| `sendSignal` | POST | `/api/room/signal` | ✅ | `{sessionId, type, data, receiverId}` |
| `deleteSignals` | DELETE | `/api/room/signal` | ✅ | `?sessionId=xxx` |
| **SSE** | GET | `/api/room/{sessionId}/stream` | ✅ | Seans gerçek zamanlı |

### 9.8 NotificationRepository

| Metot | HTTP | Endpoint | Auth | Body / Query |
|-------|------|----------|------|--------------|
| `getNotifications` | GET | `/api/notifications` | ✅ | `?page=1&limit=20` |
| `markAsRead` | PATCH | `/api/notifications` | ✅ | `{notificationId}` veya `{markAll: true}` |
| **SSE** | GET | `/api/notifications/stream` | ✅ | Gerçek zamanlı bildirimler |

### 9.9 GiftRepository

| Metot | HTTP | Endpoint | Auth | Body / Query |
|-------|------|----------|------|--------------|
| `getGiftTypes` | GET | `/api/gifts/types` | ❌ | - |
| `sendGift` | POST | `/api/gifts/send` | ✅ | `{giftId, receiverUserId, quantity?, roomType?, roomId?}` |
| `getRecentBigGifts` | GET | `/api/gifts/recent-big` | ❌ | - |
| `checkReciprocal` | GET | `/api/gifts/check-reciprocal` | ✅ | `?userId=xxx` |

### 9.10 SocialRepository

| Metot | HTTP | Endpoint | Auth | Body / Query |
|-------|------|----------|------|--------------|
| `getPosts` | GET | `/api/social/posts` | ✅ | `?page=1&limit=20&feed=following` |
| `createPost` | POST | `/api/social/posts` | ✅ | `{content, imageUrl?}` |
| `getPost` | GET | `/api/social/posts/{postId}` | ✅ | - |
| `deletePost` | DELETE | `/api/social/posts/{postId}` | ✅ | - |
| `likePost` | POST | `/api/social/posts/{postId}/likes` | ✅ | - |
| `getComments` | GET | `/api/social/posts/{postId}/comments` | ✅ | - |
| `addComment` | POST | `/api/social/posts/{postId}/comments` | ✅ | `{content}` |
| `viewPost` | POST | `/api/social/posts/{postId}/view` | ✅ | - |
| `getUserPosts` | GET | `/api/users/{userId}/posts` | ✅ | `?page=1` |
| `getStories` | GET | `/api/stories` | ✅ | - |

### 9.11 ShortVideoRepository

| Metot | HTTP | Endpoint | Auth | Body / Query |
|-------|------|----------|------|--------------|
| `getVideos` | GET | `/api/short-videos` | ❌ | `?page=1&limit=20` |
| `getVideoDetail` | GET | `/api/short-videos/{id}` | ❌ | - |
| `uploadVideo` | POST | `/api/short-videos/upload` | ✅ | `{videoUrl, thumbnailUrl?, description?}` |
| `likeVideo` | POST | `/api/short-videos/{id}/like` | ✅ | - |
| `getComments` | GET | `/api/short-videos/{id}/comments` | ❌ | `?page=1` |
| `addComment` | POST | `/api/short-videos/{id}/comments` | ✅ | `{content}` |
| `viewVideo` | POST | `/api/short-videos/{id}/view` | ✅ | `{watchedSec?}` |
| `getUserVideos` | GET | `/api/short-videos/user/{userId}` | ❌ | `?page=1` |

### 9.12 PaymentRepository

| Metot | HTTP | Endpoint | Auth | Body / Query |
|-------|------|----------|------|--------------|
| `getCreditPackages` | GET | `/api/credit-packages` | ❌ | - |
| `getPaymentMethods` | GET | `/api/payment-methods` | ❌ | - |
| `getPaymentConfig` | GET | `/api/payment/config` | ✅ | - |
| `createPaymentRequest` | POST | `/api/payment/requests` | ✅ | `{packageId, methodId, receipt?}` |
| `getJeton` | GET | `/api/jeton` | ✅ | - |
| `getWallet` | GET | `/api/wallet` | ✅ | - |
| `getMemberships` | GET | `/api/memberships` | ❌ | - |
| `purchaseMembership` | POST | `/api/memberships/purchase` | ✅ | `{planId}` |
| `requestWithdrawal` | POST | `/api/withdrawals` | ✅ | `{amount, method, details}` |

### 9.13 Diğer Repository'ler

| Metot | HTTP | Endpoint | Auth | Açıklama |
|-------|------|----------|------|----------|
| `searchAll` | GET | `/api/search?q=term` | ✅ | Genel arama |
| `advancedSearch` | GET | `/api/search/advanced?q=term&type=user` | ✅ | Filtreleme ile arama |
| `getAgoraToken` | POST | `/api/agora/token` | ✅ | Agora RTC token al |
| `getTrtcUserSig` | POST | `/api/trtc/usersig` | ✅ | TRTC user signature |
| `registerFcmToken` | POST | `/api/devices/fcm` | ✅ | Push token kaydet |
| `getPresignedUrl` | POST | `/api/upload/presigned` | ✅ | Dosya yükleme URL'si al |
| `getAnnouncements` | GET | `/api/announcements` | ✅ | Duyurular |
| `getPopups` | GET | `/api/popups` | ✅ | Popup bildirimleri |
| `getLeaderboard` | GET | `/api/leaderboards` | ❌ | Liderlik tablosu |
| `getHomepageButtons` | GET | `/api/homepage-buttons` | ❌ | Ana sayfa butonları |
| `getHomepageTicker` | GET | `/api/homepage-ticker` | ❌ | Alt bant mesajları |
| `getPublicStats` | GET | `/api/public-stats` | ❌ | Genel istatistikler |
| `getTrendVideos` | GET | `/api/trend-videos` | ❌ | Trend videolar |
| `getTrends` | GET | `/api/trends` | ❌ | Trend konular |
| `getFootball` | GET | `/api/football` | ❌ | Canlı futbol |
| `getMusicSearch` | GET | `/api/music/search?q=term` | ✅ | YouTube müzik arama |
| `getYoutubeSearch` | GET | `/api/youtube/search?q=term` | ✅ | YouTube video arama |
| `getCelebrities` | GET | `/api/celebrities` | ❌ | Ünlüler |
| `getDreams` | GET | `/api/dreams` | ❌ | Rüya yorumları |
| `getBlog` | GET | `/api/blog` | ❌ | Blog yazıları |
| `getTranslations` | GET | `/api/translations?lang=tr` | ❌ | Çeviriler |
| `getSitePages` | GET | `/api/site-pages/{slug}` | ❌ | Statik sayfalar |
| `getBroadcastImages` | GET | `/api/broadcast-images` | ❌ | Yayın görselleri |
| `getOnlineFal` | GET | `/api/online-fal` | ❌ | Online fal bölümleri |
| `getMembershipBadges` | GET | `/api/membership-badges` | ❌ | Üyelik rozetleri |
| `getAds` | GET | `/api/ads/active` | ❌ | Aktif reklamlar |
| `claimAdReward` | POST | `/api/ads/reward` | ✅ | Reklam ödülü al |

---

## 10. API İstemci (Dio) Kurulumu

```dart
// lib/core/network/api_client.dart
class ApiClient {
  late final Dio _dio;
  final SecureStorage _storage;

  ApiClient(this._storage) {
    _dio = Dio(BaseOptions(
      baseUrl: 'https://canlifal.com',
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _dio.interceptors.addAll([
      // Auth interceptor — her isteğe token ekler
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.getAccessToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
      // Retry interceptor
      RetryInterceptor(dio: _dio, storage: _storage),
      // Logging (debug mode)
      if (kDebugMode) LogInterceptor(responseBody: true),
    ]);
  }

  Future<Response> get(String path, {Map<String, dynamic>? queryParams}) =>
      _dio.get(path, queryParameters: queryParams);

  Future<Response> post(String path, {dynamic data}) =>
      _dio.post(path, data: data);

  Future<Response> patch(String path, {dynamic data}) =>
      _dio.patch(path, data: data);

  Future<Response> delete(String path, {Map<String, dynamic>? queryParams}) =>
      _dio.delete(path, queryParameters: queryParams);
}
```

---

## 11. Dosya Yükleme Akışı

```dart
// 1. Presigned URL al
final response = await apiClient.post('/api/upload/presigned', data: {
  'fileName': 'photo.jpg',
  'contentType': 'image/jpeg',
  'isPublic': true,
});
final uploadUrl = response.data['uploadUrl'];
final cloudPath = response.data['cloud_storage_path'];

// 2. Dosyayı S3'e yükle
await Dio().put(
  uploadUrl,
  data: fileBytes,
  options: Options(
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Disposition': 'attachment',
    },
  ),
);

// 3. cloud_storage_path'i API'ye gönder (örn: profil güncelleme)
await apiClient.patch('/api/user/profile', data: {
  'image': cloudPath,
});
```

---

> **Bu doküman yalnızca mevcut backend API'lerinin Flutter entegrasyon referansıdır.**  
> **Hiçbir backend kodu değiştirilmemiştir. Yeni endpoint oluşturulmamıştır.**
