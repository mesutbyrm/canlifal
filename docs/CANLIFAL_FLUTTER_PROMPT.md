# CANLIFAL — FLUTTER MOBİL UYGULAMA PROMPTU (TEK SEFERDE KOPYALANABİLİR)

> Aşağıdaki metnin **tamamını** kopyalayıp bir Flutter geliştirici yapay zekâsına (veya geliştirici ekibine) tek seferde verebilirsiniz. Hiçbir ek açıklamaya ihtiyaç duymaz.

---

Sen kıdemli bir Flutter geliştiricisisin. Aşağıda tanımlanan **CanlıFal** platformunun **eksiksiz** iOS + Android mobil uygulamasını üret. Backend hazır ve canlıdır; yeni backend yazma, yalnızca mevcut REST API'yi tüket.

## 0) TEMEL BİLGİLER

| Konu | Değer |
|---|---|
| Ürün adı | CanlıFal |
| API kökü (prod) | `https://canlifal.com/api` |
| Dil | Türkçe (varsayılan), altyapı çok dilli (`tr`, `en`) |
| Para birimleri | **Jeton** (satın alınan ana para birimi), **CFC** (ikincil/etkinlik parası), **TL** (gerçek para) |
| **Jeton fiyatı** | **1 Jeton = 0,50 TL → 10.000 Jeton = 5.000 TL** |
| Otomatik indirim/bonus | **KAPALI.** İstemci asla indirim/bonus/kampanya hesaplamaz. |
| Tema | Koyu tema öncelikli ("canlidark"), mor/altın vurgu renkleri, yuvarlak köşeler, gradyan kartlar |

### Kritik fiyat kuralı (zorunlu)
- Jeton satın alma ekranı **tutarı kendisi hesaplamaz**; `GET /api/public/jeton-price?jeton=<adet>` çağırır ve dönen `quote.finalAmount` değerini gösterir.
- Ödeme bildirimi gönderirken `amount` alanına **yalnızca** bu `finalAmount` yazılır.
- Backend tutarı yeniden hesaplar; uyuşmazsa `400 { code: "PRICE_MISMATCH", expectedAmount, unitPrice, jetonAmount }` döner. Bu durumda kullanıcıya *"Fiyat güncellendi, lütfen tekrar deneyin"* gösterilip ekran yeniden fiyat çeker.
- Kullanıcı **TL tutarını elle yazamaz**; yalnızca **Jeton adedi** girer veya hazır paket seçer. (Yalnızca Gold üyelik ödemesinde serbest tutar vardır.)

## 1) TEKNİK YIĞIN (zorunlu)

