# CanlıFal API Kayıt Defteri (API Registry)

Tek kanonik API tabanı: `https://canlifal.com/api/**`

Sürümleme yoktur (`/api/v1`, `/api/v2`, `/api/legacy` kullanılmaz).


- Toplam uç nokta (handler): **700**
- Alan (domain) sayısı: **154**
- Kullanımdan kaldırılan (deprecated) uç: **9** — hâlâ çalışır, `Deprecation: true` başlığı döner


## Birleştirme Tablosu (Eski → Kanonik)

| Eski uç | Kanonik uç | Durum |
|---|---|---|
| `/api/leaderboard` | `/api/leaderboards` | Deprecated — uyumluluk için açık |
| `/api/membership/packages` | `/api/memberships/packages` | Deprecated — uyumluluk için açık |
| `/api/payment-methods` | `/api/payments/methods` | Deprecated — uyumluluk için açık |
| `/api/payment-settings` | `/api/payments/settings` | Deprecated — uyumluluk için açık |
| `/api/payment/config` | `/api/payments/config` | Deprecated — uyumluluk için açık |
| `/api/payment/requests` | `/api/payments/requests` | Deprecated — uyumluluk için açık |
| `/api/rooms/{roomId}/music/current` | `/api/chat/rooms/{roomId}/music` | Deprecated — uyumluluk için açık |
| `/api/rooms/{roomId}/music/skip` | `/api/chat/rooms/{roomId}/music` | Deprecated — uyumluluk için açık |
| `/api/rooms/{roomId}/music/stop` | `/api/chat/rooms/{roomId}/music/stop` | Deprecated — uyumluluk için açık |

## Tüm Uç Noktalar (alana göre)


### `activities`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/activities` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `admin/activity-feed`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/activity-feed` | Yönetici | Aktif | — |
| **POST** | `/api/admin/activity-feed` | Yönetici | Aktif | — |

### `admin/ad-networks`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/ad-networks` | Yönetici | Aktif | — |
| **GET** | `/api/admin/ad-networks` | Yönetici | Aktif | — |
| **POST** | `/api/admin/ad-networks` | Yönetici | Aktif | — |

### `admin/agencies`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/agencies` | Yönetici | Aktif | — |
| **GET** | `/api/admin/agencies` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/agencies` | Yönetici | Aktif | — |

### `admin/announcement-sections`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/announcement-sections` | Yönetici | Aktif | — |
| **POST** | `/api/admin/announcement-sections` | Yönetici | Aktif | — |

### `admin/awards`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/awards` | Yönetici | Aktif | — |
| **GET** | `/api/admin/awards` | Yönetici | Aktif | — |
| **POST** | `/api/admin/awards` | Yönetici | Aktif | — |

### `admin/backup`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/backup` | Yönetici | Aktif | — |

### `admin/badges`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/badges` | Yönetici | Aktif | — |
| **GET** | `/api/admin/badges` | Yönetici | Aktif | — |
| **POST** | `/api/admin/badges` | Yönetici | Aktif | — |
| **PUT** | `/api/admin/badges` | Yönetici | Aktif | — |

### `admin/bana-ozel`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/bana-ozel` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/bana-ozel` | Yönetici | Aktif | — |
| **POST** | `/api/admin/bana-ozel` | Yönetici | Aktif | — |

### `admin/blog`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/blog` | Yönetici | Aktif | — |
| **POST** | `/api/admin/blog` | Yönetici | Aktif | — |
| **GET** | `/api/admin/blog/analytics` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/blog/bulk-category` | Yönetici | Aktif | — |
| **POST** | `/api/admin/blog/bulk-delete` | Yönetici | Aktif | — |
| **POST** | `/api/admin/blog/bulk-generate` | Yönetici | Aktif | — |
| **POST** | `/api/admin/blog/bulk-import` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/blog/bulk-publish` | Yönetici | Aktif | — |
| **DELETE** | `/api/admin/blog/categories` | Yönetici | Aktif | — |
| **GET** | `/api/admin/blog/categories` | Yönetici | Aktif | — |
| **POST** | `/api/admin/blog/categories` | Yönetici | Aktif | — |
| **GET** | `/api/admin/blog/comments` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/blog/comments` | Yönetici | Aktif | — |
| **POST** | `/api/admin/blog/generate` | Yönetici | Aktif | — |
| **POST** | `/api/admin/blog/import` | Yönetici | Aktif | — |
| **POST** | `/api/admin/blog/schedule-publish` | Yönetici | Aktif | — |
| **DELETE** | `/api/admin/blog/{postId}` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/blog/{postId}` | Yönetici | Aktif | — |
| **PUT** | `/api/admin/blog/{postId}` | Yönetici | Aktif | — |

### `admin/bots`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/bots` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/bots` | Yönetici | Aktif | — |
| **GET** | `/api/admin/bots/simulate` | Yönetici | Aktif | — |
| **POST** | `/api/admin/bots/simulate` | Yönetici | Aktif | — |
| **GET** | `/api/admin/bots/simulate-fortune` | Yönetici | Aktif | — |
| **POST** | `/api/admin/bots/simulate-fortune` | Yönetici | Aktif | — |
| **GET** | `/api/admin/bots/simulate-master` | Yönetici | Aktif | — |
| **POST** | `/api/admin/bots/simulate-master` | Yönetici | Aktif | — |
| **GET** | `/api/admin/bots/simulate-social` | Yönetici | Aktif | — |
| **POST** | `/api/admin/bots/simulate-social` | Yönetici | Aktif | — |

