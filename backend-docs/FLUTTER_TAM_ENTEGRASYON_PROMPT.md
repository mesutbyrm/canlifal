# CanlıFal — Flutter Tam Entegrasyon Promptu

> **Bu belge doğrudan bir Flutter geliştiricisine veya kod yazan bir yapay zekâ ajanına verilmek üzere hazırlanmıştır.**
> Kopyalayıp prompt olarak kullanabilirsiniz. İçinde: taban adres, kimlik doğrulama, tüm modül uçları,
> gerçek zamanlı akışlar, sesli/görüntülü yayın, hediye motoru, müzik/DJ, ödeme, ve Flutter tarafında
> yapılması gereken işlerin tam listesi ile referans dosya yolları yer alır.
>
> Son güncelleme: 8 Ağustos 2026 · Backend durumu: **690 uç, 438 benzersiz yol, 148 kategori** · Yayında: `https://canlifal.com`

---

## 0. ⚠️ ACİL — KIRILMIŞ OLABİLECEK ESKİ UÇLAR

Backend tarafında çift uçlar birleştirildi ve **aşağıdaki 9 eski uç tamamen SİLİNDİ**. Flutter uygulaması hâlâ bunları çağırıyorsa **404 alır ve ilgili ekran çalışmaz**. İlk iş olarak projede bu yolları arayın ve kanonik karşılıklarıyla değiştirin.

| ❌ Silinen (artık 404) | ✅ Kanonik yeni uç | Not |
|---|---|---|
| `GET /api/leaderboard` | `GET /api/leaderboards` | sadece isim çoğullandı |
| `GET /api/membership/packages` | `GET /api/memberships/packages` | |
| `GET /api/payment/config` | `GET /api/payments/config` | |
| `GET/POST /api/payment/requests` | `GET/POST /api/payments/requests` | |
| `GET /api/payment-methods` | `GET /api/payments/methods` | |
| `GET /api/payment-settings` | `GET /api/payments/settings` | |
| `GET /api/rooms/{id}/music/current` | `GET /api/chat/rooms/{roomId}/music` | yol tabanı `chat/rooms` oldu |
| `POST /api/rooms/{id}/music/skip` | **`DELETE`** `/api/chat/rooms/{roomId}/music` | **HTTP yöntemi değişti: POST → DELETE** |
| `POST /api/rooms/{id}/music/stop` | `POST /api/chat/rooms/{roomId}/music/stop` | |

Ayrıca: `POST /api/tencent/webhook` **korunmuştur** (sağlayıcı panelinde kayıtlı), kanonik adı `POST /api/trtc/webhook`'tur. İkisi de çalışır; yeni kayıtlarda kanonik olanı kullanın.

**Sürümleme kuralı:** Bu projede `/api/v1/`, `/api/v2/`, `/api/version/`, `/api/legacy/` **yoktur ve kullanılmayacaktır.** Tüm uçlar tek kanonik ad alanındadır: `https://canlifal.com/api/**`.

---

## 1. Temel Bilgiler

| Konu | Değer |
|---|---|
| Taban adres (prod) | `https://canlifal.com` |
| API ön eki | `/api` |
| İçerik tipi | `application/json; charset=utf-8` (yüklemeler hariç) |
| Karakter seti | UTF-8, Türkçe karakterler destekli |
| Hata gövdesi | `{ "error": "Türkçe kullanıcıya gösterilebilir mesaj" }` |
| Bazı yeni uçlarda hata | `{ "success": false, "error": { "code": "...", "message": "..." } }` |
| Oran sınırı aşımı | HTTP `429` + `{ "error": "Çok fazla istek. Lütfen biraz bekleyin." }` |
| Gerçek zamanlı | **SSE** (Server-Sent Events) — WebSocket yok |
| Sesli/görüntülü | **Tencent TRTC** (Agora terk edildi) |

**Hata mesajları zaten Türkçedir ve doğrudan kullanıcıya gösterilebilir.** Flutter tarafında ayrıca çeviri sözlüğü tutmayın; `error` alanını olduğu gibi SnackBar/Dialog içinde gösterin. Yalnızca `401` için oturum yenileme, `429` için geri çekilme (backoff) mantığı kurun.

---

## 2. Kimlik Doğrulama (Mobil JWT)

Backend'de iki kimlik yolu vardır:

- 🔄 **dual** — Mobil JWT **veya** web oturumu kabul eder. **Flutter bu uçları JWT ile çağırır.** (Uçların büyük çoğunluğu bu tiptedir.)
- 🌍 **public** — Kimlik gerekmez.
- 🌐 **session** — Yalnız web oturumu (Flutter kullanmaz).
- 🔒 **admin** — Yönetici rolü gerekir (mobil uygulama kullanmaz).

### 2.1 Uçlar

| Yöntem | Yol | Kimlik | Açıklama |
|---|---|---|---|
| POST | `/api/auth/mobile-register` | public | Kayıt |
| POST | `/api/auth/mobile-login` | public | E-posta **veya** kullanıcı adı + şifre |
| POST | `/api/auth/mobile-refresh` | public | Yenileme jetonu ile yeni çift üretir |
| POST | `/api/auth/mobile-google` | public | Google ile giriş |
| POST | `/api/auth/mobile-apple` | public | Apple ile giriş |
| POST | `/api/auth/mobile-tiktok` | public | TikTok ile giriş |
| POST | `/api/auth/logout` | dual | Çıkış |
| POST | `/api/auth/change-password` | dual | Şifre değiştirme |
| POST | `/api/auth/forgot-password` | public | Şifre sıfırlama e-postası |
| POST | `/api/auth/reset-password` | public | Yeni şifre belirleme |

