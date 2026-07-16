# CanlıFal — Flutter Backend Uyumluluk Raporu

> **Oluşturulma:** 16 Temmuz 2026
> **Backend:** Next.js 14 API Routes (canlifal.com)
> **Toplam Endpoint:** 431 (Admin: ~130, Kullanıcı: ~301)
> **Dual Auth Desteği:** 238 endpoint (Bearer JWT + NextAuth Session)
> **SSE Stream:** 5 endpoint
> **Durum:** Backend büyük ölçüde Flutter uyumlu, kritik eksikler aşağıda.

---

## 1. AUTHENTICATION SİSTEMİ

### 1.1 Mevcut Mobil Auth Endpoint'leri ✅

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/auth/mobile-login` | POST | Email/username + password login |
| `/api/auth/mobile-register` | POST | Yeni hesap oluşturma |
| `/api/auth/mobile-refresh` | POST | Token yenileme (refresh token → yeni access + refresh) |
| `/api/auth/mobile-google` | POST | Google ID Token ile login/register |
| `/api/auth/mobile-tiktok` | POST | TikTok OAuth code ile login/register |
| `/api/auth/logout` | POST | Logout (JWT stateless, client token siler) |
| `/api/auth/forgot-password` | POST | Şifre sıfırlama e-postası gönder |
| `/api/auth/reset-password` | POST | Şifre sıfırlama (token ile) |
| `/api/auth/change-password` | POST | Mevcut şifreyi değiştir (⚠️ WEB-ONLY) |

### 1.2 Token Yapısı
```
Access Token:  7 gün geçerli
Refresh Token: 30 gün geçerli
Header: Authorization: Bearer <accessToken>
```

### 1.3 Token Payload
```json
{
  "userId": "clxx...",
  "email": "user@example.com",
  "role": "user",
  "type": "access" | "refresh"
}
```

### 1.4 Login Response Formatı
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "isNewUser": false,
  "user": {
    "id": "clxx...",
    "email": "user@example.com",
    "name": "Kullanıcı Adı",
    "username": "kullanici",
    "role": "user",
    "image": "https://...",
    "credits": 100,
    "jetonBalance": 500,
    "cfcBalance": 0,
    "membership": "free",
    "membershipExpiresAt": null,
    "preferredLanguage": "tr",
    "level": 1,
    "bio": null,
    "phone": null,
    "birthDate": null,
    "zodiacSign": null,
    "referralCode": "A1B2C3D4"
  }
}
```

### 1.5 Eksikler & Öneriler

| Eksik | Durum | Öncelik |
|-------|-------|---------|
| Apple Sign-In endpoint | ✅ Eklendi (`/api/auth/mobile-apple`) | 🟢 Tamamlandı |
| change-password dual auth | ✅ Eklendi | 🟢 Tamamlandı |
| Token blacklist (logout all devices) | ❌ Yok | 🟡 Orta |
| Device session yönetimi | ❌ Yok (FCM token var) | 🟢 Düşük |

---

## 2. STANDART API RESPONSE FORMATI

### 2.1 Yeni Oluşturulan Wrapper: `lib/api-response.ts`

**Başarı:**
```json
{
  "success": true,
  "message": "Başarılı",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2026-07-16T00:00:00.000Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Hata:**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_JETONS",
    "message": "Yetersiz jeton",
    "details": [
      { "field": "jetonBalance", "message": "Minimum 50 jeton gerekli" }
    ]
  },
  "timestamp": "2026-07-16T00:00:00.000Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440001"
}
```

### 2.2 Error Kodları
```
UNAUTHORIZED          - 401: Oturum gerekli
FORBIDDEN             - 403: Yetki yok
TOKEN_EXPIRED         - 401: Token süresi dolmuş
INVALID_TOKEN         - 401: Geçersiz token
VALIDATION_ERROR      - 400: Validasyon hatası
MISSING_FIELD         - 400: Eksik alan
NOT_FOUND             - 404: Kayıt bulunamadı
ALREADY_EXISTS        - 409: Zaten mevcut
INSUFFICIENT_CREDITS  - 402: Yetersiz kredi
INSUFFICIENT_JETONS   - 402: Yetersiz jeton
RATE_LIMITED          - 429: Rate limit aşıldı
INTERNAL_ERROR        - 500: Sunucu hatası
```

