# ENDPOINT INVENTORY — CanlıFal Backend

> **Kaynak:** canlı backend kaynak ağacı (`nextjs_space/`), 2026-09-27.
> **Üretim:** `app/api/**/route.ts` programatik taraması; el ile uydurulmuş uç yoktur.
> **Durum:** Aksi yazmadıkça her satır **KODDAN TESPİT EDİLDİ** (kaynakta okundu, canlı HTTP testi yapılmadı).
> Etiketler: `DOĞRULANDI` · `KODDAN TESPİT EDİLDİ` · `EKSİK` · `ESKİ` · `ERİŞİM BEKLİYOR`


**Route dosyası:** 717 · **Metot-uç:** 1080 · **Grup:** 121 · **Veri modeli:** 270


## Grup özeti

| Grup | Route | Metot-uç |
|---|---:|---:|
| `/api/admin` | 182 | 358 |
| `/api/chat` | 54 | 85 |
| `/api/user` | 37 | 54 |
| `/api/video-streams` | 34 | 63 |
| `/api/gifts` | 26 | 28 |
| `/api/short-videos` | 25 | 27 |
| `/api/auth` | 22 | 26 |
| `/api/games` | 21 | 40 |
| `/api/live` | 19 | 24 |
| `/api/agency` | 16 | 22 |
| `/api/fortunes` | 15 | 15 |
| `/api/fortune-tellers` | 13 | 18 |
| `/api/dreams` | 11 | 14 |
| `/api/social` | 11 | 18 |
| `/api/users` | 10 | 12 |
| `/api/blog` | 9 | 11 |
| `/api/me` | 9 | 15 |
| `/api/referral` | 9 | 9 |
| `/api/messages` | 7 | 12 |
| `/api/room` | 7 | 12 |
| `/api/payments` | 6 | 9 |
| `/api/fan-clubs` | 5 | 7 |
| `/api/memberships` | 5 | 5 |
| `/api/notifications` | 5 | 9 |
| `/api/pk` | 5 | 5 |
| `/api/teller` | 5 | 6 |
| `/api/ads` | 4 | 6 |
| `/api/celebrities` | 4 | 4 |
| `/api/fortune-access` | 4 | 4 |
| `/api/gift-box` | 4 | 5 |
| `/api/mobile` | 4 | 4 |
| `/api/settings` | 4 | 4 |
| `/api/animations` | 3 | 3 |
| `/api/cfc-arena` | 3 | 3 |
| `/api/dream-contest` | 3 | 4 |
| `/api/gift-engine` | 3 | 3 |
| `/api/hashtags` | 3 | 3 |
| `/api/presence` | 3 | 4 |
| `/api/support` | 3 | 5 |
| `/api/tiktok-videos` | 3 | 3 |
| `/api/trends` | 3 | 3 |
| `/api/trtc` | 3 | 3 |
| `/api/announcements` | 2 | 3 |
| `/api/anonymous` | 2 | 3 |
| `/api/bana-ozel` | 2 | 2 |
| `/api/billing` | 2 | 2 |
| `/api/dream-symbols` | 2 | 2 |
| `/api/leaderboards` | 2 | 2 |
| `/api/membership` | 2 | 2 |
| `/api/music` | 2 | 2 |
| `/api/platform` | 2 | 2 |
| `/api/public` | 2 | 2 |
| `/api/room-themes` | 2 | 1 |
| `/api/search` | 2 | 2 |
| `/api/teams` | 2 | 4 |
| `/api/teller-chat` | 2 | 3 |
| `/api/tournaments` | 2 | 2 |
| `/api/upload` | 2 | 3 |
| `/api/[...unmatched]` | 1 | 5 |
| `/api/activities` | 1 | 1 |
| `/api/advisors` | 1 | 1 |
| `/api/astrology-panel` | 1 | 1 |
| `/api/avatar-accessories` | 1 | 0 |
| `/api/bootstrap` | 1 | 1 |
| `/api/broadcast-images` | 1 | 1 |
| `/api/broadcasters` | 1 | 1 |
| `/api/cache` | 1 | 2 |
| `/api/chat-bubbles` | 1 | 0 |
| `/api/compatibility` | 1 | 1 |
| `/api/config` | 1 | 1 |
| `/api/contact` | 1 | 1 |
| `/api/credit-packages` | 1 | 1 |
| `/api/cron` | 1 | 2 |
| `/api/currency-branding` | 1 | 1 |
| `/api/daily-login` | 1 | 2 |
| `/api/daily-missions` | 1 | 2 |
| `/api/deeplink` | 1 | 1 |
| `/api/devices` | 1 | 2 |
| `/api/dream-diary` | 1 | 3 |
| `/api/dream-stats` | 1 | 1 |
| `/api/effects` | 1 | 1 |
| `/api/emoji-packs` | 1 | 0 |
| `/api/entrance-effects` | 1 | 0 |
| `/api/favorite-tellers` | 1 | 2 |
| `/api/football` | 1 | 1 |
| `/api/fortune-request-types` | 1 | 1 |
| `/api/health` | 1 | 1 |
| `/api/homepage-buttons` | 1 | 1 |
| `/api/homepage-fortune-cards` | 1 | 1 |
| `/api/homepage-ticker` | 1 | 1 |
| `/api/horoscope` | 1 | 1 |
| `/api/jeton` | 1 | 2 |
| `/api/legal` | 1 | 1 |
| `/api/membership-badges` | 1 | 1 |
| `/api/mic-frames` | 1 | 0 |
| `/api/monitoring` | 1 | 1 |
| `/api/name-effects` | 1 | 0 |
| `/api/online-fal` | 1 | 1 |
| `/api/popups` | 1 | 1 |
| `/api/profile-frames` | 1 | 2 |
| `/api/public-stats` | 1 | 1 |
| `/api/refunds` | 1 | 2 |
| `/api/rtc` | 1 | 1 |
| `/api/seo-settings` | 1 | 1 |
| `/api/share-card` | 1 | 1 |
| `/api/signup` | 1 | 1 |
| `/api/site-animations` | 1 | 1 |
| `/api/site-pages` | 1 | 1 |
| `/api/stories` | 1 | 3 |
| `/api/supporter-levels` | 1 | 1 |
| `/api/tencent` | 1 | 1 |
| `/api/tmdb` | 1 | 1 |
| `/api/translations` | 1 | 1 |
| `/api/trend-videos` | 1 | 2 |
| `/api/verification` | 1 | 2 |
| `/api/vip` | 1 | 1 |
| `/api/wallet` | 1 | 1 |
| `/api/warmup` | 1 | 1 |
| `/api/weekly-dream-report` | 1 | 2 |
| `/api/withdrawals` | 1 | 2 |
| `/api/youtube` | 1 | 1 |

## Tam liste

Sütunlar: **Yol · Metotlar · Yetki · Rate limit · Cache**. Yetki kısaltmaları: JWT=mobil Bearer, Oturum=NextAuth cookie, Admin=RBAC, VIP=yetenek kontrolü, İmza=webhook doğrulaması, Proxy=başka route'a yönlendirme.


### /api/[...unmatched] (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/[...unmatched]` | GET, POST, PUT, PATCH, DELETE | Yok ⚠ | — | — |

### /api/activities (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/activities` | GET | JWT | — | — |