### 2.2 Giriş isteği/yanıtı

```http
POST /api/auth/mobile-login
Content-Type: application/json

{ "email": "kullanici@ornek.com", "password": "******" }
```
`email` yerine `username` de gönderilebilir (alan adı `username`).

```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "user": {
    "id": "...", "email": "...", "name": "...", "username": "...",
    "role": "USER", "image": "https://i.pinimg.com/474x/51/f6/fb/51f6fb256629fc755b8870c801092942.jpg",
    "credits": 0, "jetonBalance": 0, "cfcBalance": 0,
    "membership": null, "membershipExpiresAt": null,
    "preferredLanguage": "tr", "level": 1,
    "bio": null, "phone": null, "birthDate": null,
    "zodiacSign": null, "referralCode": "..."
  }
}
```

### 2.3 Jeton ömürleri ve başlık

- `accessToken` → **7 gün**
- `refreshToken` → **30 gün**
- Her korumalı istekte: `Authorization: Bearer <accessToken>`

**Flutter'da yapılacak:** Bir `AuthInterceptor` yazın. `401` gelirse `/api/auth/mobile-refresh` ile tek seferlik yenileme yapıp isteği tekrar deneyin; yenileme de başarısızsa oturumu kapatıp giriş ekranına yönlendirin. Eşzamanlı 401'lerde tek bir yenileme isteği çalışsın (mutex/kilit).

**Depolama:** Jetonlar `flutter_secure_storage` içinde tutulmalı, asla `SharedPreferences` düz metninde değil.

### 2.4 Bildirim cihazı kaydı

| Yöntem | Yol | Açıklama |
|---|---|---|
| POST | `/api/devices/fcm` | Girişten sonra cihaz jetonunu kaydet |
| DELETE | `/api/devices/fcm` | Çıkışta kaydı sil |

---

## 3. Mobil'e Özel Toplu Uçlar (önce bunları kullanın)

Ağ trafiğini azaltmak için mobil için hazırlanmış birleşik uçlar mevcut. Ana ekranı tek tek uçlarla değil bunlarla besleyin.

| Yöntem | Yol | Kimlik | Açıklama |
|---|---|---|---|
| GET | `/api/mobile/config` | public | Uygulama yapılandırması, zorunlu sürüm, açık/kapalı özellikler |
| GET | `/api/mobile/home` | dual | Ana ekranın tüm blokları tek yanıtta |
| GET | `/api/mobile/fortune-menu` | dual | Fal kategorileri menüsü |
| GET | `/api/mobile/user-profile/{userId}` | dual | Başka kullanıcının mobil profil görünümü |
| GET | `/api/me` · PATCH `/api/me` | dual | Kısa "ben" bilgisi ve güncelleme |

---

## 4. Kullanıcı ve Profil

| Yöntem | Yol | Açıklama |
|---|---|---|
| GET / PATCH | `/api/user/profile` | Profil oku/güncelle |
| GET | `/api/user/credits` | Kredi/jeton bakiyesi |
| GET | `/api/user/statistics`, `/api/user/stats`, `/api/user/xp`, `/api/user/achievements` | İstatistik, seviye, başarımlar |
| GET | `/api/user/activity` · PATCH aynı yol | Etkinlik/son görülme |
| GET | `/api/user/followers`, `/api/user/following`, `/api/user/likers` | Sosyal listeler |
| POST / DELETE | `/api/user/{userId}/follow` · GET `/api/user/{userId}/follow-status` | Takip |
| GET / POST | `/api/user/block` · GET/DELETE `/api/user/blocked` | Engelleme |
| POST | `/api/user/report` | Şikâyet |
| GET | `/api/user/received-gifts` | Alınan hediyeler |
| GET | `/api/user/fortunes` · PATCH `/api/user/fortunes/{fortuneId}` | Kullanıcının falları |
| GET / PATCH | `/api/user/theme` | Tema tercihi |
| GET / POST | `/api/user/watch-ad` | Reklam izleyip ödül alma |
| GET | `/api/user/broadcast-history`, `/api/user/co-broadcast-invites` | Yayın geçmişi/davetler |
| GET | `/api/user/active-sessions` | Aktif oturumlar |
| GET | `/api/users/{userId}`, `/api/users/lookup/{username}`, `/api/users/search`, `/api/users/online`, `/api/users/{userId}/posts` | Diğer kullanıcılar |

### 4.1 Kozmetik alanlar (yeni)
`GET /api/user/profile` artık şu alanları da döner — Flutter bunları okuyup görselleştirmeli:

```
nameEffect            → isim üzerindeki efekt kimliği
entranceEffectId      → odaya giriş animasyonu
chatBubbleId          → sohbet balonu görünümü
micFrameId            → mikrofon koltuğu çerçevesi
avatarAccessoryIds[]  → avatar aksesuarları (liste)
```
İlgili katalog uçları: `GET /api/profile-frames` (POST ile takma), `GET /api/room-themes/catalog`, `GET /api/membership-badges`.