### 2.3 Mevcut Durum
⚠️ **Mevcut endpoint'lerin çoğu eski format kullanıyor** (`{ error: "..." }` veya direkt data). Yeni wrapper `lib/api-response.ts` oluşturuldu. Endpoint'ler kademeli olarak yeni formata geçirilecek. **Flutter tarafı her iki formatı da handle etmeli:**

```dart
// Flutter'da backward compatible parsing
if (json['success'] == true) {
  return json['data'];
} else if (json['error'] != null) {
  // Yeni format
  if (json['error'] is Map) throw ApiError(json['error']['code'], json['error']['message']);
  // Eski format
  throw ApiError('UNKNOWN', json['error'].toString());
} else {
  // Direkt data (eski format)
  return json;
}
```

---

## 3. SSE (Server-Sent Events) KATALOĞU

### 3.1 SSE Endpoint'leri

| Endpoint | Amaç | Event Türleri |
|----------|-------|---------------|
| `/api/chat/rooms/[roomId]/stream` | Sohbet odası gerçek zamanlı | message, presence, typing, system, gift, pk |
| `/api/video-streams/[streamId]/stream` | Canlı yayın gerçek zamanlı | streamMessage, viewerCount, streamEnded, gift |
| `/api/room/[sessionId]/stream` | Falcı-kullanıcı oturum | message, timer_started, time_extended, session_ended, ping, system |
| `/api/fortune-tellers/sessions/stream` | Falcı gelen istekler | session_request, session_cancelled |
| `/api/notifications/stream` | Bildirim stream | notification |

### 3.2 SSE Bağlantı Formatı
```
GET /api/chat/rooms/{roomId}/stream
Headers:
  Authorization: Bearer <token>
  Accept: text/event-stream

Response (text/event-stream):
data: {"type":"message","data":{"id":"msg1","content":"Merhaba","userId":"u1","nickname":"Ali","timestamp":1700000000000}}

data: {"type":"presence","data":{"userId":"u2","action":"join","nickname":"Ayşe"}}

data: {"type":"gift","data":{"giftId":"g1","senderId":"u1","amount":100}}

data: {"type":"typing","data":{"userId":"u3","nickname":"Fatma"}}
```

### 3.3 Chat Room Event Türleri
```
message     - Yeni mesaj
presence    - Kullanıcı katılma/ayrılma
typing      - Yazıyor bildirimi
system      - Sistem mesajı
gift        - Hediye gönderildi
pk          - PK Battle güncellemesi
```

### 3.4 Video Stream Event Türleri
```
streamMessage  - Yeni yorum/mesaj
viewerCount    - İzleyici sayısı güncelleme
streamEnded    - Yayın bitti
gift           - Hediye gönderildi
```

### 3.5 Room (Session) Event Türleri
```
message         - Sohbet mesajı
timer_started   - Zamanlayıcı başladı
time_extended   - Süre uzatıldı
session_ended   - Oturum bitti
ping            - Canlılık kontrolü
system          - Sistem mesajı
```

### 3.6 Teller Event Türleri
```
session_request   - Yeni oturum isteği geldi
session_cancelled - İstek iptal edildi
```

---

## 4. ENDPOINT KATEGORİLERİ VE TAM LİSTE

### 4.1 Authentication (8 endpoint)
```
POST /api/auth/mobile-login          - Email/şifre ile giriş
POST /api/auth/mobile-register       - Yeni hesap oluşturma
POST /api/auth/mobile-refresh        - Token yenileme
POST /api/auth/mobile-google         - Google ile giriş
POST /api/auth/mobile-tiktok         - TikTok ile giriş
POST /api/auth/logout                - Çıkış
POST /api/auth/forgot-password       - Şifre sıfırlama talebi
POST /api/auth/reset-password        - Şifre sıfırlama
```

