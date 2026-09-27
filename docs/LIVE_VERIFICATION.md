# LIVE_VERIFICATION — Canlı HTTP Doğrulama Raporu

**Tarih:** 2026-09-27  
**Yöntem:** Salt-okuma (`GET`) istekleri. Üretim veritabanına **hiçbir yazma yapılmamıştır**.  
**Hedefler:** Herkese açık uçlar → `https://canlifal.com` (üretim). Kimlik gerektiren uçlar → yerel çalışma sunucusu (aynı veritabanı, yalnız okuma).  
**Kimlik:** Tohumlama (seed) betiğindeki test hesabı ile `POST /api/auth/mobile-login` üzerinden erişim jetonu alındı; bu tek yazma-benzeri çağrı yalnızca jeton üretir, iş verisi değiştirmez.

> Bu belgede listelenen uçlar artık **DOĞRULANDI** etiketlidir. Burada olmayan uçlar
> için diğer dokümanlardaki **KODDAN TESPİT EDİLDİ** etiketi geçerliliğini korur.

## 1. Özet

| Ölçüt | Değer |
|---|---|
| Test edilen herkese açık GET ucu | 110 |
| HTTP 200 (doğrulandı) | **85** |
| HTTP 401 (yetki zorunlu — koruma doğrulandı) | **17** |
| HTTP 400 (zorunlu parametre eksik — beklenen) | **8** |
| Bağlantı/5xx hatası | **0** |
| Gecikme (200 yanıtlar) ortanca / p95 | **188 ms / 219 ms** |
| Kimlik doğrulanmış GET testi | 20 uç, **13** × 200 |
| SSE akışı canlı doğrulama | 1 akış (`/api/notifications/stream`) |

## 2. Herkese açık uçlar — HTTP 200 (DOĞRULANDI)

`Önbellek` sütunu üretimden dönen gerçek `Cache-Control` başlığıdır.