---

## 5. Jeton, Cüzdan, Ödeme, Üyelik

| Yöntem | Yol | Kimlik | Açıklama |
|---|---|---|---|
| GET / POST | `/api/jeton` | dual | Jeton bakiyesi / işlem |
| GET | `/api/wallet` | dual | Cüzdan özeti |
| GET | `/api/credit-packages` | public | Kredi paketleri *(60 sn önbellekli)* |
| GET | `/api/payments/methods` | public | Ödeme yöntemleri *(60 sn önbellekli)* |
| GET | `/api/payments/settings` | public | Ödeme ayarları |
| GET | `/api/payments/config` | dual | Kullanıcıya özel ödeme yapılandırması |
| GET / POST | `/api/payments/requests` | dual | Ödeme talebi oluştur/listele |
| GET / POST | `/api/payments/notify` | dual | Ödeme bildirimi |
| GET | `/api/memberships` · `/api/memberships/packages` | public | Üyelik planları |
| POST | `/api/memberships/purchase` | dual | Üyelik satın alma |
| GET / POST | `/api/withdrawals` | dual | Para çekme (falcı/yayıncı) |

**Önbellek başlığı:** `credit-packages` ve `payments/methods` `Cache-Control: public, max-age=60, stale-while-revalidate=300` döner. Flutter'da bu iki listeyi 60 saniye yerel önbellekte tutun.

**Mağaza kuralı:** iOS/Android mağaza politikaları gereği dijital jeton satışında platform içi satın alma gerekebilir. `GET /api/mobile/config` içindeki bayrakları okuyup ödeme akışını buna göre gösterin/gizleyin.

---

## 6. Hediye Sistemi

| Yöntem | Yol | Kimlik | Açıklama |
|---|---|---|---|
| GET | `/api/gifts/catalog` | dual | Tam hediye kataloğu |
| GET | `/api/gifts/types` | public | Hediye tipleri |
| GET | `/api/gifts/version` | public | **Katalog sürümü — önbellek geçersizleme için** |
| POST | `/api/gifts/send` | dual | Kullanıcıya doğrudan hediye |
| POST | `/api/gifts/check-reciprocal` | dual | Karşılıklı hediye kontrolü |
| GET | `/api/gifts/recent-big` | public | Son büyük hediyeler (duyuru şeridi) |
| GET | `/api/gifts/lucky/config` · `/api/gifts/lucky/history` · POST `/api/gifts/lucky/send` | dual | Şanslı hediye |
| GET | `/api/gift-engine/gifts` · `/api/gift-engine/queue` · POST `/api/gift-engine/finish` | public/dual | Animasyon kuyruğu motoru |
| POST | `/api/chat/rooms/{roomId}/gifts` · GET aynı yol | dual | Sesli odada hediye |
| POST | `/api/video-streams/{streamId}/gifts` · GET aynı yol | dual | Görüntülü yayında hediye |
| POST | `/api/live/gift/send` · GET `/api/live/gift-types` | dual | Canlı falcı odasında hediye |

### 6.1 Gövde biçimleri

```jsonc
// POST /api/gifts/send
{ "recipientUsername": "kullanici", "giftTypeId": "...", "jetonAmount": 100, "type": "gift" }

// POST /api/chat/rooms/{roomId}/gifts
{ "recipientId": "...", "giftTypeId": "...", "quantity": 1 }

// POST /api/video-streams/{streamId}/gifts
{ "giftTypeId": "...", "quantity": 1 }
```

### 6.2 Medya URL kuralı — ÖNEMLİ
Hediye medyası backend'de `serializeGiftMedia` ile **tam nitelikli CDN adresi** olarak döner (`https://...`).
**Flutter asla taban adres birleştirmesi yapmasın**; gelen URL'yi olduğu gibi kullansın. `.svga`, `.webp`, `.mp4`, `.json` (Lottie) uzantılarına göre oynatıcı seçin.

### 6.3 Animasyon kuyruğu
Aynı anda birden fazla hediye gelirse ekranı boğmayın: `gift-engine/queue` mantığını Flutter'da da uygulayın — tek bir kuyruk, sırayla oynat, bitince `POST /api/gift-engine/finish` ile bildir. Büyük hediyeler tam ekran, küçükler alt şeritte gösterilsin.

---

## 7. Sesli Sohbet Odaları (`/api/chat/rooms/**`)

> ⚠️ **İKİ AYRI ODA KİMLİK UZAYI VAR — KARIŞTIRMAYIN**
> - `/api/chat/rooms/{roomId}` → **sesli sohbet odası** (`VoiceRoom.id`)
> - `/api/room/{sessionId}` → **birebir canlı fal seansı** (`LiveSession.id`)
> Bunlar birleştirilmedi, kimlikler birbirinin yerine kullanılamaz.