### /api/admin (182)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/admin/activity-feed` | GET, POST | Oturum | — | — |
| `/api/admin/ad-networks` | GET, POST, DELETE | Oturum | — | — |
| `/api/admin/ad-placements` | GET, POST | Yok ⚠ | — | — |
| `/api/admin/ad-placements/[id]` | GET, PATCH, DELETE | Yok ⚠ | — | — |
| `/api/admin/ad-placements/stats` | GET | Yok ⚠ | — | — |
| `/api/admin/agencies` | GET, POST, PATCH, DELETE | Admin | — | — |
| `/api/admin/agencies/[agencyId]/commission` | GET, PUT | Yok ⚠ | — | — |
| `/api/admin/agencies/[agencyId]/wallet` | GET, POST | Yok ⚠ | — | — |
| `/api/admin/agency-applicant-config` | GET, PUT | Yok ⚠ | — | — |
| `/api/admin/agency-finance` | GET, PUT | Yok ⚠ | — | — |
| `/api/admin/animations` | GET, POST | AnimAdmin | — | — |
| `/api/admin/animations/[id]` | GET, PATCH, DELETE | AnimAdmin | — | — |
| `/api/admin/animations/assignments` | GET, POST, PATCH, DELETE | AnimAdmin | — | — |
| `/api/admin/animations/membership-defaults` | GET, POST, DELETE | AnimAdmin | — | — |
| `/api/admin/animations/stats` | GET | AnimAdmin | — | — |
| `/api/admin/announcement-sections` | GET, POST | Oturum | — | — |
| `/api/admin/audit-logs` | GET | Oturum | — | — |
| `/api/admin/avatar-accessories` | HEAD/OPTIONS | Yok ⚠ | — | — |
| `/api/admin/awards` | GET, POST, DELETE | Oturum | — | — |
| `/api/admin/backup` | GET | Oturum | — | — |
| `/api/admin/badges` | GET, POST, PUT, DELETE | Oturum | — | — |
| `/api/admin/bana-ozel` | GET, POST, PATCH | Oturum | — | — |
| `/api/admin/blog` | GET, POST | Oturum | — | — |
| `/api/admin/blog/[postId]` | PUT, PATCH, DELETE | Oturum | — | — |
| `/api/admin/blog/analytics` | GET | Oturum | — | — |
| `/api/admin/blog/bulk-category` | PATCH | Oturum | — | — |
| `/api/admin/blog/bulk-delete` | POST | Oturum | — | — |
| `/api/admin/blog/bulk-generate` | POST | Oturum | — | — |
| `/api/admin/blog/bulk-import` | POST | Oturum | — | — |
| `/api/admin/blog/bulk-publish` | PATCH | Oturum | — | — |
| `/api/admin/blog/categories` | GET, POST, DELETE | Oturum | — | — |
| `/api/admin/blog/comments` | GET, PATCH | Oturum | — | — |
| `/api/admin/blog/generate` | POST | Oturum | — | — |
| `/api/admin/blog/import` | POST | Oturum | — | — |
| `/api/admin/blog/schedule-publish` | POST | Oturum | — | — |
| `/api/admin/bots` | GET, PATCH | Oturum | — | — |
| `/api/admin/bots/simulate` | GET, POST | Oturum+signature/webhook | — | — |
| `/api/admin/bots/simulate-fortune` | GET, POST | Oturum+signature/webhook | — | — |
| `/api/admin/bots/simulate-master` | GET, POST | Oturum+signature/webhook | — | — |
| `/api/admin/bots/simulate-social` | GET, POST | Oturum+signature/webhook | — | — |
| `/api/admin/broadcast-images` | GET, POST, PATCH, DELETE | Oturum | — | — |
| `/api/admin/button-order` | GET, POST | Oturum | — | — |
| `/api/admin/cache` | GET, DELETE | Oturum | — | — |
| `/api/admin/cfc-arena` | GET, POST | Yok ⚠ | — | — |
| `/api/admin/cfc-arena/[contestId]` | GET | Yok ⚠ | — | — |
| `/api/admin/cfc-payment-requests` | GET, PATCH | Admin | — | — |
| `/api/admin/cfc-settings` | GET, POST | Oturum | — | — |
| `/api/admin/chat-bubbles` | HEAD/OPTIONS | Yok ⚠ | — | — |
| `/api/admin/chat-rooms` | GET, POST, PUT, DELETE | Oturum | — | — |
| `/api/admin/chat/rooms/create-for-user` | POST | Admin | — | — |
| `/api/admin/contests` | GET, POST, PATCH, DELETE | Oturum | — | — |
| `/api/admin/credit-packages` | GET, POST | Oturum | — | — |
| `/api/admin/credit-packages/[packageId]` | PATCH, DELETE | Oturum | — | — |
| `/api/admin/credits` | POST | Oturum | — | — |
| `/api/admin/currency-config` | GET, POST, PUT | Oturum | — | — |
| `/api/admin/currency-settings` | GET, PATCH | Oturum | — | — |
| `/api/admin/dreams` | GET, POST, PUT, DELETE | Oturum | — | — |
| `/api/admin/dreams/bulk-category` | PATCH | Oturum | — | — |
| `/api/admin/dreams/bulk-delete` | POST | Oturum | — | — |
| `/api/admin/dreams/bulk-import` | POST | Oturum | — | — |
| `/api/admin/dreams/bulk-publish` | PATCH | Oturum | — | — |
| `/api/admin/dreams/generate` | POST | Oturum | — | — |
| `/api/admin/effect-rules` | GET, POST | Admin | — | — |
| `/api/admin/effect-rules/[ruleId]` | PATCH, DELETE | Admin | — | — |
| `/api/admin/emoji-packs` | HEAD/OPTIONS | Yok ⚠ | — | — |
| `/api/admin/entrance-effects` | HEAD/OPTIONS | Yok ⚠ | — | — |
| `/api/admin/feature-flags` | GET, POST | Oturum | — | — |
| `/api/admin/feature-flags/[flagId]` | PATCH, DELETE | Oturum | — | — |
| `/api/admin/finance` | GET, POST | Oturum | — | — |
| `/api/admin/fortune-request-types` | GET, POST, PATCH, DELETE | Oturum | — | — |
| `/api/admin/fortunes` | GET | Oturum | — | — |
| `/api/admin/games` | GET, POST, PUT, DELETE | Oturum | — | — |
| `/api/admin/games/rooms` | GET, DELETE | Oturum | — | — |
| `/api/admin/games/settings` | GET, PUT | Oturum | — | — |
| `/api/admin/gift-collections` | GET, POST, PATCH | Oturum | — | — |
| `/api/admin/gift-upload` | POST | Oturum | — | — |
| `/api/admin/gifts` | GET, POST | Oturum | — | — |
| `/api/admin/gifts/[giftId]` | GET, PATCH, DELETE | Oturum | — | — |
| `/api/admin/gifts/stats` | GET | Oturum | — | — |
| `/api/admin/global-search` | GET | Yok ⚠ | — | — |
| `/api/admin/homepage-buttons` | GET, POST, PATCH, DELETE | Oturum | — | — |
| `/api/admin/homepage-fortune-cards` | GET, POST, PUT, PATCH, DELETE | Oturum | — | — |
| `/api/admin/integrations/apple` | GET, PUT, DELETE | Yok ⚠ | — | — |
| `/api/admin/integrations/google-play` | GET, PUT, DELETE | Yok ⚠ | — | — |
| `/api/admin/integrations/sms` | GET, PATCH | Yok ⚠ | — | — |
| `/api/admin/integrations/sms/[providerKey]` | PUT, PATCH, DELETE | Yok ⚠ | — | — |
| `/api/admin/integrations/sms/[providerKey]/test` | POST | Yok ⚠ | — | — |
| `/api/admin/leaderboards` | GET, POST | Oturum+Admin | — | — |
| `/api/admin/ledger` | GET | Oturum | — | — |
| `/api/admin/live-tellers` | GET, POST | Oturum | — | — |
| `/api/admin/live-tellers/[tellerId]` | GET, PUT, DELETE | Oturum | — | — |
| `/api/admin/live-tellers/[tellerId]/approve` | POST | Oturum | — | — |
| `/api/admin/live-tellers/[tellerId]/ban` | POST | Oturum | — | — |
| `/api/admin/live-tellers/[tellerId]/bonus` | POST | Oturum | — | — |
| `/api/admin/live-tellers/[tellerId]/freeze` | POST | Oturum | — | — |
| `/api/admin/live-tellers/[tellerId]/permissions` | PUT | Oturum | — | — |
| `/api/admin/live-tellers/[tellerId]/warning` | POST, DELETE | Oturum | — | — |
| `/api/admin/lucky-gifts/tiers` | GET, POST, PATCH, DELETE | Oturum+Admin | — | — |
| `/api/admin/membership-badges` | GET, POST, PATCH, DELETE | Oturum | — | — |
| `/api/admin/membership-events` | GET, POST, PUT, DELETE | Yok ⚠ | — | — |
| `/api/admin/membership-features` | GET, POST, PUT, DELETE | Yok ⚠ | — | — |
| `/api/admin/membership-grants` | GET, POST, DELETE | Admin | — | — |
| `/api/admin/membership-reports` | GET | Yok ⚠ | — | — |
| `/api/admin/membership-tiers` | GET, POST, PUT, DELETE | Yok ⚠ | — | — |
| `/api/admin/memberships` | GET, POST, PUT, DELETE | Oturum | — | — |
| `/api/admin/memberships/purchases` | GET, POST, PATCH | Oturum | — | — |
| `/api/admin/mic-frames` | HEAD/OPTIONS | Yok ⚠ | — | — |
| `/api/admin/moderation` | GET, POST | Oturum | — | — |
| `/api/admin/name-effects` | HEAD/OPTIONS | Yok ⚠ | — | — |
| `/api/admin/notifications` | GET, POST, DELETE | Oturum | — | — |
| `/api/admin/online-fal/buttons` | GET, POST, PATCH, DELETE | Oturum | — | — |
| `/api/admin/online-fal/sections` | GET, POST, PATCH | Oturum | — | — |
| `/api/admin/payment-methods` | GET, POST | Oturum | — | — |
| `/api/admin/payment-notifications` | GET, POST | Admin | — | — |
| `/api/admin/payment-requests` | GET | Admin | — | — |
| `/api/admin/payment-requests/dismiss-pending` | POST | Admin | — | — |
| `/api/admin/payments` | GET, POST | Admin | — | — |
| `/api/admin/payments/stream` | GET | Admin | — | — |
| `/api/admin/pending-counts` | GET | Oturum | — | — |
| `/api/admin/platform-analytics` | GET | Yok ⚠ | — | — |
| `/api/admin/popups` | GET, POST, PUT, DELETE | Oturum | — | — |
| `/api/admin/premium-entrance` | GET, POST | Admin | — | — |
| `/api/admin/profile-frames` | GET, POST, DELETE | Oturum | — | — |
| `/api/admin/profile-frames/assign` | POST | Oturum | — | — |
| `/api/admin/referral-commission` | GET | Oturum | — | — |
| `/api/admin/referral-commission/settings` | GET, PATCH | Oturum | — | — |
| `/api/admin/refunds` | GET, PATCH | Oturum | — | — |
| `/api/admin/remote-config` | GET, POST | Oturum | — | — |
| `/api/admin/remote-config/[configId]` | PATCH, DELETE | Oturum | — | — |
| `/api/admin/risk-events` | GET | Admin | — | — |
| `/api/admin/risk-events/[eventId]` | PATCH | Admin | — | — |
| `/api/admin/roles` | GET, POST | Oturum | — | — |
| `/api/admin/roles/[roleId]` | PATCH, DELETE | Oturum | — | — |
| `/api/admin/room-themes` | HEAD/OPTIONS | Yok ⚠ | — | — |
| `/api/admin/room-themes/backgrounds` | GET, POST, PATCH | Oturum | — | — |
| `/api/admin/rooms` | GET, PATCH | Oturum | — | — |
| `/api/admin/rtc-telemetry` | GET | Admin | — | — |
| `/api/admin/seo-settings` | GET, POST | Oturum | — | — |
| `/api/admin/settings` | GET, POST | Oturum | — | — |
| `/api/admin/site-animations` | GET, POST | Yok ⚠ | — | — |
| `/api/admin/site-animations/[id]` | GET, PATCH, DELETE | Yok ⚠ | — | — |
| `/api/admin/site-animations/assign` | GET, POST | Yok ⚠ | — | — |
| `/api/admin/site-animations/bulk-assign` | POST | AnimAdmin | — | — |
| `/api/admin/site-animations/defaults` | GET, POST | Yok ⚠ | — | — |
| `/api/admin/site-animations/exit-defaults` | GET, POST | AnimAdmin | — | — |
| `/api/admin/site-animations/stats` | GET | Yok ⚠ | — | — |
| `/api/admin/site-animations/user/[userId]` | GET | AnimAdmin | — | — |
| `/api/admin/site-pages` | GET, POST, PUT, DELETE | Oturum | — | — |
| `/api/admin/statistics` | GET | Oturum | — | — |
| `/api/admin/support` | GET | Admin | — | — |
| `/api/admin/system-stats` | GET | Admin | — | — |
| `/api/admin/teller-levels` | POST | Oturum | — | — |
| `/api/admin/teller-performance` | GET | Oturum | — | — |
| `/api/admin/teller-verification` | GET, POST | Oturum | — | — |
| `/api/admin/ticker-messages` | GET, POST | Oturum | — | — |
| `/api/admin/ticker-messages/[messageId]` | PATCH, DELETE | Oturum | — | — |
| `/api/admin/tiktok-categories` | GET, POST, PATCH, DELETE | Oturum | — | — |
| `/api/admin/tiktok-videos` | GET, POST, PUT, PATCH, DELETE | Oturum | — | — |
| `/api/admin/topup-bonus-tiers` | GET, POST | Oturum | — | — |
| `/api/admin/topup-bonus-tiers/[id]` | PATCH, DELETE | Oturum | — | — |
| `/api/admin/tournaments` | GET, POST | Oturum+Admin | — | — |
| `/api/admin/trend-videos` | GET, POST | Oturum | — | — |
| `/api/admin/trend-videos/youtube` | POST | Oturum | — | — |
| `/api/admin/trends` | GET, POST, DELETE | Oturum | — | — |
| `/api/admin/users` | GET | Oturum+JWT | — | — |
| `/api/admin/users/[userId]` | GET, PATCH, DELETE | Oturum | — | — |
| `/api/admin/users/[userId]/360` | GET | Admin | — | — |
| `/api/admin/users/[userId]/ads` | GET | Admin | — | — |
| `/api/admin/users/[userId]/full` | GET | Admin | — | — |
| `/api/admin/users/[userId]/gifts` | GET | Admin | — | — |
| `/api/admin/users/[userId]/manage` | GET, POST | Admin | — | — |
| `/api/admin/users/[userId]/rooms` | GET | Admin | — | — |
| `/api/admin/users/[userId]/streams` | GET | Admin | — | — |
| `/api/admin/users/search` | GET | Oturum | — | — |
| `/api/admin/users/withdrawal-limit` | POST | Oturum | — | — |
| `/api/admin/verification` | GET, PATCH | Admin | — | — |
| `/api/admin/video-streams` | GET, PATCH, DELETE | Oturum | — | — |
| `/api/admin/visitor-stats` | GET | Oturum | — | — |
| `/api/admin/voice-room-backgrounds` | GET, POST | Yok ⚠ | — | — |
| `/api/admin/voice-room-finance-audit` | GET | Admin | — | — |
| `/api/admin/voice-room-settings` | GET, POST | Admin | — | — |
| `/api/admin/withdrawals` | GET, POST | Oturum | — | — |