### 4.2 Profil & Kullanıcı (24 endpoint)
```
GET    /api/me                        - Kendi profil bilgilerini getir
PATCH  /api/me                        - Profil güncelle
GET    /api/user/profile              - Detaylı profil
PATCH  /api/user/profile              - Profil güncelle
GET    /api/user/credits              - Kredi bakiyesi
GET    /api/user/statistics           - İstatistikler
GET    /api/user/stats                - Genel istatistikler
POST   /api/user/stats                - İstatistik güncelle
GET    /api/user/achievements         - Başarımlar
GET    /api/user/[userId]/achievements- Başkasının başarımları
GET    /api/user/xp                   - XP bilgisi
GET    /api/user/followers            - Takipçiler
GET    /api/user/following            - Takip edilenler
GET    /api/user/likers               - Beğenenler
POST   /api/user/[userId]/follow      - Takip et
DELETE /api/user/[userId]/follow      - Takibi bırak
GET    /api/user/[userId]/follow-status - Takip durumu
GET    /api/user/blocked              - Engellenenler
DELETE /api/user/blocked              - Engeli kaldır
GET    /api/user/broadcast-history    - Yayın geçmişi
GET    /api/user/received-gifts       - Alınan hediyeler
GET    /api/users/[userId]            - Kullanıcı profili (public)
GET    /api/users/online              - Online kullanıcılar
GET    /api/users/search              - Kullanıcı arama
```

### 4.3 Chat / Sohbet Odası (18 endpoint)
```
GET    /api/chat/rooms                     - Oda listesi
POST   /api/chat/rooms/create              - Oda oluştur
GET    /api/chat/rooms/[roomId]/messages    - Mesajları getir
POST   /api/chat/rooms/[roomId]/messages    - Mesaj gönder
DELETE /api/chat/rooms/[roomId]/messages    - Mesaj sil
GET    /api/chat/rooms/[roomId]/presence    - Kullanıcı listesi
POST   /api/chat/rooms/[roomId]/presence    - Odaya katıl
DELETE /api/chat/rooms/[roomId]/presence    - Odadan ayrıl
POST   /api/chat/rooms/[roomId]/typing      - Yazıyor bildirimi
GET    /api/chat/rooms/[roomId]/stream      - SSE stream
POST   /api/chat/rooms/[roomId]/gifts       - Hediye gönder
GET    /api/chat/rooms/[roomId]/gifts       - Hediye geçmişi
GET    /api/chat/rooms/[roomId]/settings    - Oda ayarları
PATCH  /api/chat/rooms/[roomId]/settings    - Oda ayarlarını güncelle
POST   /api/chat/rooms/[roomId]/moderation  - Moderasyon işlemi
PATCH  /api/chat/rooms/[roomId]/seats       - Koltuk yönetimi
POST   /api/chat/rooms/[roomId]/voice       - Ses yönetimi
POST   /api/chat/rooms/[roomId]/transfer-ownership - Sahiplik devret
```

### 4.4 DJ / Müzik (6 endpoint)
```
GET    /api/chat/rooms/[roomId]/dj          - DJ durumu
POST   /api/chat/rooms/[roomId]/dj          - DJ işlemi
GET    /api/chat/rooms/[roomId]/music       - Şu anki müzik
POST   /api/chat/rooms/[roomId]/music       - Müzik kontrolü
DELETE /api/chat/rooms/[roomId]/music       - Müzik durdur
GET    /api/chat/rooms/[roomId]/music-queue - Müzik kuyruğu
GET    /api/chat/rooms/[roomId]/song-request- Şarkı istekleri
POST   /api/chat/rooms/[roomId]/song-request- Şarkı iste
PATCH  /api/chat/rooms/[roomId]/song-request- İsteği onayla/reddet
GET    /api/music/search                    - Müzik arama
```

### 4.5 PK Battle (5 endpoint)
```
GET    /api/chat/rooms/[roomId]/pk          - PK durumu
POST   /api/chat/rooms/[roomId]/pk          - PK başlat/kabul/reddet
POST   /api/chat/rooms/[roomId]/pk/score    - PK skor güncelle
GET    /api/chat/rooms/pk-list              - Aktif PK listesi
GET    /api/video-streams/pk/list           - PK battle listesi (stream)
GET    /api/video-streams/pk                - PK bilgi
POST   /api/video-streams/pk               - PK işlemi
POST   /api/video-streams/pk/score          - PK skor (stream)
POST   /api/video-streams/[streamId]/pk-battle - PK battle (stream)
```

