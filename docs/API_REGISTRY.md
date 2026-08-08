# API Registry — CanlıFal
> Otomatik üretildi: 08 August 2026
> Toplam: **690 uç**, **148 alan**, **438 benzersiz yol**

## Alan Bazlı Özet

| Alan | Uç sayısı |
|------|-----------|
| activities | 1 |
| admin/activity-feed | 2 |
| admin/ad-networks | 3 |
| admin/agencies | 3 |
| admin/announcement-sections | 2 |
| admin/awards | 3 |
| admin/backup | 1 |
| admin/badges | 4 |
| admin/bana-ozel | 3 |
| admin/blog | 19 |
| admin/bots | 10 |
| admin/broadcast-images | 4 |
| admin/button-order | 2 |
| admin/cache | 2 |
| admin/cfc-payment-requests | 2 |
| admin/cfc-settings | 2 |
| admin/chat-rooms | 4 |
| admin/contests | 4 |
| admin/credit-packages | 4 |
| admin/credits | 1 |
| admin/currency-config | 3 |
| admin/dreams | 9 |
| admin/finance | 2 |
| admin/fortune-request-types | 4 |
| admin/fortunes | 1 |
| admin/games | 8 |
| admin/gift-collections | 3 |
| admin/gift-upload | 1 |
| admin/gifts | 6 |
| admin/homepage-buttons | 4 |
| admin/homepage-fortune-cards | 5 |
| admin/live-tellers | 12 |
| admin/lucky-gifts | 4 |
| admin/membership-badges | 4 |
| admin/memberships | 7 |
| admin/moderation | 2 |
| admin/notifications | 3 |
| admin/online-fal | 7 |
| admin/payment-methods | 2 |
| admin/payments | 3 |
| admin/pending-counts | 1 |
| admin/popups | 4 |
| admin/profile-frames | 4 |
| admin/room-themes | 3 |
| admin/rooms | 2 |
| admin/seo-settings | 2 |
| admin/settings | 2 |
| admin/site-pages | 4 |
| admin/statistics | 1 |
| admin/teller-levels | 1 |
| admin/teller-performance | 1 |
| admin/teller-verification | 2 |
| admin/ticker-messages | 4 |
| admin/tiktok-categories | 4 |
| admin/tiktok-videos | 5 |
| admin/trend-videos | 3 |
| admin/trends | 3 |
| admin/users | 6 |
| admin/video-streams | 3 |
| admin/visitor-stats | 1 |
| admin/withdrawals | 2 |
| ads | 2 |
| agency | 16 |
| announcements | 3 |
| anonymous | 3 |
| astrology-panel | 1 |
| auth | 14 |
| bana-ozel | 2 |
| blog | 10 |
| broadcast-images | 1 |
| cache | 2 |
| chat | 43 |
| compatibility | 1 |
| contact | 1 |
| credit-packages | 1 |
| daily-login | 2 |
| daily-missions | 2 |
| devices | 2 |
| dream-contest | 4 |
| dream-diary | 3 |
| dream-stats | 1 |
| dream-symbols | 2 |
| dreams | 14 |
| favorite-tellers | 2 |
| football | 1 |
| fortune-access | 2 |
| fortune-request-types | 1 |
| fortune-tellers | 18 |
| fortunes | 15 |
| games | 38 |
| gift-engine | 3 |
| gifts | 9 |
| hashtags | 3 |
| homepage-buttons | 1 |
| homepage-fortune-cards | 1 |
| homepage-ticker | 1 |
| horoscope | 1 |
| jeton | 2 |
| leaderboards | 1 |
| legal | 1 |
| live | 15 |
| me | 2 |
| membership-badges | 1 |
| memberships | 3 |
| messages | 5 |
| mobile | 4 |
| monitoring | 1 |
| music | 2 |
| notifications | 4 |
| online-fal | 1 |
| payments | 7 |
| platform | 1 |
| popups | 1 |
| presence | 3 |
| profile-frames | 2 |
| public | 2 |
| public-stats | 1 |
| referral | 2 |
| room | 12 |
| room-themes | 1 |
| search | 2 |
| seo-settings | 1 |
| settings | 4 |
| share-card | 1 |
| short-videos | 21 |
| signup | 1 |
| site-pages | 1 |
| social | 9 |
| stories | 3 |
| teller | 4 |
| teller-chat | 3 |
| tencent | 1 |
| tiktok-videos | 3 |
| tmdb | 1 |
| tournaments | 1 |
| translations | 1 |
| trend-videos | 2 |
| trends | 3 |
| trtc | 3 |
| upload | 3 |
| user | 32 |
| users | 7 |
| video-streams | 52 |
| wallet | 1 |
| warmup | 1 |
| weekly-dream-report | 2 |
| withdrawals | 2 |
| youtube | 1 |

## Kaldırılan Eski Uçlar (Aşama C — tamamlandı)

| Silinen eski uç | Kanonik karşılığı |
|---|---|
| `/api/leaderboard` | `/api/leaderboards` |
| `/api/membership/packages` | `/api/memberships/packages` |
| `/api/payment/config` | `/api/payments/config` |
| `/api/payment/requests` | `/api/payments/requests` |
| `/api/payment-methods` | `/api/payments/methods` |
| `/api/payment-settings` | `/api/payments/settings` |
| `/api/rooms/{id}/music/current` | `/api/chat/rooms/{id}/music` (GET) |
| `/api/rooms/{id}/music/skip` | `/api/chat/rooms/{id}/music` (DELETE) |
| `/api/rooms/{id}/music/stop` | `/api/chat/rooms/{id}/music/stop` |

**Not:** `/api/tencent/webhook` sağlayıcıda kayıtlı olduğu için korundu; kanonik `/api/trtc/webhook` de açık.

## Tam Uç Listesi