### /api/ads (4)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/ads/active` | GET | Yok ⚠ | — | — |
| `/api/ads/placement` | GET, POST | Oturum+JWT | — | — |
| `/api/ads/reward` | POST | JWT | — | — |
| `/api/ads/reward-callback` | GET, POST | Yok ⚠ | — | — |

### /api/advisors (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/advisors/online` | GET | Yok ⚠ | — | — |

### /api/agency (16)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/agency/applicant-score/[userId]` | GET | Yok ⚠ | — | — |
| `/api/agency/apply` | POST | JWT | agency_action | — |
| `/api/agency/earnings` | GET | JWT | — | — |
| `/api/agency/growth` | GET | Yok ⚠ | — | — |
| `/api/agency/invite` | GET, POST | JWT | — | — |
| `/api/agency/invite-earnings` | GET | Oturum+JWT | — | — |
| `/api/agency/join` | POST | JWT | agency_action | — |
| `/api/agency/leaderboard` | GET | Yok ⚠ | — | — |
| `/api/agency/leave` | POST, DELETE | JWT | — | — |
| `/api/agency/live-status` | GET | Yok ⚠ | — | — |
| `/api/agency/members` | GET, POST, DELETE | JWT | — | — |
| `/api/agency/my` | GET, PATCH | JWT | — | — |
| `/api/agency/tasks` | GET | JWT | — | — |
| `/api/agency/wallet` | GET | Yok ⚠ | — | — |
| `/api/agency/wallet/transfer` | POST | Yok ⚠ | — | — |
| `/api/agency/withdrawals` | GET, POST | Oturum+JWT | withdrawal | — |