| Yol | ms | Önbellek | Yanıt anahtarları |
|---|---|---|---|
| `/api/ads/active` | 233 | `-` | `hasAds`, `adNetwork` |
| `/api/advisors/online` | 240 | `-` | `success`, `data` |
| `/api/agency/leaderboard` | 257 | `-` | `agencies`, `period` |
| `/api/animations/manifest` | 184 | `public, max-age=60, stale-while-revalidate=300` | `version`, `count`, `animations`, `dictionaries` |
| `/api/blog` | 208 | `public, max-age=600, stale-while-revalidate=86400` | `posts`, `pagination` |
| `/api/blog/categories` | 224 | `-` | `<non-json>` |
| `/api/blog/recent` | 203 | `-` | `success`, `data` |
| `/api/blog/zodiac` | 153 | `-` | `signs` |
| `/api/broadcasters/weekly-competition` | 219 | `public, max-age=600, stale-while-revalidate=300` | `week`, `participants`, `winners`, `endsAt` |
| `/api/cfc-arena` | 327 | `-` | `success`, `data` |
| `/api/chat/broadcast-images` | 193 | `-` | `<non-json>` |
| `/api/chat/music/popular` | 200 | `-` | `items` |
| `/api/chat/rooms` | 174 | `-` | `<array:3>` |
| `/api/chat/rooms/backgrounds` | 124 | `-` | `success`, `backgrounds` |
| `/api/chat/rooms/pk-list` | 101 | `-` | `<array:0>` |
| `/api/config` | 165 | `public, max-age=60, stale-while-revalidate=300` | `success`, `data`, `request_id` |
| `/api/credit-packages` | 180 | `public, max-age=600, stale-while-revalidate=86400` | `<array:5>` |
| `/api/currency-branding` | 191 | `-` | `jeton`, `cfc`, `rules` |
| `/api/dream-symbols` | 181 | `-` | `<non-json>` |
| `/api/dreams` | 189 | `-` | `dreams`, `total`, `page`, `totalPages`, `categories` |
| `/api/dreams/trends` | 210 | `-` | `trendingDreams`, `mostDiscussed`, `trendingKeywords`, `categoryStats`, `zodiacTrends` |
| `/api/fan-clubs/popular` | 192 | `-` | `<non-json>` |
| `/api/fortune-access/ip-status` | 183 | `-` | `used`, `maxFree`, `adWatched`, `canUseFree`, `canWatchAd` |
| `/api/fortune-access/settings` | 193 | `-` | `success`, `data` |
| `/api/fortune-request-types` | 160 | `public, max-age=86400, stale-while-revalidate=86400` | `<array:6>` |
| `/api/games` | 188 | `-` | `<non-json>` |
| `/api/games/grid-settings` | 209 | `-` | `xoxGridSizes`, `sosGridSizes` |
| `/api/games/rooms` | 217 | `-` | `rooms` |
| `/api/gift-engine/gifts` | 187 | `public, max-age=60, stale-while-revalidate=300` | `<non-json>` |
| `/api/gifts/display-settings` | 182 | `public, max-age=60, stale-while-revalidate=300` | `settings` |
| `/api/gifts/insights/feed` | 112 | `-` | `items` |
| `/api/gifts/insights/leaderboard` | 175 | `-` | `type`, `period`, `scope`, `context`, `entries` |
| `/api/gifts/insights/map` | 170 | `-` | `scope`, `period`, `points` |
| `/api/gifts/missions` | 194 | `-` | `<array:0>` |
| `/api/gifts/recent-big` | 210 | `-` | `<array:0>` |
| `/api/gifts/types` | 194 | `public, max-age=600, stale-while-revalidate=86400` | `<non-json>` |
| `/api/gifts/version` | 183 | `public, s-maxage=60, stale-while-revalidate=120` | `giftVersion`, `themeVersion`, `giftCount`, `themeCount`, `timestamp` |
| `/api/hashtags/search` | 170 | `-` | `success`, `data` |
| `/api/hashtags/trending` | 180 | `-` | `success`, `data` |
| `/api/health` | 180 | `no-store, no-cache, must-revalidate` | `success`, `data`, `request_id` |
| `/api/homepage-buttons` | 180 | `public, max-age=60, stale-while-revalidate=300` | `buttons` |
| `/api/homepage-fortune-cards` | 201 | `-` | `cards`, `hero`, `ticker` |
| `/api/homepage-ticker` | 181 | `-` | `onlineUsers`, `onlineCount`, `onlineTellerCount`, `recentPurchasers`, `customMessages` |
| `/api/legal/child-safety` | 210 | `public, max-age=3600, stale-while-revalidate=86400` | `<non-json>` |
| `/api/live/guest/list` | 195 | `-` | `count`, `maxGuests`, `gridSlots`, `guests` |
| `/api/live/pk/active` | 212 | `-` | `matches` |
| `/api/membership-badges` | 178 | `-` | `<array:5>` |
| `/api/membership/plans` | 169 | `-` | `plans` |
| `/api/memberships` | 131 | `public, max-age=600, stale-while-revalidate=86400` | `<array:4>` |
| `/api/memberships/comparison` | 188 | `-` | `<non-json>` |
| `/api/memberships/packages` | 197 | `-` | `success`, `packages` |
| `/api/mobile/config` | 197 | `-` | `success`, `data` |
| `/api/online-fal` | 175 | `-` | `sections`, `buttons` |
| `/api/payments/methods` | 164 | `public, max-age=60, stale-while-revalidate=300` | `<array:2>` |
| `/api/payments/settings` | 158 | `-` | `whatsapp_number`, `whatsapp_message`, `whatsapp_enabled` |
| `/api/pk/active` | 195 | `-` | `matches` |
| `/api/pk/leaderboard` | 207 | `-` | `period`, `metric`, `entries` |
| `/api/platform/commission-rate` | 211 | `-` | `commissionRate` |
| `/api/platform/voice-room-settings` | 200 | `public, max-age=60, stale-while-revalidate=300` | `settings` |
| `/api/presence/sections` | 189 | `-` | `counts`, `total` |
| `/api/public-stats` | 142 | `-` | `fortunes`, `chat`, `video`, `social`, `users` |
| `/api/public/announcement-settings` | 137 | `-` | `entry_announcement_enabled`, `entry_announcement_duration`, `entry_announcement_style`, `entry_announcement_display_mode`, `entry_announcement_box_padding` |
| `/api/public/jeton-price` | 174 | `-` | `unitPrice`, `currency` |
| `/api/referral/validate` | 194 | `-` | `valid`, `error` |
| `/api/search` | 188 | `-` | `results` |
| `/api/seo-settings` | 146 | `-` | `site_description`, `site_og_image`, `site_name`, `site_keywords`, `site_favicon` |
| `/api/settings/ads` | 132 | `-` | — |
| `/api/settings/canlidark-hero` | 173 | `-` | `text` |
| `/api/settings/themes` | 210 | `-` | `default_theme`, `enabled_themes`, `color_mode` |
| `/api/short-videos/hashtags/search` | 207 | `-` | `success`, `data` |
| `/api/short-videos/hashtags/trending` | 167 | `-` | `success`, `data` |
| `/api/short-videos/mentions/search` | 164 | `-` | `success`, `data` |
| `/api/short-videos/music` | 193 | `-` | `success`, `data` |
| `/api/short-videos/music/recommend` | 182 | `-` | `success`, `data` |
| `/api/site-animations/active` | 189 | `public, max-age=86400, stale-while-revalidate=86400` | `items`, `total` |
| `/api/social/announcements` | 196 | `-` | `<array:0>` |
| `/api/social/public-stats` | 153 | `-` | `fortunes`, `chat`, `video`, `social`, `users` |
| `/api/social/stories` | 152 | `-` | `storyGroups` |
| `/api/tiktok-videos` | 182 | `-` | `videos`, `categories` |
| `/api/translations` | 202 | `-` | `<non-json>` |
| `/api/trend-videos` | 191 | `-` | `<non-json>` |
| `/api/trends` | 164 | `-` | `trends`, `total`, `page`, `totalPages` |
| `/api/user/story` | 219 | `-` | `storyGroups` |
| `/api/users/online` | 129 | `-` | `count`, `users` |
| `/api/video-streams/pk/list` | 102 | `-` | `<array:0>` |