### `admin/broadcast-images`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/broadcast-images` | Yönetici | Aktif | — |
| **GET** | `/api/admin/broadcast-images` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/broadcast-images` | Yönetici | Aktif | — |
| **POST** | `/api/admin/broadcast-images` | Yönetici | Aktif | — |

### `admin/button-order`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/button-order` | Yönetici | Aktif | — |
| **POST** | `/api/admin/button-order` | Yönetici | Aktif | — |

### `admin/cache`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/cache` | Yönetici | Aktif | — |
| **GET** | `/api/admin/cache` | Yönetici | Aktif | — |

### `admin/cfc-payment-requests`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/cfc-payment-requests` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/cfc-payment-requests` | Yönetici | Aktif | — |

### `admin/cfc-settings`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/cfc-settings` | Yönetici | Aktif | — |
| **POST** | `/api/admin/cfc-settings` | Yönetici | Aktif | — |

### `admin/chat-rooms`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/chat-rooms` | Yönetici | Aktif | — |
| **GET** | `/api/admin/chat-rooms` | Yönetici | Aktif | — |
| **POST** | `/api/admin/chat-rooms` | Yönetici | Aktif | — |
| **PUT** | `/api/admin/chat-rooms` | Yönetici | Aktif | — |

### `admin/contests`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/contests` | Yönetici | Aktif | — |
| **GET** | `/api/admin/contests` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/contests` | Yönetici | Aktif | — |
| **POST** | `/api/admin/contests` | Yönetici | Aktif | — |

### `admin/credit-packages`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/credit-packages` | Yönetici | Aktif | — |
| **POST** | `/api/admin/credit-packages` | Yönetici | Aktif | — |
| **DELETE** | `/api/admin/credit-packages/{packageId}` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/credit-packages/{packageId}` | Yönetici | Aktif | — |

### `admin/credits`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **POST** | `/api/admin/credits` | Yönetici | Aktif | — |

### `admin/currency-config`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/currency-config` | Yönetici | Aktif | — |
| **POST** | `/api/admin/currency-config` | Yönetici | Aktif | — |
| **PUT** | `/api/admin/currency-config` | Yönetici | Aktif | — |

### `admin/dreams`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/dreams` | Yönetici | Aktif | — |
| **GET** | `/api/admin/dreams` | Yönetici | Aktif | — |
| **POST** | `/api/admin/dreams` | Yönetici | Aktif | — |
| **PUT** | `/api/admin/dreams` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/dreams/bulk-category` | Yönetici | Aktif | — |
| **POST** | `/api/admin/dreams/bulk-delete` | Yönetici | Aktif | — |
| **POST** | `/api/admin/dreams/bulk-import` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/dreams/bulk-publish` | Yönetici | Aktif | — |
| **POST** | `/api/admin/dreams/generate` | Yönetici | Aktif | — |

### `admin/finance`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/finance` | Yönetici | Aktif | — |
| **POST** | `/api/admin/finance` | Yönetici | Aktif | — |

### `admin/fortune-request-types`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/fortune-request-types` | Yönetici | Aktif | — |
| **GET** | `/api/admin/fortune-request-types` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/fortune-request-types` | Yönetici | Aktif | — |
| **POST** | `/api/admin/fortune-request-types` | Yönetici | Aktif | — |

### `admin/fortunes`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/fortunes` | Yönetici | Aktif | — |

### `admin/games`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/games` | Yönetici | Aktif | — |
| **GET** | `/api/admin/games` | Yönetici | Aktif | — |
| **POST** | `/api/admin/games` | Yönetici | Aktif | — |
| **PUT** | `/api/admin/games` | Yönetici | Aktif | — |
| **DELETE** | `/api/admin/games/rooms` | Yönetici | Aktif | — |
| **GET** | `/api/admin/games/rooms` | Yönetici | Aktif | — |
| **GET** | `/api/admin/games/settings` | Yönetici | Aktif | — |
| **PUT** | `/api/admin/games/settings` | Yönetici | Aktif | — |

### `admin/gift-collections`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/gift-collections` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/gift-collections` | Yönetici | Aktif | — |
| **POST** | `/api/admin/gift-collections` | Yönetici | Aktif | — |

### `admin/gift-upload`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **POST** | `/api/admin/gift-upload` | Yönetici | Aktif | — |

### `admin/gifts`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/gifts` | Yönetici | Aktif | — |
| **POST** | `/api/admin/gifts` | Yönetici | Aktif | — |
| **GET** | `/api/admin/gifts/stats` | Yönetici | Aktif | — |
| **DELETE** | `/api/admin/gifts/{giftId}` | Yönetici | Aktif | — |
| **GET** | `/api/admin/gifts/{giftId}` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/gifts/{giftId}` | Yönetici | Aktif | — |

### `admin/homepage-buttons`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/homepage-buttons` | Yönetici | Aktif | — |
| **GET** | `/api/admin/homepage-buttons` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/homepage-buttons` | Yönetici | Aktif | — |
| **POST** | `/api/admin/homepage-buttons` | Yönetici | Aktif | — |

### `admin/homepage-fortune-cards`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/homepage-fortune-cards` | Yönetici | Aktif | — |
| **GET** | `/api/admin/homepage-fortune-cards` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/homepage-fortune-cards` | Yönetici | Aktif | — |
| **POST** | `/api/admin/homepage-fortune-cards` | Yönetici | Aktif | — |
| **PUT** | `/api/admin/homepage-fortune-cards` | Yönetici | Aktif | — |

### `admin/live-tellers`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/live-tellers` | Yönetici | Aktif | — |
| **POST** | `/api/admin/live-tellers` | Yönetici | Aktif | — |
| **DELETE** | `/api/admin/live-tellers/{tellerId}` | Yönetici | Aktif | — |
| **GET** | `/api/admin/live-tellers/{tellerId}` | Yönetici | Aktif | — |
| **PUT** | `/api/admin/live-tellers/{tellerId}` | Yönetici | Aktif | — |
| **POST** | `/api/admin/live-tellers/{tellerId}/approve` | Yönetici | Aktif | — |
| **POST** | `/api/admin/live-tellers/{tellerId}/ban` | Yönetici | Aktif | — |
| **POST** | `/api/admin/live-tellers/{tellerId}/bonus` | Yönetici | Aktif | — |
| **POST** | `/api/admin/live-tellers/{tellerId}/freeze` | Yönetici | Aktif | — |
| **PUT** | `/api/admin/live-tellers/{tellerId}/permissions` | Yönetici | Aktif | — |
| **DELETE** | `/api/admin/live-tellers/{tellerId}/warning` | Yönetici | Aktif | — |
| **POST** | `/api/admin/live-tellers/{tellerId}/warning` | Yönetici | Aktif | — |