### /api/animations (3)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/animations/manifest` | GET | Yok ⚠ | — | — |
| `/api/animations/me` | GET | JWT | — | — |
| `/api/animations/resolve` | GET | JWT | — | — |

### /api/announcements (2)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/announcements` | GET, POST | JWT | — | — |
| `/api/announcements/event` | POST | JWT | — | — |

### /api/anonymous (2)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/anonymous` | GET, POST | Yok ⚠ | — | — |
| `/api/anonymous/watch-ad` | POST | Yok ⚠ | — | — |

### /api/astrology-panel (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/astrology-panel` | GET | JWT | — | — |

### /api/auth (22)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth | — | — |
| `/api/auth/change-password` | POST | JWT | — | — |
| `/api/auth/email/send-verification` | POST | JWT | — | — |
| `/api/auth/email/verify` | GET, POST | Yok ⚠ | — | — |
| `/api/auth/forgot-password` | POST | Yok ⚠ | — | — |
| `/api/auth/logout` | POST | JWT | — | — |
| `/api/auth/logout-all` | POST | JWT | — | — |
| `/api/auth/mobile-apple` | POST | Yok ⚠ | — | — |
| `/api/auth/mobile-google` | POST | Yok ⚠ | — | — |
| `/api/auth/mobile-login` | POST | Yok ⚠ | — | — |
| `/api/auth/mobile-refresh` | POST | Yok ⚠ | — | — |
| `/api/auth/mobile-register` | POST | Yok ⚠ | — | — |
| `/api/auth/mobile-sessions` | GET | Yok ⚠ | — | — |
| `/api/auth/mobile-sessions/[id]` | DELETE | JWT | — | — |
| `/api/auth/mobile-tiktok` | POST | Yok ⚠ | — | — |
| `/api/auth/mobile/device-token` | POST, DELETE | Yok ⚠ | — | — |
| `/api/auth/phone/send-otp` | POST | JWT | — | — |
| `/api/auth/phone/verify-otp` | POST | JWT | — | — |
| `/api/auth/reclaim-device` | POST | Oturum | — | — |
| `/api/auth/reset-password` | POST | Yok ⚠ | — | — |
| `/api/auth/sessions` | GET, DELETE | JWT | — | — |
| `/api/auth/verify-device` | GET | Oturum | — | — |

### /api/avatar-accessories (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/avatar-accessories` | HEAD/OPTIONS | Yok ⚠ | — | — |

### /api/bana-ozel (2)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/bana-ozel` | GET | JWT | — | — |
| `/api/bana-ozel/open` | POST | JWT | — | — |

### /api/billing (2)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/billing/app-store/verify` | POST | JWT | — | — |
| `/api/billing/google-play/verify` | POST | JWT | — | — |

### /api/blog (9)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/blog` | GET | Yok ⚠ | — | — |
| `/api/blog/categories` | GET | Yok ⚠ | — | — |
| `/api/blog/comments` | GET, POST, DELETE | JWT | comment | — |
| `/api/blog/favorite` | POST | JWT | — | — |
| `/api/blog/interactions` | GET | JWT | — | — |
| `/api/blog/like` | POST | JWT | — | — |
| `/api/blog/recent` | GET | Yok ⚠ | — | — |
| `/api/blog/related` | GET | Yok ⚠ | — | — |
| `/api/blog/zodiac` | GET | Yok ⚠ | — | — |

### /api/bootstrap (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/bootstrap` | GET | Admin | — | — |

### /api/broadcast-images (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/broadcast-images` | GET | JWT | — | — |

### /api/broadcasters (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/broadcasters/weekly-competition` | GET | Yok ⚠ | — | — |

### /api/cache (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/cache` | GET, POST | JWT | — | — |

### /api/celebrities (4)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/celebrities` | GET | JWT | — | — |
| `/api/celebrities/[id]` | GET | JWT | — | — |
| `/api/celebrities/[id]/follow` | POST | JWT | — | — |
| `/api/celebrities/[id]/posts` | GET | JWT | — | — |

### /api/cfc-arena (3)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/cfc-arena` | GET | Yok ⚠ | — | — |
| `/api/cfc-arena/[contestId]` | GET | Yok ⚠ | — | — |
| `/api/cfc-arena/join` | POST | Yok ⚠ | — | — |

### /api/chat (54)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/chat/broadcast-images` | GET | Yok ⚠ | — | — |
| `/api/chat/cleanup` | GET, POST, DELETE | signature/webhook | — | — |
| `/api/chat/music/popular` | GET | Yok ⚠ | — | — |
| `/api/chat/rooms` | GET | Yok ⚠ | — | — |
| `/api/chat/rooms/[roomId]/background` | GET, PATCH | Yok ⚠ | — | — |
| `/api/chat/rooms/[roomId]/banned-words` | GET, POST | Yok ⚠ | — | — |
| `/api/chat/rooms/[roomId]/banned-words/[word]` | DELETE | Yok ⚠ | — | — |
| `/api/chat/rooms/[roomId]/bans/[userId]` | POST, DELETE | Proxy | — | — |
| `/api/chat/rooms/[roomId]/dj` | GET, POST | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/dj/[targetUserId]` | POST, DELETE | Proxy | — | — |
| `/api/chat/rooms/[roomId]/gifts` | GET, POST | Oturum+JWT | gift_send | — |
| `/api/chat/rooms/[roomId]/join-seat` | POST | Proxy | — | — |
| `/api/chat/rooms/[roomId]/kick` | POST | Proxy | — | — |
| `/api/chat/rooms/[roomId]/mentions` | POST | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/messages` | GET, POST, DELETE | Oturum+JWT | chat_message | — |
| `/api/chat/rooms/[roomId]/messages/[messageId]` | DELETE | Proxy | — | — |
| `/api/chat/rooms/[roomId]/moderation` | GET, POST | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/music` | GET, POST, DELETE | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/music-queue` | GET | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/music-request-by-query` | POST | Oturum+JWT+Proxy | — | — |
| `/api/chat/rooms/[roomId]/music-settings` | GET, PATCH | Yok ⚠ | — | — |
| `/api/chat/rooms/[roomId]/music/stop` | POST | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/mute` | POST | Proxy | — | — |
| `/api/chat/rooms/[roomId]/pin-message` | POST | VIP | — | — |
| `/api/chat/rooms/[roomId]/pk` | GET, POST | Oturum+JWT | pk_create | — |
| `/api/chat/rooms/[roomId]/pk/score` | POST | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/presence` | GET, POST, DELETE | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/queue` | GET, DELETE | Yok ⚠ | — | — |
| `/api/chat/rooms/[roomId]/report` | POST | Oturum+JWT | report | — |
| `/api/chat/rooms/[roomId]/roles` | POST | Proxy | — | — |
| `/api/chat/rooms/[roomId]/seats` | GET, PATCH | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/settings` | GET, PATCH | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/song-request` | GET, POST, PATCH | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/song/[queueId]` | DELETE | Yok ⚠ | — | — |
| `/api/chat/rooms/[roomId]/speak-request` | GET, POST, DELETE | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/speak-request/[userId]/block` | POST, DELETE | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/speak-request/[userId]/reject` | POST, DELETE | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/speak-requests` | GET | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/speak-requests/[targetUserId]` | DELETE | Yok ⚠ | — | — |
| `/api/chat/rooms/[roomId]/speak-requests/[targetUserId]/approve` | POST | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/speak-requests/[targetUserId]/block` | POST, DELETE | Yok ⚠ | — | — |
| `/api/chat/rooms/[roomId]/speak-requests/[targetUserId]/reject` | POST, DELETE | Yok ⚠ | — | — |
| `/api/chat/rooms/[roomId]/state` | GET | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/stream` | GET | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/sync` | GET | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/transfer-ownership` | POST | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/typing` | GET, POST | Oturum+JWT | — | — |
| `/api/chat/rooms/[roomId]/voice` | GET, POST | Oturum+JWT | — | — |
| `/api/chat/rooms/backgrounds` | GET | Yok ⚠ | — | — |
| `/api/chat/rooms/create` | POST | JWT | room_create | — |
| `/api/chat/rooms/pk-list` | GET | Yok ⚠ | — | — |
| `/api/chat/rooms/pk/candidates` | GET | Oturum+JWT | — | — |
| `/api/chat/youtube-audio` | GET, POST | Yok ⚠ | — | — |
| `/api/chat/youtube-stream` | GET | Yok ⚠ | — | — |