### 4.6 Gift / Hediye (6 endpoint)
```
GET    /api/gifts/types                     - Hediye türleri
POST   /api/gifts/send                      - Hediye gönder
GET    /api/gifts/recent-big                - Son büyük hediyeler
POST   /api/gifts/check-reciprocal          - Karşılıklı hediye kontrol
GET    /api/video-streams/gifts             - Stream hediye türleri
POST   /api/video-streams/[streamId]/gifts  - Stream'e hediye gönder
GET    /api/video-streams/[streamId]/gifts  - Stream hediye geçmişi
```

### 4.7 Canlı Yayın / Video Stream (20 endpoint)
```
GET    /api/video-streams                         - Yayın listesi
POST   /api/video-streams                         - Yayın başlat
GET    /api/video-streams/[streamId]               - Yayın detayı
PATCH  /api/video-streams/[streamId]               - Yayın güncelle
POST   /api/video-streams/[streamId]/end           - Yayın bitir
POST   /api/video-streams/[streamId]/join          - Yayına katıl
DELETE /api/video-streams/[streamId]/join          - İzleyici ayrıl
POST   /api/video-streams/[streamId]/leave         - Yayından ayrıl
GET    /api/video-streams/[streamId]/viewers       - İzleyici listesi
GET    /api/video-streams/[streamId]/comments      - Yorumlar
POST   /api/video-streams/[streamId]/comments      - Yorum yap
GET    /api/video-streams/[streamId]/like          - Beğeni sayısı
POST   /api/video-streams/[streamId]/like          - Beğen
POST   /api/video-streams/[streamId]/live-started  - Yayın başladı bildir
GET    /api/video-streams/[streamId]/stream        - SSE stream
GET    /api/video-streams/[streamId]/moderators    - Moderatörler
POST   /api/video-streams/[streamId]/moderators    - Moderatör ekle
DELETE /api/video-streams/[streamId]/moderators    - Moderatör kaldır
POST   /api/video-streams/[streamId]/mute          - Sessize al
POST   /api/video-streams/[streamId]/ban           - Yasakla
```

### 4.8 Co-Broadcast / Çoklu Misafir (3 endpoint)
```
GET    /api/video-streams/[streamId]/co-broadcast         - Durum
POST   /api/video-streams/[streamId]/co-broadcast         - Katıl/Ayrıl
PATCH  /api/video-streams/[streamId]/co-broadcast         - Güncelle
POST   /api/video-streams/[streamId]/co-broadcast/invite  - Davet gönder
```

### 4.9 RTC Token (2 endpoint)
```
POST   /api/agora/token                    - Agora RTC token al
POST   /api/trtc/usersig                   - TRTC UserSig al
```

### 4.10 Falcı Sistemi (14 endpoint)
```
GET    /api/fortune-tellers                         - Falcı listesi
GET    /api/fortune-tellers/[tellerId]               - Falcı detayı
GET    /api/fortune-tellers/[tellerId]/reviews       - Falcı yorumları
POST   /api/fortune-tellers/[tellerId]/session       - Oturum talebi
POST   /api/fortune-tellers/session                  - Oturum talebi (genel)
GET    /api/fortune-tellers/sessions                 - Falcı oturumları
PATCH  /api/fortune-tellers/sessions/[sessionId]     - Oturum güncelle
GET    /api/fortune-tellers/sessions/stream          - SSE (falcı istekleri)
POST   /api/fortune-tellers/apply                    - Falcı başvurusu
GET    /api/fortune-tellers/my-profile               - Falcı kendi profili
POST   /api/fortune-tellers/toggle-online            - Online/offline geçiş
GET    /api/fortune-tellers/awards                   - Ödüller
GET    /api/fortune-tellers/gifts                    - Alınan hediyeler
GET    /api/favorite-tellers                         - Favori falcılar
POST   /api/favorite-tellers                         - Favorilere ekle/kaldır
```