| # | Yöntem | Yol | Alan | Auth |
|---|--------|-----|------|------|
| 1 | GET | `/api/activities` | activities | dual |
| 2 | GET | `/api/admin/activity-feed` | admin/activity-feed | session |
| 3 | POST | `/api/admin/activity-feed` | admin/activity-feed | session |
| 4 | DELETE | `/api/admin/ad-networks` | admin/ad-networks | session |
| 5 | GET | `/api/admin/ad-networks` | admin/ad-networks | session |
| 6 | POST | `/api/admin/ad-networks` | admin/ad-networks | session |
| 7 | DELETE | `/api/admin/agencies` | admin/agencies | session |
| 8 | GET | `/api/admin/agencies` | admin/agencies | session |
| 9 | PATCH | `/api/admin/agencies` | admin/agencies | session |
| 10 | GET | `/api/admin/announcement-sections` | admin/announcement-sections | session |
| 11 | POST | `/api/admin/announcement-sections` | admin/announcement-sections | session |
| 12 | DELETE | `/api/admin/awards` | admin/awards | session |
| 13 | GET | `/api/admin/awards` | admin/awards | session |
| 14 | POST | `/api/admin/awards` | admin/awards | session |
| 15 | GET | `/api/admin/backup` | admin/backup | session |
| 16 | DELETE | `/api/admin/badges` | admin/badges | session |
| 17 | GET | `/api/admin/badges` | admin/badges | session |
| 18 | POST | `/api/admin/badges` | admin/badges | session |
| 19 | PUT | `/api/admin/badges` | admin/badges | session |
| 20 | GET | `/api/admin/bana-ozel` | admin/bana-ozel | session |
| 21 | PATCH | `/api/admin/bana-ozel` | admin/bana-ozel | session |
| 22 | POST | `/api/admin/bana-ozel` | admin/bana-ozel | session |
| 23 | GET | `/api/admin/blog` | admin/blog | session |
| 24 | POST | `/api/admin/blog` | admin/blog | session |
| 25 | GET | `/api/admin/blog/analytics` | admin/blog | session |
| 26 | PATCH | `/api/admin/blog/bulk-category` | admin/blog | session |
| 27 | POST | `/api/admin/blog/bulk-delete` | admin/blog | session |
| 28 | POST | `/api/admin/blog/bulk-generate` | admin/blog | session |
| 29 | POST | `/api/admin/blog/bulk-import` | admin/blog | session |
| 30 | PATCH | `/api/admin/blog/bulk-publish` | admin/blog | session |
| 31 | DELETE | `/api/admin/blog/categories` | admin/blog | session |
| 32 | GET | `/api/admin/blog/categories` | admin/blog | session |
| 33 | POST | `/api/admin/blog/categories` | admin/blog | session |
| 34 | GET | `/api/admin/blog/comments` | admin/blog | session |
| 35 | PATCH | `/api/admin/blog/comments` | admin/blog | session |
| 36 | POST | `/api/admin/blog/generate` | admin/blog | session |
| 37 | POST | `/api/admin/blog/import` | admin/blog | session |
| 38 | POST | `/api/admin/blog/schedule-publish` | admin/blog | session |
| 39 | DELETE | `/api/admin/blog/{postId}` | admin/blog | session |
| 40 | PATCH | `/api/admin/blog/{postId}` | admin/blog | session |
| 41 | PUT | `/api/admin/blog/{postId}` | admin/blog | session |
| 42 | GET | `/api/admin/bots` | admin/bots | session |
| 43 | PATCH | `/api/admin/bots` | admin/bots | session |
| 44 | GET | `/api/admin/bots/simulate` | admin/bots | session |
| 45 | POST | `/api/admin/bots/simulate` | admin/bots | session |
| 46 | GET | `/api/admin/bots/simulate-fortune` | admin/bots | session |
| 47 | POST | `/api/admin/bots/simulate-fortune` | admin/bots | session |
| 48 | GET | `/api/admin/bots/simulate-master` | admin/bots | session |
| 49 | POST | `/api/admin/bots/simulate-master` | admin/bots | session |
| 50 | GET | `/api/admin/bots/simulate-social` | admin/bots | session |
| 51 | POST | `/api/admin/bots/simulate-social` | admin/bots | session |
| 52 | DELETE | `/api/admin/broadcast-images` | admin/broadcast-images | session |
| 53 | GET | `/api/admin/broadcast-images` | admin/broadcast-images | session |
| 54 | PATCH | `/api/admin/broadcast-images` | admin/broadcast-images | session |
| 55 | POST | `/api/admin/broadcast-images` | admin/broadcast-images | session |
| 56 | GET | `/api/admin/button-order` | admin/button-order | session |
| 57 | POST | `/api/admin/button-order` | admin/button-order | session |
| 58 | DELETE | `/api/admin/cache` | admin/cache | session |
| 59 | GET | `/api/admin/cache` | admin/cache | session |
| 60 | GET | `/api/admin/cfc-payment-requests` | admin/cfc-payment-requests | session |
| 61 | PATCH | `/api/admin/cfc-payment-requests` | admin/cfc-payment-requests | session |
| 62 | GET | `/api/admin/cfc-settings` | admin/cfc-settings | session |
| 63 | POST | `/api/admin/cfc-settings` | admin/cfc-settings | session |
| 64 | DELETE | `/api/admin/chat-rooms` | admin/chat-rooms | session |
| 65 | GET | `/api/admin/chat-rooms` | admin/chat-rooms | session |
| 66 | POST | `/api/admin/chat-rooms` | admin/chat-rooms | session |
| 67 | PUT | `/api/admin/chat-rooms` | admin/chat-rooms | session |
| 68 | DELETE | `/api/admin/contests` | admin/contests | session |
| 69 | GET | `/api/admin/contests` | admin/contests | session |
| 70 | PATCH | `/api/admin/contests` | admin/contests | session |
| 71 | POST | `/api/admin/contests` | admin/contests | session |
| 72 | GET | `/api/admin/credit-packages` | admin/credit-packages | session |
| 73 | POST | `/api/admin/credit-packages` | admin/credit-packages | session |
| 74 | DELETE | `/api/admin/credit-packages/{packageId}` | admin/credit-packages | session |
| 75 | PATCH | `/api/admin/credit-packages/{packageId}` | admin/credit-packages | session |
| 76 | POST | `/api/admin/credits` | admin/credits | session |
| 77 | GET | `/api/admin/currency-config` | admin/currency-config | session |
| 78 | POST | `/api/admin/currency-config` | admin/currency-config | session |
| 79 | PUT | `/api/admin/currency-config` | admin/currency-config | session |
| 80 | DELETE | `/api/admin/dreams` | admin/dreams | session |
| 81 | GET | `/api/admin/dreams` | admin/dreams | session |
| 82 | POST | `/api/admin/dreams` | admin/dreams | session |
| 83 | PUT | `/api/admin/dreams` | admin/dreams | session |
| 84 | PATCH | `/api/admin/dreams/bulk-category` | admin/dreams | session |
| 85 | POST | `/api/admin/dreams/bulk-delete` | admin/dreams | session |
| 86 | POST | `/api/admin/dreams/bulk-import` | admin/dreams | session |
| 87 | PATCH | `/api/admin/dreams/bulk-publish` | admin/dreams | session |
| 88 | POST | `/api/admin/dreams/generate` | admin/dreams | session |
| 89 | GET | `/api/admin/finance` | admin/finance | session |
| 90 | POST | `/api/admin/finance` | admin/finance | session |
| 91 | DELETE | `/api/admin/fortune-request-types` | admin/fortune-request-types | session |
| 92 | GET | `/api/admin/fortune-request-types` | admin/fortune-request-types | session |
| 93 | PATCH | `/api/admin/fortune-request-types` | admin/fortune-request-types | session |
| 94 | POST | `/api/admin/fortune-request-types` | admin/fortune-request-types | session |
| 95 | GET | `/api/admin/fortunes` | admin/fortunes | session |
| 96 | DELETE | `/api/admin/games` | admin/games | session |
| 97 | GET | `/api/admin/games` | admin/games | session |
| 98 | POST | `/api/admin/games` | admin/games | session |
| 99 | PUT | `/api/admin/games` | admin/games | session |
| 100 | DELETE | `/api/admin/games/rooms` | admin/games | session |
| 101 | GET | `/api/admin/games/rooms` | admin/games | session |
| 102 | GET | `/api/admin/games/settings` | admin/games | session |
| 103 | PUT | `/api/admin/games/settings` | admin/games | session |
| 104 | GET | `/api/admin/gift-collections` | admin/gift-collections | session |
| 105 | PATCH | `/api/admin/gift-collections` | admin/gift-collections | session |
| 106 | POST | `/api/admin/gift-collections` | admin/gift-collections | session |
| 107 | POST | `/api/admin/gift-upload` | admin/gift-upload | session |
| 108 | GET | `/api/admin/gifts` | admin/gifts | session |
| 109 | POST | `/api/admin/gifts` | admin/gifts | session |
| 110 | GET | `/api/admin/gifts/stats` | admin/gifts | session |
| 111 | DELETE | `/api/admin/gifts/{giftId}` | admin/gifts | session |
| 112 | GET | `/api/admin/gifts/{giftId}` | admin/gifts | session |
| 113 | PATCH | `/api/admin/gifts/{giftId}` | admin/gifts | session |
| 114 | DELETE | `/api/admin/homepage-buttons` | admin/homepage-buttons | session |
| 115 | GET | `/api/admin/homepage-buttons` | admin/homepage-buttons | session |
| 116 | PATCH | `/api/admin/homepage-buttons` | admin/homepage-buttons | session |
| 117 | POST | `/api/admin/homepage-buttons` | admin/homepage-buttons | session |
| 118 | DELETE | `/api/admin/homepage-fortune-cards` | admin/homepage-fortune-cards | session |
| 119 | GET | `/api/admin/homepage-fortune-cards` | admin/homepage-fortune-cards | session |
| 120 | PATCH | `/api/admin/homepage-fortune-cards` | admin/homepage-fortune-cards | session |
| 121 | POST | `/api/admin/homepage-fortune-cards` | admin/homepage-fortune-cards | session |
| 122 | PUT | `/api/admin/homepage-fortune-cards` | admin/homepage-fortune-cards | session |
| 123 | GET | `/api/admin/live-tellers` | admin/live-tellers | session |
| 124 | POST | `/api/admin/live-tellers` | admin/live-tellers | session |
| 125 | DELETE | `/api/admin/live-tellers/{tellerId}` | admin/live-tellers | session |
| 126 | GET | `/api/admin/live-tellers/{tellerId}` | admin/live-tellers | session |
| 127 | PUT | `/api/admin/live-tellers/{tellerId}` | admin/live-tellers | session |
| 128 | POST | `/api/admin/live-tellers/{tellerId}/approve` | admin/live-tellers | session |
| 129 | POST | `/api/admin/live-tellers/{tellerId}/ban` | admin/live-tellers | session |
| 130 | POST | `/api/admin/live-tellers/{tellerId}/bonus` | admin/live-tellers | session |
| 131 | POST | `/api/admin/live-tellers/{tellerId}/freeze` | admin/live-tellers | session |
| 132 | PUT | `/api/admin/live-tellers/{tellerId}/permissions` | admin/live-tellers | session |
| 133 | DELETE | `/api/admin/live-tellers/{tellerId}/warning` | admin/live-tellers | session |
| 134 | POST | `/api/admin/live-tellers/{tellerId}/warning` | admin/live-tellers | session |
| 135 | DELETE | `/api/admin/lucky-gifts/tiers` | admin/lucky-gifts | session |
| 136 | GET | `/api/admin/lucky-gifts/tiers` | admin/lucky-gifts | session |
| 137 | PATCH | `/api/admin/lucky-gifts/tiers` | admin/lucky-gifts | session |
| 138 | POST | `/api/admin/lucky-gifts/tiers` | admin/lucky-gifts | session |
| 139 | DELETE | `/api/admin/membership-badges` | admin/membership-badges | session |
| 140 | GET | `/api/admin/membership-badges` | admin/membership-badges | session |
| 141 | PATCH | `/api/admin/membership-badges` | admin/membership-badges | session |
| 142 | POST | `/api/admin/membership-badges` | admin/membership-badges | session |
| 143 | DELETE | `/api/admin/memberships` | admin/memberships | session |
| 144 | GET | `/api/admin/memberships` | admin/memberships | session |
| 145 | POST | `/api/admin/memberships` | admin/memberships | session |
| 146 | PUT | `/api/admin/memberships` | admin/memberships | session |
| 147 | GET | `/api/admin/memberships/purchases` | admin/memberships | session |
| 148 | PATCH | `/api/admin/memberships/purchases` | admin/memberships | session |
| 149 | POST | `/api/admin/memberships/purchases` | admin/memberships | session |
| 150 | GET | `/api/admin/moderation` | admin/moderation | session |
| 151 | POST | `/api/admin/moderation` | admin/moderation | session |
| 152 | DELETE | `/api/admin/notifications` | admin/notifications | session |
| 153 | GET | `/api/admin/notifications` | admin/notifications | session |
| 154 | POST | `/api/admin/notifications` | admin/notifications | session |
| 155 | DELETE | `/api/admin/online-fal/buttons` | admin/online-fal | session |
| 156 | GET | `/api/admin/online-fal/buttons` | admin/online-fal | session |
| 157 | PATCH | `/api/admin/online-fal/buttons` | admin/online-fal | session |
| 158 | POST | `/api/admin/online-fal/buttons` | admin/online-fal | session |
| 159 | GET | `/api/admin/online-fal/sections` | admin/online-fal | session |
| 160 | PATCH | `/api/admin/online-fal/sections` | admin/online-fal | session |
| 161 | POST | `/api/admin/online-fal/sections` | admin/online-fal | session |
| 162 | GET | `/api/admin/payment-methods` | admin/payment-methods | session |
| 163 | POST | `/api/admin/payment-methods` | admin/payment-methods | session |
| 164 | GET | `/api/admin/payments` | admin/payments | session |
| 165 | PATCH | `/api/admin/payments` | admin/payments | session |
| 166 | POST | `/api/admin/payments` | admin/payments | session |
| 167 | GET | `/api/admin/pending-counts` | admin/pending-counts | session |
| 168 | DELETE | `/api/admin/popups` | admin/popups | session |
| 169 | GET | `/api/admin/popups` | admin/popups | session |
| 170 | POST | `/api/admin/popups` | admin/popups | session |
| 171 | PUT | `/api/admin/popups` | admin/popups | session |
| 172 | DELETE | `/api/admin/profile-frames` | admin/profile-frames | session |
| 173 | GET | `/api/admin/profile-frames` | admin/profile-frames | session |
| 174 | POST | `/api/admin/profile-frames` | admin/profile-frames | session |
| 175 | POST | `/api/admin/profile-frames/assign` | admin/profile-frames | session |
| 176 | GET | `/api/admin/room-themes/backgrounds` | admin/room-themes | session |
| 177 | PATCH | `/api/admin/room-themes/backgrounds` | admin/room-themes | session |
| 178 | POST | `/api/admin/room-themes/backgrounds` | admin/room-themes | session |
| 179 | GET | `/api/admin/rooms` | admin/rooms | session |
| 180 | PATCH | `/api/admin/rooms` | admin/rooms | session |
| 181 | GET | `/api/admin/seo-settings` | admin/seo-settings | session |
| 182 | POST | `/api/admin/seo-settings` | admin/seo-settings | session |
| 183 | GET | `/api/admin/settings` | admin/settings | session |
| 184 | POST | `/api/admin/settings` | admin/settings | session |
| 185 | DELETE | `/api/admin/site-pages` | admin/site-pages | session |
| 186 | GET | `/api/admin/site-pages` | admin/site-pages | session |
| 187 | POST | `/api/admin/site-pages` | admin/site-pages | session |
| 188 | PUT | `/api/admin/site-pages` | admin/site-pages | session |
| 189 | GET | `/api/admin/statistics` | admin/statistics | session |
| 190 | POST | `/api/admin/teller-levels` | admin/teller-levels | session |
| 191 | GET | `/api/admin/teller-performance` | admin/teller-performance | session |
| 192 | GET | `/api/admin/teller-verification` | admin/teller-verification | session |
| 193 | POST | `/api/admin/teller-verification` | admin/teller-verification | session |
| 194 | GET | `/api/admin/ticker-messages` | admin/ticker-messages | session |
| 195 | POST | `/api/admin/ticker-messages` | admin/ticker-messages | session |
| 196 | DELETE | `/api/admin/ticker-messages/{messageId}` | admin/ticker-messages | session |
| 197 | PATCH | `/api/admin/ticker-messages/{messageId}` | admin/ticker-messages | session |
| 198 | DELETE | `/api/admin/tiktok-categories` | admin/tiktok-categories | session |
| 199 | GET | `/api/admin/tiktok-categories` | admin/tiktok-categories | session |
| 200 | PATCH | `/api/admin/tiktok-categories` | admin/tiktok-categories | session |
| 201 | POST | `/api/admin/tiktok-categories` | admin/tiktok-categories | session |
| 202 | DELETE | `/api/admin/tiktok-videos` | admin/tiktok-videos | session |
| 203 | GET | `/api/admin/tiktok-videos` | admin/tiktok-videos | session |
| 204 | PATCH | `/api/admin/tiktok-videos` | admin/tiktok-videos | session |
| 205 | POST | `/api/admin/tiktok-videos` | admin/tiktok-videos | session |
| 206 | PUT | `/api/admin/tiktok-videos` | admin/tiktok-videos | session |
| 207 | GET | `/api/admin/trend-videos` | admin/trend-videos | session |
| 208 | POST | `/api/admin/trend-videos` | admin/trend-videos | session |
| 209 | POST | `/api/admin/trend-videos/youtube` | admin/trend-videos | session |
| 210 | DELETE | `/api/admin/trends` | admin/trends | session |
| 211 | GET | `/api/admin/trends` | admin/trends | session |
| 212 | POST | `/api/admin/trends` | admin/trends | session |
| 213 | GET | `/api/admin/users` | admin/users | session |
| 214 | GET | `/api/admin/users/search` | admin/users | session |
| 215 | POST | `/api/admin/users/withdrawal-limit` | admin/users | session |
| 216 | DELETE | `/api/admin/users/{userId}` | admin/users | session |
| 217 | GET | `/api/admin/users/{userId}` | admin/users | session |
| 218 | PATCH | `/api/admin/users/{userId}` | admin/users | session |
| 219 | DELETE | `/api/admin/video-streams` | admin/video-streams | session |
| 220 | GET | `/api/admin/video-streams` | admin/video-streams | session |
| 221 | PATCH | `/api/admin/video-streams` | admin/video-streams | session |
| 222 | GET | `/api/admin/visitor-stats` | admin/visitor-stats | session |
| 223 | GET | `/api/admin/withdrawals` | admin/withdrawals | session |
| 224 | POST | `/api/admin/withdrawals` | admin/withdrawals | session |
| 225 | GET | `/api/ads/active` | ads | public |
| 226 | POST | `/api/ads/reward` | ads | dual |
| 227 | POST | `/api/agency/apply` | agency | dual |
| 228 | GET | `/api/agency/earnings` | agency | dual |
| 229 | GET | `/api/agency/invite` | agency | dual |
| 230 | POST | `/api/agency/invite` | agency | dual |
| 231 | POST | `/api/agency/join` | agency | dual |
| 232 | GET | `/api/agency/leaderboard` | agency | public |
| 233 | DELETE | `/api/agency/leave` | agency | dual |
| 234 | POST | `/api/agency/leave` | agency | dual |
| 235 | DELETE | `/api/agency/members` | agency | dual |
| 236 | GET | `/api/agency/members` | agency | dual |
| 237 | POST | `/api/agency/members` | agency | dual |
| 238 | GET | `/api/agency/my` | agency | dual |
| 239 | PATCH | `/api/agency/my` | agency | dual |
| 240 | GET | `/api/agency/tasks` | agency | dual |
| 241 | GET | `/api/agency/withdrawals` | agency | dual |
| 242 | POST | `/api/agency/withdrawals` | agency | dual |
| 243 | GET | `/api/announcements` | announcements | dual |
| 244 | POST | `/api/announcements` | announcements | dual |
| 245 | POST | `/api/announcements/event` | announcements | dual |
| 246 | GET | `/api/anonymous` | anonymous | public |
| 247 | POST | `/api/anonymous` | anonymous | public |
| 248 | POST | `/api/anonymous/watch-ad` | anonymous | public |
| 249 | GET | `/api/astrology-panel` | astrology-panel | dual |
| 250 | POST | `/api/auth/change-password` | auth | dual |
| 251 | POST | `/api/auth/forgot-password` | auth | public |
| 252 | POST | `/api/auth/logout` | auth | dual |
| 253 | POST | `/api/auth/mobile-apple` | auth | public |
| 254 | POST | `/api/auth/mobile-google` | auth | public |
| 255 | POST | `/api/auth/mobile-login` | auth | public |
| 256 | POST | `/api/auth/mobile-refresh` | auth | public |
| 257 | POST | `/api/auth/mobile-register` | auth | public |
| 258 | POST | `/api/auth/mobile-tiktok` | auth | public |
| 259 | POST | `/api/auth/reclaim-device` | auth | session |
| 260 | POST | `/api/auth/reset-password` | auth | public |
| 261 | GET | `/api/auth/verify-device` | auth | session |
| 262 | GET | `/api/auth/{nextauth}` | auth | public |
| 263 | POST | `/api/auth/{nextauth}` | auth | public |
| 264 | GET | `/api/bana-ozel` | bana-ozel | dual |
| 265 | POST | `/api/bana-ozel/open` | bana-ozel | dual |
| 266 | GET | `/api/blog` | blog | public |
| 267 | GET | `/api/blog/categories` | blog | public |
| 268 | DELETE | `/api/blog/comments` | blog | dual |
| 269 | GET | `/api/blog/comments` | blog | dual |
| 270 | POST | `/api/blog/comments` | blog | dual |
| 271 | POST | `/api/blog/favorite` | blog | dual |
| 272 | GET | `/api/blog/interactions` | blog | dual |
| 273 | POST | `/api/blog/like` | blog | dual |
| 274 | GET | `/api/blog/related` | blog | public |
| 275 | GET | `/api/blog/zodiac` | blog | public |
| 276 | GET | `/api/broadcast-images` | broadcast-images | dual |
| 277 | GET | `/api/cache` | cache | dual |
| 278 | POST | `/api/cache` | cache | dual |
| 279 | GET | `/api/chat/broadcast-images` | chat | public |
| 280 | DELETE | `/api/chat/cleanup` | chat | public |
| 281 | GET | `/api/chat/cleanup` | chat | public |
| 282 | POST | `/api/chat/cleanup` | chat | public |
| 283 | GET | `/api/chat/rooms` | chat | public |
| 284 | GET | `/api/chat/rooms/backgrounds` | chat | public |
| 285 | POST | `/api/chat/rooms/create` | chat | dual |
| 286 | GET | `/api/chat/rooms/pk-list` | chat | public |
| 287 | GET | `/api/chat/rooms/{roomId}/dj` | chat | dual |
| 288 | POST | `/api/chat/rooms/{roomId}/dj` | chat | dual |
| 289 | GET | `/api/chat/rooms/{roomId}/gifts` | chat | dual |
| 290 | POST | `/api/chat/rooms/{roomId}/gifts` | chat | dual |
| 291 | DELETE | `/api/chat/rooms/{roomId}/messages` | chat | dual |
| 292 | GET | `/api/chat/rooms/{roomId}/messages` | chat | dual |
| 293 | POST | `/api/chat/rooms/{roomId}/messages` | chat | dual |
| 294 | GET | `/api/chat/rooms/{roomId}/moderation` | chat | dual |
| 295 | POST | `/api/chat/rooms/{roomId}/moderation` | chat | dual |
| 296 | DELETE | `/api/chat/rooms/{roomId}/music` | chat | dual |
| 297 | GET | `/api/chat/rooms/{roomId}/music` | chat | dual |
| 298 | POST | `/api/chat/rooms/{roomId}/music` | chat | dual |
| 299 | GET | `/api/chat/rooms/{roomId}/music-queue` | chat | dual |
| 300 | POST | `/api/chat/rooms/{roomId}/music/stop` | chat | dual |
| 301 | GET | `/api/chat/rooms/{roomId}/pk` | chat | dual |
| 302 | POST | `/api/chat/rooms/{roomId}/pk` | chat | dual |
| 303 | POST | `/api/chat/rooms/{roomId}/pk/score` | chat | dual |
| 304 | DELETE | `/api/chat/rooms/{roomId}/presence` | chat | dual |
| 305 | GET | `/api/chat/rooms/{roomId}/presence` | chat | dual |
| 306 | POST | `/api/chat/rooms/{roomId}/presence` | chat | dual |
| 307 | GET | `/api/chat/rooms/{roomId}/seats` | chat | dual |
| 308 | PATCH | `/api/chat/rooms/{roomId}/seats` | chat | dual |
| 309 | GET | `/api/chat/rooms/{roomId}/settings` | chat | dual |
| 310 | PATCH | `/api/chat/rooms/{roomId}/settings` | chat | dual |
| 311 | GET | `/api/chat/rooms/{roomId}/song-request` | chat | dual |
| 312 | PATCH | `/api/chat/rooms/{roomId}/song-request` | chat | dual |
| 313 | POST | `/api/chat/rooms/{roomId}/song-request` | chat | dual |
| 314 | GET | `/api/chat/rooms/{roomId}/state` | chat | dual |
| 315 | GET | `/api/chat/rooms/{roomId}/stream` | chat | dual |
| 316 | POST | `/api/chat/rooms/{roomId}/transfer-ownership` | chat | dual |
| 317 | GET | `/api/chat/rooms/{roomId}/typing` | chat | dual |
| 318 | POST | `/api/chat/rooms/{roomId}/typing` | chat | dual |
| 319 | GET | `/api/chat/rooms/{roomId}/voice` | chat | dual |
| 320 | POST | `/api/chat/rooms/{roomId}/voice` | chat | dual |
| 321 | GET | `/api/chat/youtube-stream` | chat | public |
| 322 | POST | `/api/compatibility` | compatibility | public |
| 323 | POST | `/api/contact` | contact | public |
| 324 | GET | `/api/credit-packages` | credit-packages | public |
| 325 | GET | `/api/daily-login` | daily-login | dual |
| 326 | POST | `/api/daily-login` | daily-login | dual |
| 327 | GET | `/api/daily-missions` | daily-missions | dual |
| 328 | POST | `/api/daily-missions` | daily-missions | dual |
| 329 | DELETE | `/api/devices/fcm` | devices | dual |
| 330 | POST | `/api/devices/fcm` | devices | dual |
| 331 | GET | `/api/dream-contest` | dream-contest | dual |
| 332 | GET | `/api/dream-contest/{contestId}/entries` | dream-contest | dual |
| 333 | POST | `/api/dream-contest/{contestId}/entries` | dream-contest | dual |
| 334 | POST | `/api/dream-contest/{contestId}/vote` | dream-contest | dual |
| 335 | DELETE | `/api/dream-diary` | dream-diary | dual |
| 336 | GET | `/api/dream-diary` | dream-diary | dual |
| 337 | POST | `/api/dream-diary` | dream-diary | dual |
| 338 | GET | `/api/dream-stats` | dream-stats | dual |
| 339 | GET | `/api/dream-symbols` | dream-symbols | public |
| 340 | GET | `/api/dream-symbols/{slug}` | dream-symbols | public |
| 341 | GET | `/api/dreams` | dreams | public |
| 342 | GET | `/api/dreams/favorites` | dreams | dual |
| 343 | POST | `/api/dreams/generate` | dreams | public |
| 344 | POST | `/api/dreams/interpret` | dreams | dual |
| 345 | POST | `/api/dreams/morning-reminder` | dreams | public |
| 346 | GET | `/api/dreams/recommendations` | dreams | dual |
| 347 | GET | `/api/dreams/trends` | dreams | public |
| 348 | GET | `/api/dreams/{slug}` | dreams | public |
| 349 | DELETE | `/api/dreams/{slug}/comments` | dreams | dual |
| 350 | GET | `/api/dreams/{slug}/comments` | dreams | dual |
| 351 | POST | `/api/dreams/{slug}/comments` | dreams | dual |
| 352 | GET | `/api/dreams/{slug}/favorite` | dreams | dual |
| 353 | POST | `/api/dreams/{slug}/favorite` | dreams | dual |
| 354 | POST | `/api/dreams/{slug}/view` | dreams | dual |
| 355 | GET | `/api/favorite-tellers` | favorite-tellers | dual |
| 356 | POST | `/api/favorite-tellers` | favorite-tellers | dual |
| 357 | GET | `/api/football` | football | public |
| 358 | POST | `/api/fortune-access/check` | fortune-access | dual |
| 359 | GET | `/api/fortune-access/ip-status` | fortune-access | public |
| 360 | GET | `/api/fortune-request-types` | fortune-request-types | public |
| 361 | GET | `/api/fortune-tellers` | fortune-tellers | dual |
| 362 | POST | `/api/fortune-tellers` | fortune-tellers | dual |
| 363 | POST | `/api/fortune-tellers/apply` | fortune-tellers | dual |
| 364 | GET | `/api/fortune-tellers/awards` | fortune-tellers | public |
| 365 | GET | `/api/fortune-tellers/gifts` | fortune-tellers | public |
| 366 | GET | `/api/fortune-tellers/my-profile` | fortune-tellers | dual |
| 367 | GET | `/api/fortune-tellers/session` | fortune-tellers | dual |
| 368 | POST | `/api/fortune-tellers/session` | fortune-tellers | dual |
| 369 | GET | `/api/fortune-tellers/sessions` | fortune-tellers | dual |
| 370 | GET | `/api/fortune-tellers/sessions/stream` | fortune-tellers | dual |
| 371 | PATCH | `/api/fortune-tellers/sessions/{sessionId}` | fortune-tellers | dual |
| 372 | GET | `/api/fortune-tellers/toggle-online` | fortune-tellers | dual |
| 373 | POST | `/api/fortune-tellers/toggle-online` | fortune-tellers | dual |
| 374 | GET | `/api/fortune-tellers/{tellerId}` | fortune-tellers | dual |
| 375 | PATCH | `/api/fortune-tellers/{tellerId}` | fortune-tellers | dual |
| 376 | GET | `/api/fortune-tellers/{tellerId}/reviews` | fortune-tellers | public |
| 377 | GET | `/api/fortune-tellers/{tellerId}/session` | fortune-tellers | dual |
| 378 | POST | `/api/fortune-tellers/{tellerId}/session` | fortune-tellers | dual |
| 379 | POST | `/api/fortunes/ask-uyumu` | fortunes | dual |
| 380 | POST | `/api/fortunes/aura-analizi` | fortunes | dual |
| 381 | POST | `/api/fortunes/burc-yorumu` | fortunes | dual |
| 382 | POST | `/api/fortunes/dogum-haritasi` | fortunes | dual |
| 383 | POST | `/api/fortunes/el-fali` | fortunes | dual |
| 384 | POST | `/api/fortunes/evet-hayir` | fortunes | dual |
| 385 | POST | `/api/fortunes/istihare` | fortunes | dual |
| 386 | POST | `/api/fortunes/kahve-fali` | fortunes | dual |
| 387 | POST | `/api/fortunes/kahve-fali-image` | fortunes | dual |
| 388 | POST | `/api/fortunes/katina` | fortunes | dual |
| 389 | POST | `/api/fortunes/kursundokme` | fortunes | dual |
| 390 | POST | `/api/fortunes/melek-kartlari` | fortunes | dual |
| 391 | POST | `/api/fortunes/numeroloji` | fortunes | dual |
| 392 | POST | `/api/fortunes/ruya-yorumu` | fortunes | dual |
| 393 | POST | `/api/fortunes/tarot-fali` | fortunes | dual |
| 394 | GET | `/api/games` | games | public |
| 395 | GET | `/api/games/daily-reward` | games | dual |
| 396 | POST | `/api/games/daily-reward` | games | dual |
| 397 | POST | `/api/games/daily-spin` | games | dual |
| 398 | GET | `/api/games/grid-settings` | games | public |
| 399 | GET | `/api/games/lamba-cini` | games | dual |
| 400 | POST | `/api/games/lamba-cini` | games | dual |
| 401 | GET | `/api/games/leaderboard` | games | dual |
| 402 | GET | `/api/games/lobby` | games | dual |
| 403 | POST | `/api/games/play` | games | dual |
| 404 | GET | `/api/games/profile` | games | dual |
| 405 | GET | `/api/games/quests` | games | dual |
| 406 | POST | `/api/games/quests` | games | dual |
| 407 | GET | `/api/games/room` | games | dual |
| 408 | POST | `/api/games/room` | games | dual |
| 409 | DELETE | `/api/games/room/{roomId}` | games | dual |
| 410 | GET | `/api/games/room/{roomId}` | games | dual |
| 411 | PATCH | `/api/games/room/{roomId}` | games | dual |
| 412 | POST | `/api/games/room/{roomId}` | games | dual |
| 413 | GET | `/api/games/room/{roomId}/chat` | games | dual |
| 414 | PATCH | `/api/games/room/{roomId}/chat` | games | dual |
| 415 | POST | `/api/games/room/{roomId}/chat` | games | dual |
| 416 | POST | `/api/games/room/{roomId}/replace-ai` | games | dual |
| 417 | DELETE | `/api/games/room/{roomId}/viewers` | games | dual |
| 418 | GET | `/api/games/room/{roomId}/viewers` | games | dual |
| 419 | POST | `/api/games/room/{roomId}/viewers` | games | dual |
| 420 | GET | `/api/games/sos` | games | dual |
| 421 | POST | `/api/games/sos` | games | dual |
| 422 | DELETE | `/api/games/sos/{gameId}` | games | dual |
| 423 | GET | `/api/games/sos/{gameId}` | games | dual |
| 424 | PATCH | `/api/games/sos/{gameId}` | games | dual |
| 425 | POST | `/api/games/sos/{gameId}` | games | dual |
| 426 | GET | `/api/games/sos/{gameId}/chat` | games | dual |
| 427 | PATCH | `/api/games/sos/{gameId}/chat` | games | dual |
| 428 | POST | `/api/games/sos/{gameId}/chat` | games | dual |
| 429 | DELETE | `/api/games/sos/{gameId}/viewers` | games | dual |
| 430 | GET | `/api/games/sos/{gameId}/viewers` | games | dual |
| 431 | POST | `/api/games/sos/{gameId}/viewers` | games | dual |
| 432 | POST | `/api/gift-engine/finish` | gift-engine | dual |
| 433 | GET | `/api/gift-engine/gifts` | gift-engine | public |
| 434 | GET | `/api/gift-engine/queue` | gift-engine | public |
| 435 | GET | `/api/gifts/catalog` | gifts | dual |
| 436 | POST | `/api/gifts/check-reciprocal` | gifts | dual |
| 437 | GET | `/api/gifts/lucky/config` | gifts | dual |
| 438 | GET | `/api/gifts/lucky/history` | gifts | dual |
| 439 | POST | `/api/gifts/lucky/send` | gifts | dual |
| 440 | GET | `/api/gifts/recent-big` | gifts | public |
| 441 | POST | `/api/gifts/send` | gifts | dual |
| 442 | GET | `/api/gifts/types` | gifts | public |
| 443 | GET | `/api/gifts/version` | gifts | public |
| 444 | GET | `/api/hashtags/search` | hashtags | public |
| 445 | GET | `/api/hashtags/trending` | hashtags | public |
| 446 | GET | `/api/hashtags/{name}` | hashtags | dual |
| 447 | GET | `/api/homepage-buttons` | homepage-buttons | public |
| 448 | GET | `/api/homepage-fortune-cards` | homepage-fortune-cards | public |
| 449 | GET | `/api/homepage-ticker` | homepage-ticker | public |
| 450 | GET | `/api/horoscope/daily` | horoscope | dual |
| 451 | GET | `/api/jeton` | jeton | dual |
| 452 | POST | `/api/jeton` | jeton | dual |
| 453 | GET | `/api/leaderboards` | leaderboards | dual |
| 454 | GET | `/api/legal/child-safety` | legal | public |
| 455 | POST | `/api/live/create-room` | live | dual |
| 456 | GET | `/api/live/gift-types` | live | dual |
| 457 | POST | `/api/live/gift/send` | live | dual |
| 458 | POST | `/api/live/heartbeat` | live | dual |
| 459 | POST | `/api/live/join-room` | live | dual |
| 460 | POST | `/api/live/leave-room` | live | dual |
| 461 | GET | `/api/live/message` | live | dual |
| 462 | POST | `/api/live/message` | live | dual |
| 463 | GET | `/api/live/online-users` | live | dual |
| 464 | GET | `/api/live/pk` | live | dual |
| 465 | POST | `/api/live/pk` | live | dual |
| 466 | POST | `/api/live/pk/score` | live | dual |
| 467 | GET | `/api/live/rooms` | live | dual |
| 468 | GET | `/api/live/seats` | live | dual |
| 469 | POST | `/api/live/seats` | live | dual |
| 470 | GET | `/api/me` | me | dual |
| 471 | PATCH | `/api/me` | me | dual |
| 472 | GET | `/api/membership-badges` | membership-badges | public |
| 473 | GET | `/api/memberships` | memberships | public |
| 474 | GET | `/api/memberships/packages` | memberships | public |
| 475 | POST | `/api/memberships/purchase` | memberships | dual |
| 476 | GET | `/api/messages` | messages | dual |
| 477 | PATCH | `/api/messages/request` | messages | dual |
| 478 | POST | `/api/messages/request` | messages | dual |
| 479 | GET | `/api/messages/{userId}` | messages | dual |
| 480 | POST | `/api/messages/{userId}` | messages | dual |
| 481 | GET | `/api/mobile/config` | mobile | public |
| 482 | GET | `/api/mobile/fortune-menu` | mobile | dual |
| 483 | GET | `/api/mobile/home` | mobile | dual |
| 484 | GET | `/api/mobile/user-profile/{userId}` | mobile | dual |
| 485 | GET | `/api/monitoring` | monitoring | session |
| 486 | GET | `/api/music/history` | music | public |
| 487 | GET | `/api/music/search` | music | dual |
| 488 | DELETE | `/api/notifications` | notifications | dual |
| 489 | GET | `/api/notifications` | notifications | dual |
| 490 | POST | `/api/notifications` | notifications | dual |
| 491 | GET | `/api/notifications/stream` | notifications | dual |
| 492 | GET | `/api/online-fal` | online-fal | public |
| 493 | GET | `/api/payments/config` | payments | dual |
| 494 | GET | `/api/payments/methods` | payments | public |
| 495 | GET | `/api/payments/notify` | payments | dual |
| 496 | POST | `/api/payments/notify` | payments | dual |
| 497 | GET | `/api/payments/requests` | payments | dual |
| 498 | POST | `/api/payments/requests` | payments | dual |
| 499 | GET | `/api/payments/settings` | payments | public |
| 500 | GET | `/api/platform/commission-rate` | platform | public |
| 501 | GET | `/api/popups` | popups | dual |
| 502 | GET | `/api/presence` | presence | dual |
| 503 | POST | `/api/presence` | presence | dual |
| 504 | GET | `/api/presence/sections` | presence | public |
| 505 | GET | `/api/profile-frames` | profile-frames | dual |
| 506 | POST | `/api/profile-frames` | profile-frames | dual |
| 507 | GET | `/api/public/announcement-settings` | public | public |
| 508 | GET | `/api/public/jeton-price` | public | public |
| 509 | GET | `/api/public-stats` | public-stats | public |
| 510 | GET | `/api/referral` | referral | dual |
| 511 | GET | `/api/referral/validate` | referral | public |
| 512 | DELETE | `/api/room/signal` | room | dual |
| 513 | GET | `/api/room/signal` | room | dual |
| 514 | POST | `/api/room/signal` | room | dual |
| 515 | GET | `/api/room/{sessionId}` | room | dual |
| 516 | PATCH | `/api/room/{sessionId}` | room | dual |
| 517 | GET | `/api/room/{sessionId}/messages` | room | dual |
| 518 | POST | `/api/room/{sessionId}/messages` | room | dual |
| 519 | GET | `/api/room/{sessionId}/review` | room | dual |
| 520 | POST | `/api/room/{sessionId}/review` | room | dual |
| 521 | GET | `/api/room/{sessionId}/stream` | room | dual |
| 522 | GET | `/api/room/{sessionId}/summary` | room | dual |
| 523 | POST | `/api/room/{sessionId}/tip` | room | dual |
| 524 | GET | `/api/room-themes/catalog` | room-themes | dual |
| 525 | GET | `/api/search` | search | public |
| 526 | GET | `/api/search/advanced` | search | dual |
| 527 | GET | `/api/seo-settings` | seo-settings | public |
| 528 | GET | `/api/settings/ads` | settings | public |
| 529 | GET | `/api/settings/canlidark-hero` | settings | public |
| 530 | GET | `/api/settings/public` | settings | public |
| 531 | GET | `/api/settings/themes` | settings | public |
| 532 | GET | `/api/share-card` | share-card | dual |
| 533 | GET | `/api/short-videos` | short-videos | dual |
| 534 | GET | `/api/short-videos/explore` | short-videos | dual |
| 535 | GET | `/api/short-videos/mentions/search` | short-videos | public |
| 536 | GET | `/api/short-videos/music` | short-videos | public |
| 537 | GET | `/api/short-videos/profile/{userId}` | short-videos | dual |
| 538 | POST | `/api/short-videos/register` | short-videos | dual |
| 539 | POST | `/api/short-videos/upload` | short-videos | dual |
| 540 | POST | `/api/short-videos/upload-url` | short-videos | dual |
| 541 | GET | `/api/short-videos/user/{userId}` | short-videos | dual |
| 542 | DELETE | `/api/short-videos/{id}` | short-videos | dual |
| 543 | GET | `/api/short-videos/{id}` | short-videos | dual |
| 544 | GET | `/api/short-videos/{id}/comments` | short-videos | dual |
| 545 | POST | `/api/short-videos/{id}/comments` | short-videos | dual |
| 546 | DELETE | `/api/short-videos/{id}/comments/{commentId}` | short-videos | dual |
| 547 | POST | `/api/short-videos/{id}/comments/{commentId}/like` | short-videos | dual |
| 548 | POST | `/api/short-videos/{id}/comments/{commentId}/pin` | short-videos | dual |
| 549 | GET | `/api/short-videos/{id}/duets` | short-videos | dual |
| 550 | POST | `/api/short-videos/{id}/like` | short-videos | dual |
| 551 | POST | `/api/short-videos/{id}/save` | short-videos | dual |
| 552 | POST | `/api/short-videos/{id}/share` | short-videos | dual |
| 553 | POST | `/api/short-videos/{id}/view` | short-videos | dual |
| 554 | POST | `/api/signup` | signup | public |
| 555 | GET | `/api/site-pages/{slug}` | site-pages | public |
| 556 | GET | `/api/social/posts` | social | dual |
| 557 | POST | `/api/social/posts` | social | dual |
| 558 | DELETE | `/api/social/posts/{postId}` | social | dual |
| 559 | GET | `/api/social/posts/{postId}` | social | dual |
| 560 | DELETE | `/api/social/posts/{postId}/comments` | social | dual |
| 561 | GET | `/api/social/posts/{postId}/comments` | social | dual |
| 562 | POST | `/api/social/posts/{postId}/comments` | social | dual |
| 563 | POST | `/api/social/posts/{postId}/likes` | social | dual |
| 564 | POST | `/api/social/posts/{postId}/view` | social | public |
| 565 | DELETE | `/api/stories` | stories | dual |
| 566 | GET | `/api/stories` | stories | dual |
| 567 | POST | `/api/stories` | stories | dual |
| 568 | GET | `/api/teller/analytics` | teller | dual |
| 569 | GET | `/api/teller/level` | teller | dual |
| 570 | GET | `/api/teller/verification` | teller | dual |
| 571 | POST | `/api/teller/verification` | teller | dual |
| 572 | GET | `/api/teller-chat` | teller-chat | dual |
| 573 | GET | `/api/teller-chat/{sessionId}` | teller-chat | dual |
| 574 | POST | `/api/teller-chat/{sessionId}` | teller-chat | dual |
| 575 | POST | `/api/tencent/webhook` | tencent | public |
| 576 | GET | `/api/tiktok-videos` | tiktok-videos | public |
| 577 | GET | `/api/tiktok-videos/oembed` | tiktok-videos | public |
| 578 | GET | `/api/tiktok-videos/{id}` | tiktok-videos | public |
| 579 | GET | `/api/tmdb` | tmdb | public |
| 580 | GET | `/api/tournaments` | tournaments | dual |
| 581 | GET | `/api/translations` | translations | public |
| 582 | GET | `/api/trend-videos` | trend-videos | public |
| 583 | POST | `/api/trend-videos` | trend-videos | public |
| 584 | GET | `/api/trends` | trends | public |
| 585 | GET | `/api/trends/{slug}` | trends | public |
| 586 | POST | `/api/trends/{slug}/like` | trends | dual |
| 587 | POST | `/api/trtc/token` | trtc | dual |
| 588 | POST | `/api/trtc/usersig` | trtc | dual |
| 589 | POST | `/api/trtc/webhook` | trtc | public |
| 590 | GET | `/api/upload/get-url` | upload | dual |
| 591 | POST | `/api/upload/get-url` | upload | dual |
| 592 | POST | `/api/upload/presigned` | upload | dual |
| 593 | GET | `/api/user/achievements` | user | dual |
| 594 | GET | `/api/user/active-sessions` | user | dual |
| 595 | GET | `/api/user/activity` | user | dual |
| 596 | PATCH | `/api/user/activity` | user | dual |
| 597 | GET | `/api/user/block` | user | dual |
| 598 | POST | `/api/user/block` | user | dual |
| 599 | DELETE | `/api/user/blocked` | user | dual |
| 600 | GET | `/api/user/blocked` | user | dual |
| 601 | GET | `/api/user/broadcast-history` | user | dual |
| 602 | GET | `/api/user/co-broadcast-invites` | user | dual |
| 603 | GET | `/api/user/credits` | user | dual |
| 604 | GET | `/api/user/followers` | user | dual |
| 605 | GET | `/api/user/following` | user | dual |
| 606 | GET | `/api/user/fortunes` | user | dual |
| 607 | PATCH | `/api/user/fortunes/{fortuneId}` | user | dual |
| 608 | GET | `/api/user/likers` | user | dual |
| 609 | GET | `/api/user/profile` | user | dual |
| 610 | PATCH | `/api/user/profile` | user | dual |
| 611 | GET | `/api/user/received-gifts` | user | dual |
| 612 | POST | `/api/user/report` | user | dual |
| 613 | GET | `/api/user/statistics` | user | dual |
| 614 | GET | `/api/user/stats` | user | dual |
| 615 | POST | `/api/user/stats` | user | dual |
| 616 | GET | `/api/user/theme` | user | dual |
| 617 | PATCH | `/api/user/theme` | user | dual |
| 618 | GET | `/api/user/watch-ad` | user | dual |
| 619 | POST | `/api/user/watch-ad` | user | dual |
| 620 | GET | `/api/user/xp` | user | dual |
| 621 | GET | `/api/user/{userId}/achievements` | user | dual |
| 622 | DELETE | `/api/user/{userId}/follow` | user | dual |
| 623 | POST | `/api/user/{userId}/follow` | user | dual |
| 624 | GET | `/api/user/{userId}/follow-status` | user | dual |
| 625 | GET | `/api/users/lookup/{username}` | users | dual |
| 626 | GET | `/api/users/online` | users | public |
| 627 | GET | `/api/users/search` | users | dual |
| 628 | GET | `/api/users/{userId}` | users | dual |
| 629 | GET | `/api/users/{userId}/follow` | users | dual |
| 630 | POST | `/api/users/{userId}/follow` | users | dual |
| 631 | GET | `/api/users/{userId}/posts` | users | dual |
| 632 | GET | `/api/video-streams` | video-streams | dual |
| 633 | POST | `/api/video-streams` | video-streams | dual |
| 634 | GET | `/api/video-streams/gifts` | video-streams | dual |
| 635 | GET | `/api/video-streams/pk` | video-streams | dual |
| 636 | POST | `/api/video-streams/pk` | video-streams | dual |
| 637 | GET | `/api/video-streams/pk/list` | video-streams | public |
| 638 | POST | `/api/video-streams/pk/score` | video-streams | public |
| 639 | DELETE | `/api/video-streams/signal` | video-streams | dual |
| 640 | GET | `/api/video-streams/signal` | video-streams | dual |
| 641 | POST | `/api/video-streams/signal` | video-streams | dual |
| 642 | GET | `/api/video-streams/{streamId}` | video-streams | dual |
| 643 | PATCH | `/api/video-streams/{streamId}` | video-streams | dual |
| 644 | GET | `/api/video-streams/{streamId}/auto-close` | video-streams | dual |
| 645 | POST | `/api/video-streams/{streamId}/auto-close` | video-streams | dual |
| 646 | DELETE | `/api/video-streams/{streamId}/ban` | video-streams | dual |
| 647 | GET | `/api/video-streams/{streamId}/ban` | video-streams | dual |
| 648 | POST | `/api/video-streams/{streamId}/ban` | video-streams | dual |
| 649 | GET | `/api/video-streams/{streamId}/co-broadcast` | video-streams | dual |
| 650 | PATCH | `/api/video-streams/{streamId}/co-broadcast` | video-streams | dual |
| 651 | POST | `/api/video-streams/{streamId}/co-broadcast` | video-streams | dual |
| 652 | POST | `/api/video-streams/{streamId}/co-broadcast/invite` | video-streams | dual |
| 653 | GET | `/api/video-streams/{streamId}/comments` | video-streams | dual |
| 654 | POST | `/api/video-streams/{streamId}/comments` | video-streams | dual |
| 655 | POST | `/api/video-streams/{streamId}/end` | video-streams | dual |
| 656 | DELETE | `/api/video-streams/{streamId}/fortune-requests` | video-streams | dual |
| 657 | GET | `/api/video-streams/{streamId}/fortune-requests` | video-streams | dual |
| 658 | PATCH | `/api/video-streams/{streamId}/fortune-requests` | video-streams | dual |
| 659 | POST | `/api/video-streams/{streamId}/fortune-requests` | video-streams | dual |
| 660 | GET | `/api/video-streams/{streamId}/fortune-requests/my-status` | video-streams | dual |
| 661 | GET | `/api/video-streams/{streamId}/gifts` | video-streams | dual |
| 662 | POST | `/api/video-streams/{streamId}/gifts` | video-streams | dual |
| 663 | DELETE | `/api/video-streams/{streamId}/join` | video-streams | dual |
| 664 | POST | `/api/video-streams/{streamId}/join` | video-streams | dual |
| 665 | POST | `/api/video-streams/{streamId}/leave` | video-streams | dual |
| 666 | GET | `/api/video-streams/{streamId}/like` | video-streams | dual |
| 667 | POST | `/api/video-streams/{streamId}/like` | video-streams | dual |
| 668 | POST | `/api/video-streams/{streamId}/live-started` | video-streams | dual |
| 669 | GET | `/api/video-streams/{streamId}/messages` | video-streams | dual |
| 670 | POST | `/api/video-streams/{streamId}/messages` | video-streams | dual |
| 671 | DELETE | `/api/video-streams/{streamId}/moderators` | video-streams | dual |
| 672 | GET | `/api/video-streams/{streamId}/moderators` | video-streams | dual |
| 673 | POST | `/api/video-streams/{streamId}/moderators` | video-streams | dual |
| 674 | DELETE | `/api/video-streams/{streamId}/mute` | video-streams | dual |
| 675 | GET | `/api/video-streams/{streamId}/mute` | video-streams | dual |
| 676 | POST | `/api/video-streams/{streamId}/mute` | video-streams | dual |
| 677 | GET | `/api/video-streams/{streamId}/pk-battle` | video-streams | dual |
| 678 | POST | `/api/video-streams/{streamId}/pk-battle` | video-streams | dual |
| 679 | DELETE | `/api/video-streams/{streamId}/signal` | video-streams | dual |
| 680 | GET | `/api/video-streams/{streamId}/signal` | video-streams | dual |
| 681 | POST | `/api/video-streams/{streamId}/signal` | video-streams | dual |
| 682 | GET | `/api/video-streams/{streamId}/stream` | video-streams | dual |
| 683 | GET | `/api/video-streams/{streamId}/viewers` | video-streams | public |
| 684 | GET | `/api/wallet` | wallet | dual |
| 685 | GET | `/api/warmup` | warmup | public |
| 686 | GET | `/api/weekly-dream-report` | weekly-dream-report | dual |
| 687 | POST | `/api/weekly-dream-report` | weekly-dream-report | dual |
| 688 | GET | `/api/withdrawals` | withdrawals | dual |
| 689 | POST | `/api/withdrawals` | withdrawals | dual |
| 690 | GET | `/api/youtube/search` | youtube | dual |