### /api/chat-bubbles (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/chat-bubbles` | HEAD/OPTIONS | Yok ⚠ | — | — |

### /api/compatibility (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/compatibility` | POST | Yok ⚠ | — | — |

### /api/config (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/config` | GET | Yok ⚠ | — | — |

### /api/contact (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/contact` | POST | Yok ⚠ | — | — |

### /api/credit-packages (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/credit-packages` | GET | Yok ⚠ | — | public-10m |

### /api/cron (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/cron/membership-expiry` | GET, POST | signature/webhook | — | — |

### /api/currency-branding (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/currency-branding` | GET | Yok ⚠ | — | — |

### /api/daily-login (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/daily-login` | GET, POST | JWT | — | — |

### /api/daily-missions (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/daily-missions` | GET, POST | JWT | — | — |

### /api/deeplink (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/deeplink/resolve` | GET | Yok ⚠ | — | — |

### /api/devices (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/devices/fcm` | POST, DELETE | Oturum+JWT | — | — |

### /api/dream-contest (3)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/dream-contest` | GET | JWT | — | — |
| `/api/dream-contest/[contestId]/entries` | GET, POST | JWT | — | — |
| `/api/dream-contest/[contestId]/vote` | POST | JWT | — | — |

### /api/dream-diary (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/dream-diary` | GET, POST, DELETE | JWT | — | — |

### /api/dream-stats (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/dream-stats` | GET | JWT | — | — |

### /api/dream-symbols (2)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/dream-symbols` | GET | Yok ⚠ | — | — |
| `/api/dream-symbols/[slug]` | GET | Yok ⚠ | — | — |

### /api/dreams (11)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/dreams` | GET | Yok ⚠ | — | — |
| `/api/dreams/[slug]` | GET | Yok ⚠ | — | — |
| `/api/dreams/[slug]/comments` | GET, POST, DELETE | JWT | comment | — |
| `/api/dreams/[slug]/favorite` | GET, POST | JWT | — | — |
| `/api/dreams/[slug]/view` | POST | JWT | — | — |
| `/api/dreams/favorites` | GET | JWT | — | — |
| `/api/dreams/generate` | POST | Yok ⚠ | — | — |
| `/api/dreams/interpret` | POST | JWT | — | — |
| `/api/dreams/morning-reminder` | POST | signature/webhook | — | — |
| `/api/dreams/recommendations` | GET | JWT | — | — |
| `/api/dreams/trends` | GET | Yok ⚠ | — | — |

### /api/effects (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/effects/resolve` | GET | Admin | — | — |

### /api/emoji-packs (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/emoji-packs` | HEAD/OPTIONS | Yok ⚠ | — | — |

### /api/entrance-effects (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/entrance-effects` | HEAD/OPTIONS | Yok ⚠ | — | — |

### /api/fan-clubs (5)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/fan-clubs` | GET | JWT | — | — |
| `/api/fan-clubs/[id]/join` | POST | JWT | — | — |
| `/api/fan-clubs/[id]/polls` | GET, POST | JWT | content_create | — |
| `/api/fan-clubs/[id]/posts` | GET, POST | JWT | content_create | — |
| `/api/fan-clubs/popular` | GET | Yok ⚠ | — | — |

### /api/favorite-tellers (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/favorite-tellers` | GET, POST | JWT | — | — |

### /api/football (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/football` | GET | Yok ⚠ | — | — |

### /api/fortune-access (4)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/fortune-access/check` | POST | JWT | — | — |
| `/api/fortune-access/consume` | POST | JWT | — | — |
| `/api/fortune-access/ip-status` | GET | Yok ⚠ | — | — |
| `/api/fortune-access/settings` | GET | Yok ⚠ | — | — |

### /api/fortune-request-types (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/fortune-request-types` | GET | Yok ⚠ | — | — |

### /api/fortune-tellers (13)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/fortune-tellers` | GET, POST | JWT | — | — |
| `/api/fortune-tellers/[tellerId]` | GET, PATCH | Oturum+JWT | — | — |
| `/api/fortune-tellers/[tellerId]/reviews` | GET | Yok ⚠ | — | — |
| `/api/fortune-tellers/[tellerId]/session` | GET, POST | Oturum+JWT | — | — |
| `/api/fortune-tellers/apply` | POST | JWT | — | — |
| `/api/fortune-tellers/awards` | GET | Yok ⚠ | — | — |
| `/api/fortune-tellers/gifts` | GET | Yok ⚠ | — | — |
| `/api/fortune-tellers/my-profile` | GET | JWT | — | — |
| `/api/fortune-tellers/session` | GET, POST | Oturum+JWT | — | — |
| `/api/fortune-tellers/sessions` | GET | Oturum+JWT | — | — |
| `/api/fortune-tellers/sessions/[sessionId]` | PATCH | Oturum+JWT | — | — |
| `/api/fortune-tellers/sessions/stream` | GET | Oturum+JWT | — | — |
| `/api/fortune-tellers/toggle-online` | GET, POST | JWT | — | — |

### /api/fortunes (15)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/fortunes/ask-uyumu` | POST | JWT | — | — |
| `/api/fortunes/aura-analizi` | POST | JWT | — | — |
| `/api/fortunes/burc-yorumu` | POST | JWT | — | — |
| `/api/fortunes/dogum-haritasi` | POST | JWT | — | — |
| `/api/fortunes/el-fali` | POST | JWT | — | — |
| `/api/fortunes/evet-hayir` | POST | JWT | — | — |
| `/api/fortunes/istihare` | POST | JWT | — | — |
| `/api/fortunes/kahve-fali` | POST | JWT | — | — |
| `/api/fortunes/kahve-fali-image` | POST | JWT | — | — |
| `/api/fortunes/katina` | POST | JWT | — | — |
| `/api/fortunes/kursundokme` | POST | JWT | — | — |
| `/api/fortunes/melek-kartlari` | POST | JWT | — | — |
| `/api/fortunes/numeroloji` | POST | JWT | — | — |
| `/api/fortunes/ruya-yorumu` | POST | JWT | — | — |
| `/api/fortunes/tarot-fali` | POST | JWT | — | — |

### /api/games (21)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/games` | GET | Yok ⚠ | — | — |
| `/api/games/auto-match` | POST | Oturum+JWT | — | — |
| `/api/games/daily-reward` | GET, POST | JWT | — | — |
| `/api/games/daily-spin` | POST | JWT | — | — |
| `/api/games/grid-settings` | GET | Yok ⚠ | — | — |
| `/api/games/lamba-cini` | GET, POST | JWT | — | — |
| `/api/games/leaderboard` | GET | JWT | — | — |
| `/api/games/lobby` | GET | JWT | — | — |
| `/api/games/play` | POST | JWT | — | — |
| `/api/games/profile` | GET | JWT | — | — |
| `/api/games/quests` | GET, POST | JWT | — | — |
| `/api/games/room` | GET, POST | JWT | — | — |
| `/api/games/room/[roomId]` | GET, POST, PATCH, DELETE | JWT | — | — |
| `/api/games/room/[roomId]/chat` | GET, POST, PATCH | JWT | — | — |
| `/api/games/room/[roomId]/replace-ai` | POST | JWT | — | — |
| `/api/games/room/[roomId]/viewers` | GET, POST, DELETE | JWT | — | — |
| `/api/games/rooms` | GET | Yok ⚠ | — | — |
| `/api/games/sos` | GET, POST | JWT | — | — |
| `/api/games/sos/[gameId]` | GET, POST, PATCH, DELETE | JWT | — | — |
| `/api/games/sos/[gameId]/chat` | GET, POST, PATCH | JWT | — | — |
| `/api/games/sos/[gameId]/viewers` | GET, POST, DELETE | JWT | — | — |

### /api/gift-box (4)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/gift-box` | GET, POST | Oturum+JWT | — | — |
| `/api/gift-box/[boxId]` | GET | Yok ⚠ | — | — |
| `/api/gift-box/[boxId]/join` | POST | Oturum+JWT | gift_box_join | — |
| `/api/gift-box/share` | POST | Oturum+JWT | gift_box_join | — |