### 4.11 Canlı Oda (Falcı-Kullanıcı Session) (6 endpoint)
```
GET    /api/room/[sessionId]                - Oturum bilgisi
PATCH  /api/room/[sessionId]                - Oturum güncelle (start/extend/end)
GET    /api/room/[sessionId]/messages       - Mesajlar
POST   /api/room/[sessionId]/messages       - Mesaj gönder
GET    /api/room/[sessionId]/stream         - SSE stream
POST   /api/room/[sessionId]/tip            - Bahşiş gönder
```

### 4.12 AI Fal (21 endpoint — hepsi POST, streaming SSE)
```
POST   /api/fortunes/coffee            - Kahve falı
POST   /api/fortunes/kahve-fali        - Kahve falı (TR)
POST   /api/fortunes/tarot             - Tarot
POST   /api/fortunes/tarot-fali        - Tarot (TR)
POST   /api/fortunes/dream             - Rüya yorumu
POST   /api/fortunes/ruya-yorumu       - Rüya yorumu (TR)
POST   /api/fortunes/horoscope         - Burç
POST   /api/fortunes/burc-yorumu       - Burç (TR)
POST   /api/fortunes/love              - Aşk uyumu
POST   /api/fortunes/ask-uyumu         - Aşk uyumu (TR)
POST   /api/fortunes/palm              - El falı
POST   /api/fortunes/el-fali           - El falı (TR)
POST   /api/fortunes/angel             - Melek kartları
POST   /api/fortunes/melek-kartlari    - Melek kartları (TR)
POST   /api/fortunes/numerology        - Numeroloji
POST   /api/fortunes/numeroloji        - Numeroloji (TR)
POST   /api/fortunes/aura              - Aura
POST   /api/fortunes/aura-analizi      - Aura (TR)
POST   /api/fortunes/yesno             - Evet/Hayır
POST   /api/fortunes/evet-hayir        - Evet/Hayır (TR)
POST   /api/fortunes/birthchart        - Doğum haritası
POST   /api/fortunes/dogum-haritasi    - Doğum haritası (TR)
POST   /api/fortunes/istihare          - İstihare
POST   /api/fortunes/istikhara         - İstihare (EN)
POST   /api/fortunes/katina            - Katina
POST   /api/fortunes/kursundokme       - Kurşun dökme
POST   /api/fortunes/coffee-image      - Kahve fotoğrafından fal
POST   /api/fortunes/kahve-fali-image  - Kahve fotoğrafından fal (TR)
```

> ⚠️ **AI Fal Response**: Tüm fal endpoint'leri **SSE (text/event-stream)** ile streaming response döner. Flutter `EventSource` veya `http` paketinin stream desteğini kullanmalı.

### 4.13 Kısa Video (TikTok-style) (15 endpoint)
```
GET    /api/short-videos                     - Video akışı
POST   /api/short-videos                     - Video bilgi oluştur
GET    /api/short-videos/[id]                - Video detayı
DELETE /api/short-videos/[id]                - Video sil
POST   /api/short-videos/[id]/like           - Beğen
POST   /api/short-videos/[id]/view           - Görüntüleme
POST   /api/short-videos/[id]/save           - Kaydet
POST   /api/short-videos/[id]/share          - Paylaş
GET    /api/short-videos/[id]/comments       - Yorumlar
POST   /api/short-videos/[id]/comments       - Yorum yap
DELETE /api/short-videos/[id]/comments/[cId] - Yorum sil
POST   /api/short-videos/upload-url          - Upload URL al
POST   /api/short-videos/upload              - Video yükle
GET    /api/short-videos/explore             - Keşfet
GET    /api/short-videos/user/[userId]       - Kullanıcı videoları
```