### `admin/lucky-gifts`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/lucky-gifts/tiers` | Yönetici | Aktif | — |
| **GET** | `/api/admin/lucky-gifts/tiers` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/lucky-gifts/tiers` | Yönetici | Aktif | — |
| **POST** | `/api/admin/lucky-gifts/tiers` | Yönetici | Aktif | — |

### `admin/membership-badges`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/membership-badges` | Yönetici | Aktif | — |
| **GET** | `/api/admin/membership-badges` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/membership-badges` | Yönetici | Aktif | — |
| **POST** | `/api/admin/membership-badges` | Yönetici | Aktif | — |

### `admin/memberships`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/memberships` | Yönetici | Aktif | — |
| **GET** | `/api/admin/memberships` | Yönetici | Aktif | — |
| **POST** | `/api/admin/memberships` | Yönetici | Aktif | — |
| **PUT** | `/api/admin/memberships` | Yönetici | Aktif | — |
| **GET** | `/api/admin/memberships/purchases` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/memberships/purchases` | Yönetici | Aktif | — |
| **POST** | `/api/admin/memberships/purchases` | Yönetici | Aktif | — |

### `admin/moderation`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/moderation` | Yönetici | Aktif | — |
| **POST** | `/api/admin/moderation` | Yönetici | Aktif | — |

### `admin/notifications`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/notifications` | Yönetici | Aktif | — |
| **GET** | `/api/admin/notifications` | Yönetici | Aktif | — |
| **POST** | `/api/admin/notifications` | Yönetici | Aktif | — |

### `admin/online-fal`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/online-fal/buttons` | Yönetici | Aktif | — |
| **GET** | `/api/admin/online-fal/buttons` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/online-fal/buttons` | Yönetici | Aktif | — |
| **POST** | `/api/admin/online-fal/buttons` | Yönetici | Aktif | — |
| **GET** | `/api/admin/online-fal/sections` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/online-fal/sections` | Yönetici | Aktif | — |
| **POST** | `/api/admin/online-fal/sections` | Yönetici | Aktif | — |

### `admin/payment-methods`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/payment-methods` | Yönetici | Aktif | — |
| **POST** | `/api/admin/payment-methods` | Yönetici | Aktif | — |

### `admin/payments`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/payments` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/payments` | Yönetici | Aktif | — |
| **POST** | `/api/admin/payments` | Yönetici | Aktif | — |

### `admin/pending-counts`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/pending-counts` | Yönetici | Aktif | — |

### `admin/popups`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/popups` | Yönetici | Aktif | — |
| **GET** | `/api/admin/popups` | Yönetici | Aktif | — |
| **POST** | `/api/admin/popups` | Yönetici | Aktif | — |
| **PUT** | `/api/admin/popups` | Yönetici | Aktif | — |

### `admin/profile-frames`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/profile-frames` | Yönetici | Aktif | — |
| **GET** | `/api/admin/profile-frames` | Yönetici | Aktif | — |
| **POST** | `/api/admin/profile-frames` | Yönetici | Aktif | — |
| **POST** | `/api/admin/profile-frames/assign` | Yönetici | Aktif | — |

### `admin/room-themes`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/room-themes/backgrounds` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/room-themes/backgrounds` | Yönetici | Aktif | — |
| **POST** | `/api/admin/room-themes/backgrounds` | Yönetici | Aktif | — |

### `admin/rooms`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/rooms` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/rooms` | Yönetici | Aktif | — |

### `admin/seo-settings`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/seo-settings` | Yönetici | Aktif | — |
| **POST** | `/api/admin/seo-settings` | Yönetici | Aktif | — |

### `admin/settings`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/settings` | Yönetici | Aktif | — |
| **POST** | `/api/admin/settings` | Yönetici | Aktif | — |

### `admin/site-pages`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/site-pages` | Yönetici | Aktif | — |
| **GET** | `/api/admin/site-pages` | Yönetici | Aktif | — |
| **POST** | `/api/admin/site-pages` | Yönetici | Aktif | — |
| **PUT** | `/api/admin/site-pages` | Yönetici | Aktif | — |

### `admin/statistics`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/statistics` | Yönetici | Aktif | — |

### `admin/teller-levels`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **POST** | `/api/admin/teller-levels` | Yönetici | Aktif | — |

### `admin/teller-performance`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/teller-performance` | Yönetici | Aktif | — |

### `admin/teller-verification`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/teller-verification` | Yönetici | Aktif | — |
| **POST** | `/api/admin/teller-verification` | Yönetici | Aktif | — |