### /api/gift-engine (3)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/gift-engine/finish` | POST | Oturum+JWT | — | — |
| `/api/gift-engine/gifts` | GET | Yok ⚠ | — | — |
| `/api/gift-engine/queue` | GET | Yok ⚠ | — | — |

### /api/gifts (26)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/gifts/battles` | GET, POST | Oturum+JWT | — | — |
| `/api/gifts/battles/[battleId]` | GET | Yok ⚠ | — | — |
| `/api/gifts/catalog` | GET | Oturum+JWT | — | — |
| `/api/gifts/check-reciprocal` | POST | JWT | — | — |
| `/api/gifts/display-settings` | GET | Yok ⚠ | — | — |
| `/api/gifts/goals` | GET, POST | Oturum+JWT | — | — |
| `/api/gifts/insights/album/[userId]` | GET | Yok ⚠ | — | — |
| `/api/gifts/insights/badge/[userId]` | GET | Yok ⚠ | — | — |
| `/api/gifts/insights/collection/[userId]` | GET | Yok ⚠ | — | — |
| `/api/gifts/insights/feed` | GET | Yok ⚠ | — | — |
| `/api/gifts/insights/first-gifter/[context]/[contextId]` | GET | Yok ⚠ | — | — |
| `/api/gifts/insights/leaderboard` | GET | Yok ⚠ | — | — |
| `/api/gifts/insights/map` | GET | Yok ⚠ | — | — |
| `/api/gifts/insights/me/badge` | GET | Oturum+JWT | — | — |
| `/api/gifts/insights/me/history` | GET | Oturum+JWT | — | — |
| `/api/gifts/insights/me/recommendations` | GET | Oturum+JWT | — | — |
| `/api/gifts/lucky/config` | GET | Oturum+JWT | — | — |
| `/api/gifts/lucky/history` | GET | Oturum+JWT | — | — |
| `/api/gifts/lucky/send` | POST | Oturum+JWT | lucky_gift | — |
| `/api/gifts/missions` | GET | Yok ⚠ | — | — |
| `/api/gifts/missions/[missionId]/claim` | POST | Oturum+JWT | — | — |
| `/api/gifts/missions/me` | GET | Oturum+JWT | — | — |
| `/api/gifts/recent-big` | GET | Yok ⚠ | — | — |
| `/api/gifts/send` | POST | JWT | — | — |
| `/api/gifts/types` | GET | Yok ⚠ | — | public-10m |
| `/api/gifts/version` | GET | Yok ⚠ | — | — |

### /api/hashtags (3)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/hashtags/[name]` | GET | JWT | — | — |
| `/api/hashtags/search` | GET | Yok ⚠ | — | — |
| `/api/hashtags/trending` | GET | Yok ⚠ | — | — |

### /api/health (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/health` | GET | Yok ⚠ | — | — |

### /api/homepage-buttons (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/homepage-buttons` | GET | Yok ⚠ | — | — |

### /api/homepage-fortune-cards (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/homepage-fortune-cards` | GET | Yok ⚠ | — | — |

### /api/homepage-ticker (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/homepage-ticker` | GET | Yok ⚠ | — | — |

### /api/horoscope (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/horoscope/daily` | GET | Oturum+JWT | — | — |

### /api/jeton (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/jeton` | GET, POST | JWT | — | — |

### /api/leaderboards (2)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/leaderboards` | GET | JWT | — | — |
| `/api/leaderboards/top100` | GET | Oturum+JWT | — | — |

### /api/legal (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/legal/child-safety` | GET | Yok ⚠ | — | — |

### /api/live (19)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/live/create-room` | POST | JWT | — | — |
| `/api/live/fal-request/[requestId]/complete` | POST | Yok ⚠ | — | — |
| `/api/live/fal-request/[requestId]/update` | POST, PATCH | Yok ⚠ | — | — |
| `/api/live/fal-request/create` | POST | Yok ⚠ | — | — |
| `/api/live/fal-requests` | GET | Yok ⚠ | — | — |
| `/api/live/gift-types` | GET | JWT | — | — |
| `/api/live/gift/send` | POST | Oturum+JWT | gift_send | — |
| `/api/live/guest` | GET, POST | Oturum+JWT | — | — |
| `/api/live/guest/list` | GET | Yok ⚠ | — | — |
| `/api/live/heartbeat` | POST | JWT | — | — |
| `/api/live/join-room` | POST | JWT | — | — |
| `/api/live/leave-room` | POST | JWT | — | — |
| `/api/live/message` | GET, POST | JWT | chat_message | — |
| `/api/live/online-users` | GET | JWT | — | — |
| `/api/live/pk` | GET, POST | JWT | pk_create | — |
| `/api/live/pk/active` | GET | Yok ⚠ | — | — |
| `/api/live/pk/score` | POST | JWT+Admin | — | — |
| `/api/live/rooms` | GET | JWT | — | — |
| `/api/live/seats` | GET, POST | JWT | — | — |

### /api/me (9)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/me` | GET, PATCH | JWT | — | — |
| `/api/me/admin-capabilities` | GET | Yok ⚠ | — | — |
| `/api/me/membership` | GET | VIP | — | — |
| `/api/me/membership-events` | GET | VIP | — | — |
| `/api/me/membership-history` | GET, PUT | VIP | — | — |
| `/api/me/profile-visitors` | GET, POST | VIP | — | — |
| `/api/me/vip-identity` | GET, PUT | VIP | — | — |
| `/api/me/vip-preferences` | GET, PUT | VIP | — | — |
| `/api/me/vip-xp` | GET, POST | VIP | — | — |

### /api/membership (2)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/membership/plans` | GET | Yok ⚠ | — | — |
| `/api/membership/purchase` | POST | Yok ⚠ | — | — |

### /api/membership-badges (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/membership-badges` | GET | Yok ⚠ | — | — |

### /api/memberships (5)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/memberships` | GET | Yok ⚠ | — | — |
| `/api/memberships/comparison` | GET | Yok ⚠ | — | — |
| `/api/memberships/gift` | POST | JWT | membership | — |
| `/api/memberships/packages` | GET | Yok ⚠ | — | — |
| `/api/memberships/purchase` | POST | JWT | membership | — |

### /api/messages (7)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/messages` | GET | JWT | — | — |
| `/api/messages/[userId]` | GET, POST | JWT | chat_message | — |
| `/api/messages/[userId]/[messageId]` | GET, DELETE | JWT | — | — |
| `/api/messages/conversations/[peerId]/messages` | GET, POST | Yok ⚠ | — | — |
| `/api/messages/conversations/[peerId]/stream` | GET | JWT | — | — |
| `/api/messages/conversations/[peerId]/typing` | GET, POST | JWT | — | — |
| `/api/messages/request` | POST, PATCH | JWT | — | — |

### /api/mic-frames (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/mic-frames` | HEAD/OPTIONS | Yok ⚠ | — | — |

### /api/mobile (4)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/mobile/config` | GET | Yok ⚠ | — | — |
| `/api/mobile/fortune-menu` | GET | JWT | — | — |
| `/api/mobile/home` | GET | JWT | — | — |
| `/api/mobile/user-profile/[userId]` | GET | JWT | — | — |

### /api/monitoring (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/monitoring` | GET | Oturum+Admin | — | — |

### /api/music (2)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/music/history` | GET | Yok ⚠ | — | — |
| `/api/music/search` | GET | JWT | — | — |

### /api/name-effects (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/name-effects` | HEAD/OPTIONS | Yok ⚠ | — | — |

### /api/notifications (5)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/notifications` | GET, POST, DELETE | JWT | — | — |
| `/api/notifications/[notificationId]/read` | POST, PATCH | JWT | — | — |
| `/api/notifications/payment` | GET, DELETE | JWT | — | — |
| `/api/notifications/stream` | GET | JWT | — | — |
| `/api/notifications/unread` | GET | JWT | — | — |

### /api/online-fal (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/online-fal` | GET | Yok ⚠ | — | — |

### /api/payments (6)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/payments/config` | GET | JWT | — | — |
| `/api/payments/methods` | GET | Yok ⚠ | — | — |
| `/api/payments/notifications/[notificationId]/dispute` | GET, POST | Admin | report | — |
| `/api/payments/notify` | GET, POST | Oturum+JWT | — | — |
| `/api/payments/requests` | GET, POST | JWT | payment | — |
| `/api/payments/settings` | GET | Yok ⚠ | — | — |

