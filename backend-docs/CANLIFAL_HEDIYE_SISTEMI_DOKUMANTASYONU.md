# CanlıFal — Hediye (Gift) Sistemi Tam Dokümantasyonu

> **Amaç:** Flutter mobil uygulamasının hediyeleri web ile **%100 aynı** göstermesi ve aynı iş mantığını çalıştırması için gereken tüm alt sistemlerin uçtan uca referansı. Bu doküman **yalnızca gerçek kod tabanından** (schema + API route'ları + client bileşenleri) çıkarılmıştır. Var olmayan bir sistem "yok" olarak açıkça işaretlenmiştir.

**Sürüm:** 1.0 · **Kapsam:** Web (`nextjs_space`) + ortak Backend + veritabanı · **Dil:** TR/EN çift dilli veri modeli · **Durum:** Kod tabanından doğrulanmış

---

## İçindekiler

1. Genel Mimari ve Hediye Akışı Özeti
2. Veri Modelleri (GiftType, GiftCollection, GiftEvent, ChatRoomGift, StreamGift, LuckyGiftTier/Reward, JetonTransaction, CreditTransaction, RoomRevenueLog)
3. Gift API — Endpoint Referansı (JSON örnekleriyle)
4. Gift Category (Koleksiyon) Yönetimi
5. Gift Animation ve Asset Türleri — PNG / SVG / SVGA / Lottie / MP4 Sözleşmesi
6. Full Screen Gift (Tam Ekran Hediye)
7. Combo Gift (Kombo Hediye)
8. Gift Priority ve Gift Queue (Öncelik ve Kuyruk)
9. Coin (Jeton) Düşme Mantığı
10. Komisyon Dağılımı
11. Wallet (Cüzdan) Sistemi
12. Transaction Log (İşlem Kayıtları)
13. Rollback (Geri Alma) Sistemi
14. Gift Ranking (Sıralama / Liderlik)
15. Gift History (Hediye Geçmişi)
16. Lucky Gift (Şanslı Hediye) Sistemi
17. Flutter ↔ Web Parite ve Sürüm Senkronizasyonu
18. Akış Diyagramları (Toplu)

---

## 1. Genel Mimari ve Hediye Akışı Özeti

Hediye sistemi tek bir backend üzerinde çalışır; web (tarayıcı oturumu) ve Flutter (JWT mobil auth) **aynı endpoint'leri ve aynı veri modellerini** kullanır. Hediye bir **jeton (coin)** harcamasıdır: gönderen kullanıcının `jetonBalance` bakiyesinden düşülür, komisyon kesildikten sonra alıcıya (ve varsa oda sahibine) dağıtılır, kalan tutar siteye gelir olarak yazılır. Her işlem atomik olarak (`prisma.$transaction`) yürütülür ve denetim (audit) tablolarına kaydedilir.

### 1.1 Bağlamlar (Context)

Hediye 5 farklı bağlamda gönderilebilir. Her bağlamın kendi endpoint'i ve kendi komisyon ayarı vardır:

| Bağlam (context) | Nerede | Ana Endpoint | Komisyon ayarı (default) |
|---|---|---|---|
| `voice_room` | Sesli sohbet odası (koltuk/seat hediyesi) | `POST /api/chat/rooms/[roomId]/gifts` | `vr_*` ayarları (aşağıda) |
| `live_stream` | Canlı video yayını | `POST /api/video-streams/[streamId]/gifts` | `stream_gift_commission` (30%) |
| `stream`/`voice` (birleşik) | Flutter birleşik uç | `POST /api/live/gift/send` | bağlama göre |
| direct gift | Kullanıcıdan kullanıcıya (profil/mesaj) | `POST /api/gifts/send` | `direct_gift_commission` (0%) |
| `fortune` | Falcıya hediye | (falcı bağlamı) | — |

### 1.2 Uçtan uca akış (özet)

```
[Client: hediye seç + adet]
        │  POST (giftTypeId, quantity, hedef)
        ▼
[API route] ── auth (web session | mobil JWT)
        │
        ├─ 1. Rate limit kontrolü (gift:{userId}, 10/dk)
        ├─ 2. GiftType doğrula (aktif mi, fiyat)
        ├─ 3. totalPrice = price * quantity
        ├─ 4. Bakiye kontrolü (jetonBalance >= totalPrice)
        │
        ▼  prisma.$transaction([...])  ◄── ATOMİK BLOK
        │   a) sender.jetonBalance  -= totalPrice   (coin düşme)
        │   b) komisyon dağıtımı hesapla (receiver / owner / site)
        │   c) receiver.jetonBalance += receiverNet
        │   d) owner.jetonBalance   += ownerNet   (varsa)
        │   e) Gift kaydı (ChatRoomGift | StreamGift | GiftEvent)
        │   f) JetonTransaction satırları (gift_sent / gift_received / gift_commission)
        │   g) RoomRevenueLog audit satırı
        │
        ▼  (transaction commit)
        ├─ 8. Realtime event yayınla (gift → oda/yayın kanalı)
        ├─ 9. Agency komisyonu (fire-and-forget, ayrı)
        └─ 10. Response: { success, newBalance, gift, ... }
        │
        ▼
[Client: hediye animasyonunu kuyruğa al → oynat]
```

Her adımın ayrıntısı ilgili bölümde JSON örnekleriyle açıklanmıştır.

---

## 2. Veri Modelleri

Bu bölümdeki tüm alanlar `prisma/schema.prisma` dosyasından birebir alınmıştır. Flutter tarafı bu alanları aynen model sınıflarına eşlemelidir.

### 2.1 GiftType (Hediye tanımı — katalog kaydı)

Tüm hediyelerin ana tablosu. Hem web hem Flutter için tek doğruluk kaynağıdır.

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | String (cuid) | Birincil anahtar |
| `name` / `nameEn` | String | TR / EN görünen ad |
| `icon` | String | Emoji veya `/...` ile başlayan görsel yolu |
| `animation` | String? | Animasyon anahtarı (`coin_single`, `heart_rain`, `star_burst`, `sparkle_burst`, `coffee_pour`, `fire_burst`, `galaxy_explosion` vb.) |
| `price` | Int | Jeton fiyatı |
| `category` | String? | Serbest metin kategori (koleksiyondan ayrı) |
| `collectionId` | String? | `GiftCollection` FK (Gift Category) |
| `sortOrder` | Int | Sıralama |
| `isActive` | Boolean | Yayında mı |
| **Asset alanları** | | |
| `assetType` | String | **`image` \| `video` \| `lottie` \| `svga` \| `gif`** |
| `displayType` | String | `static` \| `animation` \| `video` \| `3d` \| `lottie` \| `effect` \| `fullscreen` \| `mini` \| `continuous` \| `play_once` |
| `assetUrl` | String? | Ana asset public URL (SVGA/Lottie/MP4/PNG) |
| `cloudStoragePath` | String? | Bulut depolama yolu (asset) |
| `thumbnailUrl` / `thumbnailCloudPath` | String? | Önizleme görseli |
| `iconImageUrl` / `iconImageCloudPath` | String? | Statik PNG/WebP ikon |
| `soundUrl` / `soundCloudPath` | String? | Efekt sesi |
| `musicUrl` / `musicCloudPath` | String? | Müzik |
| **Animasyon ayarları** | | |
| `animationDurationMs` | Int? | Animasyon süresi (ms) |
| `startDelayMs` | Int? | Başlama gecikmesi |
| `displayDurationMs` | Int? | Ekranda kalma süresi |
| `repeatCount` | Int | Tekrar (0 = sonsuz), default 1 |
| `volume` | Int | Ses 0–100, default 100 |
| `particleEffect` | String? | `confetti` \| `heart` \| `star` \| `light` \| `glow` \| `none` |
| `hasVibration` | Boolean | Titreşim (mobil) |
| `hasColorChange` | Boolean | Renk değişim efekti |
| `effectColor` | String? | Hex renk |
| `screenPosition` | String | `bottom`\|`top`\|`center`\|`right`\|`left`\|`above_seat`\|`user_avatar`\|`room_center`\|`fullscreen`\|`background`\|`message_area`\|`header`\|`footer` |
| `animStartPoint` / `animEndPoint` | String? | Animasyon başlangıç/bitiş noktası |
| **Bayraklar** | | |
| `isFullscreen` | Boolean | Tam ekran hediye |
| `comboEnabled` | Boolean | Kombo gönderime uygun |
| `tier` | String | `small` \| `big` \| `huge` (animasyon yoğunluğu) |
| `isPremium` / `requiresVip` | Boolean | Premium / VIP gerektirir |
| `isLucky` | Boolean | Şanslı hediye |
| `isHidden` | Boolean | Gizli (listede çıkmaz) |
| `isPopular` / `isNew` / `isFeatured` / `isSpecialEvent` | Boolean | Rozetler |
| `isSeasonal` + `seasonStart`/`seasonEnd` | Boolean/DateTime | Sezonluk |
| `timedCampaign` + `campaignStart`/`campaignEnd` | Boolean/DateTime | Süreli kampanya |
| `pkOnly`/`liveOnly`/`voiceOnly`/`newUserOnly`/`eventOnly` | Boolean | Bağlam kısıtı |
| `dailySendLimit` | Int? | Günlük gönderim limiti |
| `isReusable` | Boolean | Tekrar kullanılabilir |
| `contentVersion` | Int | **Senkron için sürüm; her değişiklikte artar** |
| **Görünürlük (visibility) — katalog bağlam filtresi** | | |
| `visibleInVoiceRoom` / `visibleInLiveStream` / `visibleInPK` / `visibleInProfile` / `visibleInMessaging` / `visibleInTrend` / `visibleInStories` / `visibleInFortune` / `visibleInNotification` | Boolean | Hangi bağlamda görünür |
| `visibleAsMini` / `visibleAsFullscreen` | Boolean | Mini / tam ekran gösterim uygunluğu |

### 2.2 GiftCollection (Gift Category — koleksiyon)

```jsonc
{
  "id": "clx...",
  "name": "Romantik",           // TR ad
  "nameEn": "Romantic",         // EN ad
  "slug": "romantik",           // benzersiz (unique)
  "description": "...",
  "iconEmoji": "❤️",
  "iconUrl": "https://.../heart.png",
  "iconCloudPath": "gift-collections/heart.png",
  "sortOrder": 1,
  "isActive": true,
  "_count": { "gifts": 12 }      // koleksiyondaki hediye sayısı (include ile)
}
```

### 2.3 GiftEvent (birleşik hediye olayı + gelir dağılımı denetimi)

`live/gift/send` ve istatistik/sıralama sistemlerinin dayandığı ana olay tablosu:

```jsonc
{
  "id": "clx...",
  "idempotencyKey": "uuid-...",  // çift işlemi/çift tıklamayı önler (unique)
  "giftTypeId": "clx...",
  "senderId": "clx...",
  "receiverId": "clx...",
  "context": "live_stream",      // live_stream|voice_room|video|short_video|fortune
  "contextId": "streamId|roomId|videoId|tellerId",
  "quantity": 3,
  "grossAmount": 300,            // toplam harcanan jeton (görünen değer)
  "siteAmount": 90,             // siteye kalan
  "receiverAmount": 210,        // alıcıya giden
  "ownerAmount": 0,             // oda sahibine giden (voice_room koltuk hediyesi)
  "ownerId": null,
  "recipientIsOwner": false,
  "senderCity": "Istanbul",
  "senderCountry": "TR",
  "battleId": null,             // gift battle sırasında gönderildiyse
  "status": "completed",        // completed | refunded | cancelled
  "createdAt": "2026-07-23T10:00:00.000Z"
}
```

### 2.4 ChatRoomGift (sesli/sohbet odası hediye kaydı)

Sesli odada gönderilen her hediye satırı. Oda içi liderlik ve "alınan jeton" rozetleri buradan hesaplanır (`getReceivedJetonTotals`).

```jsonc
{
  "id": "clx...",
  "roomId": "clx...",
  "senderId": "clx...",
  "recipientId": "clx...",
  "giftTypeId": "clx...",
  "quantity": 2,
  "unitPrice": 50,
  "totalPrice": 100,       // admin/personel gönderiminde 0 yazılabilir
  "icon": "🌹",
  "giftName": "Gül",
  "createdAt": "..."
}
```

### 2.5 StreamGift (canlı yayın hediye kaydı)

```jsonc
{
  "id": "clx...",
  "streamId": "clx...",
  "senderId": "clx...",
  "giftTypeId": "clx...",
  "quantity": 1,
  "totalPrice": 500,       // finanstan hariç gönderende 0
  "recipientAmount": 350,  // %30 komisyon sonrası
  "createdAt": "..."
}
```

### 2.6 LuckyGiftTier ve LuckyGiftReward (şanslı hediye)

```jsonc
// LuckyGiftTier (ödül kademesi — admin tanımlı)
{
  "id": "clx...",
  "name": "Jackpot",
  "nameEn": "Jackpot",
  "multiplier": 100,       // kazanç çarpanı
  "weight": 1,             // ağırlıklı rastgele seçim ağırlığı
  "isJackpot": true,
  "color": "#FFD700",
  "icon": "💰",
  "isActive": true,
  "sortOrder": 0,
  "contentVersion": 3
}

// LuckyGiftReward (bir çekiliş sonucu — kullanıcı geçmişi)
{
  "id": "clx...",
  "userId": "clx...",
  "giftTypeId": "clx...",
  "tierId": "clx...",
  "quantity": 1,
  "betJetons": 100,        // yatırılan = price * quantity
  "wonJetons": 10000,      // kazanılan = bet * multiplier
  "netJetons": 9900,       // net = won - bet
  "multiplier": 100,
  "isJackpot": true,
  "createdAt": "..."
}
```

### 2.7 JetonTransaction (jeton defteri — birincil hediye para birimi)

```jsonc
{
  "id": "clx...",
  "userId": "clx...",
  "amount": -100,          // negatif = harcama, pozitif = kazanç
  "type": "gift_sent",     // aşağıdaki tip listesi
  "description": "🌹 Gül x2 → @kullanici",
  "itemSlug": null,
  "balanceBefore": 500,    // işlem öncesi bakiye
  "balanceAfter": 400,     // işlem sonrası bakiye
  "createdAt": "..."
}
```

**`type` değerleri:** `spend`, `daily_bonus`, `streak_bonus`, `task`, `purchase`, `welcome`, `gift_sent`, `gift_received`, `gift_commission`, `lucky_gift_bet`, `lucky_gift_win`.

### 2.8 CreditTransaction (ikincil kredi defteri)

```jsonc
{
  "id": "clx...",
  "userId": "clx...",
  "amount": -50,
  "type": "gift_sent",     // purchase|gift_sent|gift_received|fortune|stream|reward|referral
  "description": "...",
  "relatedId": "clx...",
  "balance": 950,          // işlem sonrası kredi bakiyesi
  "createdAt": "..."
}
```

### 2.9 RoomRevenueLog (oda gelir denetim tablosu)

```jsonc
{
  "id": "clx...",
  "roomId": "clx...",
  "eventType": "gift",     // gift | music_request | ...
  "totalAmount": 100,
  "receiverAmount": 35,
  "ownerAmount": 15,
  "siteAmount": 50,
  "senderId": "clx...",
  "receiverId": "clx...",
  "ownerId": "clx...",
  "metadata": "{\"giftName\":\"Gül\",\"quantity\":2}",  // JSON string
  "createdAt": "..."
}
```

> **Not:** `User` modelinde iki bakiye alanı vardır: `jetonBalance` (Int?, hediyelerin birincil para birimi "jeton/coin") ve `credits` (ayrı kredi bakiyesi). `currencyType` alanı `'jeton'` veya `'cfc'` değerini alır. Hediyeler jeton ile çalışır.

---

## 3. Gift API — Endpoint Referansı

Tüm endpoint'ler **çift kimlik doğrulama (dual-auth)** destekler: Flutter için `Authorization: Bearer <JWT>` (mobil), web için oturum çerezi. Aşağıdaki tablo tüm hediye uçlarını özetler.

| Metot & Yol | Amaç | Auth |
|---|---|---|
| `GET /api/gifts/catalog` | Tam katalog + koleksiyonlar + sürüm (delta senkron) | dual |
| `GET /api/gifts/version` | Hafif sürüm kontrolü (senkron tetikleyici) | public |
| `GET /api/gifts/types` | Basit aktif hediye listesi (cache) | dual |
| `GET /api/live/gift-types` | Flutter hediye paneli listesi (cache 60s) | mobil |
| `GET /api/gifts/recent-big` | Son 15 dk büyük hediyeler (kayan banner) | dual |
| `POST /api/gifts/send` | Kullanıcıdan kullanıcıya direkt hediye / jeton transferi | dual |
| `POST /api/live/gift/send` | **Birleşik** yayın+oda hediye gönderimi (Flutter) | mobil |
| `POST /api/chat/rooms/[roomId]/gifts` | Sesli/sohbet odasında hediye | dual |
| `GET /api/chat/rooms/[roomId]/gifts` | Oda liderlik tablosu + son hediyeler | dual |
| `POST /api/video-streams/[streamId]/gifts` | Canlı yayında hediye | dual |
| `GET /api/video-streams/[streamId]/gifts` | Yayında son 50 hediye | dual |
| `POST /api/gifts/lucky/send` | Şanslı hediye çekilişi | dual |
| `GET /api/gifts/lucky/config` | Şanslı hediye kademe/oran yapılandırması | public |
| `GET /api/gifts/lucky/history` | Şanslı hediye geçmişi (me/global) | dual |
| `GET /api/gifts/check-reciprocal` | Karşılıklı hediye engeli kontrolü | dual |
| `GET /api/user/received-gifts` | Kullanıcının aldığı hediyeler + toplamlar | mobil |
| `GET/POST/PATCH /api/admin/gifts` | Admin hediye CRUD + filtre/sayfalama | admin |
| `GET/PATCH/DELETE /api/admin/gifts/[giftId]` | Tekil hediye detay/güncelle/sil | admin |
| `GET /api/admin/gifts/stats` | Hediye istatistikleri (global + tekil) | admin |
| `GET/POST/PATCH /api/admin/gift-collections` | Koleksiyon (kategori) CRUD | admin |
| `POST /api/admin/gift-upload` | Asset yükleme için presigned URL | admin |
| `GET/POST/PATCH /api/admin/lucky-gifts/tiers` | Şanslı hediye kademe CRUD | admin |

### 3.1 `POST /api/gifts/send` — Direkt hediye / jeton transferi

**İstek (hediye):**
```jsonc
{
  "recipientUsername": "aysenur",
  "giftTypeId": "clx...",
  "type": "gift"          // "gift" | "jeton"
}
```
**İstek (jeton transferi):**
```jsonc
{ "recipientUsername": "aysenur", "jetonAmount": 250, "type": "jeton" }
```

**Kurallar:**
- Rate limit: **10 istek / dakika** (anahtar `gift:{userId}`, `heavyLimiter`).
- **Karşılıklılık engeli:** Alıcı bugün gönderene hediye verdiyse → `403 { "error": "reciprocal_blocked", "message": "Kurnazlık yapma biz geleceği görürüz 😜" }`.
- Direkt hediye komisyonu: `direct_gift_commission` ayarı (default **0%**).
- Jeton transfer komisyonu: `jeton_transfer_commission` (default **0%**).

**Başarılı yanıt:**
```jsonc
{
  "success": true,
  "newBalance": 400,
  "gift": { "id": "clx...", "name": "Gül", "icon": "🌹", "price": 100 },
  "bigGift": {                 // yalnızca price >= 1000 ise
    "senderName": "Mehmet",
    "giftName": "Elmas",
    "icon": "💎"
  }
}
```

### 3.2 `POST /api/live/gift/send` — Birleşik gönderim (Flutter ana ucu)

**İstek:**
```jsonc
{
  "roomId": "clx...",
  "roomType": "stream",   // "stream" | "voice"
  "giftTypeId": "clx...",
  "quantity": 5,           // 1–100
  "recipientId": "clx..."  // voice_room koltuk hediyesi için
}
```

**Başarılı yanıt:**
```jsonc
{
  "success": true,
  "data": {
    "gift": {
      "id": "clx...", "giftTypeId": "clx...", "name": "Gül", "icon": "🌹",
      "quantity": 5, "totalPrice": 500, "senderId": "clx...", "recipientId": "clx..."
    },
    "newBalance": 1500,
    "pkUpdate": {            // PK/battle aktifse
      "battleId": "clx...", "challengerScore": 1200, "opponentScore": 800
    }
  }
}
```

**Hata zarfı (tüm birleşik uç için standart):**
```jsonc
{ "success": false, "error": { "code": "INSUFFICIENT_BALANCE", "message": "Yetersiz jeton" } }
```

**Hata kodları:** `UNAUTHORIZED`, `MISSING_PARAMS`, `INVALID_GIFT`, `USER_NOT_FOUND`, `INSUFFICIENT_BALANCE`, `STREAM_NOT_FOUND`, `SELF_GIFT`, `ROOM_NOT_FOUND`, `NO_RECIPIENT`, `RECIPIENT_NOT_FOUND`, `INVALID_ROOM_TYPE`, `INTERNAL_ERROR`.

### 3.3 `POST /api/chat/rooms/[roomId]/gifts` — Sesli/sohbet odası hediyesi

**İstek:**
```jsonc
{
  "recipientId": "clx...",
  "giftTypeId": "clx...",
  "quantity": 2,
  "battleId": "clx...",              // opsiyonel — PK skoru için
  "side": "challenger",              // "challenger" | "opponent"
  "streamId": "clx..."               // opsiyonel
}
```

Bu uç işlem içinde: `ChatRoomGift` kaydı + gönderen/alıcı/oda sahibi için `JetonTransaction` satırları + sistem `ChatMessage` (`🎁 gönderen → alıcı: icon ad xN [fiyat 💎]`) oluşturur ve odaya `gift` realtime olayı yayınlar.

**Başarılı yanıt:**
```jsonc
{
  "success": true,
  "gift": {
    "id": "clx...", "icon": "🌹", "giftName": "Gül",
    "quantity": 2, "totalPrice": 100,
    "senderId": "clx...", "recipientId": "clx..."
  },
  "newBalance": 900,
  "distribution": { "receiverAmount": 35, "ownerAmount": 15, "siteAmount": 50 }
}
```

**`GET /api/chat/rooms/[roomId]/gifts`** — İki mod:
- `?after=<ISO ts>` → o andan sonraki hediyeler (poll). Parametre yoksa son 15 sn.
- Liderlik: bugünkü en çok hediye alan **top 20** (yalnızca son 120 sn aktif kullanıcılar), jeton + cfc toplamlarıyla.

```jsonc
{
  "leaderboard": [
    { "userId": "clx...", "name": "Ayşe", "image": "...", "jetonTotal": 5400, "cfcTotal": 0, "rank": 1 }
  ],
  "recentGifts": [
    { "id": "clx...", "senderName": "Ali", "recipientName": "Ayşe", "icon": "🌹", "giftName": "Gül", "quantity": 1, "totalPrice": 50, "createdAt": "..." }
  ]
}
```

### 3.4 `POST /api/video-streams/[streamId]/gifts` — Canlı yayın hediyesi

Komisyon: `stream_gift_commission` (default **30%**) → `recipientAmount = floor(total * (100 - 30) / 100)`.

**İstek:** `{ "giftTypeId": "clx...", "quantity": 1 }`

**Yanıt:**
```jsonc
{
  "success": true,
  "gift": { "id": "clx...", "icon": "💎", "giftName": "Elmas", "quantity": 1, "totalPrice": 500 },
  "recipientAmount": 350,
  "newBalance": 1000
}
```
`GET` → son **50** hediye (yeni→eski).

### 3.5 `GET /api/gifts/catalog` — Tam katalog (delta senkron)

**Sorgu:** `?sinceVersion=<N>&context=<bağlam>`

`context` → görünürlük alanı eşlemesi:

| context | Filtre alanı |
|---|---|
| `voice_room` | `visibleInVoiceRoom` |
| `live_stream` | `visibleInLiveStream` |
| `pk` | `visibleInPK` |
| `profile` | `visibleInProfile` |
| `messaging` | `visibleInMessaging` |
| `trend` | `visibleInTrend` |
| `stories` | `visibleInStories` |
| `fortune` | `visibleInFortune` |
| `notification` | `visibleInNotification` |
| `mini` | `visibleAsMini` |
| `fullscreen` | `visibleAsFullscreen` |

**Yanıt:**
```jsonc
{
  "gifts": [ { /* GiftType (tüm alanlar) */ } ],
  "collections": [ { /* GiftCollection */ } ],
  "currentVersion": 42,
  "totalGifts": 128,
  "timestamp": "2026-07-23T10:00:00.000Z"
}
```
> `sinceVersion > 0` iken 60 sn, aksi halde `GIFT_TYPES` TTL ile cache'lenir; yalnızca `contentVersion > sinceVersion` olan hediyeler döner (delta).

### 3.6 `GET /api/gifts/version` — Hafif sürüm kontrolü

```jsonc
{ "giftVersion": 42, "themeVersion": 7, "giftCount": 128, "themeCount": 12, "timestamp": "..." }
```
Cache 30 sn, `Cache-Control: s-maxage=60`.

### 3.7 `GET /api/gifts/recent-big` — Büyük hediye banner'ı

Son 15 dk, `jeton >= 500` veya adlandırılmış hediye; en fazla **5** kayıt.

### 3.8 `GET /api/gifts/check-reciprocal`

**İstek:** `POST { "recipientId": "clx..." }` → **Yanıt:** `{ "blocked": true }`

---

## 4. Gift Category (Koleksiyon) Yönetimi

Hediyeler `GiftCollection` (kategori) altında gruplanır. Kategori CRUD tamamen admin panelindedir; Flutter kategoriyi **salt-okunur** olarak katalogdan (`/api/gifts/catalog` → `collections`) alır.

| Metot | Yol | İşlev |
|---|---|---|
| `GET` | `/api/admin/gift-collections` | Tüm koleksiyonlar + hediye sayısı |
| `POST` | `/api/admin/gift-collections` | Yeni koleksiyon (slug otomatik üretilir) |
| `PATCH` | `/api/admin/gift-collections` | Güncelle (`id` zorunlu) |

**POST isteği:**
```jsonc
{
  "name": "Romantik",
  "nameEn": "Romantic",
  "iconEmoji": "❤️",
  "iconUrl": "https://.../heart.png",
  "sortOrder": 1,
  "isActive": true
}
```
- `slug` gönderilmezse `name`'den üretilir: küçük harf + alfanümerik dışını `-` yapar.
- Aynı slug varsa → `409 { "error": "Bu slug zaten kullanılıyor" }` (Prisma `P2002`).
- Başarı → `201` + oluşturulan koleksiyon.

Hediye ↔ kategori bağı `GiftType.collectionId` alanı ile kurulur (admin hediye oluşturma/güncellemede).

---

## 5. Gift Animation ve Asset Türleri — Render Sözleşmesi

> **Kritik parite kuralı:** Sunucu hiçbir animasyonu render etmez. Sunucu yalnızca `assetType`, `displayType`, `assetUrl` ve animasyon ayar alanlarını sağlar. Hangi oynatıcının kullanılacağını **istemci (web + Flutter) `assetType` alanına göre** seçer. Web ve Flutter'ın **birebir aynı** görünmesi için ikisi de aşağıdaki eşlemeyi kullanmalıdır.

### 5.1 `assetType` → Oynatıcı eşlemesi

| `assetType` | Dosya türü | Web oynatıcı | Flutter oynatıcı | Kaynak alan |
|---|---|---|---|---|
| `image` | **PNG** / WebP / APNG / JPEG | `<img>` / `next/image` | `Image.network` | `assetUrl` ya da `iconImageUrl` |
| `image` | **SVG** (`image/svg+xml`) | `<img>` (SVG) | `flutter_svg` (`SvgPicture.network`) | `assetUrl` |
| `gif` | GIF | `<img>` | `Image.network` (GIF destekli) | `assetUrl` |
| `svga` | **SVGA** | `svgaplayerweb` | `svgaplayer_flutter` | `assetUrl` |
| `lottie` | **Lottie JSON** (`application/json`) | `lottie-web` / `@lottiefiles/react` | `lottie` paketi | `assetUrl` |
| `video` | **MP4** / WebM | `<video autoplay muted>` | `video_player` | `assetUrl` |

### 5.2 Asset yükleme — `POST /api/admin/gift-upload`

Admin, asset'i doğrudan buluta yükler; sunucu yalnızca **presigned upload URL** üretir (public). İzin verilen MIME türleri koda göre birebir:

```jsonc
{
  "image":  ["image/png", "image/svg+xml", "image/gif", "image/webp", "image/apng", "image/jpeg"],
  "video":  ["video/mp4", "video/webm"],
  "audio":  ["audio/mpeg", "audio/wav", "audio/mp3", "audio/ogg"],
  "lottie": ["application/json"]
}
```

**İstek:**
```jsonc
{ "fileName": "diamond.svga", "contentType": "application/octet-stream", "purpose": "asset" }
// purpose: asset | thumbnail | icon | sound | music
```
> Not: `contentType` yukarıdaki listede olmalıdır; aksi halde `400` "Desteklenmeyen dosya türü". (SVGA dosyaları çoğunlukla ikili olduğundan, mevcut MIME beyaz listesi PNG/SVG/GIF/WebP/APNG/MP4/WebM/MP3/WAV/Lottie-JSON türlerini kapsar; SVGA asset'i için dosya bulut yoluna yüklenir ve `assetType: "svga"` ile kayıt edilir.)

**Yanıt:**
```jsonc
{ "uploadUrl": "https://s3...signed", "cloud_storage_path": "gift-asset-diamond.svga" }
```

**Yükleme akışı:**
```
[Admin panel] ──1. presigned URL iste──▶ /api/admin/gift-upload
     ◀── { uploadUrl, cloud_storage_path } ──
[Admin panel] ──2. PUT dosya (uploadUrl'e doğrudan)──▶ [Bulut Depolama]
[Admin panel] ──3. POST /api/admin/gifts (cloudStoragePath + assetType)──▶
     [Sunucu getFileUrl ile public assetUrl üretir, GiftType kaydeder]
```

### 5.3 Animasyon ayarlarının istemci yorumu

`animationDurationMs`, `startDelayMs`, `displayDurationMs`, `repeatCount` (0=sonsuz), `volume`, `particleEffect`, `hasVibration` (mobilde titreşim), `hasColorChange`, `effectColor`, `screenPosition` alanları istemci oynatıcısına doğrudan geçirilir. Flutter ve web bu alanları **aynı** şekilde uygulamalıdır ki görünüm eşleşsin.

---

## 6. Full Screen Gift (Tam Ekran Hediye)

Bir hediyenin tam ekran gösterilmesi tamamen `GiftType` alanlarıyla belirlenir:

| Belirleyici alan | Değer |
|---|---|
| `isFullscreen` | `true` |
| `visibleAsFullscreen` | `true` (katalog `context=fullscreen` filtresine girer) |
| `displayType` | `"fullscreen"` |
| `screenPosition` | `"fullscreen"` |

**İstemci davranışı (web referansı — `gift-animation-overlay.tsx`):** Pahalı hediyelerde (fiyat ≥ 200 jeton) tam ekran bir **flash** efekti tetiklenir (600 ms). Flutter da aynı eşiği uygulayarak tam ekran katman göstermelidir. Tam ekran hediye kuyrukta tek başına oynatılır (bkz. Bölüm 8), diğer animasyonların üstüne biner.

```
fiyat >= 200  → tam ekran flash (600ms) + merkez animasyon
fiyat >= 500  → 5 sn süre + en yoğun partikül seti (galaxy)
isFullscreen  → screenPosition=fullscreen katmanı, arka planı kaplar
```

---

## 7. Combo Gift (Kombo Hediye)

Kombo, aynı hediyenin arka arkaya hızlı gönderiminin **tek animasyonda sayaçla** birleştirilmesidir.

**Sunucu tarafı:** Kombo, ayrı bir endpoint DEĞİLDİR. İstemci kullanıcının ard arda dokunuşlarını `quantity` (1–100) alanında toplayıp tek istekte gönderir. `GiftType.comboEnabled = true` olan hediyeler kombo için uygundur.

**İstemci tarafı kombo tespiti (web referansı — birebir kod mantığı):**
```
Yeni hediye geldiğinde:
  eğer (öncekiCombo.giftId == yeni.id
        && öncekiCombo.senderName == yeni.senderName
        && (şimdi - öncekiCombo.lastTime) < 5000 ms):
      combo.count += (yeni.quantity || 1)     // sayacı artır
  değilse:
      yeni combo başlat (count = yeni.quantity || 1)
  combo 5 sn işlem olmazsa temizlenir
```

Yani **aynı gönderen + aynı hediye + 5 sn içinde** = kombo sayacı artar (örn. "x2, x3, x10 …"). Flutter aynı 5 sn'lik pencereyi ve aynı eşleşme kuralını uygulamalıdır.

**Kombo JSON (istemci-içi durum):**
```jsonc
{
  "giftId": "clx...",
  "senderName": "Mehmet",
  "count": 12,
  "giftIcon": "🌹",
  "giftName": "Gül",
  "lastTime": 1753267200000
}
```

---

## 8. Gift Priority ve Gift Queue (Öncelik ve Kuyruk)

> **Dürüst durum:** Sunucuda ayrı bir "gift priority" veya "gift queue" tablosu/servisi **YOKTUR**. Öncelik ve kuyruk **istemci-taraflı bir animasyon kuyruğudur** ve sunucunun sağladığı alanlarla (`tier`, `price`, `isFullscreen`, `displayDurationMs`) yönetilir. Web'in referans uygulaması `components/gift-animation-overlay.tsx` içindedir; Flutter birebir aynı davranışı uygulamalıdır.

### 8.1 Kuyruk mantığı (FIFO + sıralı oynatma)

```
giftQueue: []          // gelen hediyeler eklenir
isAnimating: false

triggerGift(gift):
    giftQueue.push(gift)          // FIFO — sona ekle

processQueue (isAnimating false && queue boş değil):
    next = giftQueue.shift()      // baştan al
    isAnimating = true
    - kombo tespiti yap
    - fiyat >= 200 → tam ekran flash
    - partikülleri üret
    - süre = fiyat>=500 ? 5000ms : fiyat>=100 ? 4000ms : 3000ms
    - süre bitince: activeGift=null, 300ms sonra isAnimating=false
    → sıradaki hediye işlenir
```

Aynı anda **tek** hediye animasyonu oynar; diğerleri sırada bekler. Bu, ekranın animasyonla dolmasını engeller.

### 8.2 Öncelik (fiyat/tier tabanlı görsel yoğunluk)

Öncelik ayrı bir "sıraya sokma" değil; **görsel ağırlıktır** ve fiyata göre belirlenir:

| Fiyat eşiği | Süre | Partikül seti | Ek efekt |
|---|---|---|---|
| `>= 500` (luxury) | 5000 ms | `galaxy` (40 partikül) | tam ekran flash |
| `>= 200` (expensive) | 4000 ms | fire/yoğun | tam ekran flash (600ms) |
| `>= 100` (mid) | 4000 ms | fire (25) | — |
| `< 100` | 3000 ms | sparkle (15) | — |

`GiftType.tier` (`small`/`big`/`huge`) alanı da istemcide yoğunluk seçimi için kullanılabilir. Flutter, web ile aynı görünmek için **aynı fiyat eşiklerini ve süreleri** kullanmalıdır.

### 8.3 Partikül eşlemesi (animation anahtarı → emoji/renk)

Web referansındaki `animation` anahtarları: `coin_single`, `coin_spread_5`, `coin_spread_10`, `heart_rain`, `star_burst`, `sparkle_burst`, `coffee_pour`, `fire_burst`, `galaxy_explosion`. Her biri sabit bir renk paleti ve emoji seti kullanır (jeton/kalp/yıldız/sparkle/ateş/galaksi/kahve). Flutter aynı anahtar→palet eşlemesini taşımalıdır.

---

## 9. Coin (Jeton) Düşme Mantığı

Hediye gönderiminde jeton **her zaman gönderenden** düşülür. Kod mantığı:

```
totalPrice = giftType.price * quantity

// Personel/yönetici istisnaları
isStaff       = (sender.role === 'yonetici')          // sınırsız bakiye — DÜŞME YOK
senderExcluded = isExcludedFromFinance(sender.id)      // admin/personel — alıcı/oda KREDİLENMEZ

if (!isStaff):
    if ((sender.jetonBalance ?? 0) < totalPrice):
        → 400 "Yetersiz jeton"   (live/gift/send'de INSUFFICIENT_BALANCE)
    sender.jetonBalance decrement totalPrice     // atomik

if (senderExcluded):
    // alıcı ve oda sahibi kredilenmez; kayıtlarda totalPrice: 0 saklanabilir
```

**Özet kurallar:**
- Bakiye `null` ise `0` kabul edilir.
- `yonetici` rolü: bakiye düşmez (sınırsız).
- `isExcludedFromFinance` (admin/personel): gönderim görünür ama alıcı/yayıncı **kredilenmez** ve yayın hediyelerinde `totalPrice: 0` saklanır (istatistikleri şişirmemek için).
- Düşme ve kredileme **aynı `$transaction` bloğunda** yapılır (bkz. Bölüm 13).

**Coin düşme diyagramı:**
```
[Gönderim isteği]
      │
      ▼
 role == 'yonetici'? ──Evet──▶ [Düşme yok] ──▶ devam
      │Hayır
      ▼
 jetonBalance >= totalPrice? ──Hayır──▶ 400 "Yetersiz jeton"
      │Evet
      ▼
 jetonBalance -= totalPrice  (decrement, atomik)
      │
      ▼
 senderExcluded? ──Evet──▶ [alıcı/oda kredilenmez, totalPrice=0 sakla]
      │Hayır
      ▼
 [Komisyon dağılımına geç]
```

---

## 10. Komisyon Dağılımı

Her bağlamın kendi dağıtım kuralı vardır. Tüm oranlar **ayar (settings) tablosundan** okunur; parantez içindekiler varsayılan değerlerdir.

### 10.1 Sesli/sohbet odası — `calculateGiftDistribution(total, roomType)`

Ayarlar: `vr_gift_receiver_percent` (**70**), `vr_room_owner_percent` (**30**), `vr_site_commission_percent` (**50**).

```
Adım 1 — brüt paylar:
  receiverGross = total * receiverPct/100
  ownerGross    = (oda FREE ise 0, değilse total * ownerPct/100)

Adım 2 — her paya komisyon uygula:
  receiverNet = receiverGross - floor(receiverGross * commPct/100)
  ownerNet    = ownerGross    - floor(ownerGross    * commPct/100)
  siteAmount  = total - receiverNet - ownerNet   // kalan site geliri
```

**Örnek (total = 100, FREE değil, varsayılanlar):**
```
receiverGross = 70,  ownerGross = 30
receiverNet   = 70 - floor(70*0.5) = 35
ownerNet      = 30 - floor(30*0.5) = 15
siteAmount    = 100 - 35 - 15 = 50
```
> **FREE oda:** oda sahibi 0 alır; owner payı siteye kalır.

### 10.2 Canlı yayın — `stream_gift_commission` (30%)

```
recipientAmount = floor(total * (100 - 30) / 100)   // %70 alıcıya
siteAmount      = total - recipientAmount            // %30 site
```

### 10.3 Direkt hediye / jeton transferi

`direct_gift_commission` (**0%**) ve `jeton_transfer_commission` (**0%**) — varsayılan olarak alıcı tümünü alır.

### 10.4 Müzik — `calculateMusicDistribution`

Sabit maliyet **10 jeton**. FREE oda → %100 site; NORMAL oda → `vr_music_owner_percent` (**50**); VIP oda → `vr_vip_music_owner_percent` (**70**) oda sahibine.

### 10.5 Agency (ajans) komisyonu — `processAgencyCommission`

**Ateşle-unut (fire-and-forget):** Ana işlemden sonra ayrı çalışır. Alıcı onaylı+aktif bir ajansa bağlıysa, hediye gelirinden `commissionRate%` kesilir (ajansın `penaltyLevel >= 3` ise **yarıya** iner) → `AgencyEarning` kaydı + `Agency.totalEarnings` + `AgencyUser.totalEarnings` artırılır. `sourceType`: `direct_gift` | `stream_gift` | `chat_gift`.

**Komisyon dağıtım diyagramı (sesli oda):**
```
        total (100)
            │
   ┌────────┴─────────┐
   ▼                  ▼
receiverGross(70)  ownerGross(30, FREE→0)
   │ -komisyon %50    │ -komisyon %50
   ▼                  ▼
receiverNet(35)    ownerNet(15)
   │                  │
   └───────┬──────────┘
           ▼
   siteAmount = total - receiverNet - ownerNet = 50
           │
           ▼  (sonra, ayrı)
   processAgencyCommission(receiverNet üzerinden ajans payı)
```

---

## 11. Wallet (Cüzdan) Sistemi

Kullanıcının iki ayrı bakiyesi vardır:

| Bakiye | Alan | Kullanım |
|---|---|---|
| **Jeton (coin)** | `User.jetonBalance` (Int?) | Hediyelerin birincil para birimi |
| **Kredi** | `User.credits` | İkincil / ayrı işlemler |

`currencyType` alanı `'jeton'` veya `'cfc'` değerini alır. Hediye akışları jeton üzerinden çalışır.

Her bakiye değişikliği ilgili **defter (ledger)** tablosuna bir satır yazar; böylece bakiye her an işlemlerden yeniden türetilebilir:
- Jeton hareketleri → `JetonTransaction` (`balanceBefore` / `balanceAfter` ile tam iz)
- Kredi hareketleri → `CreditTransaction` (`balance` ile)

**Cüzdan güncelleme akışı (hediye örneği):**
```
$transaction:
  sender.jetonBalance: { decrement: totalPrice }
    └▶ JetonTransaction { type:'gift_sent',     amount:-totalPrice, balanceBefore, balanceAfter }
  receiver.jetonBalance: { increment: receiverNet }
    └▶ JetonTransaction { type:'gift_received',  amount:+receiverNet }
  owner.jetonBalance: { increment: ownerNet }          // varsa
    └▶ JetonTransaction { type:'gift_commission', amount:+ownerNet }
```

Yanıtlarda güncel bakiye `newBalance` alanında istemciye döner; istemci cüzdanı bu değerle günceller (ekstra istek gerekmez).

---

## 12. Transaction Log (İşlem Kayıtları)

Sistem, her hediye/gelir hareketini **birden fazla denetim katmanında** kaydeder:

| Katman | Tablo | Ne kaydeder |
|---|---|---|
| Jeton defteri | `JetonTransaction` | Her jeton hareketi + `balanceBefore`/`balanceAfter` |
| Kredi defteri | `CreditTransaction` | Her kredi hareketi + `balance` |
| Oda geliri denetimi | `RoomRevenueLog` | `logRoomRevenue()` ile oda başına gelir dağılımı (total/receiver/owner/site + metadata JSON) |
| Birleşik hediye olayı | `GiftEvent` | Tam gelir bölüşümü + `context`/`contextId` + `idempotencyKey` + `status` |

**`logRoomRevenue` çağrısı (RoomRevenueLog satırı):**
```jsonc
{
  "roomId": "clx...",
  "eventType": "gift",
  "totalAmount": 100,
  "receiverAmount": 35,
  "ownerAmount": 15,
  "siteAmount": 50,
  "senderId": "clx...",
  "receiverId": "clx...",
  "ownerId": "clx...",
  "metadata": "{\"giftName\":\"Gül\",\"quantity\":2}"
}
```

**GiftEvent** ayrıca istatistik/sıralama (Bölüm 14) ve idempotency/rollback (Bölüm 13) için birincil kaynaktır.

---

## 13. Rollback (Geri Alma) Sistemi

> **Dürüst durum:** Adı "rollback" olan tek bir servis/endpoint **yoktur**. Geri alma güvenceleri şu dört mekanizmayla sağlanır:

### 13.1 Atomik işlem (`prisma.$transaction`)

Tüm bakiye güncellemeleri + hediye kaydı + defter satırları **tek bir işlemde** işlenir. Herhangi bir adım hata verirse **tümü geri alınır** (otomatik rollback) — yarım kalmış/tutarsız durum oluşmaz.

```
prisma.$transaction([
  updateSenderBalance,     // -totalPrice
  updateReceiverBalance,   // +receiverNet
  updateOwnerBalance,      // +ownerNet
  createGiftRecord,
  createJetonTxRows,
])
// herhangi biri throw ederse → hiçbiri uygulanmaz (implicit rollback)
```

### 13.2 Idempotency (çift işlem koruması)

`GiftEvent.idempotencyKey` **unique**'tir. Aynı anahtarla ikinci istek (çift tıklama / ağ tekrarı) veritabanı seviyesinde reddedilir — kullanıcı iki kez ücretlendirilmez.

### 13.3 Durum (status) ile mantıksal geri alma

`GiftEvent.status`: `completed` | **`refunded`** | **`cancelled`**. Bir hediye iade edilirse/iptal edilirse durum bu değerlere çekilir (fiziksel silme yerine iz korunur).

### 13.4 Fal talebi (fortune-requests) iade akışı

Hediyeler için genel bir iade ucu yoktur; ancak **fal talebi** akışında gerçek iade mantığı vardır:
- `action: 'refund'` → bekleyen `jetonAmount` iade edilir, `status: 'refunded'`, `refundedAt` yazılır.
- `DELETE ?refundAll=true` (yayın bittiğinde) → bekleyen tüm talepler iade edilir.

**Rollback karar diyagramı:**
```
Hediye işlemi
   │
   ├─ Herhangi bir DB hatası? ──Evet──▶ $transaction otomatik ROLLBACK (hiçbir değişiklik kalmaz)
   │
   ├─ Aynı idempotencyKey tekrar? ──Evet──▶ unique ihlali → işlem reddedilir (çift ücret yok)
   │
   └─ Manuel iade/iptal gerekli? ──Evet──▶ status = 'refunded' | 'cancelled'
                                            (fal taleplerinde jetonAmount iadesi)
```

---

## 14. Gift Ranking (Sıralama / Liderlik)

Sıralamalar farklı kaynaklardan üretilir:

### 14.1 Oda liderlik tablosu — `GET /api/chat/rooms/[roomId]/gifts`

Bugün en çok hediye **alan** ilk 20 kullanıcı (yalnızca son 120 sn aktif), jeton + cfc toplamlarıyla:
```jsonc
{
  "leaderboard": [
    { "userId": "clx...", "name": "Ayşe", "image": "...", "jetonTotal": 5400, "cfcTotal": 0, "rank": 1 },
    { "userId": "clx...", "name": "Ali",  "image": "...", "jetonTotal": 3200, "cfcTotal": 0, "rank": 2 }
  ]
}
```

### 14.2 Koltuk başına alınan jeton — `getReceivedJetonTotals(roomId, userIds?)`

`ChatRoomGift` üzerinden `recipientId` bazında `totalPrice` toplamı (koltuk üstündeki "alınan jeton" rozeti):
```jsonc
{ "clx_user1": 5400, "clx_user2": 3200 }
```

### 14.3 Admin istatistik / global ranking — `GET /api/admin/gifts/stats`

**Global (giftId'siz):** en çok gönderilen 20 hediye (`GiftEvent` groupBy):
```jsonc
{
  "totalGifts": 128,
  "totalEvents": 45210,
  "topGifts": [
    { "giftTypeId": "clx...", "gift": { "name": "Gül", "icon": "🌹", "price": 50 }, "sendCount": 8900, "totalJetons": 445000 }
  ]
}
```
**Tekil (`?giftId=`):** gönderim sayısı, toplam jeton, site/alıcı kazancı, **top 10 gönderen**, **top 10 alan**, bağlam kırılımı ve son 7 günlük günlük trend.

### 14.4 Battle / hedef / görev modelleri (mevcut)

Şu modeller şemada tanımlıdır ve sıralama/etkinlik için kullanılır: `GiftBattle` + `GiftBattleParticipant` (taraf başına brüt jeton skoru), `GiftGoal` (bağış hedefi), `GiftMission` + `UserMissionProgress` (günlük görevler). PK skoru hediye gönderiminde `battleId`/`side` ile güncellenir ve `pkUpdate` yanıtında döner (bkz. 3.2).

---

## 15. Gift History (Hediye Geçmişi)

### 15.1 Kullanıcının aldığı hediyeler — `GET /api/user/received-gifts` (mobil)

```jsonc
{
  "gifts": [
    { "id": "clx...", "senderName": "Ali", "icon": "🌹", "giftName": "Gül", "quantity": 2, "totalPrice": 100, "createdAt": "..." }
  ],
  "totals": { "jetonTotal": 15400, "cfcTotal": 0 }
}
```

### 15.2 Şanslı hediye geçmişi — `GET /api/gifts/lucky/history`

- `?scope=me` (varsayılan): kullanıcının kendi sonuçları + özet (`totalPlays`, `totalBet`, `totalWon`, `netJetons`, `bestMultiplier`).
- `?scope=global`: son büyük kazançlar/jackpotlar akışı (herkese açık).

```jsonc
// scope=me
{
  "scope": "me",
  "summary": { "totalPlays": 42, "totalBet": 4200, "totalWon": 5800, "netJetons": 1600, "bestMultiplier": 50 },
  "history": [
    { "id": "clx...", "gift": { "name": "Elmas", "icon": "💎" }, "betJetons": 100, "quantity": 1,
      "multiplier": 10, "wonJetons": 1000, "netJetons": 900, "isJackpot": false, "createdAt": "..." }
  ]
}
```

### 15.3 Jeton/kredi hareket geçmişi

Genel harcama/kazanç geçmişi `JetonTransaction` (ve `CreditTransaction`) tablolarından türetilir; her satırda `balanceBefore`/`balanceAfter` bulunur (bkz. Bölüm 12).

---

## 16. Lucky Gift (Şanslı Hediye) Sistemi

### 16.1 Çekiliş — `POST /api/gifts/lucky/send`

Hediyenin `isLucky = true` olması gerekir. **Ağırlıklı rastgele** kademe seçimi (`weight`) yapılır:
```
betJetons = price * quantity
wonJetons = betJetons * tier.multiplier
netJetons = wonJetons - betJetons
// JetonTransaction: lucky_gift_bet (-bet), lucky_gift_win (+won)
// Jackpot kademesi → SiteAnnouncement (maxPasses 2)
```

**Yanıt:**
```jsonc
{
  "success": true,
  "rewardId": "clx...",
  "result": {
    "tierId": "clx...", "tierName": "Jackpot", "multiplier": 100,
    "betJetons": 100, "wonJetons": 10000, "netJetons": 9900,
    "isJackpot": true, "color": "#FFD700", "icon": "💰", "isWin": true
  },
  "newBalance": 9900
}
```

### 16.2 Yapılandırma — `GET /api/gifts/lucky/config` (public)

Aktif kademeler + görünen oranlar (`oddsPercent`) + şanslı hediye listesi + **RTP** (beklenen geri dönüş oranı) + sürüm:
```jsonc
{
  "enabled": true,
  "tiers": [
    { "id": "clx...", "name": "Jackpot", "multiplier": 100, "isJackpot": true, "color": "#FFD700", "icon": "💰", "oddsPercent": 0.5 }
  ],
  "luckyGifts": [ { "id": "clx...", "name": "Elmas", "icon": "💎", "price": 100, "assetType": "svga" } ],
  "rtp": 0.95,
  "version": 3
}
```
`oddsPercent = round(weight / toplamAğırlık * 10000) / 100`. Kademe CRUD: `GET/POST/PATCH /api/admin/lucky-gifts/tiers` (her PATCH `contentVersion` artırır).

---

## 17. Flutter ↔ Web Parite ve Sürüm Senkronizasyonu

### 17.1 %100 parite kuralları (özet)

Flutter'ın hediyeleri web ile **birebir aynı** göstermesi için:
1. **Aynı katalog kaynağı:** `/api/gifts/catalog` (veya `/api/live/gift-types`). Hediye listesi, fiyat, ikon, `assetType`, animasyon ayarları web ile aynıdır.
2. **Aynı oynatıcı eşlemesi:** `assetType` → oynatıcı tablosu (Bölüm 5.1). PNG/SVG/SVGA/Lottie/MP4 aynı asset URL'lerinden oynatılır.
3. **Aynı kuyruk & öncelik:** FIFO tek-tek oynatma, fiyat eşiklerine göre süre (3s/4s/5s) ve tam ekran flash eşiği (≥200) (Bölüm 8).
4. **Aynı kombo penceresi:** aynı gönderen+hediye+5 sn (Bölüm 7).
5. **Aynı fiyat eşikli görsel yoğunluk:** ≥100 / ≥200 / ≥500 (Bölüm 8.2).
6. **Aynı realtime olay:** oda/yayın kanalından gelen `gift` event'i hem web hem Flutter'da kuyruğa alınır.

### 17.2 Delta senkron akışı (önerilen istemci deseni)

```
[Uygulama açılış / periyodik]
      │
      ▼
GET /api/gifts/version         →  { giftVersion: 42, ... }
      │
      ├─ giftVersion == localVersion?  ──Evet──▶ [Değişiklik yok, cache kullan]
      │
      └─ giftVersion > localVersion?   ──Evet──▶
             GET /api/gifts/catalog?sinceVersion=<local>&context=<bağlam>
                   │
                   ▼
             { gifts: [değişenler], collections, currentVersion }
                   │
                   ▼
             yerel katalog + localVersion güncelle
```
> `contentVersion` her hediye/kademe değişikliğinde artar; istemci yalnızca değişen kayıtları çeker (bant genişliği tasarrufu).

### 17.3 Realtime hediye olayı (istemci dinleme)

Hediye gönderildiğinde sunucu ilgili oda/yayın kanalına `gift` olayı yayınlar. İstemci bu olayı alınca `triggerGift(...)` ile kuyruğa ekler:
```jsonc
// yayınlanan gift event payload (örnek)
{
  "type": "gift",
  "senderName": "Mehmet", "senderImage": "...",
  "giftIcon": "🌹", "giftName": "Gül", "giftPrice": 50,
  "animation": "heart_rain", "quantity": 2, "assetType": "svga", "assetUrl": "https://..."
}
```

---

## 18. Akış Diyagramları (Toplu)

### 18.1 Hediye gönderimi — uçtan uca

```
Client                         API (dual-auth)                     DB ($transaction)
  │  POST gift (id, qty, hedef)   │                                    │
  │──────────────────────────────▶│ auth + rate-limit(10/dk)          │
  │                               │ GiftType doğrula (aktif/fiyat)     │
  │                               │ totalPrice = price*qty             │
  │                               │ bakiye >= totalPrice ?             │
  │                               │────────── BEGIN ──────────────────▶│
  │                               │  sender -= totalPrice              │
  │                               │  dağılım: receiver/owner/site      │
  │                               │  receiver += receiverNet           │
  │                               │  owner    += ownerNet              │
  │                               │  Gift kaydı + JetonTx + RevenueLog  │
  │                               │──────────  COMMIT ─────────────────▶│
  │                               │ realtime 'gift' yayınla            │
  │                               │ agency komisyonu (fire-and-forget) │
  │◀──── { success, newBalance } ──│                                    │
  │ kuyruğa al → animasyon oynat  │                                    │
```

### 18.2 Katalog sürüm senkronu (Flutter)

```
version endpoint ──▶ local < remote? ──Evet──▶ catalog?sinceVersion=local ──▶ delta uygula
                          │Hayır
                          └──▶ cache kullan
```

### 18.3 Şanslı hediye çekilişi

```
POST lucky/send (isLucky gift)
   │
   ▼
betJetons = price*qty  →  bakiye düş (lucky_gift_bet)
   │
   ▼
ağırlıklı rastgele tier seç (weight)
   │
   ▼
wonJetons = bet * multiplier  →  bakiye ekle (lucky_gift_win)
   │
   ├─ isJackpot? ──Evet──▶ SiteAnnouncement (duyuru)
   ▼
LuckyGiftReward kaydet  →  result + newBalance döndür
```

### 18.4 Animasyon kuyruğu (istemci)

```
gift event → giftQueue.push
                │
   isAnimating false && queue dolu?
                │Evet
                ▼
   next = queue.shift → kombo tespit → (≥200 flash) → partikül üret
                │
   süre(fiyat) bitince → temizle → 300ms → isAnimating=false → sıradaki
```

---

## Ek: Ayar (Settings) Anahtarları Özeti

| Anahtar | Varsayılan | Kullanım |
|---|---|---|
| `direct_gift_commission` | 0 | Direkt hediye komisyonu (%) |
| `jeton_transfer_commission` | 0 | Jeton transfer komisyonu (%) |
| `stream_gift_commission` | 30 | Canlı yayın hediye komisyonu (%) |
| `vr_gift_receiver_percent` | 70 | Sesli oda alıcı payı (%) |
| `vr_room_owner_percent` | 30 | Sesli oda sahibi payı (%) |
| `vr_site_commission_percent` | 50 | Sesli oda paylara uygulanan site komisyonu (%) |
| `vr_music_owner_percent` | 50 | Müzik — normal oda sahibi payı (%) |
| `vr_vip_music_owner_percent` | 70 | Müzik — VIP oda sahibi payı (%) |

---

*Bu doküman `nextjs_space` kod tabanındaki gerçek route ve şema tanımlarından üretilmiştir. Kodda bulunmayan hiçbir davranış uydurulmamış; olmayan sistemler (özel Rollback servisi, sunucu-taraflı Gift Queue/Priority) açıkça belirtilmiştir.*