| Yöntem | Yol | Açıklama |
|---|---|---|
| GET | `/api/chat/rooms` | Oda listesi (public) |
| POST | `/api/chat/rooms/create` | Oda oluştur |
| GET | `/api/chat/rooms/backgrounds` · `/api/chat/broadcast-images` | Arka planlar/görseller |
| GET | `/api/chat/rooms/{roomId}/state` | Odanın tam anlık durumu — **odaya girişte ilk çağrı bu olmalı** |
| GET / POST / DELETE | `/api/chat/rooms/{roomId}/messages` | Mesajlar |
| GET | `/api/chat/rooms/{roomId}/stream` | **SSE — gerçek zamanlı akış** |
| GET / PATCH | `/api/chat/rooms/{roomId}/seats` | Mikrofon koltukları |
| GET / POST | `/api/chat/rooms/{roomId}/voice` | Ses aç/kapat durumu |
| GET / POST / DELETE | `/api/chat/rooms/{roomId}/presence` | Odaya giriş/çıkış/kalp atışı |
| GET / POST | `/api/chat/rooms/{roomId}/typing` | Yazıyor göstergesi |
| GET / PATCH | `/api/chat/rooms/{roomId}/settings` | Oda ayarları |
| GET / POST | `/api/chat/rooms/{roomId}/moderation` | Susturma/atma |
| POST | `/api/chat/rooms/{roomId}/transfer-ownership` | Sahiplik devri |
| GET / POST | `/api/chat/rooms/{roomId}/pk` · POST `/pk/score` · GET `/api/chat/rooms/pk-list` | PK yarışması |
| GET / POST | `/api/chat/rooms/{roomId}/gifts` | Odada hediye |

### 7.1 SSE olay tipleri — `GET /api/chat/rooms/{roomId}/stream`

Her satır `data: {json}\n\n` biçimindedir. `type` alanına göre ayrıştırın:

| `type` | Anlamı |
|---|---|
| `connected` | Bağlantı kuruldu (ilk olay) |
| `messages` | Yeni sohbet mesajı/mesajları |
| `system` | Sistem duyurusu |
| `gift` | Odada hediye gönderildi → animasyon kuyruğuna at |
| `pk` | PK skoru/durumu güncellendi |
| `room_event` | Oda düzeyinde olay (ayar, sahiplik, müzik vb.) |
| `presence` | Katılımcı listesi/koltuk değişimi |
| `typing` | Yazıyor göstergesi |

Ayrıca 15 saniyede bir `: heartbeat` yorum satırı gelir — bunu yok sayın ama zaman aşımı sayacınızı sıfırlayın.

---

## 8. Müzik / DJ (sesli odalarda)

| Yöntem | Yol | Açıklama |
|---|---|---|
| GET | `/api/chat/rooms/{roomId}/music` | **Şu an çalan parça** |
| POST | `/api/chat/rooms/{roomId}/music` | Parça çal → gövde: `{ "videoId": "...", "title": "...", "duration": 215 }` |
| **DELETE** | `/api/chat/rooms/{roomId}/music` | **Parçayı atla (eski `music/skip` yerine)** |
| POST | `/api/chat/rooms/{roomId}/music/stop` | Müziği durdur |
| GET | `/api/chat/rooms/{roomId}/music-queue` | Sıradaki parçalar |
| GET / POST / PATCH | `/api/chat/rooms/{roomId}/song-request` | Şarkı isteği |
| GET / POST | `/api/chat/rooms/{roomId}/dj` | DJ yetkisi |
| GET | `/api/music/search` (dual) · `/api/music/history` (public) | Arama/geçmiş |
| GET | `/api/chat/youtube-stream` · `/api/short-videos/music` | Akış kaynakları |

**Senkronizasyon:** Sunucu parçanın başlangıç zaman damgasını döner. Flutter, kendi oynatıcısını `şu an - başlangıç` farkına göre ileri sararak senkronlar; SSE'den gelen `room_event` müzik değişimlerinde `GET .../music` ile durumu tazeler.

---

## 9. Canlı Fal Seansı (birebir) — `/api/room/{sessionId}/**`

| Yöntem | Yol | Açıklama |
|---|---|---|
| GET / PATCH | `/api/room/{sessionId}` | Seans durumu / güncelleme |
| GET / POST | `/api/room/{sessionId}/messages` | Seans mesajları |
| GET | `/api/room/{sessionId}/stream` | **SSE — seans akışı** |
| GET | `/api/room/{sessionId}/summary` | Seans özeti |
| GET / POST | `/api/room/{sessionId}/review` | Değerlendirme |
| POST | `/api/room/{sessionId}/tip` | Bahşiş |
| GET / POST / DELETE | `/api/room/signal` | WebRTC/ses sinyalleşme |

**SSE ilk olayı** şu alanları taşır ve süre sayacı bunun üzerine kurulur:
```json
{ "type":"connected", "sessionId":"...", "isUser":true, "isTeller":false,
  "status":"ACTIVE", "timerStarted":true, "timerStartedAt":"2026-08-08T...Z",
  "maxMinutes":15, "minutesUsed":3 }
```
**Flutter'da yapılacak:** Sayaç istemcide **yerel olarak** ilerlesin ama `timerStartedAt` + `maxMinutes` sunucu değerleriyle her yeniden bağlanmada düzeltilsin. Süre bitiminde ekranı kilitleyip uzatma/çıkış seçeneği sunun. Kredi düşümü **sunucuda** yapılır — istemci hesap yapmaz.

