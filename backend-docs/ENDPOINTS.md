# 📌CanlıFal — Tüm API Endpoint Listesi

> Otomatik keşifle çıkarılmış **780 endpoint handler** (502 benzersiz yol), **172 kategori**. Hiçbir endpoint atlanmamıştır.


Auth rüzgarları: **🔄 Dual** = mobil JWT veya web oturumu · **🌐 Oturum** = web oturumu (NextAuth) · **🌍 Public** = kimliksiz. **🔒 ADMIN** = yönetici rolü gerekir.


> Makine-okunur tam liste: `openapi.json` (Swagger) ve `postman_collection.json`.


## Kategoriler

- [activities](#cat-activities) (1)
- [admin/activity-feed](#cat-admin-activity-feed) (2)
- [admin/ad-networks](#cat-admin-ad-networks) (3)
- [admin/agencies](#cat-admin-agencies) (3)
- [admin/announcement-sections](#cat-admin-announcement-sections) (2)
- [admin/audit-logs](#cat-admin-audit-logs) (1)
- [admin/awards](#cat-admin-awards) (3)
- [admin/backup](#cat-admin-backup) (1)
- [admin/badges](#cat-admin-badges) (4)
- [admin/bana-ozel](#cat-admin-bana-ozel) (3)
- [admin/blog](#cat-admin-blog) (19)
- [admin/bots](#cat-admin-bots) (10)
- [admin/broadcast-images](#cat-admin-broadcast-images) (4)
- [admin/button-order](#cat-admin-button-order) (2)
- [admin/cache](#cat-admin-cache) (2)
- [admin/cfc-payment-requests](#cat-admin-cfc-payment-requests) (2)
- [admin/cfc-settings](#cat-admin-cfc-settings) (2)
- [admin/chat-rooms](#cat-admin-chat-rooms) (4)
- [admin/contests](#cat-admin-contests) (4)
- [admin/credit-packages](#cat-admin-credit-packages) (4)
- [admin/credits](#cat-admin-credits) (1)
- [admin/currency-config](#cat-admin-currency-config) (3)
- [admin/dreams](#cat-admin-dreams) (9)
- [admin/effect-rules](#cat-admin-effect-rules) (4)
- [admin/feature-flags](#cat-admin-feature-flags) (4)
- [admin/finance](#cat-admin-finance) (2)
- [admin/fortune-request-types](#cat-admin-fortune-request-types) (4)
- [admin/fortunes](#cat-admin-fortunes) (1)
- [admin/games](#cat-admin-games) (8)
- [admin/gift-collections](#cat-admin-gift-collections) (3)
- [admin/gift-upload](#cat-admin-gift-upload) (1)
- [admin/gifts](#cat-admin-gifts) (6)
- [admin/homepage-buttons](#cat-admin-homepage-buttons) (4)
- [admin/homepage-fortune-cards](#cat-admin-homepage-fortune-cards) (5)
- [admin/ledger](#cat-admin-ledger) (1)
- [admin/live-tellers](#cat-admin-live-tellers) (12)
- [admin/lucky-gifts](#cat-admin-lucky-gifts) (4)
- [admin/membership-badges](#cat-admin-membership-badges) (4)
- [admin/memberships](#cat-admin-memberships) (7)
- [admin/moderation](#cat-admin-moderation) (2)
- [admin/notifications](#cat-admin-notifications) (3)
- [admin/online-fal](#cat-admin-online-fal) (7)
- [admin/payment-methods](#cat-admin-payment-methods) (2)
- [admin/payments](#cat-admin-payments) (3)
- [admin/pending-counts](#cat-admin-pending-counts) (1)
- [admin/popups](#cat-admin-popups) (4)
- [admin/profile-frames](#cat-admin-profile-frames) (4)
- [admin/remote-config](#cat-admin-remote-config) (4)
- [admin/risk-events](#cat-admin-risk-events) (2)
- [admin/roles](#cat-admin-roles) (4)
- [admin/room-themes](#cat-admin-room-themes) (3)
- [admin/rooms](#cat-admin-rooms) (2)
- [admin/rtc-telemetry](#cat-admin-rtc-telemetry) (1)
- [admin/seo-settings](#cat-admin-seo-settings) (2)
- [admin/settings](#cat-admin-settings) (2)
- [admin/site-pages](#cat-admin-site-pages) (4)
- [admin/statistics](#cat-admin-statistics) (1)
- [admin/support](#cat-admin-support) (1)
- [admin/system-stats](#cat-admin-system-stats) (1)
- [admin/teller-levels](#cat-admin-teller-levels) (1)
- [admin/teller-performance](#cat-admin-teller-performance) (1)
- [admin/teller-verification](#cat-admin-teller-verification) (2)
- [admin/ticker-messages](#cat-admin-ticker-messages) (4)
- [admin/tiktok-categories](#cat-admin-tiktok-categories) (4)
- [admin/tiktok-videos](#cat-admin-tiktok-videos) (5)
- [admin/trend-videos](#cat-admin-trend-videos) (3)
- [admin/trends](#cat-admin-trends) (3)
- [admin/users](#cat-admin-users) (6)
- [admin/verification](#cat-admin-verification) (2)
- [admin/video-streams](#cat-admin-video-streams) (3)
- [admin/visitor-stats](#cat-admin-visitor-stats) (1)
- [admin/withdrawals](#cat-admin-withdrawals) (2)
- [ads](#cat-ads) (2)
- [agency](#cat-agency) (16)
- [announcements](#cat-announcements) (3)
- [anonymous](#cat-anonymous) (3)
- [astrology-panel](#cat-astrology-panel) (1)
- [auth](#cat-auth) (14)
- [bana-ozel](#cat-bana-ozel) (2)
- [blog](#cat-blog) (10)
- [bootstrap](#cat-bootstrap) (1)
- [broadcast-images](#cat-broadcast-images) (1)
- [cache](#cat-cache) (2)
- [chat](#cat-chat) (54)
- [compatibility](#cat-compatibility) (1)
- [config](#cat-config) (1)
- [contact](#cat-contact) (1)
- [credit-packages](#cat-credit-packages) (1)
- [daily-login](#cat-daily-login) (2)
- [daily-missions](#cat-daily-missions) (2)
- [deeplink](#cat-deeplink) (1)
- [devices](#cat-devices) (2)
- [dream-contest](#cat-dream-contest) (4)
- [dream-diary](#cat-dream-diary) (3)
- [dream-stats](#cat-dream-stats) (1)
- [dream-symbols](#cat-dream-symbols) (2)
- [dreams](#cat-dreams) (14)
- [effects](#cat-effects) (1)
- [favorite-tellers](#cat-favorite-tellers) (2)
- [football](#cat-football) (1)
- [fortune-access](#cat-fortune-access) (2)
- [fortune-request-types](#cat-fortune-request-types) (1)
- [fortune-tellers](#cat-fortune-tellers) (18)
- [fortunes](#cat-fortunes) (15)
- [games](#cat-games) (40)
- [gift-engine](#cat-gift-engine) (3)
- [gifts](#cat-gifts) (27)
- [hashtags](#cat-hashtags) (3)
- [health](#cat-health) (1)
- [homepage-buttons](#cat-homepage-buttons) (1)
- [homepage-fortune-cards](#cat-homepage-fortune-cards) (1)
- [homepage-ticker](#cat-homepage-ticker) (1)
- [horoscope](#cat-horoscope) (1)
- [jeton](#cat-jeton) (2)
- [leaderboards](#cat-leaderboards) (1)
- [legal](#cat-legal) (1)
- [live](#cat-live) (19)
- [me](#cat-me) (2)
- [membership](#cat-membership) (1)
- [membership-badges](#cat-membership-badges) (1)
- [memberships](#cat-memberships) (3)
- [messages](#cat-messages) (5)
- [mobile](#cat-mobile) (4)
- [monitoring](#cat-monitoring) (1)
- [music](#cat-music) (2)
- [notifications](#cat-notifications) (4)
- [online-fal](#cat-online-fal) (1)
- [payments](#cat-payments) (7)
- [pk](#cat-pk) (5)
- [platform](#cat-platform) (1)
- [popups](#cat-popups) (1)
- [presence](#cat-presence) (3)
- [profile-frames](#cat-profile-frames) (2)
- [public](#cat-public) (2)
- [public-stats](#cat-public-stats) (1)
- [referral](#cat-referral) (2)
- [room](#cat-room) (12)
- [room-themes](#cat-room-themes) (1)
- [rtc](#cat-rtc) (1)
- [search](#cat-search) (2)
- [seo-settings](#cat-seo-settings) (1)
- [settings](#cat-settings) (4)
- [share-card](#cat-share-card) (1)
- [short-videos](#cat-short-videos) (21)
- [signup](#cat-signup) (1)
- [site-pages](#cat-site-pages) (1)
- [social](#cat-social) (9)
- [stories](#cat-stories) (3)
- [support](#cat-support) (5)
- [supporter-levels](#cat-supporter-levels) (1)
- [teams](#cat-teams) (4)
- [teller](#cat-teller) (4)
- [teller-chat](#cat-teller-chat) (3)
- [tencent](#cat-tencent) (1)
- [tiktok-videos](#cat-tiktok-videos) (3)
- [tmdb](#cat-tmdb) (1)
- [tournaments](#cat-tournaments) (1)
- [translations](#cat-translations) (1)
- [trend-videos](#cat-trend-videos) (2)
- [trends](#cat-trends) (3)
- [trtc](#cat-trtc) (3)
- [upload](#cat-upload) (3)
- [user](#cat-user) (32)
- [users](#cat-users) (7)
- [verification](#cat-verification) (2)
- [video-streams](#cat-video-streams) (53)
- [wallet](#cat-wallet) (1)
- [warmup](#cat-warmup) (1)
- [weekly-dream-report](#cat-weekly-dream-report) (2)
- [withdrawals](#cat-withdrawals) (2)
- [youtube](#cat-youtube) (1)
- [{unmatched}](#cat-{unmatched}) (5)

---


## <a name="cat-activities"></a>`activities`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/activities` | 🔄 Dual | — | — |


## <a name="cat-admin-activity-feed"></a>`admin/activity-feed`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/activity-feed` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/activity-feed` | 🌐 Oturum 🔒 | — | `isEnabled`, `maxItems`, `specificUserIds`, `visibleToAdmin`, `visibleToBasic`, `visibleToDiamond`, `visibleToGold`, `visibleToGuests`, `visibleToModerator`, `visibleToPremium` |


## <a name="cat-admin-ad-networks"></a>`admin/ad-networks`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/ad-networks` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/ad-networks` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/ad-networks` | 🌐 Oturum 🔒 | — | `adCode`, `adUnitId`, `appId`, `id`, `isActive`, `name`, `provider`, `sortOrder` |


## <a name="cat-admin-agencies"></a>`admin/agencies`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/agencies` | 🌐 Oturum 🔒 | — | `agencyId` |
| **GET** | `/api/admin/agencies` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/agencies` | 🌐 Oturum 🔒 | — | `action`, `agencyId` |


## <a name="cat-admin-announcement-sections"></a>`admin/announcement-sections`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/announcement-sections` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/announcement-sections` | 🌐 Oturum 🔒 | — | `categoryConfig`, `categoryKey`, `categorySettings`, `giftAnnouncementSettings` |


## <a name="cat-admin-audit-logs"></a>`admin/audit-logs`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/audit-logs` | 🌐 Oturum 🔒 | — | — |


## <a name="cat-admin-awards"></a>`admin/awards`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/awards` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/awards` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/awards` | 🌐 Oturum 🔒 | — | `awardType`, `endDate`, `startDate`, `tellerId`, `title` |


## <a name="cat-admin-backup"></a>`admin/backup`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/backup` | 🌐 Oturum 🔒 | — | — |


## <a name="cat-admin-badges"></a>`admin/badges`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/badges` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/badges` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/badges` | 🌐 Oturum 🔒 | — | `bgColor`, `color`, `description`, `icon`, `name`, `tier`, `userId` |
| **PUT** | `/api/admin/badges` | 🌐 Oturum 🔒 | — | `bgColor`, `color`, `description`, `icon`, `id`, `isActive`, `name`, `sortOrder`, `tier`, `userId` |


## <a name="cat-admin-bana-ozel"></a>`admin/bana-ozel`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/bana-ozel` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/bana-ozel` | 🌐 Oturum 🔒 | — | `id` |
| **POST** | `/api/admin/bana-ozel` | 🌐 Oturum 🔒 | — | `category`, `icon`, `jetonCost`, `nameEn`, `nameTr`, `slug`, `sortOrder` |


## <a name="cat-admin-blog"></a>`admin/blog`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/blog` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/blog` | 🌐 Oturum 🔒 | — | `authorName`, `category`, `contentEn`, `contentTr`, `coverImage`, `descEn`, `descTr`, `isAiGenerated`, `isEditorPick`, `isFeatured`, `isPremium`, `isPublished` … |
| **GET** | `/api/admin/blog/analytics` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/blog/bulk-category` | 🌐 Oturum 🔒 | — | `category`, `postIds` |
| **POST** | `/api/admin/blog/bulk-delete` | 🌐 Oturum 🔒 | — | `postIds` |
| **POST** | `/api/admin/blog/bulk-generate` | 🌐 Oturum 🔒 | — | `autoPublish`, `category`, `topics`, `zodiacSign` |
| **POST** | `/api/admin/blog/bulk-import` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/blog/bulk-publish` | 🌐 Oturum 🔒 | — | `isPublished`, `postIds` |
| **DELETE** | `/api/admin/blog/categories` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/blog/categories` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/blog/categories` | 🌐 Oturum 🔒 | — | `nameEn`, `nameTr`, `slug` |
| **GET** | `/api/admin/blog/comments` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/blog/comments` | 🌐 Oturum 🔒 | — | `action`, `commentId` |
| **POST** | `/api/admin/blog/generate` | 🌐 Oturum 🔒 | — | `keywords`, `mode`, `title` |
| **POST** | `/api/admin/blog/import` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/blog/schedule-publish` | 🌐 Oturum 🔒 | — | — |
| **DELETE** | `/api/admin/blog/{postId}` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/blog/{postId}` | 🌐 Oturum 🔒 | — | `authorName`, `category`, `contentEn`, `contentTr`, `coverImage`, `descEn`, `descTr`, `isAiGenerated`, `isEditorPick`, `isFeatured`, `isPremium`, `isPublished` … |
| **PUT** | `/api/admin/blog/{postId}` | 🌐 Oturum 🔒 | — | — |


## <a name="cat-admin-bots"></a>`admin/bots`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/bots` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/bots` | 🌐 Oturum 🔒 | — | `action`, `activityLevel`, `botIds`, `isActive`, `personality` |
| **GET** | `/api/admin/bots/simulate` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/bots/simulate` | 🌐 Oturum 🔒 | — | `action`, `roomId` |
| **GET** | `/api/admin/bots/simulate-fortune` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/bots/simulate-fortune` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/bots/simulate-master` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/bots/simulate-master` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/bots/simulate-social` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/bots/simulate-social` | 🌐 Oturum 🔒 | — | — |


## <a name="cat-admin-broadcast-images"></a>`admin/broadcast-images`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/broadcast-images` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/broadcast-images` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/broadcast-images` | 🌐 Oturum 🔒 | — | `id`, `imageUrl`, `isActive`, `name`, `sortOrder` |
| **POST** | `/api/admin/broadcast-images` | 🌐 Oturum 🔒 | — | `imageUrl`, `name`, `sortOrder` |


## <a name="cat-admin-button-order"></a>`admin/button-order`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/button-order` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/button-order` | 🌐 Oturum 🔒 | — | `order` |


## <a name="cat-admin-cache"></a>`admin/cache`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/cache` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/cache` | 🌐 Oturum 🔒 | — | — |


## <a name="cat-admin-cfc-payment-requests"></a>`admin/cfc-payment-requests`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/cfc-payment-requests` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/cfc-payment-requests` | 🌐 Oturum 🔒 | — | `action`, `requestId`, `reviewNote` |


## <a name="cat-admin-cfc-settings"></a>`admin/cfc-settings`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/cfc-settings` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/cfc-settings` | 🌐 Oturum 🔒 | — | — |


## <a name="cat-admin-chat-rooms"></a>`admin/chat-rooms`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/chat-rooms` | 🌐 Oturum 🔒 | — | `roomId` |
| **GET** | `/api/admin/chat-rooms` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/chat-rooms` | 🌐 Oturum 🔒 | — | `description`, `icon`, `name`, `roomType` |
| **PUT** | `/api/admin/chat-rooms` | 🌐 Oturum 🔒 | — | `backgroundImage`, `descEn`, `descTr`, `giftCommissionPercent`, `icon`, `isActive`, `isMuted`, `nameEn`, `nameTr`, `ownerId`, `roomId`, `roomType` |


## <a name="cat-admin-contests"></a>`admin/contests`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/contests` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/contests` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/contests` | 🌐 Oturum 🔒 | — | `description`, `dreamPrompt`, `endDate`, `id`, `isActive`, `startDate`, `title` |
| **POST** | `/api/admin/contests` | 🌐 Oturum 🔒 | — | `description`, `dreamPrompt`, `endDate`, `startDate`, `title` |


## <a name="cat-admin-credit-packages"></a>`admin/credit-packages`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/credit-packages` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/credit-packages` | 🌐 Oturum 🔒 | — | `bonusCredits`, `credits`, `currency`, `isFeatured`, `name`, `nameEn`, `price`, `sortOrder` |
| **DELETE** | `/api/admin/credit-packages/{packageId}` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/credit-packages/{packageId}` | 🌐 Oturum 🔒 | — | `bonusCredits`, `credits`, `currency`, `isActive`, `isFeatured`, `name`, `nameEn`, `price`, `sortOrder` |


## <a name="cat-admin-credits"></a>`admin/credits`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **POST** | `/api/admin/credits` | 🌐 Oturum 🔒 | — | `amount`, `currency`, `userId` |


## <a name="cat-admin-currency-config"></a>`admin/currency-config`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/currency-config` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/currency-config` | 🌐 Oturum 🔒 | — | `area`, `areaName`, `cost`, `currencyType`, `id`, `isActive` |
| **PUT** | `/api/admin/currency-config` | 🌐 Oturum 🔒 | — | `configs` |


## <a name="cat-admin-dreams"></a>`admin/dreams`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/dreams` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/dreams` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/dreams` | 🌐 Oturum 🔒 | — | `category`, `content`, `isPublished`, `keywords`, `metaDescription`, `summary`, `title` |
| **PUT** | `/api/admin/dreams` | 🌐 Oturum 🔒 | — | `category`, `content`, `id`, `isPublished`, `keywords`, `metaDescription`, `summary`, `title` |
| **PATCH** | `/api/admin/dreams/bulk-category` | 🌐 Oturum 🔒 | — | `category`, `dreamIds` |
| **POST** | `/api/admin/dreams/bulk-delete` | 🌐 Oturum 🔒 | — | `dreamIds` |
| **POST** | `/api/admin/dreams/bulk-import` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/dreams/bulk-publish` | 🌐 Oturum 🔒 | — | `dreamIds`, `isPublished` |
| **POST** | `/api/admin/dreams/generate` | 🌐 Oturum 🔒 | — | `title` |


## <a name="cat-admin-effect-rules"></a>`admin/effect-rules`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/effect-rules` | 🌍 Public 🔒 | — | — |
| **POST** | `/api/admin/effect-rules` | 🌍 Public 🔒 | — | `conditionType`, `conditionValue`, `description`, `effectRefId`, `effectType`, `isActive`, `key`, `name`, `priority`, `threshold` |
| **DELETE** | `/api/admin/effect-rules/{ruleId}` | 🌍 Public 🔒 | — | — |
| **PATCH** | `/api/admin/effect-rules/{ruleId}` | 🌍 Public 🔒 | — | `conditionType`, `conditionValue`, `description`, `effectRefId`, `effectType`, `isActive`, `name`, `priority`, `threshold` |


## <a name="cat-admin-feature-flags"></a>`admin/feature-flags`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/feature-flags` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/feature-flags` | 🌐 Oturum 🔒 | — | `description`, `enabled`, `key`, `metadata`, `percentage`, `platform` |
| **DELETE** | `/api/admin/feature-flags/{flagId}` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/feature-flags/{flagId}` | 🌐 Oturum 🔒 | — | `description`, `enabled`, `metadata`, `percentage`, `platform` |


## <a name="cat-admin-finance"></a>`admin/finance`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/finance` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/finance` | 🌐 Oturum 🔒 | — | `action`, `amount`, `currency`, `key`, `reason`, `userId`, `value` |


## <a name="cat-admin-fortune-request-types"></a>`admin/fortune-request-types`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/fortune-request-types` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/fortune-request-types` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/fortune-request-types` | 🌐 Oturum 🔒 | — | `description`, `icon`, `id`, `isActive`, `jetonCost`, `name`, `nameEn`, `sortOrder` |
| **POST** | `/api/admin/fortune-request-types` | 🌐 Oturum 🔒 | — | `description`, `icon`, `jetonCost`, `name`, `nameEn`, `sortOrder` |


## <a name="cat-admin-fortunes"></a>`admin/fortunes`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/fortunes` | 🌐 Oturum 🔒 | — | — |


## <a name="cat-admin-games"></a>`admin/games`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/games` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/games` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/games` | 🌐 Oturum 🔒 | — | `config`, `description`, `entryFee`, `icon`, `isActive`, `maxReward`, `minReward`, `slug`, `sortOrder`, `title` |
| **PUT** | `/api/admin/games` | 🌐 Oturum 🔒 | — | `config`, `description`, `entryFee`, `icon`, `id`, `isActive`, `maxReward`, `minReward`, `sortOrder`, `title` |
| **DELETE** | `/api/admin/games/rooms` | 🌐 Oturum 🔒 | — | `roomId` |
| **GET** | `/api/admin/games/rooms` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/games/settings` | 🌐 Oturum 🔒 | — | — |
| **PUT** | `/api/admin/games/settings` | 🌐 Oturum 🔒 | — | — |


## <a name="cat-admin-gift-collections"></a>`admin/gift-collections`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/gift-collections` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/gift-collections` | 🌐 Oturum 🔒 | — | `description`, `iconCloudPath`, `iconEmoji`, `iconUrl`, `id`, `isActive`, `name`, `nameEn`, `slug`, `sortOrder` |
| **POST** | `/api/admin/gift-collections` | 🌐 Oturum 🔒 | — | `description`, `iconCloudPath`, `iconEmoji`, `iconUrl`, `isActive`, `name`, `nameEn`, `slug`, `sortOrder` |


## <a name="cat-admin-gift-upload"></a>`admin/gift-upload`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **POST** | `/api/admin/gift-upload` | 🌐 Oturum 🔒 | — | `contentType`, `fileName`, `purpose` |


## <a name="cat-admin-gifts"></a>`admin/gifts`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/gifts` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/gifts` | 🌐 Oturum 🔒 | — | `animEndPoint`, `animStartPoint`, `animation`, `animationDurationMs`, `animationType`, `assetDurationMs`, `assetHeight`, `assetMimeType`, `assetType`, `assetUrl`, `assetWidth`, `campaignEnd` … |
| **GET** | `/api/admin/gifts/stats` | 🌐 Oturum 🔒 | — | — |
| **DELETE** | `/api/admin/gifts/{giftId}` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/gifts/{giftId}` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/gifts/{giftId}` | 🌐 Oturum 🔒 | — | `animationType`, `assetMimeType`, `assetType`, `assetUrl`, `cloudStoragePath`, `collectionId`, `iconImageCloudPath`, `iconImageUrl`, `musicCloudPath`, `musicUrl`, `soundCloudPath`, `soundUrl` … |


## <a name="cat-admin-homepage-buttons"></a>`admin/homepage-buttons`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/homepage-buttons` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/homepage-buttons` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/homepage-buttons` | 🌐 Oturum 🔒 | — | `href`, `icon`, `id`, `isVisible`, `label`, `reorder`, `sortOrder`, `specialBehavior` |
| **POST** | `/api/admin/homepage-buttons` | 🌐 Oturum 🔒 | — | `href`, `icon`, `label`, `specialBehavior` |


## <a name="cat-admin-homepage-fortune-cards"></a>`admin/homepage-fortune-cards`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/homepage-fortune-cards` | 🌐 Oturum 🔒 | — | `id` |
| **GET** | `/api/admin/homepage-fortune-cards` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/homepage-fortune-cards` | 🌐 Oturum 🔒 | — | `key`, `settings`, `value` |
| **POST** | `/api/admin/homepage-fortune-cards` | 🌐 Oturum 🔒 | — | `href`, `icon`, `id`, `image`, `isActive`, `name`, `sortOrder` |
| **PUT** | `/api/admin/homepage-fortune-cards` | 🌐 Oturum 🔒 | — | `id` |


## <a name="cat-admin-ledger"></a>`admin/ledger`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/ledger` | 🌐 Oturum 🔒 | — | — |


## <a name="cat-admin-live-tellers"></a>`admin/live-tellers`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/live-tellers` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/live-tellers` | 🌐 Oturum 🔒 | — | `bio`, `displayName`, `isVerified`, `pricePerSession`, `specialties`, `userId` |
| **DELETE** | `/api/admin/live-tellers/{tellerId}` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/live-tellers/{tellerId}` | 🌐 Oturum 🔒 | — | — |
| **PUT** | `/api/admin/live-tellers/{tellerId}` | 🌐 Oturum 🔒 | — | `bio`, `displayName`, `isActive`, `isVerified`, `pricePerSession`, `specialties` |
| **POST** | `/api/admin/live-tellers/{tellerId}/approve` | 🌐 Oturum 🔒 | — | `action`, `note` |
| **POST** | `/api/admin/live-tellers/{tellerId}/ban` | 🌐 Oturum 🔒 | — | `action`, `reason` |
| **POST** | `/api/admin/live-tellers/{tellerId}/bonus` | 🌐 Oturum 🔒 | — | `amount`, `reason` |
| **POST** | `/api/admin/live-tellers/{tellerId}/freeze` | 🌐 Oturum 🔒 | — | `action`, `reason` |
| **PUT** | `/api/admin/live-tellers/{tellerId}/permissions` | 🌐 Oturum 🔒 | — | `adminNotes`, `canChat`, `canEditProfile`, `canGoOnline`, `canSetPrice`, `canStartSession`, `canViewEarnings`, `canWithdraw`, `commissionRate`, `maxSessionsPerDay` |
| **DELETE** | `/api/admin/live-tellers/{tellerId}/warning` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/live-tellers/{tellerId}/warning` | 🌐 Oturum 🔒 | — | `reason` |


## <a name="cat-admin-lucky-gifts"></a>`admin/lucky-gifts`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/lucky-gifts/tiers` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/lucky-gifts/tiers` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/lucky-gifts/tiers` | 🌐 Oturum 🔒 | — | `id` |
| **POST** | `/api/admin/lucky-gifts/tiers` | 🌐 Oturum 🔒 | — | `color`, `icon`, `isActive`, `isJackpot`, `multiplier`, `name`, `nameEn`, `sortOrder`, `weight` |


## <a name="cat-admin-membership-badges"></a>`admin/membership-badges`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/membership-badges` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/membership-badges` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/membership-badges` | 🌐 Oturum 🔒 | — | `id`, `imageUrl`, `isActive`, `name`, `sortOrder`, `tier` |
| **POST** | `/api/admin/membership-badges` | 🌐 Oturum 🔒 | — | `imageUrl`, `isActive`, `name`, `sortOrder`, `tier` |


## <a name="cat-admin-memberships"></a>`admin/memberships`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/memberships` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/memberships` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/memberships` | 🌐 Oturum 🔒 | — | `bonusJetons`, `currency`, `description`, `descriptionEn`, `discountPercent`, `durationDays`, `exclusiveBadge`, `features`, `isActive`, `isFeatured`, `name`, `nameEn` … |
| **PUT** | `/api/admin/memberships` | 🌐 Oturum 🔒 | — | `id` |
| **GET** | `/api/admin/memberships/purchases` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/memberships/purchases` | 🌐 Oturum 🔒 | — | `action`, `extendDays`, `purchaseId` |
| **POST** | `/api/admin/memberships/purchases` | 🌐 Oturum 🔒 | — | `customTier`, `durationDays`, `freeGrant`, `planId`, `userId` |


## <a name="cat-admin-moderation"></a>`admin/moderation`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/moderation` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/moderation` | 🌐 Oturum 🔒 | — | `action`, `reason`, `targetId` |


## <a name="cat-admin-notifications"></a>`admin/notifications`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/notifications` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/notifications` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/notifications` | 🌐 Oturum 🔒 | — | `imageUrl`, `message`, `scheduledAt`, `targetType`, `targetValue`, `title`, `url` |


## <a name="cat-admin-online-fal"></a>`admin/online-fal`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/online-fal/buttons` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/online-fal/buttons` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/online-fal/buttons` | 🌐 Oturum 🔒 | — | `bgColor`, `borderColor`, `href`, `icon`, `id`, `isVisible`, `label`, `sortOrder`, `textColor` |
| **POST** | `/api/admin/online-fal/buttons` | 🌐 Oturum 🔒 | — | `bgColor`, `borderColor`, `href`, `icon`, `label`, `textColor` |
| **GET** | `/api/admin/online-fal/sections` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/online-fal/sections` | 🌐 Oturum 🔒 | — | `icon`, `id`, `isVisible`, `sortOrder`, `title` |
| **POST** | `/api/admin/online-fal/sections` | 🌐 Oturum 🔒 | — | `order` |


## <a name="cat-admin-payment-methods"></a>`admin/payment-methods`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/payment-methods` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/payment-methods` | 🌐 Oturum 🔒 | — | `config`, `description`, `descriptionEn`, `isActive`, `name`, `nameEn`, `sortOrder`, `type` |


## <a name="cat-admin-payments"></a>`admin/payments`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/payments` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/payments` | 🌐 Oturum 🔒 | — | `action`, `jetonAmount`, `notificationId` |
| **POST** | `/api/admin/payments` | 🌐 Oturum 🔒 | — | `jetonAmount`, `reason`, `userId` |


## <a name="cat-admin-pending-counts"></a>`admin/pending-counts`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/pending-counts` | 🌐 Oturum 🔒 | — | — |


## <a name="cat-admin-popups"></a>`admin/popups`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/popups` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/popups` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/popups` | 🌐 Oturum 🔒 | — | `buttons`, `isActive`, `maxShowCount`, `message`, `popupType`, `priority`, `showDelaySeconds`, `showOnRefresh`, `showTo`, `title` |
| **PUT** | `/api/admin/popups` | 🌐 Oturum 🔒 | — | `action`, `buttons`, `id`, `isActive`, `maxShowCount`, `message`, `popupType`, `priority`, `showDelaySeconds`, `showOnRefresh`, `showTo`, `title` |


## <a name="cat-admin-profile-frames"></a>`admin/profile-frames`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/profile-frames` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/profile-frames` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/profile-frames` | 🌐 Oturum 🔒 | — | `id`, `imageUrl`, `isActive`, `name`, `sortOrder`, `tier` |
| **POST** | `/api/admin/profile-frames/assign` | 🌐 Oturum 🔒 | — | `frameId`, `userId` |


## <a name="cat-admin-remote-config"></a>`admin/remote-config`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/remote-config` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/remote-config` | 🌐 Oturum 🔒 | — | `description`, `group`, `key`, `platform`, `value`, `valueType` |
| **DELETE** | `/api/admin/remote-config/{configId}` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/remote-config/{configId}` | 🌐 Oturum 🔒 | — | `description`, `group`, `platform`, `value`, `valueType` |


## <a name="cat-admin-risk-events"></a>`admin/risk-events`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/risk-events` | 🌍 Public 🔒 | — | — |
| **PATCH** | `/api/admin/risk-events/{eventId}` | 🌍 Public 🔒 | — | `reviewNote`, `reviewed` |


## <a name="cat-admin-roles"></a>`admin/roles`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/roles` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/roles` | 🌐 Oturum 🔒 | — | `description`, `key`, `level`, `name` |
| **DELETE** | `/api/admin/roles/{roleId}` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/roles/{roleId}` | 🌐 Oturum 🔒 | — | `description`, `level`, `name`, `permissions` |


## <a name="cat-admin-room-themes"></a>`admin/room-themes`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/room-themes/backgrounds` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/room-themes/backgrounds` | 🌐 Oturum 🔒 | — | `backgroundUrl`, `cloudStoragePath`, `id`, `soundCloudPath`, `soundUrl`, `thumbnailCloudPath`, `thumbnailUrl` |
| **POST** | `/api/admin/room-themes/backgrounds` | 🌐 Oturum 🔒 | — | `activeFrom`, `activeTo`, `animationSpeed`, `assetType`, `backgroundUrl`, `blurAmount`, `category`, `cloudStoragePath`, `description`, `hasParallax`, `hasZoom`, `isActive` … |


## <a name="cat-admin-rooms"></a>`admin/rooms`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/rooms` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/rooms` | 🌐 Oturum 🔒 | — | `giftBeneficiaryId`, `giftCommissionPercent`, `roomId` |


## <a name="cat-admin-rtc-telemetry"></a>`admin/rtc-telemetry`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/rtc-telemetry` | 🌍 Public 🔒 | — | — |


## <a name="cat-admin-seo-settings"></a>`admin/seo-settings`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/seo-settings` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/seo-settings` | 🌐 Oturum 🔒 | — | — |


## <a name="cat-admin-settings"></a>`admin/settings`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/settings` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/settings` | 🌐 Oturum 🔒 | — | `description`, `key`, `value` |


## <a name="cat-admin-site-pages"></a>`admin/site-pages`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/site-pages` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/site-pages` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/site-pages` | 🌐 Oturum 🔒 | — | `content`, `contentEn`, `isPublished`, `showInFooter`, `showInHeader`, `slug`, `sortOrder`, `title`, `titleEn` |
| **PUT** | `/api/admin/site-pages` | 🌐 Oturum 🔒 | — | `content`, `contentEn`, `id`, `isPublished`, `items`, `reorder`, `showInFooter`, `showInHeader`, `slug`, `sortOrder`, `title`, `titleEn` |


## <a name="cat-admin-statistics"></a>`admin/statistics`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/statistics` | 🌐 Oturum 🔒 | — | — |


## <a name="cat-admin-support"></a>`admin/support`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/support` | 🌍 Public 🔒 | — | — |


## <a name="cat-admin-system-stats"></a>`admin/system-stats`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/system-stats` | 🌍 Public 🔒 | — | — |


## <a name="cat-admin-teller-levels"></a>`admin/teller-levels`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **POST** | `/api/admin/teller-levels` | 🌐 Oturum 🔒 | — | — |


## <a name="cat-admin-teller-performance"></a>`admin/teller-performance`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/teller-performance` | 🌐 Oturum 🔒 | — | — |


## <a name="cat-admin-teller-verification"></a>`admin/teller-verification`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/teller-verification` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/teller-verification` | 🌐 Oturum 🔒 | — | `action`, `note`, `tellerId` |


## <a name="cat-admin-ticker-messages"></a>`admin/ticker-messages`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/ticker-messages` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/ticker-messages` | 🌐 Oturum 🔒 | — | `icon`, `text` |
| **DELETE** | `/api/admin/ticker-messages/{messageId}` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/ticker-messages/{messageId}` | 🌐 Oturum 🔒 | — | `icon`, `isActive`, `sortOrder`, `text` |


## <a name="cat-admin-tiktok-categories"></a>`admin/tiktok-categories`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/tiktok-categories` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/tiktok-categories` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/tiktok-categories` | 🌐 Oturum 🔒 | — | `description`, `id`, `isActive`, `sortOrder`, `title` |
| **POST** | `/api/admin/tiktok-categories` | 🌐 Oturum 🔒 | — | `description`, `title` |


## <a name="cat-admin-tiktok-videos"></a>`admin/tiktok-videos`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/tiktok-videos` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/tiktok-videos` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/tiktok-videos` | 🌐 Oturum 🔒 | — | `categoryId`, `id`, `isActive`, `sortOrder`, `title` |
| **POST** | `/api/admin/tiktok-videos` | 🌐 Oturum 🔒 | — | `categoryId`, `tiktokUrl`, `tiktokUrls` |
| **PUT** | `/api/admin/tiktok-videos` | 🌐 Oturum 🔒 | — | — |


## <a name="cat-admin-trend-videos"></a>`admin/trend-videos`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/trend-videos` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/trend-videos` | 🌐 Oturum 🔒 | — | `action`, `categoryId`, `channelName`, `description`, `duration`, `id`, `isActive`, `sortOrder`, `thumbnailUrl`, `title`, `videos`, `youtubeId` |
| **POST** | `/api/admin/trend-videos/youtube` | 🌐 Oturum 🔒 | — | `action`, `maxResults`, `query`, `urls` |


## <a name="cat-admin-trends"></a>`admin/trends`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/trends` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/trends` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/trends` | 🌐 Oturum 🔒 | — | `id` |


## <a name="cat-admin-users"></a>`admin/users`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/users` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/users/search` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/users/withdrawal-limit` | 🌐 Oturum 🔒 | — | `limit`, `userId` |
| **DELETE** | `/api/admin/users/{userId}` | 🌐 Oturum 🔒 | — | — |
| **GET** | `/api/admin/users/{userId}` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/users/{userId}` | 🌐 Oturum 🔒 | — | `action`, `amount`, `banReason`, `credits`, `email`, `image`, `membership`, `membershipExpiresAt`, `name`, `newPassword`, `phone`, `profileEffect` … |


## <a name="cat-admin-verification"></a>`admin/verification`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/verification` | 🌍 Public 🔒 | — | — |
| **PATCH** | `/api/admin/verification` | 🌍 Public 🔒 | — | `action`, `id`, `reviewNote` |


## <a name="cat-admin-video-streams"></a>`admin/video-streams`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/admin/video-streams` | 🌐 Oturum 🔒 | — | `streamId` |
| **GET** | `/api/admin/video-streams` | 🌐 Oturum 🔒 | — | — |
| **PATCH** | `/api/admin/video-streams` | 🌐 Oturum 🔒 | — | `action`, `streamId` |


## <a name="cat-admin-visitor-stats"></a>`admin/visitor-stats`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/visitor-stats` | 🌐 Oturum 🔒 | — | — |


## <a name="cat-admin-withdrawals"></a>`admin/withdrawals`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/admin/withdrawals` | 🌐 Oturum 🔒 | — | — |
| **POST** | `/api/admin/withdrawals` | 🌐 Oturum 🔒 | — | `action`, `adminNote`, `requestId` |


## <a name="cat-ads"></a>`ads`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/ads/active` | 🌍 Public | — | — |
| **POST** | `/api/ads/reward` | 🔄 Dual | — | — |


## <a name="cat-agency"></a>`agency`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **POST** | `/api/agency/apply` | 🔄 Dual | var (özel) | `contactEmail`, `contactPhone`, `description`, `name` |
| **GET** | `/api/agency/earnings` | 🔄 Dual | — | — |
| **GET** | `/api/agency/invite` | 🔄 Dual | — | — |
| **POST** | `/api/agency/invite` | 🔄 Dual | — | `expiresInDays`, `maxUses` |
| **POST** | `/api/agency/join` | 🔄 Dual | var (özel) | `inviteCode` |
| **GET** | `/api/agency/leaderboard` | 🌍 Public | — | — |
| **DELETE** | `/api/agency/leave` | 🔄 Dual | — | — |
| **POST** | `/api/agency/leave` | 🔄 Dual | — | `action`, `reason`, `requestId`, `reviewNote` |
| **DELETE** | `/api/agency/members` | 🔄 Dual | — | — |
| **GET** | `/api/agency/members` | 🔄 Dual | — | — |
| **POST** | `/api/agency/members` | 🔄 Dual | — | `username` |
| **GET** | `/api/agency/my` | 🔄 Dual | — | — |
| **PATCH** | `/api/agency/my` | 🔄 Dual | — | `description`, `name` |
| **GET** | `/api/agency/tasks` | 🔄 Dual | — | — |
| **GET** | `/api/agency/withdrawals` | 🔄 Dual | var (özel) | — |
| **POST** | `/api/agency/withdrawals` | 🔄 Dual | var (özel) | `action`, `note`, `requestId` |


## <a name="cat-announcements"></a>`announcements`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/announcements` | 🔄 Dual | — | — |
| **POST** | `/api/announcements` | 🔄 Dual | — | `path`, `section` |
| **POST** | `/api/announcements/event` | 🔄 Dual | — | `details`, `eventType` |


## <a name="cat-anonymous"></a>`anonymous`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/anonymous` | 🌍 Public | — | — |
| **POST** | `/api/anonymous` | 🌍 Public | — | `deviceId`, `username` |
| **POST** | `/api/anonymous/watch-ad` | 🌍 Public | — | `deviceId` |


## <a name="cat-astrology-panel"></a>`astrology-panel`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/astrology-panel` | 🔄 Dual | — | — |


## <a name="cat-auth"></a>`auth`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **POST** | `/api/auth/change-password` | 🔄 Dual | — | `currentPassword`, `newPassword` |
| **POST** | `/api/auth/forgot-password` | 🌍 Public | authLimiter (kimlik doğrulama limiti) | `email` |
| **POST** | `/api/auth/logout` | 🔄 Dual | — | — |
| **POST** | `/api/auth/mobile-apple` | 🌍 Public | authLimiter (kimlik doğrulama limiti) | `fullName`, `identityToken`, `referralCode` |
| **POST** | `/api/auth/mobile-google` | 🌍 Public | authLimiter (kimlik doğrulama limiti) | `idToken`, `referralCode` |
| **POST** | `/api/auth/mobile-login` | 🌍 Public | authLimiter (kimlik doğrulama limiti) | `email`, `password`, `username` |
| **POST** | `/api/auth/mobile-refresh` | 🌍 Public | — | `refreshToken` |
| **POST** | `/api/auth/mobile-register` | 🌍 Public | authLimiter (kimlik doğrulama limiti) | `birthDate`, `birthTime`, `email`, `name`, `password`, `preferredLanguage`, `referralCode`, `username` |
| **POST** | `/api/auth/mobile-tiktok` | 🌍 Public | authLimiter (kimlik doğrulama limiti) | `code`, `redirectUri`, `referralCode` |
| **POST** | `/api/auth/reclaim-device` | 🌐 Oturum | — | — |
| **POST** | `/api/auth/reset-password` | 🌍 Public | authLimiter (kimlik doğrulama limiti) | `password`, `token` |
| **GET** | `/api/auth/verify-device` | 🌐 Oturum | — | — |
| **GET** | `/api/auth/{nextauth}` | 🌍 Public | — | — |
| **POST** | `/api/auth/{nextauth}` | 🌍 Public | — | — |


## <a name="cat-bana-ozel"></a>`bana-ozel`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/bana-ozel` | 🔄 Dual | — | — |
| **POST** | `/api/bana-ozel/open` | 🔄 Dual | — | `slug` |


## <a name="cat-blog"></a>`blog`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/blog` | 🌍 Public | — | — |
| **GET** | `/api/blog/categories` | 🌍 Public | — | — |
| **DELETE** | `/api/blog/comments` | 🔄 Dual 🔒 | var (özel) | — |
| **GET** | `/api/blog/comments` | 🔄 Dual 🔒 | var (özel) | — |
| **POST** | `/api/blog/comments` | 🔄 Dual 🔒 | var (özel) | `content`, `parentId`, `postId` |
| **POST** | `/api/blog/favorite` | 🔄 Dual | — | `postId` |
| **GET** | `/api/blog/interactions` | 🔄 Dual | — | — |
| **POST** | `/api/blog/like` | 🔄 Dual | — | `postId` |
| **GET** | `/api/blog/related` | 🌍 Public | — | — |
| **GET** | `/api/blog/zodiac` | 🌍 Public | — | — |


## <a name="cat-bootstrap"></a>`bootstrap`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/bootstrap` | 🌍 Public | — | — |


## <a name="cat-broadcast-images"></a>`broadcast-images`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/broadcast-images` | 🔄 Dual | — | — |


## <a name="cat-cache"></a>`cache`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/cache` | 🔄 Dual 🔒 | — | — |
| **POST** | `/api/cache` | 🔄 Dual 🔒 | — | `channel`, `data`, `field`, `key`, `member`, `members`, `message`, `op`, `prefix`, `score`, `ttl`, `value` … |


## <a name="cat-chat"></a>`chat`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/chat/broadcast-images` | 🌍 Public | — | — |
| **DELETE** | `/api/chat/cleanup` | 🌍 Public | — | — |
| **GET** | `/api/chat/cleanup` | 🌍 Public | — | — |
| **POST** | `/api/chat/cleanup` | 🌍 Public | — | — |
| **GET** | `/api/chat/rooms` | 🌍 Public | — | — |
| **GET** | `/api/chat/rooms/backgrounds` | 🌍 Public | — | — |
| **POST** | `/api/chat/rooms/create` | 🔄 Dual | var (özel) | `description`, `icon`, `name`, `paymentType`, `roomType` |
| **GET** | `/api/chat/rooms/pk-list` | 🌍 Public | — | — |
| **GET** | `/api/chat/rooms/{roomId}/dj` | 🔄 Dual 🔒 | — | — |
| **POST** | `/api/chat/rooms/{roomId}/dj` | 🔄 Dual 🔒 | — | `action`, `userId` |
| **GET** | `/api/chat/rooms/{roomId}/gifts` | 🔄 Dual | var (özel) | — |
| **POST** | `/api/chat/rooms/{roomId}/gifts` | 🔄 Dual | var (özel) | `battleId`, `giftTypeId`, `platform`, `quantity`, `receiverName`, `senderName`, `side`, `streamId` |
| **DELETE** | `/api/chat/rooms/{roomId}/messages` | 🔄 Dual 🔒 | var (özel) | — |
| **GET** | `/api/chat/rooms/{roomId}/messages` | 🔄 Dual 🔒 | var (özel) | — |
| **POST** | `/api/chat/rooms/{roomId}/messages` | 🔄 Dual 🔒 | var (özel) | `content`, `nickname` |
| **GET** | `/api/chat/rooms/{roomId}/moderation` | 🔄 Dual 🔒 | — | — |
| **POST** | `/api/chat/rooms/{roomId}/moderation` | 🔄 Dual 🔒 | — | `action`, `duration`, `message`, `reason`, `role`, `targetUserId`, `ttl` |
| **DELETE** | `/api/chat/rooms/{roomId}/music` | 🔄 Dual 🔒 | — | — |
| **GET** | `/api/chat/rooms/{roomId}/music` | 🔄 Dual 🔒 | — | — |
| **POST** | `/api/chat/rooms/{roomId}/music` | 🔄 Dual 🔒 | — | `duration`, `title`, `videoId` |
| **GET** | `/api/chat/rooms/{roomId}/music-queue` | 🔄 Dual | — | — |
| **POST** | `/api/chat/rooms/{roomId}/music/stop` | 🔄 Dual | — | — |
| **GET** | `/api/chat/rooms/{roomId}/pk` | 🔄 Dual 🔒 | var (özel) | — |
| **POST** | `/api/chat/rooms/{roomId}/pk` | 🔄 Dual 🔒 | var (özel) | — |
| **POST** | `/api/chat/rooms/{roomId}/pk/score` | 🔄 Dual | — | `amount`, `battleId`, `side` |
| **DELETE** | `/api/chat/rooms/{roomId}/presence` | 🔄 Dual 🔒 | — | — |
| **GET** | `/api/chat/rooms/{roomId}/presence` | 🔄 Dual 🔒 | — | — |
| **POST** | `/api/chat/rooms/{roomId}/presence` | 🔄 Dual 🔒 | — | `nickname`, `password`, `seatIndex` |
| **GET** | `/api/chat/rooms/{roomId}/seats` | 🔄 Dual | — | — |
| **PATCH** | `/api/chat/rooms/{roomId}/seats` | 🔄 Dual | — | `forceAssign`, `forceThrone`, `seatIndex`, `targetUserId` |
| **GET** | `/api/chat/rooms/{roomId}/settings` | 🔄 Dual | — | — |
| **PATCH** | `/api/chat/rooms/{roomId}/settings` | 🔄 Dual | — | `backgroundImage`, `bannedWords`, `bannerImage`, `descEn`, `descTr`, `giftCommissionPercent`, `icon`, `isActive`, `isMuted`, `nameEn`, `nameTr`, `password` … |
| **GET** | `/api/chat/rooms/{roomId}/song-request` | 🔄 Dual | — | — |
| **PATCH** | `/api/chat/rooms/{roomId}/song-request` | 🔄 Dual | — | `requestId` |
| **POST** | `/api/chat/rooms/{roomId}/song-request` | 🔄 Dual | — | `dedication`, `duration`, `note`, `priority`, `requestType`, `title`, `videoId` |
| **DELETE** | `/api/chat/rooms/{roomId}/speak-request` | 🔄 Dual | — | — |
| **GET** | `/api/chat/rooms/{roomId}/speak-request` | 🔄 Dual | — | — |
| **POST** | `/api/chat/rooms/{roomId}/speak-request` | 🔄 Dual | — | `message` |
| **DELETE** | `/api/chat/rooms/{roomId}/speak-request/{userId}/block` | 🔄 Dual | — | — |
| **POST** | `/api/chat/rooms/{roomId}/speak-request/{userId}/block` | 🔄 Dual | — | `reason` |
| **DELETE** | `/api/chat/rooms/{roomId}/speak-request/{userId}/reject` | 🔄 Dual | — | — |
| **POST** | `/api/chat/rooms/{roomId}/speak-request/{userId}/reject` | 🔄 Dual | — | — |
| **GET** | `/api/chat/rooms/{roomId}/speak-requests` | 🔄 Dual | — | — |
| **POST** | `/api/chat/rooms/{roomId}/speak-requests/{targetUserId}/approve` | 🔄 Dual | — | — |
| **GET** | `/api/chat/rooms/{roomId}/state` | 🔄 Dual | — | — |
| **GET** | `/api/chat/rooms/{roomId}/stream` | 🔄 Dual 🔒 | — | — |
| **POST** | `/api/chat/rooms/{roomId}/transfer-ownership` | 🔄 Dual 🔒 | — | `newOwnerId` |
| **GET** | `/api/chat/rooms/{roomId}/typing` | 🔄 Dual | — | — |
| **POST** | `/api/chat/rooms/{roomId}/typing` | 🔄 Dual | — | `isTyping` |
| **GET** | `/api/chat/rooms/{roomId}/voice` | 🔄 Dual 🔒 | — | — |
| **POST** | `/api/chat/rooms/{roomId}/voice` | 🔄 Dual 🔒 | — | `type` |
| **GET** | `/api/chat/youtube-audio` | 🌍 Public | — | — |
| **POST** | `/api/chat/youtube-audio` | 🌍 Public | — | — |
| **GET** | `/api/chat/youtube-stream` | 🌍 Public | — | — |


## <a name="cat-compatibility"></a>`compatibility`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **POST** | `/api/compatibility` | 🌍 Public | — | `moonSign1`, `moonSign2`, `risingSign1`, `risingSign2`, `sign1`, `sign2` |


## <a name="cat-config"></a>`config`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/config` | 🌍 Public | — | — |


## <a name="cat-contact"></a>`contact`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **POST** | `/api/contact` | 🌍 Public | — | `email`, `message`, `name` |


## <a name="cat-credit-packages"></a>`credit-packages`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/credit-packages` | 🌍 Public | — | — |


## <a name="cat-daily-login"></a>`daily-login`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/daily-login` | 🔄 Dual | — | — |
| **POST** | `/api/daily-login` | 🔄 Dual | — | — |


## <a name="cat-daily-missions"></a>`daily-missions`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/daily-missions` | 🔄 Dual | — | — |
| **POST** | `/api/daily-missions` | 🔄 Dual | — | `taskType` |


## <a name="cat-deeplink"></a>`deeplink`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/deeplink/resolve` | 🌍 Public | — | — |


## <a name="cat-devices"></a>`devices`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/devices/fcm` | 🔄 Dual | — | `token` |
| **POST** | `/api/devices/fcm` | 🔄 Dual | — | `appVersion`, `platform`, `token` |


## <a name="cat-dream-contest"></a>`dream-contest`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/dream-contest` | 🔄 Dual | — | — |
| **GET** | `/api/dream-contest/{contestId}/entries` | 🔄 Dual | — | — |
| **POST** | `/api/dream-contest/{contestId}/entries` | 🔄 Dual | — | `interpretation` |
| **POST** | `/api/dream-contest/{contestId}/vote` | 🔄 Dual | — | `entryId` |


## <a name="cat-dream-diary"></a>`dream-diary`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/dream-diary` | 🔄 Dual | — | `id` |
| **GET** | `/api/dream-diary` | 🔄 Dual | — | — |
| **POST** | `/api/dream-diary` | 🔄 Dual | — | `analyzeWithAI`, `content`, `dreamDate`, `lucidity`, `mood`, `symbols`, `title` |


## <a name="cat-dream-stats"></a>`dream-stats`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/dream-stats` | 🔄 Dual | — | — |


## <a name="cat-dream-symbols"></a>`dream-symbols`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/dream-symbols` | 🌍 Public | — | — |
| **GET** | `/api/dream-symbols/{slug}` | 🌍 Public | — | — |


## <a name="cat-dreams"></a>`dreams`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/dreams` | 🌍 Public | — | — |
| **GET** | `/api/dreams/favorites` | 🔄 Dual | — | — |
| **POST** | `/api/dreams/generate` | 🌍 Public | — | `query` |
| **POST** | `/api/dreams/interpret` | 🔄 Dual | — | `dreamText` |
| **POST** | `/api/dreams/morning-reminder` | 🌍 Public | — | — |
| **GET** | `/api/dreams/recommendations` | 🔄 Dual | — | — |
| **GET** | `/api/dreams/trends` | 🌍 Public | — | — |
| **GET** | `/api/dreams/{slug}` | 🌍 Public | — | — |
| **DELETE** | `/api/dreams/{slug}/comments` | 🔄 Dual 🔒 | var (özel) | `commentId` |
| **GET** | `/api/dreams/{slug}/comments` | 🔄 Dual 🔒 | var (özel) | — |
| **POST** | `/api/dreams/{slug}/comments` | 🔄 Dual 🔒 | var (özel) | `content`, `didComeTrue`, `experienceType` |
| **GET** | `/api/dreams/{slug}/favorite` | 🔄 Dual | — | — |
| **POST** | `/api/dreams/{slug}/favorite` | 🔄 Dual | — | — |
| **POST** | `/api/dreams/{slug}/view` | 🔄 Dual | — | — |


## <a name="cat-effects"></a>`effects`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/effects/resolve` | 🌍 Public | — | — |


## <a name="cat-favorite-tellers"></a>`favorite-tellers`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/favorite-tellers` | 🔄 Dual | — | — |
| **POST** | `/api/favorite-tellers` | 🔄 Dual | — | `tellerId` |


## <a name="cat-football"></a>`football`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/football` | 🌍 Public | — | — |


## <a name="cat-fortune-access"></a>`fortune-access`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **POST** | `/api/fortune-access/check` | 🔄 Dual | — | `adWatched`, `fortuneType` |
| **GET** | `/api/fortune-access/ip-status` | 🌍 Public | — | — |


## <a name="cat-fortune-request-types"></a>`fortune-request-types`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/fortune-request-types` | 🌍 Public | — | — |


## <a name="cat-fortune-tellers"></a>`fortune-tellers`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/fortune-tellers` | 🔄 Dual | — | — |
| **POST** | `/api/fortune-tellers` | 🔄 Dual | — | `bio`, `displayName`, `pricePerSession`, `specialties` |
| **POST** | `/api/fortune-tellers/apply` | 🔄 Dual | — | `applicationNote`, `bio`, `displayName`, `specialties` |
| **GET** | `/api/fortune-tellers/awards` | 🌍 Public | — | — |
| **GET** | `/api/fortune-tellers/gifts` | 🌍 Public | — | — |
| **GET** | `/api/fortune-tellers/my-profile` | 🔄 Dual | — | — |
| **GET** | `/api/fortune-tellers/session` | 🔄 Dual 🔒 | — | — |
| **POST** | `/api/fortune-tellers/session` | 🔄 Dual 🔒 | — | `duration`, `fortuneType`, `tellerId` |
| **GET** | `/api/fortune-tellers/sessions` | 🔄 Dual | — | — |
| **GET** | `/api/fortune-tellers/sessions/stream` | 🔄 Dual | — | — |
| **PATCH** | `/api/fortune-tellers/sessions/{sessionId}` | 🔄 Dual | — | `action` |
| **GET** | `/api/fortune-tellers/toggle-online` | 🔄 Dual | — | — |
| **POST** | `/api/fortune-tellers/toggle-online` | 🔄 Dual | — | `isOnline` |
| **GET** | `/api/fortune-tellers/{tellerId}` | 🔄 Dual 🔒 | — | — |
| **PATCH** | `/api/fortune-tellers/{tellerId}` | 🔄 Dual 🔒 | — | `avatar`, `bio`, `displayName`, `isActive`, `isOnline`, `isVerified`, `pricePerSession`, `specialties` |
| **GET** | `/api/fortune-tellers/{tellerId}/reviews` | 🌍 Public | — | — |
| **GET** | `/api/fortune-tellers/{tellerId}/session` | 🔄 Dual 🔒 | — | — |
| **POST** | `/api/fortune-tellers/{tellerId}/session` | 🔄 Dual 🔒 | — | `duration`, `fortuneType` |


## <a name="cat-fortunes"></a>`fortunes`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **POST** | `/api/fortunes/ask-uyumu` | 🔄 Dual | — | `language`, `partnerName`, `partnerSign`, `yourName`, `yourSign` |
| **POST** | `/api/fortunes/aura-analizi` | 🔄 Dual | — | `birthDate`, `currentMood`, `language`, `name`, `recentExperiences` |
| **POST** | `/api/fortunes/burc-yorumu` | 🔄 Dual | — | `language`, `zodiacSign` |
| **POST** | `/api/fortunes/dogum-haritasi` | 🔄 Dual | — | `birthDate`, `birthPlace`, `birthTime`, `language` |
| **POST** | `/api/fortunes/el-fali` | 🔄 Dual | — | `hand`, `language`, `palmImagePath` |
| **POST** | `/api/fortunes/evet-hayir` | 🔄 Dual | — | `language`, `question` |
| **POST** | `/api/fortunes/istihare` | 🔄 Dual | — | `language`, `question`, `situation` |
| **POST** | `/api/fortunes/kahve-fali` | 🔄 Dual | — | `description`, `language` |
| **POST** | `/api/fortunes/kahve-fali-image` | 🔄 Dual | — | `cupImagePath`, `language`, `saucerImagePath` |
| **POST** | `/api/fortunes/katina` | 🔄 Dual | — | `language`, `question` |
| **POST** | `/api/fortunes/kursundokme` | 🔄 Dual | — | — |
| **POST** | `/api/fortunes/melek-kartlari` | 🔄 Dual | — | `cardCount`, `language`, `question` |
| **POST** | `/api/fortunes/numeroloji` | 🔄 Dual | — | `birthDate`, `language`, `name` |
| **POST** | `/api/fortunes/ruya-yorumu` | 🔄 Dual | — | `dreamDescription`, `language` |
| **POST** | `/api/fortunes/tarot-fali` | 🔄 Dual | — | `cardCount`, `language`, `question` |


## <a name="cat-games"></a>`games`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/games` | 🌍 Public | — | — |
| **POST** | `/api/games/auto-match` | 🔄 Dual | — | — |
| **GET** | `/api/games/daily-reward` | 🔄 Dual | — | — |
| **POST** | `/api/games/daily-reward` | 🔄 Dual | — | — |
| **POST** | `/api/games/daily-spin` | 🔄 Dual | — | — |
| **GET** | `/api/games/grid-settings` | 🌍 Public | — | — |
| **GET** | `/api/games/lamba-cini` | 🔄 Dual | — | — |
| **POST** | `/api/games/lamba-cini` | 🔄 Dual | — | `chestIndex` |
| **GET** | `/api/games/leaderboard` | 🔄 Dual | — | — |
| **GET** | `/api/games/lobby` | 🔄 Dual | — | — |
| **POST** | `/api/games/play` | 🔄 Dual | — | `gameSlug`, `result`, `score` |
| **GET** | `/api/games/profile` | 🔄 Dual | — | — |
| **GET** | `/api/games/quests` | 🔄 Dual | — | — |
| **POST** | `/api/games/quests` | 🔄 Dual | — | `questType` |
| **GET** | `/api/games/room` | 🔄 Dual | — | — |
| **POST** | `/api/games/room` | 🔄 Dual | — | `betAmount`, `betCurrency`, `gameType`, `gridSize`, `isAI`, `turnTimer` |
| **DELETE** | `/api/games/room/{roomId}` | 🔄 Dual 🔒 | — | — |
| **GET** | `/api/games/room/{roomId}` | 🔄 Dual 🔒 | — | — |
| **PATCH** | `/api/games/room/{roomId}` | 🔄 Dual 🔒 | — | `action`, `currentTurn`, `fullState`, `player1Score`, `player2Score`, `state`, `status`, `winnerId` |
| **POST** | `/api/games/room/{roomId}` | 🔄 Dual 🔒 | — | — |
| **GET** | `/api/games/room/{roomId}/chat` | 🔄 Dual | — | — |
| **PATCH** | `/api/games/room/{roomId}/chat` | 🔄 Dual | — | `chatEnabled` |
| **POST** | `/api/games/room/{roomId}/chat` | 🔄 Dual | — | `message` |
| **POST** | `/api/games/room/{roomId}/replace-ai` | 🔄 Dual | — | — |
| **DELETE** | `/api/games/room/{roomId}/viewers` | 🔄 Dual | — | — |
| **GET** | `/api/games/room/{roomId}/viewers` | 🔄 Dual | — | — |
| **POST** | `/api/games/room/{roomId}/viewers` | 🔄 Dual | — | — |
| **GET** | `/api/games/rooms` | 🌍 Public | — | — |
| **GET** | `/api/games/sos` | 🔄 Dual | — | — |
| **POST** | `/api/games/sos` | 🔄 Dual | — | `betAmount`, `betCurrency`, `gridSize`, `isAI`, `turnTimer` |
| **DELETE** | `/api/games/sos/{gameId}` | 🔄 Dual 🔒 | — | — |
| **GET** | `/api/games/sos/{gameId}` | 🔄 Dual 🔒 | — | — |
| **PATCH** | `/api/games/sos/{gameId}` | 🔄 Dual 🔒 | — | `action`, `aiMoves`, `col`, `letter`, `row` |
| **POST** | `/api/games/sos/{gameId}` | 🔄 Dual 🔒 | — | — |
| **GET** | `/api/games/sos/{gameId}/chat` | 🔄 Dual | — | — |
| **PATCH** | `/api/games/sos/{gameId}/chat` | 🔄 Dual | — | `chatEnabled` |
| **POST** | `/api/games/sos/{gameId}/chat` | 🔄 Dual | — | `message` |
| **DELETE** | `/api/games/sos/{gameId}/viewers` | 🔄 Dual | — | — |
| **GET** | `/api/games/sos/{gameId}/viewers` | 🔄 Dual | — | — |
| **POST** | `/api/games/sos/{gameId}/viewers` | 🔄 Dual | — | — |


## <a name="cat-gift-engine"></a>`gift-engine`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **POST** | `/api/gift-engine/finish` | 🔄 Dual | — | — |
| **GET** | `/api/gift-engine/gifts` | 🌍 Public | — | — |
| **GET** | `/api/gift-engine/queue` | 🌍 Public | — | — |


## <a name="cat-gifts"></a>`gifts`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/gifts/battles` | 🔄 Dual | — | — |
| **POST** | `/api/gifts/battles` | 🔄 Dual | — | `participants` |
| **GET** | `/api/gifts/battles/{battleId}` | 🌍 Public | — | — |
| **GET** | `/api/gifts/catalog` | 🔄 Dual | — | — |
| **POST** | `/api/gifts/check-reciprocal` | 🔄 Dual | — | `recipientId` |
| **GET** | `/api/gifts/goals` | 🔄 Dual | — | — |
| **POST** | `/api/gifts/goals` | 🔄 Dual | — | — |
| **GET** | `/api/gifts/insights/album/{userId}` | 🌍 Public | — | — |
| **GET** | `/api/gifts/insights/badge/{userId}` | 🌍 Public | — | — |
| **GET** | `/api/gifts/insights/collection/{userId}` | 🌍 Public | — | — |
| **GET** | `/api/gifts/insights/feed` | 🌍 Public | — | — |
| **GET** | `/api/gifts/insights/first-gifter/{context}/{contextId}` | 🌍 Public | — | — |
| **GET** | `/api/gifts/insights/leaderboard` | 🌍 Public | — | — |
| **GET** | `/api/gifts/insights/map` | 🌍 Public | — | — |
| **GET** | `/api/gifts/insights/me/badge` | 🔄 Dual | — | — |
| **GET** | `/api/gifts/insights/me/history` | 🔄 Dual | — | — |
| **GET** | `/api/gifts/insights/me/recommendations` | 🔄 Dual | — | — |
| **GET** | `/api/gifts/lucky/config` | 🔄 Dual | — | — |
| **GET** | `/api/gifts/lucky/history` | 🔄 Dual | — | — |
| **POST** | `/api/gifts/lucky/send` | 🔄 Dual | var (özel) | `context`, `contextId`, `giftTypeId`, `quantity` |
| **GET** | `/api/gifts/missions` | 🌍 Public | — | — |
| **GET** | `/api/gifts/missions/me` | 🔄 Dual | — | — |
| **POST** | `/api/gifts/missions/{missionId}/claim` | 🔄 Dual | — | — |
| **GET** | `/api/gifts/recent-big` | 🌍 Public | — | — |
| **POST** | `/api/gifts/send` | 🔄 Dual 🔒 | var (özel) | `giftTypeId`, `jetonAmount`, `recipientUsername`, `type` |
| **GET** | `/api/gifts/types` | 🌍 Public | — | — |
| **GET** | `/api/gifts/version` | 🌍 Public | — | — |


## <a name="cat-hashtags"></a>`hashtags`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/hashtags/search` | 🌍 Public | — | — |
| **GET** | `/api/hashtags/trending` | 🌍 Public | — | — |
| **GET** | `/api/hashtags/{name}` | 🔄 Dual | — | — |


## <a name="cat-health"></a>`health`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/health` | 🌍 Public | — | — |


## <a name="cat-homepage-buttons"></a>`homepage-buttons`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/homepage-buttons` | 🌍 Public | — | — |


## <a name="cat-homepage-fortune-cards"></a>`homepage-fortune-cards`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/homepage-fortune-cards` | 🌍 Public | — | — |


## <a name="cat-homepage-ticker"></a>`homepage-ticker`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/homepage-ticker` | 🌍 Public | — | — |


## <a name="cat-horoscope"></a>`horoscope`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/horoscope/daily` | 🔄 Dual | — | — |


## <a name="cat-jeton"></a>`jeton`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/jeton` | 🔄 Dual | — | — |
| **POST** | `/api/jeton` | 🔄 Dual | — | `action` |


## <a name="cat-leaderboards"></a>`leaderboards`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/leaderboards` | 🔄 Dual | — | — |


## <a name="cat-legal"></a>`legal`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/legal/child-safety` | 🌍 Public | — | — |


## <a name="cat-live"></a>`live`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **POST** | `/api/live/create-room` | 🔄 Dual | — | `category`, `coverUrl`, `description`, `thumbnailUrl`, `title` |
| **GET** | `/api/live/gift-types` | 🔄 Dual | — | — |
| **POST** | `/api/live/gift/send` | 🔄 Dual | var (özel) | `giftTypeId`, `quantity`, `recipientId`, `roomId`, `roomType` |
| **GET** | `/api/live/guest` | 🔄 Dual | — | — |
| **POST** | `/api/live/guest` | 🔄 Dual | — | `muted`, `videoOff` |
| **GET** | `/api/live/guest/list` | 🌍 Public | — | — |
| **POST** | `/api/live/heartbeat` | 🔄 Dual | — | `roomId`, `roomType` |
| **POST** | `/api/live/join-room` | 🔄 Dual | — | — |
| **POST** | `/api/live/leave-room` | 🔄 Dual | — | `roomId`, `roomType` |
| **GET** | `/api/live/message` | 🔄 Dual 🔒 | var (özel) | — |
| **POST** | `/api/live/message` | 🔄 Dual 🔒 | var (özel) | `content`, `roomId`, `roomType` |
| **GET** | `/api/live/online-users` | 🔄 Dual | — | — |
| **GET** | `/api/live/pk` | 🔄 Dual | var (özel) | — |
| **POST** | `/api/live/pk` | 🔄 Dual | var (özel) | `action`, `battleId`, `duration`, `roomId`, `targetRoomId` |
| **GET** | `/api/live/pk/active` | 🌍 Public | — | — |
| **POST** | `/api/live/pk/score` | 🔄 Dual | — | `amount`, `battleId`, `roomId`, `side` |
| **GET** | `/api/live/rooms` | 🔄 Dual | — | — |
| **GET** | `/api/live/seats` | 🔄 Dual | — | — |
| **POST** | `/api/live/seats` | 🔄 Dual | — | `action`, `roomId`, `seatIndex`, `targetUserId` |


## <a name="cat-me"></a>`me`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/me` | 🔄 Dual | — | — |
| **PATCH** | `/api/me` | 🔄 Dual | — | — |


## <a name="cat-membership"></a>`membership`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/membership/plans` | 🌍 Public | — | — |


## <a name="cat-membership-badges"></a>`membership-badges`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/membership-badges` | 🌍 Public | — | — |


## <a name="cat-memberships"></a>`memberships`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/memberships` | 🌍 Public | — | — |
| **GET** | `/api/memberships/packages` | 🌍 Public | — | — |
| **POST** | `/api/memberships/purchase` | 🔄 Dual | var (özel) | `paymentMethod`, `planId` |


## <a name="cat-messages"></a>`messages`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/messages` | 🔄 Dual | — | — |
| **PATCH** | `/api/messages/request` | 🔄 Dual | — | `action`, `requestId` |
| **POST** | `/api/messages/request` | 🔄 Dual | — | `message`, `receiverId` |
| **GET** | `/api/messages/{userId}` | 🔄 Dual | var (özel) | — |
| **POST** | `/api/messages/{userId}` | 🔄 Dual | var (özel) | `content`, `imageUrl` |


## <a name="cat-mobile"></a>`mobile`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/mobile/config` | 🌍 Public | — | — |
| **GET** | `/api/mobile/fortune-menu` | 🔄 Dual | — | — |
| **GET** | `/api/mobile/home` | 🔄 Dual | — | — |
| **GET** | `/api/mobile/user-profile/{userId}` | 🔄 Dual | — | — |


## <a name="cat-monitoring"></a>`monitoring`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/monitoring` | 🌐 Oturum | — | — |


## <a name="cat-music"></a>`music`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/music/history` | 🌍 Public | — | — |
| **GET** | `/api/music/search` | 🔄 Dual | — | — |


## <a name="cat-notifications"></a>`notifications`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/notifications` | 🔄 Dual | — | — |
| **GET** | `/api/notifications` | 🔄 Dual | — | — |
| **POST** | `/api/notifications` | 🔄 Dual | — | `markAll`, `notificationIds` |
| **GET** | `/api/notifications/stream` | 🔄 Dual | — | — |


## <a name="cat-online-fal"></a>`online-fal`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/online-fal` | 🌍 Public | — | — |


## <a name="cat-payments"></a>`payments`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/payments/config` | 🔄 Dual | — | — |
| **GET** | `/api/payments/methods` | 🌍 Public | — | — |
| **GET** | `/api/payments/notify` | 🔄 Dual | — | — |
| **POST** | `/api/payments/notify` | 🔄 Dual | — | `amount`, `notes`, `paymentMethod`, `senderName`, `transactionId` |
| **GET** | `/api/payments/requests` | 🔄 Dual | var (özel) | — |
| **POST** | `/api/payments/requests` | 🔄 Dual | var (özel) | `amount`, `method`, `notes`, `senderInfo` |
| **GET** | `/api/payments/settings` | 🌍 Public | — | — |


## <a name="cat-pk"></a>`pk`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/pk/active` | 🌍 Public | — | — |
| **GET** | `/api/pk/leaderboard` | 🌍 Public | — | — |
| **GET** | `/api/pk/me/invites` | 🔄 Dual | — | — |
| **GET** | `/api/pk/{matchId}` | 🌍 Public | — | — |
| **GET** | `/api/pk/{matchId}/stream` | 🌍 Public | — | — |


## <a name="cat-platform"></a>`platform`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/platform/commission-rate` | 🌍 Public | — | — |


## <a name="cat-popups"></a>`popups`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/popups` | 🔄 Dual | — | — |


## <a name="cat-presence"></a>`presence`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/presence` | 🔄 Dual | — | — |
| **POST** | `/api/presence` | 🔄 Dual | — | `isNewSession`, `path`, `visitorId` |
| **GET** | `/api/presence/sections` | 🌍 Public | — | — |


## <a name="cat-profile-frames"></a>`profile-frames`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/profile-frames` | 🔄 Dual | — | — |
| **POST** | `/api/profile-frames` | 🔄 Dual | — | `frameId` |


## <a name="cat-public"></a>`public`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/public/announcement-settings` | 🌍 Public | — | — |
| **GET** | `/api/public/jeton-price` | 🌍 Public | — | — |


## <a name="cat-public-stats"></a>`public-stats`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/public-stats` | 🌍 Public | — | — |


## <a name="cat-referral"></a>`referral`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/referral` | 🔄 Dual | — | — |
| **GET** | `/api/referral/validate` | 🌍 Public | — | — |


## <a name="cat-room"></a>`room`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/room/signal` | 🔄 Dual | — | — |
| **GET** | `/api/room/signal` | 🔄 Dual | — | — |
| **POST** | `/api/room/signal` | 🔄 Dual | — | `receiverId`, `sessionId`, `signalData`, `signalType` |
| **GET** | `/api/room/{sessionId}` | 🔄 Dual 🔒 | — | — |
| **PATCH** | `/api/room/{sessionId}` | 🔄 Dual 🔒 | — | `action`, `minutes` |
| **GET** | `/api/room/{sessionId}/messages` | 🔄 Dual | — | — |
| **POST** | `/api/room/{sessionId}/messages` | 🔄 Dual | — | `message` |
| **GET** | `/api/room/{sessionId}/review` | 🔄 Dual | — | — |
| **POST** | `/api/room/{sessionId}/review` | 🔄 Dual | — | `comment`, `rating` |
| **GET** | `/api/room/{sessionId}/stream` | 🔄 Dual | — | — |
| **GET** | `/api/room/{sessionId}/summary` | 🔄 Dual | — | — |
| **POST** | `/api/room/{sessionId}/tip` | 🔄 Dual 🔒 | var (özel) | `amount` |


## <a name="cat-room-themes"></a>`room-themes`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/room-themes/catalog` | 🔄 Dual | — | — |


## <a name="cat-rtc"></a>`rtc`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **POST** | `/api/rtc/telemetry` | 🌍 Public | var (özel) | `samples` |


## <a name="cat-search"></a>`search`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/search` | 🌍 Public | — | — |
| **GET** | `/api/search/advanced` | 🔄 Dual | — | — |


## <a name="cat-seo-settings"></a>`seo-settings`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/seo-settings` | 🌍 Public | — | — |


## <a name="cat-settings"></a>`settings`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/settings/ads` | 🌍 Public | — | — |
| **GET** | `/api/settings/canlidark-hero` | 🌍 Public | — | — |
| **GET** | `/api/settings/public` | 🌍 Public | — | — |
| **GET** | `/api/settings/themes` | 🌍 Public | — | — |


## <a name="cat-share-card"></a>`share-card`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/share-card` | 🔄 Dual | — | — |


## <a name="cat-short-videos"></a>`short-videos`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/short-videos` | 🔄 Dual | — | — |
| **GET** | `/api/short-videos/explore` | 🔄 Dual | — | — |
| **GET** | `/api/short-videos/mentions/search` | 🌍 Public | — | — |
| **GET** | `/api/short-videos/music` | 🌍 Public | — | — |
| **GET** | `/api/short-videos/profile/{userId}` | 🔄 Dual | — | — |
| **POST** | `/api/short-videos/register` | 🔄 Dual | — | — |
| **POST** | `/api/short-videos/upload` | 🔄 Dual | var (özel) | — |
| **POST** | `/api/short-videos/upload-url` | 🔄 Dual | — | — |
| **GET** | `/api/short-videos/user/{userId}` | 🔄 Dual | — | — |
| **DELETE** | `/api/short-videos/{id}` | 🔄 Dual 🔒 | — | — |
| **GET** | `/api/short-videos/{id}` | 🔄 Dual 🔒 | — | — |
| **GET** | `/api/short-videos/{id}/comments` | 🔄 Dual | var (özel) | — |
| **POST** | `/api/short-videos/{id}/comments` | 🔄 Dual | var (özel) | `content`, `parentId` |
| **DELETE** | `/api/short-videos/{id}/comments/{commentId}` | 🔄 Dual 🔒 | — | — |
| **POST** | `/api/short-videos/{id}/comments/{commentId}/like` | 🔄 Dual | — | — |
| **POST** | `/api/short-videos/{id}/comments/{commentId}/pin` | 🔄 Dual 🔒 | — | — |
| **GET** | `/api/short-videos/{id}/duets` | 🔄 Dual | — | — |
| **POST** | `/api/short-videos/{id}/like` | 🔄 Dual | — | — |
| **POST** | `/api/short-videos/{id}/save` | 🔄 Dual | — | — |
| **POST** | `/api/short-videos/{id}/share` | 🔄 Dual | — | — |
| **POST** | `/api/short-videos/{id}/view` | 🔄 Dual | — | `watchedSec` |


## <a name="cat-signup"></a>`signup`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **POST** | `/api/signup` | 🌍 Public | authLimiter (kimlik doğrulama limiti) | `birthDate`, `birthTime`, `email`, `name`, `password`, `preferredLanguage`, `referralCode`, `username` |


## <a name="cat-site-pages"></a>`site-pages`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/site-pages/{slug}` | 🌍 Public | — | — |


## <a name="cat-social"></a>`social`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/social/posts` | 🔄 Dual | var (özel) | — |
| **POST** | `/api/social/posts` | 🔄 Dual | var (özel) | `content`, `fortuneId`, `fortuneType`, `imageUrl`, `isPublic`, `postType`, `youtubeUrl` |
| **DELETE** | `/api/social/posts/{postId}` | 🔄 Dual 🔒 | — | — |
| **GET** | `/api/social/posts/{postId}` | 🔄 Dual 🔒 | — | — |
| **DELETE** | `/api/social/posts/{postId}/comments` | 🔄 Dual 🔒 | var (özel) | — |
| **GET** | `/api/social/posts/{postId}/comments` | 🔄 Dual 🔒 | var (özel) | — |
| **POST** | `/api/social/posts/{postId}/comments` | 🔄 Dual 🔒 | var (özel) | `content` |
| **POST** | `/api/social/posts/{postId}/likes` | 🔄 Dual | — | — |
| **POST** | `/api/social/posts/{postId}/view` | 🌍 Public | — | — |


## <a name="cat-stories"></a>`stories`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/stories` | 🔄 Dual | var (özel) | — |
| **GET** | `/api/stories` | 🔄 Dual | var (özel) | — |
| **POST** | `/api/stories` | 🔄 Dual | var (özel) | `caption`, `mediaType`, `mediaUrl` |


## <a name="cat-support"></a>`support`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/support/tickets` | 🌍 Public | var (özel) | — |
| **POST** | `/api/support/tickets` | 🌍 Public | var (özel) | `category`, `message`, `subject` |
| **GET** | `/api/support/tickets/{ticketId}` | 🌍 Public | — | — |
| **PATCH** | `/api/support/tickets/{ticketId}` | 🌍 Public | — | `assignedTo`, `priority`, `status` |
| **POST** | `/api/support/tickets/{ticketId}/messages` | 🌍 Public | — | `body`, `isInternal`, `message` |


## <a name="cat-supporter-levels"></a>`supporter-levels`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/supporter-levels` | 🌍 Public | — | — |


## <a name="cat-teams"></a>`teams`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/teams` | 🌍 Public | — | — |
| **POST** | `/api/teams` | 🌍 Public | — | `description`, `logoUrl`, `name` |
| **GET** | `/api/teams/{teamId}` | 🌍 Public | — | — |
| **PATCH** | `/api/teams/{teamId}` | 🌍 Public | — | `action` |


## <a name="cat-teller"></a>`teller`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/teller/analytics` | 🔄 Dual | — | — |
| **GET** | `/api/teller/level` | 🔄 Dual | — | — |
| **GET** | `/api/teller/verification` | 🔄 Dual | — | — |
| **POST** | `/api/teller/verification` | 🔄 Dual | — | `docUrl` |


## <a name="cat-teller-chat"></a>`teller-chat`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/teller-chat` | 🔄 Dual | — | — |
| **GET** | `/api/teller-chat/{sessionId}` | 🔄 Dual | — | — |
| **POST** | `/api/teller-chat/{sessionId}` | 🔄 Dual | — | `content`, `imageUrl`, `messageType` |


## <a name="cat-tencent"></a>`tencent`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **POST** | `/api/tencent/webhook` | 🌍 Public | — | `CallbackTs`, `EventGroupId`, `EventInfo`, `EventType` |


## <a name="cat-tiktok-videos"></a>`tiktok-videos`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/tiktok-videos` | 🌍 Public | — | — |
| **GET** | `/api/tiktok-videos/oembed` | 🌍 Public | — | — |
| **GET** | `/api/tiktok-videos/{id}` | 🌍 Public | — | — |


## <a name="cat-tmdb"></a>`tmdb`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/tmdb` | 🌍 Public | — | — |


## <a name="cat-tournaments"></a>`tournaments`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/tournaments` | 🔄 Dual | — | — |


## <a name="cat-translations"></a>`translations`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/translations` | 🌍 Public | — | — |


## <a name="cat-trend-videos"></a>`trend-videos`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/trend-videos` | 🌍 Public | — | — |
| **POST** | `/api/trend-videos` | 🌍 Public | — | `videoId` |


## <a name="cat-trends"></a>`trends`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/trends` | 🌍 Public | — | — |
| **GET** | `/api/trends/{slug}` | 🌍 Public | — | — |
| **POST** | `/api/trends/{slug}/like` | 🔄 Dual | — | — |


## <a name="cat-trtc"></a>`trtc`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **POST** | `/api/trtc/token` | 🔄 Dual | — | `role`, `roomId` |
| **POST** | `/api/trtc/usersig` | 🔄 Dual | — | — |
| **POST** | `/api/trtc/webhook` | 🌍 Public | — | — |


## <a name="cat-upload"></a>`upload`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/upload/get-url` | 🔄 Dual | — | — |
| **POST** | `/api/upload/get-url` | 🔄 Dual | — | `cloud_storage_path`, `isPublic` |
| **POST** | `/api/upload/presigned` | 🔄 Dual | — | `contentType`, `fileName`, `folder`, `isPublic` |


## <a name="cat-user"></a>`user`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/user/achievements` | 🔄 Dual | — | — |
| **GET** | `/api/user/active-sessions` | 🔄 Dual | — | — |
| **GET** | `/api/user/activity` | 🔄 Dual | — | — |
| **PATCH** | `/api/user/activity` | 🔄 Dual | — | `markAllRead`, `notificationIds` |
| **GET** | `/api/user/block` | 🔄 Dual | — | — |
| **POST** | `/api/user/block` | 🔄 Dual | — | `userId` |
| **DELETE** | `/api/user/blocked` | 🔄 Dual | — | `id`, `type` |
| **GET** | `/api/user/blocked` | 🔄 Dual | — | — |
| **GET** | `/api/user/broadcast-history` | 🔄 Dual | — | — |
| **GET** | `/api/user/co-broadcast-invites` | 🔄 Dual | — | — |
| **GET** | `/api/user/credits` | 🔄 Dual | — | — |
| **GET** | `/api/user/followers` | 🔄 Dual | — | — |
| **GET** | `/api/user/following` | 🔄 Dual | — | — |
| **GET** | `/api/user/fortunes` | 🔄 Dual | — | — |
| **PATCH** | `/api/user/fortunes/{fortuneId}` | 🔄 Dual | — | `action` |
| **GET** | `/api/user/likers` | 🔄 Dual | — | — |
| **GET** | `/api/user/profile` | 🔄 Dual | — | — |
| **PATCH** | `/api/user/profile` | 🔄 Dual | — | `bio`, `birthDate`, `birthTime`, `email`, `favoriteTeam`, `hideProfileViews`, `image`, `messagePrivacy`, `name`, `phone`, `risingSign`, `username` … |
| **GET** | `/api/user/received-gifts` | 🔄 Dual | — | — |
| **POST** | `/api/user/report` | 🔄 Dual | var (özel) | `details`, `reason`, `userId` |
| **GET** | `/api/user/statistics` | 🔄 Dual | — | — |
| **GET** | `/api/user/stats` | 🔄 Dual | — | — |
| **POST** | `/api/user/stats` | 🔄 Dual | — | `minutesToAdd` |
| **GET** | `/api/user/theme` | 🔄 Dual | — | — |
| **PATCH** | `/api/user/theme` | 🔄 Dual | — | `theme` |
| **GET** | `/api/user/watch-ad` | 🔄 Dual | — | — |
| **POST** | `/api/user/watch-ad` | 🔄 Dual | — | — |
| **GET** | `/api/user/xp` | 🔄 Dual | — | — |
| **GET** | `/api/user/{userId}/achievements` | 🔄 Dual | — | — |
| **DELETE** | `/api/user/{userId}/follow` | 🔄 Dual | — | — |
| **POST** | `/api/user/{userId}/follow` | 🔄 Dual | — | — |
| **GET** | `/api/user/{userId}/follow-status` | 🔄 Dual | — | — |


## <a name="cat-users"></a>`users`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/users/lookup/{username}` | 🔄 Dual | — | — |
| **GET** | `/api/users/online` | 🌍 Public | — | — |
| **GET** | `/api/users/search` | 🔄 Dual | — | — |
| **GET** | `/api/users/{userId}` | 🔄 Dual | — | — |
| **GET** | `/api/users/{userId}/follow` | 🔄 Dual | — | — |
| **POST** | `/api/users/{userId}/follow` | 🔄 Dual | — | — |
| **GET** | `/api/users/{userId}/posts` | 🔄 Dual | — | — |


## <a name="cat-verification"></a>`verification`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/verification` | 🌍 Public | var (özel) | — |
| **POST** | `/api/verification` | 🌍 Public | var (özel) | `documentType`, `documentUrls`, `fullName`, `note`, `type` |


## <a name="cat-video-streams"></a>`video-streams`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/video-streams` | 🔄 Dual | var (özel) | — |
| **POST** | `/api/video-streams` | 🔄 Dual | var (özel) | `category`, `coverUrl`, `description`, `tags`, `thumbnailUrl`, `title` |
| **GET** | `/api/video-streams/gifts` | 🔄 Dual | — | — |
| **GET** | `/api/video-streams/pk` | 🔄 Dual 🔒 | var (özel) | — |
| **POST** | `/api/video-streams/pk` | 🔄 Dual 🔒 | var (özel) | `action`, `battleId`, `duration`, `opponentVoiceRoomId`, `streamId`, `targetStreamId` |
| **GET** | `/api/video-streams/pk/list` | 🌍 Public | — | — |
| **POST** | `/api/video-streams/pk/score` | 🌍 Public | — | `battleId`, `points`, `streamId` |
| **DELETE** | `/api/video-streams/signal` | 🔄 Dual | — | — |
| **GET** | `/api/video-streams/signal` | 🔄 Dual | — | — |
| **POST** | `/api/video-streams/signal` | 🔄 Dual | — | `data`, `receiverId`, `streamId`, `type` |
| **GET** | `/api/video-streams/{streamId}` | 🔄 Dual 🔒 | — | — |
| **PATCH** | `/api/video-streams/{streamId}` | 🔄 Dual 🔒 | — | `backgroundUrl`, `broadcastImage`, `description`, `isImageMode`, `status`, `title` |
| **GET** | `/api/video-streams/{streamId}/auto-close` | 🔄 Dual | — | — |
| **POST** | `/api/video-streams/{streamId}/auto-close` | 🔄 Dual | — | — |
| **DELETE** | `/api/video-streams/{streamId}/ban` | 🔄 Dual | — | — |
| **GET** | `/api/video-streams/{streamId}/ban` | 🔄 Dual | — | — |
| **POST** | `/api/video-streams/{streamId}/ban` | 🔄 Dual | — | `reason`, `userId` |
| **GET** | `/api/video-streams/{streamId}/co-broadcast` | 🔄 Dual | — | — |
| **PATCH** | `/api/video-streams/{streamId}/co-broadcast` | 🔄 Dual | — | `action` |
| **POST** | `/api/video-streams/{streamId}/co-broadcast` | 🔄 Dual | — | `action`, `userId` |
| **POST** | `/api/video-streams/{streamId}/co-broadcast/invite` | 🔄 Dual | — | `inviteeId` |
| **GET** | `/api/video-streams/{streamId}/comments` | 🔄 Dual | var (özel) | — |
| **POST** | `/api/video-streams/{streamId}/comments` | 🔄 Dual | var (özel) | `content`, `isHidden`, `nickname` |
| **POST** | `/api/video-streams/{streamId}/end` | 🔄 Dual 🔒 | — | — |
| **DELETE** | `/api/video-streams/{streamId}/fortune-requests` | 🔄 Dual 🔒 | — | — |
| **GET** | `/api/video-streams/{streamId}/fortune-requests` | 🔄 Dual 🔒 | — | — |
| **PATCH** | `/api/video-streams/{streamId}/fortune-requests` | 🔄 Dual 🔒 | — | `action`, `requestId` |
| **POST** | `/api/video-streams/{streamId}/fortune-requests` | 🔄 Dual 🔒 | — | — |
| **GET** | `/api/video-streams/{streamId}/fortune-requests/my-status` | 🔄 Dual | — | — |
| **GET** | `/api/video-streams/{streamId}/gifts` | 🔄 Dual | var (özel) | — |
| **POST** | `/api/video-streams/{streamId}/gifts` | 🔄 Dual | var (özel) | `giftTypeId`, `quantity` |
| **DELETE** | `/api/video-streams/{streamId}/join` | 🔄 Dual | — | — |
| **POST** | `/api/video-streams/{streamId}/join` | 🔄 Dual | — | — |
| **POST** | `/api/video-streams/{streamId}/leave` | 🔄 Dual | — | `viewerId` |
| **GET** | `/api/video-streams/{streamId}/like` | 🔄 Dual | — | — |
| **POST** | `/api/video-streams/{streamId}/like` | 🔄 Dual | — | `count` |
| **POST** | `/api/video-streams/{streamId}/live-started` | 🔄 Dual | — | — |
| **POST** | `/api/video-streams/{streamId}/media-heartbeat` | 🔄 Dual | — | — |
| **GET** | `/api/video-streams/{streamId}/messages` | 🔄 Dual | — | — |
| **POST** | `/api/video-streams/{streamId}/messages` | 🔄 Dual | — | — |
| **DELETE** | `/api/video-streams/{streamId}/moderators` | 🔄 Dual | — | `userId` |
| **GET** | `/api/video-streams/{streamId}/moderators` | 🔄 Dual | — | — |
| **POST** | `/api/video-streams/{streamId}/moderators` | 🔄 Dual | — | `userId` |
| **DELETE** | `/api/video-streams/{streamId}/mute` | 🔄 Dual | — | `viewerId` |
| **GET** | `/api/video-streams/{streamId}/mute` | 🔄 Dual | — | — |
| **POST** | `/api/video-streams/{streamId}/mute` | 🔄 Dual | — | `expiresAt`, `reason`, `viewerId` |
| **GET** | `/api/video-streams/{streamId}/pk-battle` | 🔄 Dual | — | — |
| **POST** | `/api/video-streams/{streamId}/pk-battle` | 🔄 Dual | — | `action`, `battleId`, `duration`, `targetStreamId` |
| **DELETE** | `/api/video-streams/{streamId}/signal` | 🔄 Dual | — | — |
| **GET** | `/api/video-streams/{streamId}/signal` | 🔄 Dual | — | — |
| **POST** | `/api/video-streams/{streamId}/signal` | 🔄 Dual | — | `data`, `receiverId`, `type` |
| **GET** | `/api/video-streams/{streamId}/stream` | 🔄 Dual | — | — |
| **GET** | `/api/video-streams/{streamId}/viewers` | 🌍 Public | — | — |


## <a name="cat-wallet"></a>`wallet`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/wallet` | 🔄 Dual | — | — |


## <a name="cat-warmup"></a>`warmup`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/warmup` | 🌍 Public | — | — |


## <a name="cat-weekly-dream-report"></a>`weekly-dream-report`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/weekly-dream-report` | 🔄 Dual | — | — |
| **POST** | `/api/weekly-dream-report` | 🔄 Dual | — | — |


## <a name="cat-withdrawals"></a>`withdrawals`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/withdrawals` | 🔄 Dual | var (özel) | — |
| **POST** | `/api/withdrawals` | 🔄 Dual | var (özel) | `accountDetails`, `amount`, `method` |


## <a name="cat-youtube"></a>`youtube`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **GET** | `/api/youtube/search` | 🔄 Dual | — | — |


## <a name="cat-{unmatched}"></a>`{unmatched}`

| Method | Endpoint | Auth | Rate Limit | Body Alanları |
|--------|----------|------|-----------|---------------|
| **DELETE** | `/api/{unmatched}` | 🌍 Public | — | — |
| **GET** | `/api/{unmatched}` | 🌍 Public | — | — |
| **PATCH** | `/api/{unmatched}` | 🌍 Public | — | — |
| **POST** | `/api/{unmatched}` | 🌍 Public | — | — |
| **PUT** | `/api/{unmatched}` | 🌍 Public | — | — |