- Flutter 3.22+ / Dart 3.4+, null-safety.
- Durum yönetimi: **Riverpod** (`flutter_riverpod` + `riverpod_annotation`).
- Yönlendirme: **go_router** (deep link destekli).
- HTTP: **dio** + interceptor (otomatik `Authorization: Bearer`, 401'de refresh, retry, hata eşlemesi).
- Model/JSON: **freezed** + **json_serializable**.
- Yerel depolama: `flutter_secure_storage` (token), `hive` (önbellek).
- Gerçek zamanlı: **SSE** (`/stream` uçları) için `http` paketiyle akış okuma; ayrıca kısa aralıklı polling fallback.
- Sesli/görüntülü yayın: **Tencent TRTC** (`tencent_trtc_cloud`). İmza `GET /api/trtc/usersig`, oda token `GET /api/trtc/token`.
- Push bildirim: **Firebase Cloud Messaging** (token kaydı `POST /api/devices/fcm` ve `POST /api/user/device-token`).
- Medya: `image_picker`, `video_player`, `cached_network_image`, `lottie` (animasyonlar), `flutter_svg` (kozmetik SVG'ler).
- Yerelleştirme: `flutter_localizations` + `intl`, metinler `GET /api/translations` üzerinden de güncellenebilir.
- Mimari: `lib/core` (ağ, tema, yönlendirme, hatalar), `lib/data` (modeller, repository), `lib/features/<özellik>` (ekran + controller + widget), `lib/shared` (ortak widget).

## 2) KİMLİK DOĞRULAMA

Mobil uçlar JWT tabanlıdır (NextAuth çerezi değil).

| Amaç | Uç |
|---|---|
| Kayıt | `POST /api/auth/mobile-register` |
| Giriş | `POST /api/auth/mobile-login` — body `{ email veya username, password }` → `{ accessToken, refreshToken, user }` |
| Token yenileme | `POST /api/auth/mobile-refresh` |
| Google ile giriş | `POST /api/auth/mobile-google` |
| Apple ile giriş | `POST /api/auth/mobile-apple` |
| TikTok ile giriş | `POST /api/auth/mobile-tiktok` |
| Telefon OTP | `POST /api/auth/phone/send-otp`, `POST /api/auth/phone/verify-otp` |
| E-posta doğrulama | `POST /api/auth/email/send-verification`, `POST /api/auth/email/verify` |
| Şifre sıfırlama | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| Şifre değiştirme | `POST /api/auth/change-password` |
| Oturumlar | `GET/DELETE /api/auth/mobile-sessions`, `/api/auth/mobile-sessions/[id]` |
| Cihaz tokeni | `POST /api/auth/mobile/device-token` |
| Çıkış | `POST /api/auth/logout`, `POST /api/auth/logout-all` |

Tüm korumalı isteklere `Authorization: Bearer <accessToken>` eklenir. 401 alınınca refresh denenir, başarısızsa giriş ekranına yönlendirilir.

## 3) UYGULAMA AÇILIŞI

1. `GET /api/mobile/config?platform=ios|android&version=<sürüm>` → zorunlu güncelleme, bakım modu, özellik bayrakları, mağaza bağlantıları. Bakım modunda bakım ekranı; zorunlu güncellemede kapatılamayan güncelleme diyaloğu.
2. `GET /api/bootstrap` → genel yapılandırma.
3. `GET /api/mobile/home` → **tek istekte** ana sayfa: `liveStreams`, `voiceRooms`, `fortuneCards`, `homepageButtons`, `announcements`, `liveTellers`, `user`.
4. `GET /api/mobile/fortune-menu` → fal menüsü.
5. `GET /api/translations` → metin sözlüğü.

## 4) EKRANLAR VE MODÜLLER (hepsi uygulanacak)

### 4.1 Ana sayfa
Canlı yayın kartları, sesli oda kartları, fal kartları, duyuru şeridi (`GET /api/homepage-ticker`), çevrimiçi falcılar, hızlı erişim butonları (`GET /api/homepage-buttons`), popup'lar (`GET /api/popups`).

### 4.2 Fal modülü
`GET /api/fortune-request-types`, `GET /api/online-fal`.
Fal türleri (her biri ayrı ekran + sonuç ekranı):
`kahve-fali` (fotoğraf yükleme), `el-fali` (fotoğraf), `tarot-fali`, `katina`, `melek-kartlari`, `ruya-yorumu`, `burc-yorumu`, `dogum-haritasi`, `numeroloji`, `aura-analizi`, `ask-uyumu`, `evet-hayir`, `istihare`, `kursundokme`.
Uçlar: `POST /api/fortunes/<tür>`. Erişim kontrolü: `GET /api/fortune-access/check`, `POST /api/fortune-access/consume`.
Geçmiş: `GET /api/user/fortunes`, detay/sabitleme/puanlama: `/api/user/fortunes/[fortuneId]`, `/pin`, `/rate`.

### 4.3 Canlı falcılar
`GET /api/fortune-tellers` (liste, filtre, arama), `/[tellerId]` (profil), `/[tellerId]/reviews`, `/[tellerId]/session` (jetonla seans başlat), `GET /api/advisors/online`, favoriler `GET/POST /api/favorite-tellers`.
Falcı paneli (falcı rolündeki kullanıcı için): `GET /api/fortune-tellers/my-profile`, `POST /api/fortune-tellers/toggle-online`, `GET /api/teller/analytics`, `/api/teller/level`, `/api/teller/reviews`, `/api/teller/gifts`, başvuru `POST /api/fortune-tellers/apply`, doğrulama `/api/teller/verification`.
Seans sohbeti: `GET/POST /api/teller-chat`, `/api/teller-chat/[sessionId]`, canlı akış `/api/fortune-tellers/sessions/stream` (SSE).

### 4.4 Sesli sohbet odaları (voice room)
Liste `GET /api/chat/rooms`, oluştur `POST /api/chat/rooms/create` (jeton bedelli), katıl/çık, arka planlar `GET /api/chat/rooms/backgrounds`.
Oda içi: mesajlar `/api/chat/rooms/[roomId]/messages` (+ SSE `/stream`), koltuklar `/seats`, `/join-seat`, mikrofon istekleri `/speak-request(s)`, moderasyon `/mute`, `/kick`, `/bans/[userId]`, `/moderation`, roller `/roles`, sahiplik devri `/transfer-ownership`, sabitlenmiş mesaj `/pin-message`, yasaklı kelimeler `/banned-words`, yazıyor göstergesi `/typing`, varlık `/presence`, durum `/state` & `/sync`.
Müzik/DJ: `/music`, `/music-queue`, `/music-settings`, `/music-request-by-query`, `/song-request` (jeton bedelli), `/dj`, `GET /api/music/search`, `GET /api/chat/music/popular`, YouTube ses `/api/chat/youtube-audio`.
PK (oda düellosu): `/pk`, `/pk/score`, `/pk/support`, `GET /api/chat/rooms/pk-list`.
Hediye: `POST /api/chat/rooms/[roomId]/gifts`.

### 4.5 Canlı video yayın
`GET /api/video-streams`, `POST /api/live/create-room`, katıl `/api/live/join-room`, ayrıl `/api/live/leave-room`, heartbeat `/api/live/heartbeat`.
Yayın içi: `/api/video-streams/[streamId]/{messages,comments,gifts,gifts/leaderboard,viewers,like,join,leave,end,moderator(s),mute,ban,background,image,co-broadcast,co-broadcast/invite,pk-battle,signal,stream,sync,media-heartbeat,fortune-requests}`.
PK: `/api/video-streams/pk`, `/pk/list`, `/pk/score`, `/pk/candidates`.
TRTC ile gerçek yayın: `GET /api/trtc/usersig`, `GET /api/trtc/token`.

### 4.6 Kısa videolar (shorts)
Dikey kaydırmalı akış: `GET /api/short-videos`, `/explore`, `/explore/nearby`, `/music`, `/hashtags/trending`.
Etkileşim: `/[id]/like`, `/save`, `/share`, `/view`, `/comments` (+ beğeni, sabitleme), `/duets`, `/subtitles/generate`.
Yükleme: `POST /api/short-videos/upload-url` → CDN'e PUT → `POST /api/short-videos/upload`.
Profil akışı: `/profile/[userId]`, `/user/[userId]`.

### 4.7 Sosyal
Akış `GET /api/social/posts`, gönderi detayı/yorum/beğeni, keşfet `/api/social/discovery`, hikâyeler `/api/stories` & `/api/social/stories`, hashtag `/api/hashtags/*`, arama `/api/search`, `/api/search/advanced`.
Profil: `GET /api/users/[userId]`, `/api/users/lookup/[username]`, takip `/api/users/[userId]/follow`, takipçiler/takip edilenler, engelleme `/api/user/block`, `/api/user/blocked`, şikayet `/api/user/report`, ziyaretçiler `/api/me/profile-visitors`.
Mesajlaşma: `/api/messages`, `/api/messages/[userId]`, `/api/messages/conversations/[peerId]/messages` (+ `/stream`, `/typing`), istek `/api/messages/request`.
Fan kulüpleri: `/api/fan-clubs`, `/[id]/join`, `/posts`, `/polls`.

### 4.8 Hediye sistemi
Katalog `GET /api/gifts/catalog`, `GET /api/gifts/types`, sürüm `GET /api/gifts/version` (yerel önbellek geçersizleştirme).
Gönder `POST /api/gifts/send`, şanslı hediye `/api/gifts/lucky/send` (CFC ile), hediye kutusu `/api/gift-box`, hedefler `/api/gifts/goals`, görevler `/api/gifts/missions`, savaşlar `/api/gifts/battles`, istatistik/koleksiyon `/api/gifts/insights/*`.
Animasyonlar: `GET /api/animations/manifest`, `/api/animations/me`, `/api/animations/resolve`, `/api/site-animations/active` (Lottie/SVGA/GIF oynatıcı; giriş-çıkış, koltuk, profil animasyonları).

### 4.9 Jeton & CFC cüzdan (ÖNEMLİ)
- Bakiye: `GET /api/jeton/balances` → `{ jetonBalance, fakeJetonBalance, isStaff, mustChooseSource }`; ayrıca `GET /api/wallet`, `GET /api/user/credits`.
- Fiyat: `GET /api/public/jeton-price?jeton=<adet>` → `{ unitPrice, cfcUnitPrice, discountEnabled, discountPercent, quote:{ jetonAmount, unitPrice, baseAmount, discountAmount, finalAmount } }`.
- Paketler: `GET /api/credit-packages`.
- Ödeme yöntemleri: `GET /api/payments/methods`, yapılandırma `GET /api/payments/config`, ayarlar `GET /api/payments/settings`.
- **Ödeme bildirimi:** `POST /api/payments/notify` body:
  ```json
  { "productType": "jeton" | "cfc" | "gold",
    "quantity": 10000,
    "amount": 5000,
    "paymentMethodId": "...",
    "senderName": "...",
    "note": "..." }
  ```
  `amount` daima sunucudan alınan `finalAmount` olmalıdır. Hata: `400 PRICE_MISMATCH`.
- Başvurularım: `GET /api/payments/requests`, itiraz `POST /api/payments/notifications/[id]/dispute`, bildirim `GET /api/notifications/payment`.
- Mağaza içi satın alma: `POST /api/billing/google-play/verify`, `POST /api/billing/app-store/verify`.
- **Sahte jeton:** personel hesapları harcamada kaynak seçer; istek gövdesine `jetonSource: "real" | "fake"` eklenir. `mustChooseSource` true ise harcama ekranlarında kaynak seçici gösterilir. Sahte jeton **paraya çevrilemez**, karşı tarafa kazanç yazmaz.

### 4.10 Para çekme (vergi/kesinti ile)
- Önizleme: `GET /api/withdrawals/quote?amount=<jeton>` →
  `{ jetonAmount, jetonBalance, rate, minWithdrawal, grossTL, taxPercent, taxAmount, netAmountTL, lifetime:{grossTL,netTL,taxTL}, labels }`.
- Ekranda mutlaka şu üç satır gösterilir:
  **Toplam kazandığınız:** `grossTL` TL · **Kesinti (%`taxPercent`):** `taxAmount` TL · **Elinize geçecek tahmini tutar:** `netAmountTL` TL.
- Talep: `POST /api/withdrawals`, geçmiş `GET /api/withdrawals`.
- Kesinti yüzdesi yalnızca yöneticinin belirlediği değerdir; uygulama asla sabit bir oran varsaymaz.

### 4.11 Üyelikler (VIP)
`GET /api/memberships`, `/api/membership/plans`, `/api/memberships/packages`, `/api/memberships/comparison`, satın alma `POST /api/membership/purchase` veya `/api/memberships/purchase`, hediye etme `/api/memberships/gift`, durum `/api/me/membership`, geçmiş `/api/me/membership-history`, VIP XP `/api/me/vip-xp`, VIP kimlik `/api/me/vip-identity`, tercihler `/api/me/vip-preferences`.
Seviyeler: free, gold, premium, diamond, svip. **Üyelik seviyesi jeton fiyatını DEĞİŞTİRMEZ.**

### 4.12 Kozmetikler
Profil çerçeveleri `/api/profile-frames`, mikrofon çerçeveleri `/api/mic-frames`, giriş efektleri `/api/entrance-effects`, isim efektleri `/api/name-effects`, sohbet balonları `/api/chat-bubbles`, avatar aksesuarları `/api/avatar-accessories`, emoji paketleri `/api/emoji-packs`, rozetler `/api/membership-badges`, oda temaları `/api/room-themes`.
Kullanıcıya açık kozmetikler üyelik seviyesine göre kademelidir (free → basic → gold → premium → diamond).

### 4.13 Ajans sistemi
Başvuru `POST /api/agency/apply`, ajansım `GET /api/agency/my`, üyeler `GET/POST /api/agency/members`, **davetler** `GET/POST/DELETE /api/agency/invites` (üye onayı olmadan kimse eklenemez), katılma `POST /api/agency/join`, ayrılma `POST /api/agency/leave` (**3 gün sonra otomatik onaylanır**, `autoLeaveAt` gösterilir), kazançlar `/api/agency/earnings`, görevler `/api/agency/tasks`, cüzdan `/api/agency/wallet` + `/transfer`, çekim `/api/agency/withdrawals`, sıralama `/api/agency/leaderboard`, davet kodu `/api/agency/invite`.

### 4.14 Oyunlar
`GET /api/games`, oyun odaları `/api/games/room(s)`, Okey/SOS `/api/games/sos/*`, eşleşme `/api/games/auto-match`, günlük ödül `/api/games/daily-reward`, çark `/api/games/daily-spin`, görevler `/api/games/quests`, profil `/api/games/profile`, turnuvalar `/api/tournaments`.

### 4.15 Rüya & blog & içerik
Rüya sözlüğü `/api/dream-symbols`, rüya günlüğü `/api/dream-diary`, yorum `/api/dreams/interpret`, yarışma `/api/dream-contest`, haftalık rapor `/api/weekly-dream-report`, trendler `/api/dreams/trends`.
Blog `/api/blog` (+ kategori, yorum, beğeni, favori), burçlar `/api/horoscope/daily`, uyum `/api/compatibility`, ünlüler `/api/celebrities`.
**Trend videolar bölümü şu anda kapalıdır:** `GET /api/trend-videos` `{ disabled: true }` dönerse bölüm hiç gösterilmez.

### 4.16 Bildirimler & diğer
`GET /api/notifications`, okundu `/[notificationId]/read`, okunmamış `/unread`, canlı akış `/notifications/stream` (SSE).
Günlük giriş `/api/daily-login`, günlük görevler `/api/user/daily-tasks`, başarımlar `/api/user/achievements`, liderlik `/api/leaderboards`, `/api/leaderboards/top100`, referans `/api/referral/*`, destek talepleri `/api/support/tickets`, ayarlar `/api/user/social-settings`, `/api/user/theme`, hesap silme `/api/user/account/delete`, reklam ödülü `/api/user/watch-ad`, `/api/ads/*`.

## 5) MEDYA YÜKLEME (CDN)

Tüm kullanıcı medyası CDN'e **kategori klasörleriyle** yüklenir:

1. `POST /api/upload/presigned` body `{ fileName, contentType, isPublic, folder }` → `{ uploadUrl, cloud_storage_path, publicUrl }`
2. Dönen `uploadUrl`'e dosyayı **PUT** ile gönder (`Content-Type` aynı olmalı; imzada `content-disposition` varsa `Content-Disposition: attachment` başlığını da ekle).
3. Veritabanına **yalnızca** `cloud_storage_path` kaydedilir; gösterimde `publicUrl` kullanılır.

| `folder` değeri | CDN klasörü | Kullanım |
|---|---|---|
| `profile` / `avatar` | `gift/profiles` | Profil fotoğrafı |
| `cover` / `kapak` | `gift/covers` | Kapak fotoğrafı |
| `social` / `post` | `gift/social` | Paylaşılan görseller |
| `video` / `shorts` | `gift/videos` | Paylaşılan videolar |
| `gift` | `gift/gifts` | Site hediyeleri |
| `cosmetic` | `gift/cosmetics` | Kozmetikler |
| `frame` | `gift/frames` | Profil çerçeveleri |
| `badge` | `gift/badges` | Rozetler |
| `fortune` | `gift/fortunes` | Fal görselleri (gizli) |
| `chat` | `gift/chat` | Sohbet ekleri |
| `announcement` | `gift/announcements` | Duyuru görselleri |

Kısa videolar ayrıca `shorts/videos` ve `shorts/thumbnails` klasörlerini kullanır.

## 6) GERÇEK ZAMANLI AKIŞLAR (SSE)

`/api/chat/rooms/[roomId]/stream`, `/api/video-streams/[streamId]/stream`, `/api/messages/conversations/[peerId]/stream`, `/api/notifications/stream`, `/api/fortune-tellers/sessions/stream`, `/api/pk/[matchId]/stream`, `/api/room/[sessionId]/stream`.
Uygulama arka plana alındığında akışlar kapatılır, öne gelince yeniden bağlanır (üstel geri çekilme).

## 7) TASARIM DİLİ

- Koyu arka plan (#0B0B12 – #15121F), mor (#7C3AED) ve altın (#F59E0B) vurgular, cam efektli kartlar, yumuşak gölgeler, 16–24 px yuvarlaklık.
- Üyelik rozetleri renk kodludur: gold #F59E0B, premium #A855F7, diamond #22D3EE, SVIP gradyan.
- Kurucu hesap rozeti: **"SİTE KURUCUSU"** altın gradyan.
- Tüm para alanları `tr_TR` biçiminde: `5.000,00 ₺`, jeton: `10.000 🪙`.
- Boş durum, yükleniyor (shimmer) ve hata ekranları her listede zorunlu.
- Erişilebilirlik: minimum 44×44 dokunma alanı, yeterli kontrast, ekran okuyucu etiketleri.

## 8) HATA YÖNETİMİ

| Kod | Davranış |
|---|---|
| 401 | Token yenile → başarısızsa giriş ekranı |
| 403 | "Bu işlem için yetkiniz yok" |
| 409 | "Bu işlem zaten yapılmış" (çift onay koruması) |
| 429 | "Çok fazla istek, lütfen bekleyin" + geri sayım |
| 400 `PRICE_MISMATCH` | Fiyatı yeniden çek, kullanıcıyı bilgilendir |
| 503 / bakım | Bakım ekranı |

## 9) TESLİM EDİLECEKLER

1. Derlenen, `flutter analyze` hatasız tam proje.
2. Yukarıdaki **tüm** modüller için ekranlar, controller'lar ve repository'ler.
3. `lib/core/network/api_client.dart` içinde tüm uçların merkezî tanımı.
4. Ortam dosyası (`--dart-define`) ile `API_BASE_URL` yapılandırması.
5. iOS + Android için izinler (kamera, mikrofon, galeri, bildirim, konum) ve mağaza yapılandırması.
6. README: kurulum, çalıştırma, yayınlama adımları.

**Hiçbir modülü atlama. Fiyat kurallarını (1 Jeton = 0,50 TL, istemci tarafı indirim yok, tutar sunucudan) harfi harfine uygula.**