### `admin/ticker-messages`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/ticker-messages` | Yönetici | Aktif | — |
| **POST** | `/api/admin/ticker-messages` | Yönetici | Aktif | — |
| **DELETE** | `/api/admin/ticker-messages/{messageId}` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/ticker-messages/{messageId}` | Yönetici | Aktif | — |

### `admin/tiktok-categories`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/tiktok-categories` | Yönetici | Aktif | — |
| **GET** | `/api/admin/tiktok-categories` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/tiktok-categories` | Yönetici | Aktif | — |
| **POST** | `/api/admin/tiktok-categories` | Yönetici | Aktif | — |

### `admin/tiktok-videos`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/tiktok-videos` | Yönetici | Aktif | — |
| **GET** | `/api/admin/tiktok-videos` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/tiktok-videos` | Yönetici | Aktif | — |
| **POST** | `/api/admin/tiktok-videos` | Yönetici | Aktif | — |
| **PUT** | `/api/admin/tiktok-videos` | Yönetici | Aktif | — |

### `admin/trend-videos`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/trend-videos` | Yönetici | Aktif | — |
| **POST** | `/api/admin/trend-videos` | Yönetici | Aktif | — |
| **POST** | `/api/admin/trend-videos/youtube` | Yönetici | Aktif | — |

### `admin/trends`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/trends` | Yönetici | Aktif | — |
| **GET** | `/api/admin/trends` | Yönetici | Aktif | — |
| **POST** | `/api/admin/trends` | Yönetici | Aktif | — |

### `admin/users`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/users` | Yönetici | Aktif | — |
| **GET** | `/api/admin/users/search` | Yönetici | Aktif | — |
| **POST** | `/api/admin/users/withdrawal-limit` | Yönetici | Aktif | — |
| **DELETE** | `/api/admin/users/{userId}` | Yönetici | Aktif | — |
| **GET** | `/api/admin/users/{userId}` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/users/{userId}` | Yönetici | Aktif | — |

### `admin/video-streams`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/admin/video-streams` | Yönetici | Aktif | — |
| **GET** | `/api/admin/video-streams` | Yönetici | Aktif | — |
| **PATCH** | `/api/admin/video-streams` | Yönetici | Aktif | — |

### `admin/visitor-stats`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/visitor-stats` | Yönetici | Aktif | — |

### `admin/withdrawals`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/admin/withdrawals` | Yönetici | Aktif | — |
| **POST** | `/api/admin/withdrawals` | Yönetici | Aktif | — |

### `ads`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/ads/active` | Herkese açık | Aktif | — |
| **POST** | `/api/ads/reward` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `agency`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **POST** | `/api/agency/apply` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/agency/earnings` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/agency/invite` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/agency/invite` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/agency/join` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/agency/leaderboard` | Herkese açık | Aktif | — |
| **DELETE** | `/api/agency/leave` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/agency/leave` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **DELETE** | `/api/agency/members` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/agency/members` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/agency/members` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/agency/my` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **PATCH** | `/api/agency/my` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/agency/tasks` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/agency/withdrawals` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/agency/withdrawals` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `announcements`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/announcements` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/announcements` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/announcements/event` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `anonymous`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/anonymous` | Herkese açık | Aktif | — |
| **POST** | `/api/anonymous` | Herkese açık | Aktif | — |
| **POST** | `/api/anonymous/watch-ad` | Herkese açık | Aktif | — |