### 9.1 Falcı tarafı
| Yöntem | Yol | Açıklama |
|---|---|---|
| GET | `/api/fortune-tellers` · `/api/fortune-tellers/{tellerId}` | Falcı listesi/detay |
| GET | `/api/fortune-tellers/{tellerId}/reviews` | Yorumlar (public) |
| GET / POST | `/api/fortune-tellers/{tellerId}/session` | Seans başlat/durum |
| GET / POST | `/api/fortune-tellers/session` · GET `/api/fortune-tellers/sessions` | Falcının seansları |
| GET | `/api/fortune-tellers/sessions/stream` | **SSE — falcıya gelen seans talepleri** (`pending_sessions`) |
| PATCH | `/api/fortune-tellers/sessions/{sessionId}` | Kabul/ret |
| GET / POST | `/api/fortune-tellers/toggle-online` | Çevrimiçi durumu |
| GET | `/api/fortune-tellers/my-profile` · POST `/api/fortune-tellers/apply` | Falcı profili/başvuru |
| GET | `/api/teller/analytics`, `/api/teller/level`, `/api/teller/verification` (POST da var) | Falcı paneli |
| GET | `/api/teller-chat` · `/api/teller-chat/{sessionId}` (POST) | Falcı yazışması |
| GET / POST | `/api/favorite-tellers` | Favori falcılar |

---

## 10. Canlı Oda (çoklu) — `/api/live/**`