## 3. Herkese açık sanılan ama korumalı uçlar — HTTP 401

Statik taramada yetki yardımcısı görülmeyen bu uçlar çalışma zamanında **401**
döndürmektedir; koruma **doğrulanmıştır**. İlgili dokümanlardaki `auth: []` notu bu
uçlar için geçersizdir.

| Yol | ms |
|---|---|
| `/api/agency/growth` | 253 |
| `/api/agency/live-status` | 249 |
| `/api/agency/wallet` | 225 |
| `/api/auth/mobile-sessions` | 216 |
| `/api/me/admin-capabilities` | 190 |
| `/api/referral/earnings` | 205 |
| `/api/referral/me` | 192 |
| `/api/social/actions` | 220 |
| `/api/social/discovery` | 178 |
| `/api/social/profile` | 155 |
| `/api/user/daily-tasks` | 166 |
| `/api/user/location` | 155 |
| `/api/user/social-settings` | 167 |
| `/api/users/me/activity` | 189 |
| `/api/users/me/broadcast-history` | 204 |
| `/api/users/me/profile-visitors` | 199 |
| `/api/users/me/stats` | 185 |

## 4. Zorunlu parametre bekleyen uçlar — HTTP 400

| Yol | Not |
|---|---|
| `/api/anonymous` | Sorgu parametresi zorunlu; parametresiz çağrıda 400 döner. |
| `/api/blog/related` | Sorgu parametresi zorunlu; parametresiz çağrıda 400 döner. |
| `/api/deeplink/resolve` | Sorgu parametresi zorunlu; parametresiz çağrıda 400 döner. |
| `/api/fortune-tellers/awards` | Sorgu parametresi zorunlu; parametresiz çağrıda 400 döner. |
| `/api/fortune-tellers/gifts` | Sorgu parametresi zorunlu; parametresiz çağrıda 400 döner. |
| `/api/live/fal-requests` | Sorgu parametresi zorunlu; parametresiz çağrıda 400 döner. |
| `/api/music/history` | Sorgu parametresi zorunlu; parametresiz çağrıda 400 döner. |
| `/api/settings/public` | Sorgu parametresi zorunlu; parametresiz çağrıda 400 döner. |

## 5. Kimlik doğrulanmış salt-okuma testleri

| Yol | Durum | ms | Yanıt anahtarları |
|---|---|---|---|
| `/api/users/me/stats` | 200 | 129 | `stats`, `user` |
| `/api/users/me/activity` | 200 | 142 | `notifications`, `pagination`, `unreadCount` |
| `/api/users/me/profile-visitors` | 403 | 139 | `error`, `request_id`, `success` |
| `/api/users/me/broadcast-history` | 200 | 125 | `broadcasts`, `pagination` |
| `/api/user/daily-tasks` | 200 | 131 | `allBonusClaimed`, `allCompleted`, `missions`, `streak`, `totalReward` |
| `/api/user/social-settings` | 200 | 142 | `data`, `success` |
| `/api/user/location` | 200 | 126 | `data`, `success` |
| `/api/social/profile` | 400 | 165 | `error`, `success` |
| `/api/social/discovery` | 200 | 133 | `data`, `success` |
| `/api/social/actions` | 200 | 127 | `data`, `success` |
| `/api/referral/me` | 200 | 234 | `data`, `success` |
| `/api/referral/earnings` | 200 | 142 | `balances`, `items`, `limit`, `offset`, `rates`, `referralCode` |
| `/api/me/admin-capabilities` | 200 | 162 | `data`, `request_id`, `success` |
| `/api/auth/mobile-sessions` | 200 | 143 | `data`, `success` |
| `/api/notifications` | 200 | 134 | `notifications`, `unreadCount` |
| `/api/wallet/balance` | 404 | 343 | `code`, `error`, `errorEn` |
| `/api/credits/balance` | 404 | 59 | `code`, `error`, `errorEn` |
| `/api/agency/growth` | 403 | 177 | `error`, `success` |
| `/api/agency/live-status` | 403 | 151 | `error`, `success` |
| `/api/agency/wallet` | 403 | 135 | `error`, `success` |