### `astrology-panel`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/astrology-panel` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `auth`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **POST** | `/api/auth/change-password` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/auth/forgot-password` | Herkese açık | Aktif | — |
| **POST** | `/api/auth/logout` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/auth/mobile-apple` | Herkese açık | Aktif | — |
| **POST** | `/api/auth/mobile-google` | Herkese açık | Aktif | — |
| **POST** | `/api/auth/mobile-login` | Herkese açık | Aktif | — |
| **POST** | `/api/auth/mobile-refresh` | Herkese açık | Aktif | — |
| **POST** | `/api/auth/mobile-register` | Herkese açık | Aktif | — |
| **POST** | `/api/auth/mobile-tiktok` | Herkese açık | Aktif | — |
| **POST** | `/api/auth/reclaim-device` | Web oturumu | Aktif | — |
| **POST** | `/api/auth/reset-password` | Herkese açık | Aktif | — |
| **GET** | `/api/auth/verify-device` | Web oturumu | Aktif | — |
| **GET** | `/api/auth/{nextauth}` | Herkese açık | Aktif | — |
| **POST** | `/api/auth/{nextauth}` | Herkese açık | Aktif | — |

### `bana-ozel`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/bana-ozel` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/bana-ozel/open` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `blog`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/blog` | Herkese açık | Aktif | — |
| **GET** | `/api/blog/categories` | Herkese açık | Aktif | — |
| **DELETE** | `/api/blog/comments` | Yönetici | Aktif | — |
| **GET** | `/api/blog/comments` | Yönetici | Aktif | — |
| **POST** | `/api/blog/comments` | Yönetici | Aktif | — |
| **POST** | `/api/blog/favorite` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/blog/interactions` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/blog/like` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/blog/related` | Herkese açık | Aktif | — |
| **GET** | `/api/blog/zodiac` | Herkese açık | Aktif | — |

### `broadcast-images`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/broadcast-images` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `cache`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/cache` | Yönetici | Aktif | — |
| **POST** | `/api/cache` | Yönetici | Aktif | — |

### `chat`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/chat/broadcast-images` | Herkese açık | Aktif | — |
| **DELETE** | `/api/chat/cleanup` | Herkese açık | Aktif | — |
| **GET** | `/api/chat/cleanup` | Herkese açık | Aktif | — |
| **POST** | `/api/chat/cleanup` | Herkese açık | Aktif | — |
| **GET** | `/api/chat/rooms` | Herkese açık | Aktif | — |
| **GET** | `/api/chat/rooms/backgrounds` | Herkese açık | Aktif | — |
| **POST** | `/api/chat/rooms/create` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/chat/rooms/pk-list` | Herkese açık | Aktif | — |
| **GET** | `/api/chat/rooms/{roomId}/dj` | Yönetici | Aktif | — |
| **POST** | `/api/chat/rooms/{roomId}/dj` | Yönetici | Aktif | — |
| **GET** | `/api/chat/rooms/{roomId}/gifts` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/chat/rooms/{roomId}/gifts` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **DELETE** | `/api/chat/rooms/{roomId}/messages` | Yönetici | Aktif | — |
| **GET** | `/api/chat/rooms/{roomId}/messages` | Yönetici | Aktif | — |
| **POST** | `/api/chat/rooms/{roomId}/messages` | Yönetici | Aktif | — |
| **GET** | `/api/chat/rooms/{roomId}/moderation` | Yönetici | Aktif | — |
| **POST** | `/api/chat/rooms/{roomId}/moderation` | Yönetici | Aktif | — |
| **DELETE** | `/api/chat/rooms/{roomId}/music` | Yönetici | Aktif | — |
| **GET** | `/api/chat/rooms/{roomId}/music` | Yönetici | Aktif | — |
| **POST** | `/api/chat/rooms/{roomId}/music` | Yönetici | Aktif | — |
| **GET** | `/api/chat/rooms/{roomId}/music-queue` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/chat/rooms/{roomId}/music/stop` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/chat/rooms/{roomId}/pk` | Yönetici | Aktif | — |
| **POST** | `/api/chat/rooms/{roomId}/pk` | Yönetici | Aktif | — |
| **POST** | `/api/chat/rooms/{roomId}/pk/score` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **DELETE** | `/api/chat/rooms/{roomId}/presence` | Yönetici | Aktif | — |
| **GET** | `/api/chat/rooms/{roomId}/presence` | Yönetici | Aktif | — |
| **POST** | `/api/chat/rooms/{roomId}/presence` | Yönetici | Aktif | — |
| **GET** | `/api/chat/rooms/{roomId}/seats` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **PATCH** | `/api/chat/rooms/{roomId}/seats` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/chat/rooms/{roomId}/settings` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **PATCH** | `/api/chat/rooms/{roomId}/settings` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/chat/rooms/{roomId}/song-request` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **PATCH** | `/api/chat/rooms/{roomId}/song-request` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/chat/rooms/{roomId}/song-request` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/chat/rooms/{roomId}/state` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/chat/rooms/{roomId}/stream` | Yönetici | Aktif | — |
| **POST** | `/api/chat/rooms/{roomId}/transfer-ownership` | Yönetici | Aktif | — |
| **GET** | `/api/chat/rooms/{roomId}/typing` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/chat/rooms/{roomId}/typing` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/chat/rooms/{roomId}/voice` | Yönetici | Aktif | — |
| **POST** | `/api/chat/rooms/{roomId}/voice` | Yönetici | Aktif | — |
| **GET** | `/api/chat/youtube-stream` | Herkese açık | Aktif | — |

### `compatibility`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **POST** | `/api/compatibility` | Herkese açık | Aktif | — |

### `contact`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **POST** | `/api/contact` | Herkese açık | Aktif | — |

### `credit-packages`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/credit-packages` | Herkese açık | Aktif | — |

### `daily-login`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/daily-login` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/daily-login` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `daily-missions`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/daily-missions` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/daily-missions` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `devices`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/devices/fcm` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/devices/fcm` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `dream-contest`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/dream-contest` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/dream-contest/{contestId}/entries` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/dream-contest/{contestId}/entries` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/dream-contest/{contestId}/vote` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `dream-diary`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/dream-diary` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/dream-diary` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/dream-diary` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `dream-stats`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/dream-stats` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `dream-symbols`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/dream-symbols` | Herkese açık | Aktif | — |
| **GET** | `/api/dream-symbols/{slug}` | Herkese açık | Aktif | — |

### `dreams`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/dreams` | Herkese açık | Aktif | — |
| **GET** | `/api/dreams/favorites` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/dreams/generate` | Herkese açık | Aktif | — |
| **POST** | `/api/dreams/interpret` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/dreams/morning-reminder` | Herkese açık | Aktif | — |
| **GET** | `/api/dreams/recommendations` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/dreams/trends` | Herkese açık | Aktif | — |
| **GET** | `/api/dreams/{slug}` | Herkese açık | Aktif | — |
| **DELETE** | `/api/dreams/{slug}/comments` | Yönetici | Aktif | — |
| **GET** | `/api/dreams/{slug}/comments` | Yönetici | Aktif | — |
| **POST** | `/api/dreams/{slug}/comments` | Yönetici | Aktif | — |
| **GET** | `/api/dreams/{slug}/favorite` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/dreams/{slug}/favorite` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/dreams/{slug}/view` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `favorite-tellers`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/favorite-tellers` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/favorite-tellers` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `football`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/football` | Herkese açık | Aktif | — |

### `fortune-access`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **POST** | `/api/fortune-access/check` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/fortune-access/ip-status` | Herkese açık | Aktif | — |

### `fortune-request-types`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/fortune-request-types` | Herkese açık | Aktif | — |