### 4.14 Sosyal (12 endpoint)
```
GET    /api/social/posts                     - Post akışı
POST   /api/social/posts                     - Post paylaş
GET    /api/social/posts/[postId]            - Post detayı
DELETE /api/social/posts/[postId]            - Post sil
GET    /api/social/posts/[postId]/comments   - Yorumlar
POST   /api/social/posts/[postId]/comments   - Yorum yap
DELETE /api/social/posts/[postId]/comments   - Yorum sil
POST   /api/social/posts/[postId]/likes      - Beğen
POST   /api/social/posts/[postId]/view       - Görüntüleme
GET    /api/hashtags/trending                - Trend hashtagler
GET    /api/hashtags/search                  - Hashtag arama
GET    /api/hashtags/[name]                  - Hashtag detayı
```

### 4.15 Mesajlaşma (DM) (4 endpoint)
```
GET    /api/messages                         - Sohbet listesi
GET    /api/messages/[userId]                - Mesaj geçmişi
POST   /api/messages/[userId]                - Mesaj gönder
POST   /api/messages/request                 - Mesaj isteği
PATCH  /api/messages/request                 - İsteği onayla/reddet
```

### 4.16 Bildirimler (3 endpoint)
```
GET    /api/notifications                    - Bildirim listesi
POST   /api/notifications                    - Bildirimi okundu işaretle
DELETE /api/notifications                    - Bildirimi sil
GET    /api/notifications/stream             - SSE stream
```

### 4.17 Ödeme & Jeton (8 endpoint)
```
GET    /api/credit-packages                  - Kredi paketleri
GET    /api/payment-methods                  - Ödeme yöntemleri
GET    /api/jeton                            - Jeton bilgisi
POST   /api/jeton                            - Jeton işlemi
POST   /api/memberships/purchase             - Üyelik satın al
GET    /api/memberships                      - Üyelik listesi
GET    /api/payment/config                   - Ödeme ayarları
POST   /api/payment/requests                 - Ödeme talebi
GET    /api/payment/requests                 - Ödeme geçmişi
GET    /api/wallet                           - Cüzdan bilgisi
GET    /api/withdrawals                      - Çekim geçmişi
POST   /api/withdrawals                      - Çekim talebi
```

### 4.18 Oyunlar (14 endpoint)
```
GET    /api/games                            - Oyun listesi
POST   /api/games/play                       - Oyun oyna
GET    /api/games/profile                    - Oyun profili
GET    /api/games/leaderboard                - Liderlik tablosu
GET    /api/games/daily-reward               - Günlük ödül
POST   /api/games/daily-reward               - Ödül al
POST   /api/games/daily-spin                 - Günlük çark
GET    /api/games/quests                     - Görevler
POST   /api/games/quests                     - Görevi tamamla
GET    /api/games/room/[roomId]              - Oyun odası
POST   /api/games/room                       - Oyun odası oluştur
POST   /api/games/sos                        - SOS oyunu oluştur
GET    /api/games/sos/[gameId]               - SOS oyun durumu
```

### 4.19 Blog & Rüya Takvimi (12 endpoint)
```
GET    /api/blog                             - Blog listesi
GET    /api/blog/categories                  - Kategoriler
GET    /api/blog/comments                    - Yorumlar
POST   /api/blog/like                        - Beğen
POST   /api/blog/favorite                    - Favorile
GET    /api/dreams                           - Rüya sözlüğü
GET    /api/dreams/[slug]                    - Rüya detayı
POST   /api/dreams/interpret                 - Rüya yorumla
GET    /api/dream-diary                      - Rüya günlüğü
POST   /api/dream-diary                      - Rüya kaydet
GET    /api/dream-symbols                    - Rüya sembolleri
```

### 4.20 Ünlüler & Fan Kulübü (12 endpoint)
```
GET    /api/celebrities                                 - Ünlü listesi
GET    /api/celebrities/[slug]                          - Ünlü detayı
POST   /api/celebrities/[slug]/follow                   - Takip et
GET    /api/celebrities/[slug]/fan-club                 - Fan kulübü
POST   /api/celebrities/[slug]/fan-club/join            - Katıl
GET    /api/celebrities/[slug]/fan-club/posts           - Gönderiler
POST   /api/celebrities/[slug]/fan-club/posts           - Gönderi paylaş
GET    /api/celebrities/[slug]/fan-club/members         - Üyeler
GET    /api/celebrities/[slug]/fan-club/polls           - Anketler
POST   /api/celebrities/[slug]/fan-club/polls           - Anket oluştur
GET    /api/fan-clubs/popular                           - Popüler kulüpler
```