### /api/pk (5)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/pk/[matchId]` | GET | Yok ⚠ | — | — |
| `/api/pk/[matchId]/stream` | GET | Yok ⚠ | — | — |
| `/api/pk/active` | GET | Yok ⚠ | — | — |
| `/api/pk/leaderboard` | GET | Yok ⚠ | — | — |
| `/api/pk/me/invites` | GET | Oturum+JWT | — | — |

### /api/platform (2)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/platform/commission-rate` | GET | Yok ⚠ | — | — |
| `/api/platform/voice-room-settings` | GET | Yok ⚠ | — | — |

### /api/popups (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/popups` | GET | Oturum+JWT | — | — |

### /api/presence (3)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/presence` | GET, POST | JWT | — | — |
| `/api/presence/online-events` | GET | Yok ⚠ | — | — |
| `/api/presence/sections` | GET | Yok ⚠ | — | — |

### /api/profile-frames (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/profile-frames` | GET, POST | JWT | — | — |

### /api/public (2)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/public/announcement-settings` | GET | Yok ⚠ | — | — |
| `/api/public/jeton-price` | GET | Yok ⚠ | — | — |

### /api/public-stats (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/public-stats` | GET | Yok ⚠ | — | — |

### /api/referral (9)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/referral` | GET | Oturum+JWT | — | — |
| `/api/referral/earnings` | GET | Yok ⚠ | — | — |
| `/api/referral/invite-link` | GET | JWT | — | — |
| `/api/referral/ledger` | GET | JWT | — | — |
| `/api/referral/me` | GET | Yok ⚠ | — | — |
| `/api/referral/settings` | GET | JWT | — | — |
| `/api/referral/stats` | GET | JWT | — | — |
| `/api/referral/users` | GET | JWT | — | — |
| `/api/referral/validate` | GET | Yok ⚠ | — | — |

### /api/refunds (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/refunds` | GET, POST | JWT | — | — |

### /api/room (7)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/room/[sessionId]` | GET, PATCH | Oturum+JWT | — | — |
| `/api/room/[sessionId]/messages` | GET, POST | Oturum+JWT | — | — |
| `/api/room/[sessionId]/review` | GET, POST | Oturum+JWT | — | — |
| `/api/room/[sessionId]/stream` | GET | Oturum+JWT | — | — |
| `/api/room/[sessionId]/summary` | GET | Oturum+JWT | — | — |
| `/api/room/[sessionId]/tip` | POST | Oturum+JWT | tip | — |
| `/api/room/signal` | GET, POST, DELETE | Oturum+JWT | — | — |

### /api/room-themes (2)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/room-themes` | HEAD/OPTIONS | Yok ⚠ | — | — |
| `/api/room-themes/catalog` | GET | Oturum+JWT | — | — |

### /api/rtc (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/rtc/telemetry` | POST | Admin | rtc_telemetry | — |

### /api/search (2)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/search` | GET | Yok ⚠ | — | — |
| `/api/search/advanced` | GET | JWT | — | — |

### /api/seo-settings (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/seo-settings` | GET | Yok ⚠ | — | — |

### /api/settings (4)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/settings/ads` | GET | Yok ⚠ | — | — |
| `/api/settings/canlidark-hero` | GET | Yok ⚠ | — | — |
| `/api/settings/public` | GET | Yok ⚠ | — | — |
| `/api/settings/themes` | GET | Yok ⚠ | — | — |

### /api/share-card (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/share-card` | GET | JWT | — | — |

### /api/short-videos (25)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/short-videos` | GET | JWT | — | — |
| `/api/short-videos/[id]` | GET, DELETE | JWT | — | — |
| `/api/short-videos/[id]/comments` | GET, POST | JWT | comment | — |
| `/api/short-videos/[id]/comments/[commentId]` | DELETE | JWT | — | — |
| `/api/short-videos/[id]/comments/[commentId]/like` | POST | JWT | — | — |
| `/api/short-videos/[id]/comments/[commentId]/pin` | POST | JWT | — | — |
| `/api/short-videos/[id]/duets` | GET | JWT | — | — |
| `/api/short-videos/[id]/like` | POST | JWT | — | — |
| `/api/short-videos/[id]/save` | POST | JWT | — | — |
| `/api/short-videos/[id]/share` | POST | JWT | — | — |
| `/api/short-videos/[id]/subtitles/generate` | POST | JWT | ai_generate | — |
| `/api/short-videos/[id]/view` | POST | JWT | — | — |
| `/api/short-videos/explore` | GET | JWT | — | — |
| `/api/short-videos/explore/nearby` | GET | JWT | — | — |
| `/api/short-videos/hashtags/search` | GET | Yok ⚠ | — | — |
| `/api/short-videos/hashtags/trending` | GET | Yok ⚠ | — | — |
| `/api/short-videos/mentions/search` | GET | Yok ⚠ | — | — |
| `/api/short-videos/music` | GET | Yok ⚠ | — | — |
| `/api/short-videos/music/recommend` | GET | Yok ⚠ | — | — |
| `/api/short-videos/profile/[userId]` | GET | JWT | — | — |
| `/api/short-videos/register` | POST | JWT | — | — |
| `/api/short-videos/upload` | POST | JWT | upload | — |
| `/api/short-videos/upload-url` | POST | JWT | — | — |
| `/api/short-videos/user/[userId]` | GET | JWT | — | — |
| `/api/short-videos/viewed/me` | GET | JWT | — | — |

### /api/signup (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/signup` | POST | Yok ⚠ | — | — |

### /api/site-animations (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/site-animations/active` | GET | Yok ⚠ | — | — |

### /api/site-pages (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/site-pages/[slug]` | GET | Yok ⚠ | — | — |

### /api/social (11)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/social/actions` | GET, POST | Yok ⚠ | — | — |
| `/api/social/announcements` | GET | Yok ⚠ | — | — |
| `/api/social/discovery` | GET | Yok ⚠ | — | — |
| `/api/social/posts` | GET, POST | JWT | content_create | — |
| `/api/social/posts/[postId]` | GET, DELETE | JWT | — | — |
| `/api/social/posts/[postId]/comments` | GET, POST, DELETE | JWT | comment | — |
| `/api/social/posts/[postId]/likes` | POST | JWT | — | — |
| `/api/social/posts/[postId]/view` | POST | Yok ⚠ | — | — |
| `/api/social/profile` | GET | Yok ⚠ | — | — |
| `/api/social/public-stats` | GET | Yok ⚠ | — | — |
| `/api/social/stories` | GET, POST, DELETE | Yok ⚠ | — | — |

### /api/stories (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/stories` | GET, POST, DELETE | JWT | content_create | — |

### /api/support (3)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/support/tickets` | GET, POST | Admin | report | — |
| `/api/support/tickets/[ticketId]` | GET, PATCH | Admin | — | — |
| `/api/support/tickets/[ticketId]/messages` | POST | Admin | — | — |

### /api/supporter-levels (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/supporter-levels` | GET | Admin | — | — |

### /api/teams (2)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/teams` | GET, POST | Admin | — | — |
| `/api/teams/[teamId]` | GET, PATCH | Admin | — | — |

### /api/teller (5)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/teller/analytics` | GET | JWT | — | — |
| `/api/teller/gifts` | GET | JWT | — | — |
| `/api/teller/level` | GET | Oturum+JWT | — | — |
| `/api/teller/reviews` | GET | JWT | — | — |
| `/api/teller/verification` | GET, POST | JWT | — | — |

### /api/teller-chat (2)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/teller-chat` | GET | Oturum+JWT | — | — |
| `/api/teller-chat/[sessionId]` | GET, POST | Oturum+JWT | — | — |

### /api/tencent (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/tencent/webhook` | POST | signature/webhook | — | — |

### /api/tiktok-videos (3)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/tiktok-videos` | GET | Yok ⚠ | — | — |
| `/api/tiktok-videos/[id]` | GET | Yok ⚠ | — | — |
| `/api/tiktok-videos/oembed` | GET | Yok ⚠ | — | — |