**Yorum:**

- `403` dönen üç ajans ucu (`/api/agency/*`) ve `/api/users/me/profile-visitors`,
  rol/üyelik tabanlı ek yetki gerektirir; test hesabında bu rol yoktur. Koruma **doğrulanmıştır**.
- `/api/social/profile` kullanıcı kimliği parametresi olmadan `400` döner.
- `/api/wallet/balance` ve `/api/credits/balance` **404** döner — bu yollar mevcut
  değildir; bakiye bilgisi başka uçlar üzerinden sunulur.

## 6. SSE akışı canlı doğrulama

| Ölçüt | Gözlenen |
|---|---|
| `Content-Type` | `text/event-stream` |
| İlk kare | `data: {"type":"connected","unreadCount":<sayı>}` |
| Kalp atışı | `: heartbeat` yorum satırı |
| Gözlem süresi | ~18 sn |

**Önemli düzeltme:** Bu akış olay adlarını SSE `event:` alanıyla değil, `data`
gövdesindeki **`type`** alanıyla taşır. Flutter tarafında `event` adına göre değil,
JSON gövdesindeki `type` alanına göre ayrıştırma yapılmalıdır.

`/api/fortune-tellers/stream` test hesabıyla açılamadı (falcı rolü gerekir) —
bu akış için etiket **KODDAN TESPİT EDİLDİ** olarak kalır.

## 7. Yetki denetimi düzeltmesi (54 → 15)

İlk statik tarama yalnız `authenticateRequest` ve `getServerSession` desenlerini
tanıyordu. Bu tur tarama genişletildi:

- `requireAuth` / `requireRole` (`lib/rbac.ts`)
- Alan bazlı koruyucular (`requireAdAdmin` vb.)
- `resolveChatActor` ve `forwardTo*` vekil (proxy) yardımcıları
- **Göreli yollu yeniden dışa aktarımlar** (`export { POST } from '../../.../route'`) — 3 seviyeye kadar çözümlendi

Sonuç: durum değiştiren uçlar arasında yetki izi bulunmayanların sayısı
**70 ham kayıttan 15'e** düştü. Ayrıca dört uç, hedef dosyası incelenerek
**yanlış alarm** olarak kapatıldı:

| Uç | Gerçek koruma |
|---|---|
| `/api/video-streams/[streamId]/moderator` | `../moderators/route.ts` → `authenticateRequest` (L51, L97) |
| `/api/video-streams/[streamId]/background` | `../route.ts` `PATCH` → `authenticateRequest` + oturum (L79-85) |
| `/api/video-streams/[streamId]/image` | `../route.ts` `PATCH` → aynı koruma |
| `/api/messages/conversations/[peerId]/messages` | `../../../[userId]/route.ts` → `authenticateRequest` (L14, L145) |

Kalan 15 uç üç gruba ayrılır:

**A. Kasıtlı olarak herkese açık (aksiyon gerekmez, 9 uç)**

- `/api/[...unmatched]`
- `/api/anonymous`
- `/api/anonymous/watch-ad`
- `/api/auth/email/verify`
- `/api/auth/forgot-password`
- `/api/auth/mobile-register`
- `/api/auth/reset-password`
- `/api/contact`
- `/api/signup`

**B. İmza/dış çağrı ile korunan (1 uç)**

- `/api/trtc/webhook` → `app/api/tencent/webhook/route.ts`; imza doğrulaması var,
  ancak `TRTC_WEBHOOK_KEY` tanımsızsa doğrulama **atlanır** (bkz. açık bulgu).

**C. Gerçek inceleme adayları (5 uç)**

| Uç | Risk |
|---|---|
| `/api/compatibility` | Kimliksiz çağrıda dış dil modeli maliyeti doğurur |
| `/api/dreams/generate` | Aynı; kimliksiz üretim çağrısı |
| `/api/chat/youtube-audio` | Kimliksiz dış kaynak çekimi |
| `/api/trend-videos` | Kimliksiz liste/çekim |
| `/api/social/posts/[postId]/view` | Kimliksiz sayaç artırımı — şişirmeye açık |

Bu liste bir güvenlik açığı **iddiası değildir**; hız sınırı veya kimlik zorunluluğu
açısından gözden geçirilmesi önerilen adaylardır.

## 8. Test edilmeyenler

- Durum değiştiren (`POST/PUT/PATCH/DELETE`) uçların hiçbiri çalıştırılmamıştır.
- Yönetici (admin) uçları test hesabında rol bulunmadığı için çağrılmamıştır.
- Ödeme, hediye gönderimi, jeton harcama akışları **bilinçli olarak** dışarıda bırakılmıştır.