### 4.21 Ajans (8 endpoint)
```
POST   /api/agency/apply                     - Ajans başvurusu
GET    /api/agency/my                        - Kendi ajansım
PATCH  /api/agency/my                        - Ajans güncelle
GET    /api/agency/members                   - Üyeler
GET    /api/agency/earnings                  - Kazançlar
POST   /api/agency/invite                    - Davet gönder
POST   /api/agency/join                      - Ajansa katıl
POST   /api/agency/leave                     - Ajanstan ayrıl
GET    /api/agency/leaderboard               - Liderlik
GET    /api/agency/withdrawals               - Çekim geçmişi
POST   /api/agency/withdrawals               - Çekim talebi
```

### 4.22 Story (3 endpoint)
```
GET    /api/stories                          - Hikayeler
POST   /api/stories                          - Hikaye oluştur
DELETE /api/stories                          - Hikaye sil
```

### 4.23 Diğer (20+ endpoint)
```
GET    /api/homepage-buttons                 - Anasayfa butonları
GET    /api/homepage-fortune-cards           - Fal kartları
GET    /api/homepage-ticker                  - Alt yazı mesajları
GET    /api/announcements                    - Duyurular
POST   /api/announcements                    - Duyuru paylaş
GET    /api/leaderboard                      - Liderlik tablosu
GET    /api/search                           - Arama
GET    /api/search/advanced                  - Gelişmiş arama
POST   /api/contact                          - İletişim formu
GET    /api/popups                           - Pop-up'lar
GET    /api/broadcast-images                 - Yayın görselleri
POST   /api/devices/fcm                      - Push token kaydet
DELETE /api/devices/fcm                      - Push token sil
GET    /api/daily-login                      - Günlük giriş
POST   /api/daily-login                      - Giriş ödülü al
GET    /api/daily-missions                   - Günlük görevler
POST   /api/daily-missions                   - Görevi tamamla
POST   /api/upload/presigned                 - Dosya yükleme URL'i
POST   /api/upload/get-url                   - Upload URL al
GET    /api/presence                         - Online durumu
POST   /api/presence                         - Presence güncelle
GET    /api/profile-frames                   - Profil çerçeveleri
GET    /api/trend-videos                     - Trend videolar
GET    /api/tiktok-videos                    - TikTok videoları
GET    /api/horoscope/daily                  - Günlük burç
GET    /api/football                         - Futbol sonuçları
GET    /api/referral                         - Referans bilgisi
GET    /api/public-stats                     - Platform istatistikleri
POST   /api/user/watch-ad                    - Reklam izle + ödül
```

---

## 5. WEB-ONLY ENDPOINT'LER (Flutter Kullanamaz)

| Endpoint | Neden | Çözüm |
|----------|-------|-------|
| `POST /api/auth/change-password` | ✅ Düzeltildi | Dual auth eklendi |
| `POST /api/auth/reclaim-device` | getServerSession only | `authenticateRequest` ekle |
| `GET /api/auth/verify-device` | getServerSession only | `authenticateRequest` ekle |
| `GET /api/share-card` | HTML render (server-side) | Flutter'da client-side render |
| `GET /api/docs/download` | Server file access | Flutter'da URL aç |
| `GET /api/settings/themes` | Web tema sistemi | Flutter kendi temasını kullanır |

> **Not:** 431 endpoint'ten 238'i zaten dual auth destekliyor. Kalan non-admin endpoint'lerin büyük çoğunluğu public (auth gerektirmeyen) endpoint'ler.

---

## 6. EKSİK / ÖNERİLEN YENİ ENDPOINT'LER

### 6.1 Kritik Eksikler 🔴

| Endpoint | Açıklama |
|----------|----------|
| `POST /api/auth/mobile-apple` | ✅ Eklendi — Apple Sign-In |
| `GET /api/mobile/config` | ✅ Eklendi — Uygulama konfigürasyonu |
| `POST /api/user/block` | ✅ Eklendi — Kullanıcı engelle/engeli kaldır |
| `POST /api/user/report` | ✅ Eklendi — Kullanıcı raporla |