### `fortune-tellers`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/fortune-tellers` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/fortune-tellers` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/fortune-tellers/apply` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/fortune-tellers/awards` | Herkese açık | Aktif | — |
| **GET** | `/api/fortune-tellers/gifts` | Herkese açık | Aktif | — |
| **GET** | `/api/fortune-tellers/my-profile` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/fortune-tellers/session` | Yönetici | Aktif | — |
| **POST** | `/api/fortune-tellers/session` | Yönetici | Aktif | — |
| **GET** | `/api/fortune-tellers/sessions` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/fortune-tellers/sessions/stream` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **PATCH** | `/api/fortune-tellers/sessions/{sessionId}` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/fortune-tellers/toggle-online` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/fortune-tellers/toggle-online` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/fortune-tellers/{tellerId}` | Yönetici | Aktif | — |
| **PATCH** | `/api/fortune-tellers/{tellerId}` | Yönetici | Aktif | — |
| **GET** | `/api/fortune-tellers/{tellerId}/reviews` | Herkese açık | Aktif | — |
| **GET** | `/api/fortune-tellers/{tellerId}/session` | Yönetici | Aktif | — |
| **POST** | `/api/fortune-tellers/{tellerId}/session` | Yönetici | Aktif | — |

### `fortunes`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **POST** | `/api/fortunes/ask-uyumu` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/fortunes/aura-analizi` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/fortunes/burc-yorumu` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/fortunes/dogum-haritasi` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/fortunes/el-fali` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/fortunes/evet-hayir` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/fortunes/istihare` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/fortunes/kahve-fali` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/fortunes/kahve-fali-image` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/fortunes/katina` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/fortunes/kursundokme` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/fortunes/melek-kartlari` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/fortunes/numeroloji` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/fortunes/ruya-yorumu` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/fortunes/tarot-fali` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `games`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/games` | Herkese açık | Aktif | — |
| **GET** | `/api/games/daily-reward` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/games/daily-reward` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/games/daily-spin` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/games/grid-settings` | Herkese açık | Aktif | — |
| **GET** | `/api/games/lamba-cini` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/games/lamba-cini` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/games/leaderboard` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/games/lobby` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/games/play` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/games/profile` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/games/quests` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/games/quests` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/games/room` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/games/room` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **DELETE** | `/api/games/room/{roomId}` | Yönetici | Aktif | — |
| **GET** | `/api/games/room/{roomId}` | Yönetici | Aktif | — |
| **PATCH** | `/api/games/room/{roomId}` | Yönetici | Aktif | — |
| **POST** | `/api/games/room/{roomId}` | Yönetici | Aktif | — |
| **GET** | `/api/games/room/{roomId}/chat` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **PATCH** | `/api/games/room/{roomId}/chat` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/games/room/{roomId}/chat` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/games/room/{roomId}/replace-ai` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **DELETE** | `/api/games/room/{roomId}/viewers` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/games/room/{roomId}/viewers` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/games/room/{roomId}/viewers` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/games/sos` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/games/sos` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **DELETE** | `/api/games/sos/{gameId}` | Yönetici | Aktif | — |
| **GET** | `/api/games/sos/{gameId}` | Yönetici | Aktif | — |
| **PATCH** | `/api/games/sos/{gameId}` | Yönetici | Aktif | — |
| **POST** | `/api/games/sos/{gameId}` | Yönetici | Aktif | — |
| **GET** | `/api/games/sos/{gameId}/chat` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **PATCH** | `/api/games/sos/{gameId}/chat` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/games/sos/{gameId}/chat` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **DELETE** | `/api/games/sos/{gameId}/viewers` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/games/sos/{gameId}/viewers` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/games/sos/{gameId}/viewers` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `gift-engine`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **POST** | `/api/gift-engine/finish` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/gift-engine/gifts` | Herkese açık | Aktif | — |
| **GET** | `/api/gift-engine/queue` | Herkese açık | Aktif | — |

### `gifts`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/gifts/catalog` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/gifts/check-reciprocal` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/gifts/lucky/config` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/gifts/lucky/history` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/gifts/lucky/send` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/gifts/recent-big` | Herkese açık | Aktif | — |
| **POST** | `/api/gifts/send` | Yönetici | Aktif | — |
| **GET** | `/api/gifts/types` | Herkese açık | Aktif | — |
| **GET** | `/api/gifts/version` | Herkese açık | Aktif | — |

### `hashtags`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/hashtags/search` | Herkese açık | Aktif | — |
| **GET** | `/api/hashtags/trending` | Herkese açık | Aktif | — |
| **GET** | `/api/hashtags/{name}` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `homepage-buttons`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/homepage-buttons` | Herkese açık | Aktif | — |

### `homepage-fortune-cards`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/homepage-fortune-cards` | Herkese açık | Aktif | — |

### `homepage-ticker`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/homepage-ticker` | Herkese açık | Aktif | — |

### `horoscope`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/horoscope/daily` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `jeton`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/jeton` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/jeton` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `leaderboard`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/leaderboard` | Herkese açık | Deprecated | `/api/leaderboards` |

### `leaderboards`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/leaderboards` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `legal`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/legal/child-safety` | Herkese açık | Aktif | — |

### `live`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **POST** | `/api/live/create-room` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/live/gift-types` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/live/gift/send` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/live/heartbeat` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/live/join-room` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/live/leave-room` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/live/message` | Yönetici | Aktif | — |
| **POST** | `/api/live/message` | Yönetici | Aktif | — |
| **GET** | `/api/live/online-users` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/live/pk` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/live/pk` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/live/pk/score` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/live/rooms` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/live/seats` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/live/seats` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `me`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/me` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **PATCH** | `/api/me` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `membership`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/membership/packages` | Herkese açık | Deprecated | `/api/memberships/packages` |

### `membership-badges`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/membership-badges` | Herkese açık | Aktif | — |

### `memberships`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/memberships` | Herkese açık | Aktif | — |
| **GET** | `/api/memberships/packages` | Herkese açık | Aktif | — |
| **POST** | `/api/memberships/purchase` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `messages`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/messages` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **PATCH** | `/api/messages/request` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/messages/request` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/messages/{userId}` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/messages/{userId}` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `mobile`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/mobile/config` | Herkese açık | Aktif | — |
| **GET** | `/api/mobile/fortune-menu` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/mobile/home` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/mobile/user-profile/{userId}` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `monitoring`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/monitoring` | Web oturumu | Aktif | — |