### /api/tmdb (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/tmdb` | GET | Yok ⚠ | — | — |

### /api/tournaments (2)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/tournaments` | GET | Oturum+JWT | — | — |
| `/api/tournaments/join` | POST | Oturum+JWT | — | — |

### /api/translations (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/translations` | GET | Yok ⚠ | — | — |

### /api/trend-videos (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/trend-videos` | GET, POST | Yok ⚠ | — | — |

### /api/trends (3)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/trends` | GET | Yok ⚠ | — | — |
| `/api/trends/[slug]` | GET | Yok ⚠ | — | — |
| `/api/trends/[slug]/like` | POST | JWT | — | — |

### /api/trtc (3)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/trtc/token` | POST | JWT | — | — |
| `/api/trtc/usersig` | POST | JWT | — | — |
| `/api/trtc/webhook` | POST | Yok ⚠ | — | — |

### /api/upload (2)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/upload/get-url` | GET, POST | JWT | — | — |
| `/api/upload/presigned` | POST | JWT | — | — |

### /api/user (37)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/user/[userId]/achievements` | GET | JWT | — | — |
| `/api/user/[userId]/follow` | POST, DELETE | JWT | — | — |
| `/api/user/[userId]/follow-status` | GET | JWT | — | — |
| `/api/user/account` | POST, DELETE | JWT | — | — |
| `/api/user/account/delete` | POST | Yok ⚠ | — | — |
| `/api/user/achievements` | GET | JWT | — | — |
| `/api/user/active-sessions` | GET | JWT | — | — |
| `/api/user/activity` | GET, PATCH | JWT | — | — |
| `/api/user/block` | GET, POST | JWT | — | — |
| `/api/user/blocked` | GET, DELETE | JWT | — | — |
| `/api/user/broadcast-history` | GET | JWT | — | — |
| `/api/user/co-broadcast-invites` | GET | JWT | — | — |
| `/api/user/credits` | GET | JWT | — | — |
| `/api/user/daily-tasks` | GET, POST | Yok ⚠ | — | — |
| `/api/user/device-token` | POST, DELETE | Yok ⚠ | — | — |
| `/api/user/favorites` | GET, POST | JWT | — | — |
| `/api/user/favorites/[favoriteId]` | DELETE | JWT | — | — |
| `/api/user/followers` | GET | JWT | — | private-5m |
| `/api/user/following` | GET | JWT | — | private-5m |
| `/api/user/fortunes` | GET | JWT | — | — |
| `/api/user/fortunes/[fortuneId]` | PATCH | JWT | — | — |
| `/api/user/fortunes/[fortuneId]/pin` | POST, PATCH | JWT | — | — |
| `/api/user/fortunes/[fortuneId]/rate` | POST | JWT | — | — |
| `/api/user/likers` | GET | JWT | — | — |
| `/api/user/location` | GET, POST | Yok ⚠ | — | — |
| `/api/user/profile` | GET, PATCH | JWT | — | — |
| `/api/user/received-gifts` | GET | JWT | — | — |
| `/api/user/referral-earnings` | GET | Oturum+JWT | — | — |
| `/api/user/report` | POST | JWT | report | — |
| `/api/user/social-settings` | GET, PUT | Yok ⚠ | — | — |
| `/api/user/statistics` | GET | JWT | — | — |
| `/api/user/stats` | GET, POST | JWT | — | — |
| `/api/user/story` | GET, POST, DELETE | Yok ⚠ | — | — |
| `/api/user/theme` | GET, PATCH | JWT | — | — |
| `/api/user/wallet` | GET | Oturum+JWT | — | — |
| `/api/user/watch-ad` | GET, POST | JWT | — | — |
| `/api/user/xp` | GET | JWT | — | — |

### /api/users (10)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/users/[userId]` | GET | JWT | — | — |
| `/api/users/[userId]/follow` | GET, POST | JWT | — | — |
| `/api/users/[userId]/posts` | GET | JWT | — | — |
| `/api/users/lookup/[username]` | GET | JWT | — | — |
| `/api/users/me/activity` | GET | Yok ⚠ | — | — |
| `/api/users/me/broadcast-history` | GET | Yok ⚠ | — | — |
| `/api/users/me/profile-visitors` | GET, POST | Yok ⚠ | — | — |
| `/api/users/me/stats` | GET | Yok ⚠ | — | — |
| `/api/users/online` | GET | Yok ⚠ | — | — |
| `/api/users/search` | GET | JWT | — | — |

### /api/verification (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/verification` | GET, POST | Admin | report | — |

### /api/video-streams (34)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/video-streams` | GET, POST | Oturum+JWT | stream_create | — |
| `/api/video-streams/[streamId]` | GET, PATCH | Oturum+JWT | — | — |
| `/api/video-streams/[streamId]/auto-close` | GET, POST | JWT | — | — |
| `/api/video-streams/[streamId]/background` | POST, PATCH | Yok ⚠ | — | — |
| `/api/video-streams/[streamId]/ban` | GET, POST, DELETE | JWT | — | — |
| `/api/video-streams/[streamId]/co-broadcast` | GET, POST, PATCH | JWT | — | — |
| `/api/video-streams/[streamId]/co-broadcast/invite` | POST | JWT | — | — |
| `/api/video-streams/[streamId]/comments` | GET, POST | JWT | comment | no-store |
| `/api/video-streams/[streamId]/end` | POST | JWT | — | — |
| `/api/video-streams/[streamId]/fortune-requests` | GET, POST, PATCH, DELETE | JWT | — | — |
| `/api/video-streams/[streamId]/fortune-requests/my-status` | GET | JWT | — | — |
| `/api/video-streams/[streamId]/gifts` | GET, POST | Oturum+JWT | gift_send | — |
| `/api/video-streams/[streamId]/gifts/leaderboard` | GET | Yok ⚠ | — | — |
| `/api/video-streams/[streamId]/image` | POST, PATCH | Yok ⚠ | — | — |
| `/api/video-streams/[streamId]/join` | POST, DELETE | JWT | — | — |
| `/api/video-streams/[streamId]/leave` | POST | JWT | — | — |
| `/api/video-streams/[streamId]/like` | GET, POST | JWT | — | — |
| `/api/video-streams/[streamId]/live-started` | POST | JWT | — | — |
| `/api/video-streams/[streamId]/media-heartbeat` | POST | JWT | — | — |
| `/api/video-streams/[streamId]/messages` | GET, POST | JWT | — | — |
| `/api/video-streams/[streamId]/moderator` | GET, POST, DELETE | Yok ⚠ | — | — |
| `/api/video-streams/[streamId]/moderators` | GET, POST, DELETE | JWT | — | — |
| `/api/video-streams/[streamId]/mute` | GET, POST, DELETE | JWT | — | — |
| `/api/video-streams/[streamId]/pk-battle` | GET, POST | JWT | — | — |
| `/api/video-streams/[streamId]/signal` | GET, POST, DELETE | JWT | — | — |
| `/api/video-streams/[streamId]/stream` | GET | JWT | — | — |
| `/api/video-streams/[streamId]/sync` | GET | Oturum+JWT | — | — |
| `/api/video-streams/[streamId]/viewers` | GET | Yok ⚠ | — | — |
| `/api/video-streams/gifts` | GET | JWT | — | — |
| `/api/video-streams/pk` | GET, POST | Oturum+JWT | pk_create | — |
| `/api/video-streams/pk/candidates` | GET | Oturum+JWT | — | — |
| `/api/video-streams/pk/list` | GET | Yok ⚠ | — | — |
| `/api/video-streams/pk/score` | POST | Oturum+JWT | — | — |
| `/api/video-streams/signal` | GET, POST, DELETE | JWT | — | — |

### /api/vip (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/vip/leaderboard` | GET | VIP | — | — |

### /api/wallet (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/wallet` | GET | JWT | — | — |

### /api/warmup (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/warmup` | GET | Yok ⚠ | — | — |

### /api/weekly-dream-report (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/weekly-dream-report` | GET, POST | JWT | — | — |

### /api/withdrawals (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/withdrawals` | GET, POST | Oturum+JWT | withdrawal | — |

### /api/youtube (1)

| Yol | Metot | Yetki | Rate | Cache |
|---|---|---|---|---|
| `/api/youtube/search` | GET | JWT | — | — |