### 6.2 Önerilen İyileştirmeler 🟡

| Mevcut | Öneri |
|--------|-------|
| Ayrı fal endpoint'leri | `/api/fortunes/generate` tek endpoint, `type` parametreli |
| Her endpoint farklı format | Standart `lib/api-response.ts` wrapper'ına geçiş |
| Sayfalama tutarsız | Tüm liste endpoint'lerinde cursor/offset pagination |

---

## 7. PERFORMANS DURUMU

### 7.1 Mevcut Optimizasyonlar ✅
- ✅ In-memory cache (`lib/cache.ts` → getCached, getCachedPlatformSetting)
- ✅ Auth token cache (`lib/perf.ts` → getCachedAuth)
- ✅ Database index'ler (ChatPresence, ChatRoomGift, Notification, ShortVideo)
- ✅ Prisma `select` clause (gereksiz alan çekme azaltıldı)
- ✅ Promise.all paralel sorgular
- ✅ SSE in-memory event bus (DB polling yerine)
- ✅ Connection pooling (Prisma default)
- ✅ Rate limiting (`lib/rate-limiter.ts`)

### 7.2 Eksik Performans İyileştirmeleri
- ❌ Redis cache yok (in-memory = tek instance, scale sorunlu)
- ❌ ETag header'ları yok
- ❌ Brotli/Gzip explicitly set değil (Next.js default var)
- ❌ CDN header'ları (Cache-Control) tutarsız
- ❌ Cursor-based pagination az sayıda endpoint'te var

---

## 8. GÜVENLİK DEĞERLENDİRMESİ

### 8.1 Güçlü Yönler ✅
- JWT token'lar server-side sign/verify
- Rate limiting tüm auth endpoint'lerinde aktif
- Dual auth her yerde tutarlı
- Admin endpoint'ler middleware korumalı
- Role-based access control

### 8.2 İyileştirme Gereken
- Token blacklist/revocation mekanizması yok
- Refresh token rotation (her kullanımda yeni token) yok
- Device fingerprint tracking sınırlı
- API key/secret pair (service-to-service) yok

---

## 9. ÖNCELİK SIRASI — YAPILACAK İYİLEŞTİRMELER

| # | İş | Öncelik | Etki |
|---|-----|---------|------|
| 1 | Apple Sign-In endpoint | 🔴 Kritik | iOS App Store zorunlu |
| 2 | Mobile config endpoint | 🔴 Kritik | Force update, maintenance |
| 3 | change-password dual auth | 🟡 Orta | Mobil şifre değişikliği |
| 4 | User block endpoint | 🟡 Orta | Sosyal güvenlik |
| 5 | Standart response format geçişi | 🟡 Orta | Flutter parsing tutarlılığı |
| 6 | Push notification entegrasyonu | 🟡 Orta | FCM endpoint var, OneSignal mevcut |
| 7 | ETag/Cache-Control header'ları | 🟢 Düşük | Bandwidth optimizasyonu |
| 8 | Cursor pagination | 🟢 Düşük | Büyük liste performansı |
| 9 | Token blacklist | 🟢 Düşük | Güvenlik iyileştirmesi |

---

## 10. FILE UPLOAD

### Presigned URL Akışı
```
1. POST /api/upload/presigned
   Body: { fileName, contentType, isPublic }
   Response: { uploadUrl, fileUrl, cloudStoragePath }

2. PUT uploadUrl (S3 presigned)
   Headers: Content-Type: <contentType>
   Body: file binary

3. Dosya URL'ini ilgili endpoint'e gönder
```

---

## 11. PUSH NOTIFICATION

### FCM Token Kayıt
```
POST /api/devices/fcm
Body: { token: "fcm_token", platform: "android"|"ios", appVersion: "1.0.0" }
```

### Push Token Silme (Logout)
```
DELETE /api/devices/fcm
Body: { token: "fcm_token" }
```

> Backend OneSignal kullanıyor (`lib/onesignal.ts`). Flutter tarafında firebase_messaging veya onesignal_flutter kullanılabilir.

---