### `music`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/music/history` | Herkese açık | Aktif | — |
| **GET** | `/api/music/search` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `notifications`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/notifications` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/notifications` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/notifications` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/notifications/stream` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `online-fal`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/online-fal` | Herkese açık | Aktif | — |

### `payment`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/payment/config` | Herkese açık | Deprecated | `/api/payments/config` |
| **GET** | `/api/payment/requests` | Herkese açık | Deprecated | `/api/payments/requests` |
| **POST** | `/api/payment/requests` | Herkese açık | Deprecated | `/api/payments/requests` |

### `payment-methods`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/payment-methods` | Herkese açık | Deprecated | `/api/payments/methods` |

### `payment-settings`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/payment-settings` | Herkese açık | Deprecated | `/api/payments/settings` |

### `payments`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/payments/config` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/payments/methods` | Herkese açık | Aktif | — |
| **GET** | `/api/payments/notify` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/payments/notify` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/payments/requests` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/payments/requests` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/payments/settings` | Herkese açık | Aktif | — |

### `platform`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/platform/commission-rate` | Herkese açık | Aktif | — |

### `popups`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/popups` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `presence`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/presence` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/presence` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/presence/sections` | Herkese açık | Aktif | — |

### `profile-frames`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/profile-frames` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/profile-frames` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `public`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/public/announcement-settings` | Herkese açık | Aktif | — |
| **GET** | `/api/public/jeton-price` | Herkese açık | Aktif | — |

### `public-stats`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/public-stats` | Herkese açık | Aktif | — |

### `referral`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/referral` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/referral/validate` | Herkese açık | Aktif | — |

### `room`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/room/signal` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/room/signal` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/room/signal` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/room/{sessionId}` | Yönetici | Aktif | — |
| **PATCH** | `/api/room/{sessionId}` | Yönetici | Aktif | — |
| **GET** | `/api/room/{sessionId}/messages` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/room/{sessionId}/messages` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/room/{sessionId}/review` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/room/{sessionId}/review` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/room/{sessionId}/stream` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/room/{sessionId}/summary` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/room/{sessionId}/tip` | Yönetici | Aktif | — |

### `room-themes`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/room-themes/catalog` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `rooms`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/rooms/{roomId}/music/current` | Herkese açık | Deprecated | `/api/chat/rooms/{roomId}/music` |
| **POST** | `/api/rooms/{roomId}/music/skip` | Herkese açık | Deprecated | `/api/chat/rooms/{roomId}/music` |
| **POST** | `/api/rooms/{roomId}/music/stop` | Herkese açık | Deprecated | `/api/chat/rooms/{roomId}/music/stop` |

### `search`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/search` | Herkese açık | Aktif | — |
| **GET** | `/api/search/advanced` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `seo-settings`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/seo-settings` | Herkese açık | Aktif | — |

### `settings`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/settings/ads` | Herkese açık | Aktif | — |
| **GET** | `/api/settings/canlidark-hero` | Herkese açık | Aktif | — |
| **GET** | `/api/settings/public` | Herkese açık | Aktif | — |
| **GET** | `/api/settings/themes` | Herkese açık | Aktif | — |

### `share-card`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/share-card` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `short-videos`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/short-videos` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/short-videos/explore` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/short-videos/mentions/search` | Herkese açık | Aktif | — |
| **GET** | `/api/short-videos/music` | Herkese açık | Aktif | — |
| **GET** | `/api/short-videos/profile/{userId}` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/short-videos/register` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/short-videos/upload` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/short-videos/upload-url` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/short-videos/user/{userId}` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **DELETE** | `/api/short-videos/{id}` | Yönetici | Aktif | — |
| **GET** | `/api/short-videos/{id}` | Yönetici | Aktif | — |
| **GET** | `/api/short-videos/{id}/comments` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/short-videos/{id}/comments` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **DELETE** | `/api/short-videos/{id}/comments/{commentId}` | Yönetici | Aktif | — |
| **POST** | `/api/short-videos/{id}/comments/{commentId}/like` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/short-videos/{id}/comments/{commentId}/pin` | Yönetici | Aktif | — |
| **GET** | `/api/short-videos/{id}/duets` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/short-videos/{id}/like` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/short-videos/{id}/save` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/short-videos/{id}/share` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/short-videos/{id}/view` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `signup`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **POST** | `/api/signup` | Herkese açık | Aktif | — |

### `site-pages`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/site-pages/{slug}` | Herkese açık | Aktif | — |

### `social`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/social/posts` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/social/posts` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **DELETE** | `/api/social/posts/{postId}` | Yönetici | Aktif | — |
| **GET** | `/api/social/posts/{postId}` | Yönetici | Aktif | — |
| **DELETE** | `/api/social/posts/{postId}/comments` | Yönetici | Aktif | — |
| **GET** | `/api/social/posts/{postId}/comments` | Yönetici | Aktif | — |
| **POST** | `/api/social/posts/{postId}/comments` | Yönetici | Aktif | — |
| **POST** | `/api/social/posts/{postId}/likes` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/social/posts/{postId}/view` | Herkese açık | Aktif | — |

### `stories`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **DELETE** | `/api/stories` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/stories` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/stories` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `teller`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/teller/analytics` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/teller/level` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/teller/verification` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/teller/verification` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `teller-chat`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/teller-chat` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/teller-chat/{sessionId}` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/teller-chat/{sessionId}` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `tencent`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **POST** | `/api/tencent/webhook` | Herkese açık | Aktif | — |