| Yöntem | Yol | Açıklama |
|---|---|---|
| POST | `/api/live/create-room`, `/api/live/join-room`, `/api/live/leave-room` | Oda yaşam döngüsü |
| POST | `/api/live/heartbeat` | Canlılık sinyali (30 sn'de bir) |
| GET | `/api/live/rooms`, `/api/live/online-users` | Listeler |
| GET / POST | `/api/live/message` | Oda mesajları |
| GET / POST | `/api/live/seats` | Koltuklar |
| GET / POST | `/api/live/pk` · POST `/api/live/pk/score` | PK |
| GET | `/api/live/gift-types` · POST `/api/live/gift/send` | Hediye |

---

## 11. Görüntülü Yayın — `/api/video-streams/**` (52 uç)

Bu grup **özellikle Flutter için** alan adlarıyla uyumlu hâle getirilmiştir.

### 11.1 Liste ve detay
| Yöntem | Yol | Açıklama |
|---|---|---|
| GET / POST | `/api/video-streams` | Yayın listesi / yayın başlat |
| GET / PATCH | `/api/video-streams/{streamId}` | Detay / güncelleme |
| POST | `/api/video-streams/{streamId}/live-started` | Yayın gerçekten başladı bildirimi |
| POST | `/api/video-streams/{streamId}/end` | Yayını bitir |
| GET / POST | `/api/video-streams/{streamId}/auto-close` | Otomatik kapanma |

**Yanıt zarfı:** `{ "streams": [...], "items": [...], "pagination": { ... } }` — `streams` ve `items` aynı veriyi taşır (geri uyumluluk).
**Her yayın nesnesindeki Flutter alanları:** `streamId`, `isLive`, `viewers`, `watching`, `broadcasterId`, `hostUserId`, `streamerName`, `thumbnailUrl`, `coverUrl`.

### 11.2 İzleyici ve etkileşim
| Yöntem | Yol | Açıklama |
|---|---|---|
| POST / DELETE | `/api/video-streams/{streamId}/join` · POST `/leave` | Katıl/ayrıl |
| GET | `/api/video-streams/{streamId}/viewers` | İzleyici listesi (public) |
| GET | `/api/video-streams/{streamId}/stream` | **SSE — yayın akışı** |
| GET / POST | `/api/video-streams/{streamId}/messages` · `/comments` | Sohbet/yorum |
| GET / POST | `/api/video-streams/{streamId}/like` | Beğeni |
| GET / POST | `/api/video-streams/{streamId}/gifts` · GET `/api/video-streams/gifts` | Hediye |

### 11.3 Moderasyon ve çoklu yayın
| Yöntem | Yol | Açıklama |
|---|---|---|
| GET / POST / DELETE | `.../moderators`, `.../ban`, `.../mute` | Moderatör, yasak, susturma |
| GET / POST / PATCH | `.../co-broadcast` · POST `.../co-broadcast/invite` | Ortak yayın |
| GET / POST | `.../pk-battle` · `/api/video-streams/pk` · `/pk/list` · `/pk/score` | PK savaşı |
| GET / POST / DELETE | `.../signal` ve `/api/video-streams/signal` | Sinyalleşme |
| GET / POST / PATCH / DELETE | `.../fortune-requests` · GET `.../fortune-requests/my-status` | Yayında fal talebi |

### 11.4 SSE olayları — `GET /api/video-streams/{streamId}/stream`
| `type` | Anlamı |
|---|---|
| `connected` | Bağlandı |
| `viewerCount` | İzleyici sayısı değişti |
| `streamMessage` | Yeni sohbet mesajı |
| `gift` | Hediye geldi |
| `pk` | PK durumu |
| `streamEnded` | Yayın bitti → ekranı kapat |

---

## 12. TRTC (Sesli/Görüntülü Altyapı)

| Yöntem | Yol | Açıklama |
|---|---|---|
| POST | `/api/trtc/token` | **Katılım imzası al** |
| POST | `/api/trtc/usersig` | Yalnız `userSig` |
| POST | `/api/trtc/webhook` | Sağlayıcı geri bildirimi (kanonik) |
| POST | `/api/tencent/webhook` | Aynı işin eski adı — korunuyor |

**İstek:**
```json
POST /api/trtc/token
{ "roomId": "<oda veya yayın kimliği>", "role": "host" }   // role: "host" | "audience"
```
**Yanıt:** `sdkAppId`, `userId`, `userSig`, `roomId`, `expireTime`

**Flutter'da yapılacak:**
1. `tencent_trtc_cloud` (veya güncel resmi Tencent Flutter paketi) ekleyin.
2. Odaya girmeden hemen önce `POST /api/trtc/token` çağırın — jetonu önbelleğe **almayın**, süresi kısadır.
3. `enterRoom(sdkAppId, userId, userSig, roomId, role)` ile katılın.
4. Mikrofon/kamera izinlerini (`permission_handler`) katılımdan önce alın.
5. Arka plana geçişte sesi sürdürmek için Android'de ön plan servisi, iOS'ta arka plan ses modunu etkinleştirin.
6. `roomId` olarak sesli odada `VoiceRoom.id`, görüntülü yayında `streamId` kullanılır — **karıştırmayın**.
7. Not: Bu platform **Agora'dan Tencent TRTC'ye geçmiştir.** Projede kalan Agora kodu ve `agoraUid` alan adı temizlenmeli; yeni alan adı `trtcUid`'dir.

---

## 13. Fal Üretimi (yapay zekâ falları)

Tümü `POST` ve `dual` kimlik ister. Her biri kredi/jeton düşer; yetersizse `400` + Türkçe mesaj döner.

```
/api/fortunes/kahve-fali            /api/fortunes/kahve-fali-image
/api/fortunes/tarot-fali            /api/fortunes/katina
/api/fortunes/el-fali               /api/fortunes/melek-kartlari
/api/fortunes/ruya-yorumu           /api/fortunes/istihare
/api/fortunes/burc-yorumu           /api/fortunes/dogum-haritasi
/api/fortunes/numeroloji            /api/fortunes/aura-analizi
/api/fortunes/ask-uyumu             /api/fortunes/evet-hayir
/api/fortunes/kursundokme
```
Destekleyici uçlar: `GET /api/fortune-request-types`, `GET /api/fortune-access`, `GET /api/horoscope`, `GET /api/compatibility`, `GET /api/astrology-panel`, rüya modülü (`/api/dreams`, `/api/dream-diary`, `/api/dream-symbols`, `/api/dream-contest`, `/api/dream-stats`, `/api/weekly-dream-report`).

**Flutter'da yapılacak:** Fal üretimi uzun sürebilir (yapay zekâ yanıtı). İstek zaman aşımını **90 saniye** yapın, ekranda ilerleme animasyonu gösterin ve kullanıcı ekrandan çıksa bile sonucu `GET /api/user/fortunes` üzerinden geri okuyabilsin.

---

## 14. Kısa Videolar, Sosyal, Mesajlaşma, Oyunlar

| Alan | Uçlar |
|---|---|
| Kısa video (21 uç) | `GET /api/short-videos`, `/explore`, `/{id}`, `/{id}/comments`, `/{id}/like`, `/{id}/save`, `/{id}/share`, `/{id}/view`, `/{id}/duets`, `POST /upload`, `POST /upload-url`, `GET /profile/{userId}`, `GET /user/{userId}`, `GET /music`, `GET /mentions/search` |
| Sosyal akış | `GET/POST /api/social/posts`, `/{postId}`, `/{postId}/comments`, `/{postId}/likes`, `/{postId}/view`, `GET/POST/DELETE /api/stories` |
| Özel mesaj | `GET /api/messages`, `GET/POST /api/messages/{userId}`, `POST/PATCH /api/messages/request` |
| Bildirim | `GET/POST/DELETE /api/notifications`, **`GET /api/notifications/stream` (SSE, `type: notification`)** |
| Oyunlar (38 uç) | `/api/games`, `/lobby`, `/play`, `/profile`, `/quests`, `/leaderboard`, `/daily-reward`, `/daily-spin`, `/lamba-cini`, `/room/**`, `/sos/**` |
| Günlük ödül | `GET/POST /api/daily-login`, `GET/POST /api/daily-missions` |
| Sıralama | `GET /api/leaderboards` |
| Davet | `GET /api/referral`, `GET /api/referral/validate` |
| Varlık | `GET/POST /api/presence`, `GET /api/presence/sections` |
| Arama | `GET /api/search`, `GET /api/search/advanced` |
| Duyuru | `GET/POST /api/announcements`, `POST /api/announcements/event`, `GET /api/popups`, `GET /api/homepage-ticker` |
| Ayar | `GET /api/settings/public`, `/api/settings/ads`, `/api/settings/themes` |

---

## 15. Dosya Yükleme

| Yöntem | Yol | Açıklama |
|---|---|---|
| GET / POST | `/api/upload/get-url` | İmzalı yükleme adresi |
| POST | `/api/upload/presigned` | Ön imzalı yükleme |
| POST | `/api/short-videos/upload-url` · `/api/short-videos/upload` | Video yükleme |

**Akış:** ① Backend'den imzalı adres al → ② Dosyayı **doğrudan** o adrese `PUT` ile yükle (backend üzerinden geçirme) → ③ Dönen depolama yolunu ilgili uca gönder.
**Flutter'da yapılacak:** Görselleri yüklemeden önce sıkıştırın (`flutter_image_compress`), ilerleme yüzdesi gösterin, iptal edilebilir olsun.

---

## 16. Flutter Tarafında Yapılacaklar (görev listesi)

### 16.1 Altyapı
1. **Ağ katmanı:** `dio` + `AuthInterceptor` (Bearer ekleme), `RefreshInterceptor` (401 → tek seferlik yenileme), `RetryInterceptor` (ağ hatası ve 429 için üstel geri çekilme), `LogInterceptor` (yalnız hata ayıklama derlemesinde).
2. **Taban adres tek yerde:** `const kApiBase = 'https://canlifal.com/api';` — hiçbir ekranda elle URL yazılmasın. `/v1/`, `/v2/` **eklenmeyecek**.
3. **Güvenli depolama:** `flutter_secure_storage` ile `accessToken` / `refreshToken`.
4. **Model sınıfları:** `json_serializable` ile üretin. Bilinmeyen alanlar sessizce yok sayılsın; backend alan eklediğinde uygulama çökmemeli.
5. **Durum yönetimi:** Riverpod veya Bloc — tek seçim, karma kullanmayın.
6. **Hata gösterimi:** Ortak `ApiException(message, statusCode)`; `message` doğrudan `error` alanından gelir ve Türkçedir.

### 16.2 SSE (gerçek zamanlı) istemcisi
7. Tek bir `SseClient` sınıfı yazın: `Authorization` başlıklı `GET`, `text/event-stream` okuma, satır satır `data:` ayrıştırma, `: heartbeat` yok sayma.
8. **Otomatik yeniden bağlanma:** kopmada 1s → 2s → 4s → 8s (üst sınır 30s) üstel geri çekilme.
9. **Yeniden bağlanınca durum tazeleme:** sesli odada `GET .../state`, seansta `GET /api/room/{sessionId}`, yayında `GET /api/video-streams/{streamId}` çağırıp kaçırılan durumu senkronlayın.
10. Uygulama arka plana alındığında SSE'yi kapatın, öne geldiğinde yeniden açın (pil tasarrufu).
11. Aynı anda **en fazla 2 SSE** açık olsun (örn. oda akışı + bildirim akışı).

### 16.3 Ekranlar
12. Giriş/kayıt (e-posta, kullanıcı adı, Google, Apple, TikTok).
13. Ana ekran → `GET /api/mobile/home` tek çağrısıyla.
14. Falcı listesi/detay/seans başlatma → süre sayacı ve kredi uyarıları.
15. Sesli oda: koltuklar, mikrofon, sohbet, hediye animasyonu, müzik/DJ paneli, PK.
16. Görüntülü yayın: izleyici sayısı, sohbet, hediye, ortak yayın, moderasyon.
17. Fal üretim ekranları (14 fal tipi) + geçmiş.
18. Jeton mağazası, üyelik, ödeme talebi, para çekme.
19. Profil, kozmetikler (çerçeve, balon, giriş efekti), takip/engelleme.
20. Kısa video akışı, sosyal gönderiler, özel mesaj, bildirimler.
21. Oyunlar, günlük ödül, sıralama, davet.

### 16.4 Kurallar
22. **İş mantığı backend'dedir.** Kredi düşme, hediye bedeli, seans süresi, PK skoru istemcide hesaplanmaz — sunucu yanıtı ve SSE olayı esas alınır.
23. **Optimistik güncelleme yalnız beğeni/takip gibi geri alınabilir işlemlerde**; hediye ve ödemede asla.
24. **Medya URL'leri tam adrestir** — birleştirme yapmayın.
25. **Sürüm kontrolü:** açılışta `GET /api/mobile/config` ile zorunlu güncelleme bayrağını okuyun.
26. **Türkçe karakter:** tüm istek/yanıtlarda UTF-8; `Content-Type` başlığına `charset=utf-8` ekleyin.
27. **Oran sınırı:** `429` gelirse kullanıcıya mesajı gösterip butonu geçici kilitleyin; otomatik hızlı tekrar denemeyin.

---

## 17. Dosya Yolları (referans belgeler)

Tümü şu kök altındadır: `/home/ubuntu/fortune_telling_platform/`

### 17.1 Bu prompt
```
backend-docs/FLUTTER_TAM_ENTEGRASYON_PROMPT.md   ← bu belge
backend-docs/FLUTTER_TAM_ENTEGRASYON_PROMPT.pdf
backend-docs/FLUTTER_TAM_ENTEGRASYON_PROMPT.docx
```

### 17.2 Flutter'a özel rehberler
```
backend-docs/FLUTTER_BACKEND_ENTEGRASYON_PROMPT.md            (~15 KB) genel entegrasyon
backend-docs/FLUTTER_CANLI_FALCILAR_TRTC_HEDIYE_PROMPT.md     (~30 KB) TRTC + hediye ayrıntısı
backend-docs/CANLIFAL_FLUTTER_RESMI_SERVIS_ENTEGRASYONU.md    (~34 KB) resmi servis katmanı
backend-docs/FLUTTER_INTEGRATION.md                           (~9 KB)  müzik/DJ odaklı
```

### 17.3 API referansları
```
backend-docs/ENDPOINTS.md            (~90 KB)  690 ucun kategori bazlı tam tablosu
backend-docs/endpoints_index.json    (~181 KB) makine okunur liste
                                     kayıt: {path, method, auth, admin, rateLimit,
                                             pathParams, bodyFields, tag, dynamic}
backend-docs/openapi.json            (~1 MB)   OpenAPI 3 — 438 yol (kod üretimi için)
backend-docs/postman_collection.json (~773 KB) Postman koleksiyonu
docs/API_REGISTRY.md                           kanonik uç sicili
docs/MCP_REGISTRY.md                           10 araç + 3 kaynak (yalnız AI/otomasyon)
backend-docs/DEPRECATED_ENDPOINTS_TAKVIM.md    silinen uçlar ve takvim
```

> **OpenAPI'den model üretimi:** `openapi.json` dosyasını `openapi_generator` / `swagger_dart_code_generator` ile besleyerek Dart model ve servis iskeletini otomatik üretebilirsiniz. Bu, elle model yazmaktan hem hızlı hem hatasızdır.

### 17.4 Sistem dokümanları
```
backend-docs/CANLIFAL_REALTIME_SISTEMLER_DOKUMANTASYONU.md   (~50 KB) SSE, varlık, sinyalleşme
backend-docs/CANLIFAL_HEDIYE_SISTEMI_DOKUMANTASYONU.md       (~48 KB) hediye motoru
backend-docs/CANLIFAL_BACKEND_GELISTIRICI_DOKUMANTASYONU.md  (~20 KB) mimari
backend-docs/CANLIFAL_BACKEND_DENETIM_RAPORU.md              (~19 KB) denetim bulguları
backend-docs/MUSIC_API.md                                    (~8 KB)  müzik uçları
```

### 17.5 Veri modeli
```
backend-docs/DATABASE_REFERENCE.md   (~182 KB) tüm tablolar ve alanlar
backend-docs/database_schema.sql              SQL şeması
backend-docs/schema.prisma                    veri modeli tanımı
```

### 17.6 Uç kaynak kodu (doğruluk kontrolü için)
```
nextjs_space/app/api/**/route.ts     her ucun gerçek uygulaması
nextjs_space/lib/mobile-auth.ts      mobil JWT üretimi/doğrulaması
nextjs_space/lib/stream-events.ts    yayın olay tamponu (SSE kaynağı)
nextjs_space/lib/media-url.ts        hediye/medya tam URL üretimi
nextjs_space/lib/rate-limiter.ts     oran sınırı kuralları
```

### 17.7 Belge üretim betikleri
```
scripts_docs/generate_api_docs.py       ENDPOINTS.md üretir
scripts_docs/build_endpoint_list.py     endpoints_index.json üretir
scripts_docs/build_openapi_postman.py   openapi.json + postman_collection.json üretir
scripts_docs/build_db_reference.py      DATABASE_REFERENCE.md üretir
```

---

## 18. Hızlı Başlangıç Sırası (Flutter ajanı için)

1. `backend-docs/endpoints_index.json` ve `openapi.json` dosyalarını okuyun; Dart modellerini üretin.
2. Bölüm 0'daki tabloya göre projedeki eski uç yollarını **arayıp değiştirin**.
3. Ağ katmanını + jeton yenilemeyi kurun (Bölüm 2, 16.1).
4. `GET /api/mobile/config` ve `GET /api/mobile/home` ile ana akışı ayağa kaldırın.
5. `SseClient` yazın ve sesli oda akışına bağlayın (Bölüm 7.1, 16.2).
6. TRTC katılımını `POST /api/trtc/token` ile bağlayın (Bölüm 12).
7. Hediye kataloğu + animasyon kuyruğunu bağlayın (Bölüm 6).
8. Ödeme/jeton/üyelik ekranlarını bağlayın (Bölüm 5).
9. Kalan modülleri (fal, kısa video, sosyal, oyun) sırayla ekleyin.

---

## 19. Kontrol Listesi (teslim öncesi)

- [ ] Projede `/api/v1/`, `/api/v2/`, `/api/legacy/`, `/api/version/` geçen **tek bir satır bile yok**
- [ ] Bölüm 0'daki 9 eski uçtan hiçbiri kullanılmıyor (`music/skip` artık `DELETE .../music`)
- [ ] Tüm korumalı istekler `Authorization: Bearer` taşıyor
- [ ] 401'de tek seferlik yenileme çalışıyor, sonsuz döngü yok
- [ ] SSE kopmalarında üstel geri çekilme + durum tazeleme var
- [ ] Sesli oda kimliği (`roomId`) ile fal seansı kimliği (`sessionId`) hiçbir yerde karışmıyor
- [ ] Medya URL'lerine taban adres eklenmiyor
- [ ] Hediye animasyonları kuyrukta, tek tek oynatılıyor
- [ ] Kredi/süre hesabı istemcide yapılmıyor
- [ ] Hata mesajları backend'den geldiği gibi (Türkçe) gösteriliyor
- [ ] `GET /api/mobile/config` ile zorunlu güncelleme kontrolü açılışta yapılıyor