### `tiktok-videos`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/tiktok-videos` | Herkese açık | Aktif | — |
| **GET** | `/api/tiktok-videos/oembed` | Herkese açık | Aktif | — |
| **GET** | `/api/tiktok-videos/{id}` | Herkese açık | Aktif | — |

### `tmdb`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/tmdb` | Herkese açık | Aktif | — |

### `tournaments`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/tournaments` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `translations`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/translations` | Herkese açık | Aktif | — |

### `trend-videos`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/trend-videos` | Herkese açık | Aktif | — |
| **POST** | `/api/trend-videos` | Herkese açık | Aktif | — |

### `trends`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/trends` | Herkese açık | Aktif | — |
| **GET** | `/api/trends/{slug}` | Herkese açık | Aktif | — |
| **POST** | `/api/trends/{slug}/like` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `trtc`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **POST** | `/api/trtc/token` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/trtc/usersig` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/trtc/webhook` | Herkese açık | Aktif | — |

### `upload`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/upload/get-url` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/upload/get-url` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/upload/presigned` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `user`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/user/achievements` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/active-sessions` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/activity` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **PATCH** | `/api/user/activity` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/block` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/user/block` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **DELETE** | `/api/user/blocked` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/blocked` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/broadcast-history` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/co-broadcast-invites` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/credits` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/followers` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/following` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/fortunes` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **PATCH** | `/api/user/fortunes/{fortuneId}` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/likers` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/profile` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **PATCH** | `/api/user/profile` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/received-gifts` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/user/report` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/statistics` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/stats` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/user/stats` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/theme` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **PATCH** | `/api/user/theme` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/watch-ad` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/user/watch-ad` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/xp` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/{userId}/achievements` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **DELETE** | `/api/user/{userId}/follow` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/user/{userId}/follow` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/user/{userId}/follow-status` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `users`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/users/lookup/{username}` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/users/online` | Herkese açık | Aktif | — |
| **GET** | `/api/users/search` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/users/{userId}` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/users/{userId}/follow` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/users/{userId}/follow` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/users/{userId}/posts` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `video-streams`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/video-streams` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/video-streams` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/video-streams/gifts` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/video-streams/pk` | Yönetici | Aktif | — |
| **POST** | `/api/video-streams/pk` | Yönetici | Aktif | — |
| **GET** | `/api/video-streams/pk/list` | Herkese açık | Aktif | — |
| **POST** | `/api/video-streams/pk/score` | Herkese açık | Aktif | — |
| **DELETE** | `/api/video-streams/signal` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/video-streams/signal` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/video-streams/signal` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/video-streams/{streamId}` | Yönetici | Aktif | — |
| **PATCH** | `/api/video-streams/{streamId}` | Yönetici | Aktif | — |
| **GET** | `/api/video-streams/{streamId}/auto-close` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/video-streams/{streamId}/auto-close` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **DELETE** | `/api/video-streams/{streamId}/ban` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/video-streams/{streamId}/ban` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/video-streams/{streamId}/ban` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/video-streams/{streamId}/co-broadcast` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **PATCH** | `/api/video-streams/{streamId}/co-broadcast` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/video-streams/{streamId}/co-broadcast` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/video-streams/{streamId}/co-broadcast/invite` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/video-streams/{streamId}/comments` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/video-streams/{streamId}/comments` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/video-streams/{streamId}/end` | Yönetici | Aktif | — |
| **DELETE** | `/api/video-streams/{streamId}/fortune-requests` | Yönetici | Aktif | — |
| **GET** | `/api/video-streams/{streamId}/fortune-requests` | Yönetici | Aktif | — |
| **PATCH** | `/api/video-streams/{streamId}/fortune-requests` | Yönetici | Aktif | — |
| **POST** | `/api/video-streams/{streamId}/fortune-requests` | Yönetici | Aktif | — |
| **GET** | `/api/video-streams/{streamId}/fortune-requests/my-status` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/video-streams/{streamId}/gifts` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/video-streams/{streamId}/gifts` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **DELETE** | `/api/video-streams/{streamId}/join` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/video-streams/{streamId}/join` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/video-streams/{streamId}/leave` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/video-streams/{streamId}/like` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/video-streams/{streamId}/like` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/video-streams/{streamId}/live-started` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/video-streams/{streamId}/messages` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/video-streams/{streamId}/messages` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **DELETE** | `/api/video-streams/{streamId}/moderators` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/video-streams/{streamId}/moderators` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/video-streams/{streamId}/moderators` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **DELETE** | `/api/video-streams/{streamId}/mute` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/video-streams/{streamId}/mute` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/video-streams/{streamId}/mute` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/video-streams/{streamId}/pk-battle` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/video-streams/{streamId}/pk-battle` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **DELETE** | `/api/video-streams/{streamId}/signal` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/video-streams/{streamId}/signal` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/video-streams/{streamId}/signal` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/video-streams/{streamId}/stream` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **GET** | `/api/video-streams/{streamId}/viewers` | Herkese açık | Aktif | — |

### `wallet`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/wallet` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `warmup`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/warmup` | Herkese açık | Aktif | — |

### `weekly-dream-report`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/weekly-dream-report` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/weekly-dream-report` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `withdrawals`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/withdrawals` | Karma (mobil JWT / web oturumu) | Aktif | — |
| **POST** | `/api/withdrawals` | Karma (mobil JWT / web oturumu) | Aktif | — |

### `youtube`

| Metod | Uç nokta | Kimlik doğrulama | Durum | Yerine |
|---|---|---|---|---|
| **GET** | `/api/youtube/search` | Karma (mobil JWT / web oturumu) | Aktif | — |
