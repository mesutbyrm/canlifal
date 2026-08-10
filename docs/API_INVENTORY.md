# API_INVENTORY.md — CanlıFal Tam API Envanteri

> **AŞAMA A çıktısı — SALT OKUMA.** Bu rapor üretilirken hiçbir kod dosyası değiştirilmedi veya silinmedi.  
> Üretim tarihi: 2026-08-10 · Yöntem: kaynak kod statik taraması (`/tmp/inv/scan_backend.py`, `scan_callers.py`, `match.py`, `scan_express.py`).  
> **Canlı trafik ölçümü yapılmadı** — bu envanter kod tabanlıdır, çalışma zamanı çağrı istatistiği içermez (`NOT PERFORMED`).

## 0. Yönetici Özeti — Gerçek Sayılar

| Ölçüm | Değer |
|---|---|
| Ana backend route dosyası | 454 |
| Ana backend endpoint (metot × route) | 696 |
| Ana backend SSE endpoint | 19 |
| İkinci backend (Express) endpoint | 276 |
| İkinci backend distinct path | 214 |
| İki backend arasında **birebir duplicate path** | 110 |
| Yalnız ikinci backend'de olan path | 104 |
| Veritabanı modeli (ana şema) | 196 |
| Kodda hiç kullanılmayan model (ana şema) | 36 |
| Hiçbir istemciden referanslanmayan route | 42 |
| Flutter'ın çağırdığı, ana backend'de karşılığı olmayan path | 187 |
| Bunlardan ikinci backend'de bulunan | 67 |
| Bunlardan **hiçbir backend'de bulunmayan (404 riski)** | 120 |

## 1. Alan Bazlı Dağılım (ana backend)

| Alan | Route | SSE | Yalnız Flutter | Yalnız Web | Referanssız |
|---|---:|---:|---:|---:|---:|
| ADMIN | 108 | 0 | 2 | 90 | 5 |
| AUTH | 14 | 0 | 9 | 1 | 0 |
| CACHE_MONITOR | 2 | 0 | 0 | 0 | 2 |
| CHAT | 30 | 1 | 6 | 2 | 2 |
| FAL_TAROT_BURC | 30 | 14 | 1 | 24 | 4 |
| GAMES | 20 | 0 | 1 | 5 | 1 |
| GIFTS | 12 | 0 | 5 | 0 | 3 |
| LIVE | 40 | 1 | 20 | 1 | 1 |
| LIVE_FALCI | 1 | 0 | 0 | 0 | 0 |
| MEDIA_CDN | 2 | 0 | 0 | 0 | 0 |
| MUSIC | 2 | 0 | 1 | 0 | 1 |
| NOTIFICATIONS | 5 | 1 | 2 | 0 | 1 |
| OTHER | 109 | 1 | 13 | 24 | 12 |
| PROFILE | 30 | 0 | 10 | 1 | 0 |
| SHORTS | 22 | 0 | 16 | 2 | 1 |
| SOCIAL | 8 | 0 | 0 | 0 | 3 |
| STORY | 1 | 0 | 0 | 0 | 0 |
| TRTC | 4 | 0 | 1 | 0 | 2 |
| VOICE_ROOMS | 10 | 1 | 0 | 4 | 4 |
| WALLET_JETON_PAYMENT | 4 | 0 | 1 | 0 | 0 |

## 2. Ana Backend — Tam Endpoint Tablosu

Sütunlar: **Path** · **Metotlar** · **Auth (kod içi kanıt)** · **DB modelleri** · **Cache** · **SSE** · **Çağıran istemci**

| Path | Metot | Auth | DB modelleri | Cache | SSE | Çağıran |
|---|---|---|---|---|---|---|
| `/api/[...unmatched]` | GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS | public? | — |  |  | web,components,lib,flutter,api2 |
| `/api/activities` | GET | mobileJWT,adminCheck | activityFeedConfig,liveActivity |  |  | components,flutter |
| `/api/admin/activity-feed` | GET/POST | nextauth | activityFeedConfig,liveActivity |  |  | web,flutter |
| `/api/admin/ad-networks` | GET/POST/DELETE | nextauth | adNetwork |  |  | web |
| `/api/admin/agencies` | GET/PATCH/DELETE | nextauth | agency,agencyPenalty,agencyUser |  |  | web |
| `/api/admin/announcement-sections` | GET/POST | nextauth | platformSettings,user | ✓ |  | web |
| `/api/admin/avatar-accessories` |  | public? | — |  |  | web |
| `/api/admin/awards` | GET/POST/DELETE | nextauth | liveFortuneTeller,tellerAward |  |  | web |
| `/api/admin/backup` | GET | nextauth | platformSettings,siteSetting |  |  | web |
| `/api/admin/badges` | GET/POST/PUT/DELETE | nextauth | customBadge |  |  | web |
| `/api/admin/bana-ozel` | GET/POST/PATCH | nextauth | banaOzelItem |  |  | web |
| `/api/admin/blog` | GET/POST | nextauth | blogPost |  |  | web |
| `/api/admin/blog/[postId]` | PUT/PATCH/DELETE | nextauth | blogPost |  |  | web |
| `/api/admin/blog/analytics` | GET | nextauth | blogCategory,blogComment,blogFavorite,blogPost |  |  | web |
| `/api/admin/blog/bulk-category` | PATCH | nextauth | blogPost |  |  | web |
| `/api/admin/blog/bulk-delete` | POST | nextauth | blogPost |  |  | web |
| `/api/admin/blog/bulk-generate` | POST | nextauth | blogCategory,blogPost |  |  | web |
| `/api/admin/blog/bulk-import` | POST | nextauth,adminCheck | blogPost |  |  | web |
| `/api/admin/blog/bulk-publish` | PATCH | nextauth | blogPost |  |  | web |
| `/api/admin/blog/categories` | GET/POST/DELETE | nextauth | blogCategory |  |  | web |
| `/api/admin/blog/comments` | GET/PATCH | nextauth | blogComment,blogPost |  |  | web |
| `/api/admin/blog/generate` | POST | nextauth | blogCategory |  |  | web |
| `/api/admin/blog/import` | POST | nextauth | blogCategory,blogPost |  |  | — |
| `/api/admin/blog/schedule-publish` | POST | nextauth | blogPost |  |  | — |
| `/api/admin/bots` | GET/PATCH | nextauth | botProfile,user |  |  | web |
| `/api/admin/bots/simulate` | GET/POST | nextauth | botProfile,chatMessage,chatPresence,chatRoom,user |  |  | web |
| `/api/admin/bots/simulate-fortune` | GET/POST | nextauth | botProfile,dreamComment,dreamFavorite,dreamInterpretation,dreamView… |  |  | web |
| `/api/admin/bots/simulate-master` | GET/POST | nextauth | botProfile,chatMessage,chatPresence,dreamComment,dreamFavorite… |  |  | web |
| `/api/admin/bots/simulate-social` | GET/POST | nextauth | botProfile,follow,socialComment,socialLike,socialPost… |  |  | web |
| `/api/admin/broadcast-images` | GET/POST/PATCH/DELETE | nextauth | broadcastImage,user |  |  | web |
| `/api/admin/button-order` | GET/POST | nextauth | platformSettings | ✓ |  | web |
| `/api/admin/cache` | GET/DELETE | nextauth | — | ✓ |  | — |
| `/api/admin/cfc-payment-requests` | GET/PATCH | nextauth | cfcPaymentRequest,user |  |  | flutter |
| `/api/admin/cfc-settings` | GET/POST | nextauth | platformSettings | ✓ |  | flutter |
| `/api/admin/chat-bubbles` |  | public? | — |  |  | web |
| `/api/admin/chat-rooms` | GET/POST/PUT/DELETE | nextauth | chatBan,chatMessage,chatMute,chatPresence,chatRoom… |  |  | web |
| `/api/admin/contests` | GET/POST/PATCH/DELETE | nextauth | dreamContest,dreamContestEntry,dreamContestVote |  |  | web |
| `/api/admin/credit-packages` | GET/POST | nextauth | creditPackage | ✓ |  | web |
| `/api/admin/credit-packages/[packageId]` | PATCH/DELETE | nextauth | creditPackage | ✓ |  | web |
| `/api/admin/credits` | POST | nextauth | user |  |  | web,flutter |
| `/api/admin/currency-config` | GET/POST/PUT | nextauth | currencyConfig |  |  | web |
| `/api/admin/dreams` | GET/POST/PUT/DELETE | nextauth,adminCheck | dreamInterpretation |  |  | web |
| `/api/admin/dreams/bulk-category` | PATCH | nextauth | dreamInterpretation |  |  | web |
| `/api/admin/dreams/bulk-delete` | POST | nextauth | dreamInterpretation |  |  | web |
| `/api/admin/dreams/bulk-import` | POST | nextauth,adminCheck | dreamInterpretation |  |  | web |
| `/api/admin/dreams/bulk-publish` | PATCH | nextauth | dreamInterpretation |  |  | web |
| `/api/admin/dreams/generate` | POST | nextauth | dreamInterpretation |  |  | web |
| `/api/admin/emoji-packs` |  | public? | — |  |  | web |
| `/api/admin/entrance-effects` |  | public? | — |  |  | web |
| `/api/admin/finance` | GET/POST | nextauth | banaOzelHistory,chatRoomGift,giftType,jetonTransaction,liveFortuneTeller… | ✓ |  | web,components,flutter |
| `/api/admin/fortune-request-types` | GET/POST/PATCH/DELETE | nextauth | fortuneRequestType,user |  |  | web |
| `/api/admin/fortunes` | GET | nextauth | fortune |  |  | — |
| `/api/admin/games` | GET/POST/PUT/DELETE | nextauth | miniGame |  |  | web |
| `/api/admin/games/rooms` | GET/DELETE | nextauth | gameRoom,user |  |  | web |
| `/api/admin/games/settings` | GET/PUT | nextauth | platformSettings | ✓ |  | web |
| `/api/admin/gift-collections` | GET/POST/PATCH | nextauth | giftCollection |  |  | web |
| `/api/admin/gift-upload` | POST | nextauth | — |  |  | web |
| `/api/admin/gifts` | GET/POST | nextauth | giftType | ✓ |  | web,flutter |
| `/api/admin/gifts/[giftId]` | GET/PATCH/DELETE | nextauth | giftType | ✓ |  | web,flutter |
| `/api/admin/gifts/stats` | GET | nextauth | giftEvent,giftType,user |  |  | web,flutter |
| `/api/admin/homepage-buttons` | GET/POST/PATCH/DELETE | nextauth,adminCheck | homepageButton |  |  | web |
| `/api/admin/homepage-fortune-cards` | GET/POST/PUT/PATCH/DELETE | nextauth,adminCheck | homepageFortuneCard,platformSettings | ✓ |  | web |
| `/api/admin/live-tellers` | GET/POST | nextauth | liveFortuneTeller,user |  |  | web |
| `/api/admin/live-tellers/[tellerId]` | GET/PUT/DELETE | nextauth | liveFortuneTeller |  |  | web |
| `/api/admin/live-tellers/[tellerId]/approve` | POST | nextauth | liveFortuneTeller |  |  | web |
| `/api/admin/live-tellers/[tellerId]/ban` | POST | nextauth | liveFortuneTeller |  |  | web |
| `/api/admin/live-tellers/[tellerId]/bonus` | POST | nextauth | liveFortuneTeller,user |  |  | web |
| `/api/admin/live-tellers/[tellerId]/freeze` | POST | nextauth | liveFortuneTeller |  |  | web |
| `/api/admin/live-tellers/[tellerId]/permissions` | PUT | nextauth | liveFortuneTeller,user |  |  | web |
| `/api/admin/live-tellers/[tellerId]/warning` | POST/DELETE | nextauth | tellerWarning |  |  | web |
| `/api/admin/lucky-gifts/tiers` | GET/POST/PATCH/DELETE | nextauth,adminCheck | luckyGiftTier |  |  | web |
| `/api/admin/membership-badges` | GET/POST/PATCH/DELETE | nextauth | membershipBadge |  |  | web |
| `/api/admin/memberships` | GET/POST/PUT/DELETE | nextauth | membershipPlan,membershipPurchase |  |  | web |
| `/api/admin/memberships/purchases` | GET/POST/PATCH | nextauth | membershipPlan,membershipPurchase,user |  |  | web |
| `/api/admin/mic-frames` |  | public? | — |  |  | web |
| `/api/admin/moderation` | GET/POST | nextauth | socialComment,socialLike,socialPost,user |  |  | web |
| `/api/admin/name-effects` |  | public? | — |  |  | web |
| `/api/admin/notifications` | GET/POST/DELETE | nextauth | pushNotificationLog |  |  | web,flutter |
| `/api/admin/online-fal/buttons` | GET/POST/PATCH/DELETE | nextauth,adminCheck | onlineFalButton |  |  | web |
| `/api/admin/online-fal/sections` | GET/POST/PATCH | nextauth,adminCheck | onlineFalSection |  |  | web |
| `/api/admin/payment-methods` | GET/POST | nextauth | paymentMethod | ✓ |  | web |
| `/api/admin/payments` | GET/POST/PATCH | nextauth | jetonTransaction,paymentNotification,user |  |  | web |
| `/api/admin/pending-counts` | GET | nextauth | agency,liveFortuneTeller,paymentNotification,tellerWarning,user… |  |  | web |
| `/api/admin/popups` | GET/POST/PUT/DELETE | nextauth | adminPopup |  |  | web |
| `/api/admin/profile-frames` | GET/POST/DELETE | nextauth | profileFrame,user |  |  | web |
| `/api/admin/profile-frames/assign` | POST | nextauth | user |  |  | web |
| `/api/admin/room-themes` |  | public? | — |  |  | web |
| `/api/admin/room-themes/backgrounds` | GET/POST/PATCH | nextauth | roomTheme | ✓ |  | web |
| `/api/admin/rooms` | GET/PATCH | nextauth | chatRoom,user |  |  | web |
| `/api/admin/seo-settings` | GET/POST | nextauth,adminCheck | siteSetting |  |  | web |
| `/api/admin/settings` | GET/POST | nextauth | platformSettings | ✓ |  | web |
| `/api/admin/site-pages` | GET/POST/PUT/DELETE | nextauth | sitePage |  |  | web |
| `/api/admin/statistics` | GET | nextauth | chatRoomGift,conversation,directMessage,follow,fortune… | ✓ |  | web |
| `/api/admin/teller-levels` | POST | nextauth | liveFortuneTeller |  |  | — |
| `/api/admin/teller-performance` | GET | nextauth | liveFortuneTeller |  |  | web |
| `/api/admin/teller-verification` | GET/POST | nextauth | liveFortuneTeller |  |  | web |
| `/api/admin/ticker-messages` | GET/POST | nextauth | tickerMessage |  |  | web |
| `/api/admin/ticker-messages/[messageId]` | PATCH/DELETE | nextauth | tickerMessage |  |  | web |
| `/api/admin/tiktok-categories` | GET/POST/PATCH/DELETE | nextauth | tikTokCategory,tikTokVideo |  |  | web |
| `/api/admin/tiktok-videos` | GET/POST/PUT/PATCH/DELETE | nextauth | tikTokVideo |  |  | web |
| `/api/admin/trend-videos` | GET/POST | nextauth | trendVideo,trendVideoCategory |  |  | web |
| `/api/admin/trend-videos/youtube` | POST | nextauth | — |  |  | web |
| `/api/admin/trends` | GET/POST/DELETE | nextauth | trendingTopic,user |  |  | web |
| `/api/admin/users` | GET | nextauth | user |  |  | web,components,flutter |
| `/api/admin/users/[userId]` | GET/PATCH/DELETE | nextauth | platformSettings,user,videoStream |  |  | web,components,flutter |
| `/api/admin/users/search` | GET | nextauth | user |  |  | web,components,flutter |
| `/api/admin/users/withdrawal-limit` | POST | nextauth | user |  |  | web |
| `/api/admin/video-streams` | GET/PATCH/DELETE | nextauth | streamGift,videoStream,videoStreamComment,videoStreamLike,videoStreamSignal… |  |  | web |
| `/api/admin/visitor-stats` | GET | nextauth | sitePresence,siteVisit,user |  |  | web |
| `/api/admin/withdrawals` | GET/POST | nextauth | agency,user,withdrawalRequest |  |  | web,flutter |
| `/api/ads/active` | GET | public? | adNetwork |  |  | components,flutter |
| `/api/ads/reward` | POST | mobileJWT | ipFortuneUsage |  |  | components,flutter |
| `/api/agency/apply` | POST | mobileJWT | agency,agencyUser,user |  |  | web,flutter |
| `/api/agency/earnings` | GET | mobileJWT | agencyEarning,agencyUser,user |  |  | web,flutter |
| `/api/agency/invite` | GET/POST | mobileJWT | agencyUser,inviteCode |  |  | web,flutter |
| `/api/agency/join` | POST | mobileJWT | agency,agencyUser,inviteCode |  |  | web,flutter |
| `/api/agency/leaderboard` | GET | public? | agency,agencyEarning |  |  | web,flutter |
| `/api/agency/leave` | POST/DELETE | mobileJWT | agency,agencyLeaveRequest,agencyUser |  |  | web |
| `/api/agency/members` | GET/POST/DELETE | mobileJWT | agency,agencyLeaveRequest,agencyUser,user |  |  | web,flutter |
| `/api/agency/my` | GET/PATCH | mobileJWT | agency,agencyLeaveRequest,agencyUser |  |  | web,components,flutter |
| `/api/agency/tasks` | GET | mobileJWT | agency,agencyEarning,agencyTask,agencyUser |  |  | flutter |
| `/api/agency/withdrawals` | GET/POST | mobileJWT,nextauth | agencyUser,user,withdrawalRequest |  |  | web,flutter |
| `/api/announcements` | GET/POST | mobileJWT,adminCheck | siteAnnouncement,user | ✓ |  | web,components,flutter |
| `/api/announcements/event` | POST | mobileJWT,adminCheck | siteAnnouncement,user | ✓ |  | — |
| `/api/anonymous` | GET/POST | public? | anonymousUser |  |  | — |
| `/api/anonymous/watch-ad` | POST | public? | anonymousUser,siteSetting |  |  | — |
| `/api/astrology-panel` | GET | mobileJWT | user |  |  | web |
| `/api/auth/[...nextauth]` |  | public? | — |  |  | web,components,flutter |
| `/api/auth/change-password` | POST | mobileJWT | user |  |  | components,flutter |
| `/api/auth/forgot-password` | POST | public? | passwordResetToken,user |  |  | flutter |
| `/api/auth/logout` | POST | mobileJWT | — |  |  | flutter |
| `/api/auth/mobile-apple` | POST | public? | account,follow,referral,sitePresence,user | ✓ |  | flutter |
| `/api/auth/mobile-google` | POST | public? | account,follow,referral,sitePresence,user | ✓ |  | flutter |
| `/api/auth/mobile-login` | POST | public? | sitePresence,user |  |  | flutter |
| `/api/auth/mobile-refresh` | POST | public? | user |  |  | flutter |
| `/api/auth/mobile-register` | POST | public? | follow,referral,user | ✓ |  | flutter |
| `/api/auth/mobile-tiktok` | POST | public? | account,follow,referral,sitePresence,user | ✓ |  | flutter |
| `/api/auth/reclaim-device` | POST | nextauth | user |  |  | components,flutter |
| `/api/auth/reset-password` | POST | public? | passwordResetToken,user |  |  | flutter |
| `/api/auth/verify-device` | GET | nextauth | user |  |  | components,flutter |
| `/api/avatar-accessories` |  | public? | — |  |  | — |
| `/api/bana-ozel` | GET | mobileJWT | banaOzelItem,dailyTask,user,userFortuneStreak |  |  | web,components |
| `/api/bana-ozel/open` | POST | mobileJWT | banaOzelHistory,banaOzelItem,creditTransaction,dailyTask,jetonTransaction… |  |  | web,components |
| `/api/blog` | GET | public? | blogPost |  |  | web,flutter |
| `/api/blog/categories` | GET | public? | blogCategory,blogPost | ✓ |  | web,flutter |
| `/api/blog/comments` | GET/POST/DELETE | mobileJWT,adminCheck | blogComment,blogPost |  |  | web,flutter |
| `/api/blog/favorite` | POST | mobileJWT | blogFavorite |  |  | web,flutter |
| `/api/blog/interactions` | GET | mobileJWT | blogFavorite,blogLike,blogPost |  |  | web |
| `/api/blog/like` | POST | mobileJWT | blogLike,blogPost |  |  | web,flutter |
| `/api/blog/related` | GET | public? | blogPost |  |  | web |
| `/api/blog/zodiac` | GET | public? | blogPost |  |  | web |
| `/api/broadcast-images` | GET | mobileJWT | broadcastImage | ✓ |  | web,flutter |
| `/api/cache` | GET/POST | mobileJWT | — |  |  | — |
| `/api/chat-bubbles` |  | public? | — |  |  | — |
| `/api/chat/broadcast-images` | GET | public? | broadcastImage |  |  | web |
| `/api/chat/cleanup` | GET/POST/DELETE | public? | chatMessage |  |  | — |
| `/api/chat/rooms` | GET | public? | chatRoom | ✓ |  | web,components,flutter |
| `/api/chat/rooms/[roomId]/dj` | GET/POST | mobileJWT,nextauth,adminCheck | chatPresence,chatRoom,user |  |  | web,flutter |
| `/api/chat/rooms/[roomId]/gifts` | GET/POST | mobileJWT,nextauth | chatMessage,chatPresence,chatRoom,chatRoomGift,giftType… |  |  | web,flutter |
| `/api/chat/rooms/[roomId]/messages` | GET/POST/DELETE | mobileJWT,nextauth | chatMessage,chatPresence,chatRoom,chatUserRole |  |  | web,flutter |
| `/api/chat/rooms/[roomId]/moderation` | GET/POST | mobileJWT,nextauth | chatBan,chatMessage,chatMute,chatPresence,chatRoom… |  |  | web,flutter |
| `/api/chat/rooms/[roomId]/music` | GET/POST/DELETE | mobileJWT,nextauth,adminCheck | chatMessage,chatPresence,chatRoom,user |  |  | web,components,flutter |
| `/api/chat/rooms/[roomId]/music-queue` | GET | mobileJWT,nextauth | chatMessage |  |  | flutter |
| `/api/chat/rooms/[roomId]/music/stop` | POST | mobileJWT,nextauth | chatMessage,chatRoom |  |  | flutter |
| `/api/chat/rooms/[roomId]/pk` | GET/POST | mobileJWT,nextauth,adminCheck | chatRoom,chatUserRole,pKBattle,user |  |  | web,flutter |
| `/api/chat/rooms/[roomId]/pk/score` | POST | mobileJWT,nextauth | pKBattle |  |  | flutter |
| `/api/chat/rooms/[roomId]/presence` | GET/POST/DELETE | mobileJWT,nextauth,adminCheck | chatMessage,chatPresence,chatRoom,chatUserRole,user… |  |  | web,flutter |
| `/api/chat/rooms/[roomId]/seats` | GET/PATCH | mobileJWT,nextauth | chatPresence,chatRoom,chatUserRole,user,voiceSession |  |  | web,flutter |
| `/api/chat/rooms/[roomId]/settings` | GET/PATCH | mobileJWT,nextauth | chatRoom |  |  | web,flutter |
| `/api/chat/rooms/[roomId]/song-request` | GET/POST/PATCH | mobileJWT,nextauth | chatMessage,chatRoom,jetonTransaction,user |  |  | web,components,flutter |
| `/api/chat/rooms/[roomId]/state` | GET | mobileJWT,nextauth,adminCheck | chatPresence,chatRoom,chatUserRole,voiceSession |  |  | web,flutter |
| `/api/chat/rooms/[roomId]/stream` | GET | mobileJWT,nextauth,adminCheck | chatPresence,chatRoom,chatUserRole,voiceSession | ✓ | ✓ | flutter |
| `/api/chat/rooms/[roomId]/transfer-ownership` | POST | mobileJWT,nextauth,adminCheck | chatRoom,chatUserRole,user |  |  | web,flutter |
| `/api/chat/rooms/[roomId]/typing` | GET/POST | mobileJWT,nextauth | chatPresence |  |  | web,flutter |
| `/api/chat/rooms/[roomId]/voice` | GET/POST | mobileJWT,nextauth | chatRoom,chatUserRole,user,voiceSession |  |  | web,flutter |
| `/api/chat/rooms/backgrounds` | GET | public? | chatRoom | ✓ |  | flutter |
| `/api/chat/rooms/create` | POST | mobileJWT | chatRoom,jetonTransaction,user | ✓ |  | web,flutter |
| `/api/chat/rooms/pk-list` | GET | public? | chatRoom,pKBattle,user |  |  | — |
| `/api/chat/youtube-stream` | GET | public? | — | ✓ |  | flutter |
| `/api/compatibility` | POST | public? | — |  |  | web |
| `/api/contact` | POST | public? | — |  |  | web |
| `/api/credit-packages` | GET | public? | — | ✓ |  | web,flutter |
| `/api/daily-login` | GET/POST | mobileJWT | dailyLoginReward,user |  |  | components,flutter |
| `/api/daily-missions` | GET/POST | mobileJWT | creditTransaction,dailyTask,user,userFortuneStreak |  |  | web,flutter |
| `/api/devices/fcm` | POST/DELETE | mobileJWT,nextauth | userDevice |  |  | flutter |
| `/api/dream-contest` | GET | mobileJWT | dreamContest |  |  | web,flutter |
| `/api/dream-contest/[contestId]/entries` | GET/POST | mobileJWT | dreamContest,dreamContestEntry,dreamContestVote,user |  |  | web |
| `/api/dream-contest/[contestId]/vote` | POST | mobileJWT | dreamContestEntry,dreamContestVote |  |  | web |
| `/api/dream-diary` | GET/POST/DELETE | mobileJWT | dreamDiaryEntry,user |  |  | web,flutter |
| `/api/dream-stats` | GET | mobileJWT | dreamDiaryEntry,fortune |  |  | web,flutter |
| `/api/dream-symbols` | GET | public? | dreamSymbol |  |  | web,flutter |
| `/api/dream-symbols/[slug]` | GET | public? | dreamSymbol |  |  | web |
| `/api/dreams` | GET | public? | dreamInterpretation |  |  | web,flutter |
| `/api/dreams/[slug]` | GET | public? | dreamComment,dreamInterpretation |  |  | web |
| `/api/dreams/[slug]/comments` | GET/POST/DELETE | mobileJWT,adminCheck | dreamComment,dreamInterpretation |  |  | — |
| `/api/dreams/[slug]/favorite` | GET/POST | mobileJWT | dreamFavorite,dreamInterpretation |  |  | — |
| `/api/dreams/[slug]/view` | POST | mobileJWT | dreamInterpretation,dreamView |  |  | — |
| `/api/dreams/favorites` | GET | mobileJWT | dreamFavorite |  |  | web |
| `/api/dreams/generate` | POST | public? | dreamInterpretation |  |  | web |
| `/api/dreams/interpret` | POST | mobileJWT | dreamDiaryEntry,dreamView,jetonTransaction,socialPost,user |  |  | web |
| `/api/dreams/morning-reminder` | POST | public? | — |  |  | — |
| `/api/dreams/recommendations` | GET | mobileJWT | dreamFavorite,dreamInterpretation,dreamView |  |  | web |
| `/api/dreams/trends` | GET | public? | — |  |  | web |
| `/api/emoji-packs` |  | public? | — |  |  | — |
| `/api/entrance-effects` |  | public? | — |  |  | — |
| `/api/favorite-tellers` | GET/POST | mobileJWT | favoriteTeller,liveFortuneTeller |  |  | web,flutter |
| `/api/football` | GET | public? | — |  |  | web,components,flutter |
| `/api/fortune-access/check` | POST | mobileJWT | — |  |  | components,flutter |
| `/api/fortune-access/ip-status` | GET | public? | ipFortuneUsage |  |  | components |
| `/api/fortune-request-types` | GET | public? | — | ✓ |  | web,flutter |
| `/api/fortune-tellers` | GET/POST | mobileJWT | liveFortuneTeller,videoStream | ✓ |  | web,components,flutter |
| `/api/fortune-tellers/[tellerId]` | GET/PATCH | mobileJWT,nextauth,adminCheck | liveFortuneTeller |  |  | web,components,flutter |
| `/api/fortune-tellers/[tellerId]/reviews` | GET | public? | liveTellerReview |  |  | — |
| `/api/fortune-tellers/[tellerId]/session` | GET/POST | mobileJWT,nextauth | liveFortuneTeller,liveSession,user | ✓ |  | web,flutter |
| `/api/fortune-tellers/apply` | POST | mobileJWT | liveFortuneTeller,user | ✓ |  | web,flutter |
| `/api/fortune-tellers/awards` | GET | public? | tellerAward |  |  | web,flutter |
| `/api/fortune-tellers/gifts` | GET | public? | tellerGift,user |  |  | flutter |
| `/api/fortune-tellers/my-profile` | GET | mobileJWT | liveFortuneTeller |  |  | web,flutter |
| `/api/fortune-tellers/session` | GET/POST | mobileJWT,nextauth | liveFortuneTeller,liveSession,user | ✓ |  | flutter |
| `/api/fortune-tellers/sessions` | GET | mobileJWT,nextauth | liveFortuneTeller,liveSession |  |  | web,components,flutter |
| `/api/fortune-tellers/sessions/[sessionId]` | PATCH | mobileJWT,nextauth | liveFortuneTeller,liveSession,tellerChatSession,user | ✓ |  | web,components,flutter |
| `/api/fortune-tellers/sessions/stream` | GET | mobileJWT,nextauth | liveFortuneTeller,liveSession | ✓ | ✓ | flutter |
| `/api/fortune-tellers/toggle-online` | GET/POST | mobileJWT | liveFortuneTeller |  |  | web,flutter |
| `/api/fortunes/ask-uyumu` | POST | mobileJWT | fortune | ✓ | ✓ | web |
| `/api/fortunes/aura-analizi` | POST | mobileJWT | fortune | ✓ | ✓ | web |
| `/api/fortunes/burc-yorumu` | POST | mobileJWT | fortune | ✓ | ✓ | web |
| `/api/fortunes/dogum-haritasi` | POST | mobileJWT | fortune | ✓ | ✓ | web |
| `/api/fortunes/el-fali` | POST | mobileJWT | fortune | ✓ | ✓ | web |
| `/api/fortunes/evet-hayir` | POST | mobileJWT | fortune | ✓ | ✓ | web |
| `/api/fortunes/istihare` | POST | mobileJWT | fortune | ✓ | ✓ | web |
| `/api/fortunes/kahve-fali` | POST | mobileJWT | fortune | ✓ | ✓ | web |
| `/api/fortunes/kahve-fali-image` | POST | mobileJWT | fortune | ✓ | ✓ | web |
| `/api/fortunes/katina` | POST | mobileJWT | fortune | ✓ | ✓ | web |
| `/api/fortunes/kursundokme` | POST | mobileJWT | fortune | ✓ |  | web |
| `/api/fortunes/melek-kartlari` | POST | mobileJWT | fortune | ✓ | ✓ | web |
| `/api/fortunes/numeroloji` | POST | mobileJWT | fortune | ✓ | ✓ | web |
| `/api/fortunes/ruya-yorumu` | POST | mobileJWT | fortune | ✓ | ✓ | web |
| `/api/fortunes/tarot-fali` | POST | mobileJWT | fortune | ✓ | ✓ | web |
| `/api/games` | GET | public? | miniGame |  |  | web,flutter |
| `/api/games/daily-reward` | GET/POST | mobileJWT | dailyQuest,dailyReward,user |  |  | web |
| `/api/games/daily-spin` | POST | mobileJWT | user,userGameProfile |  |  | flutter |
| `/api/games/grid-settings` | GET | public? | — | ✓ |  | web |
| `/api/games/lamba-cini` | GET/POST | mobileJWT | dailyQuest,gamePlay,miniGame,user,userGameProfile |  |  | web |
| `/api/games/leaderboard` | GET | mobileJWT | gameRoom,user,userGameProfile |  |  | web,flutter |
| `/api/games/lobby` | GET | mobileJWT | gameRoom,gameRoomViewer,sosGame,sosGameViewer,user | ✓ |  | web |
| `/api/games/play` | POST | mobileJWT | dailyQuest,gamePlay,miniGame,user,userGameProfile |  |  | web,flutter |
| `/api/games/profile` | GET | mobileJWT | user,userGameProfile |  |  | web,flutter |
| `/api/games/quests` | GET/POST | mobileJWT | dailyQuest,user |  |  | web,flutter |
| `/api/games/room` | GET/POST | mobileJWT | gameRoom,user |  |  | web,components,flutter |
| `/api/games/room/[roomId]` | GET/POST/PATCH/DELETE | mobileJWT | gameRoom,user |  |  | components,flutter |
| `/api/games/room/[roomId]/chat` | GET/POST/PATCH | mobileJWT | gameRoom,gameRoomChat |  |  | web,components,flutter |
| `/api/games/room/[roomId]/replace-ai` | POST | mobileJWT | gameRoom,sosGame |  |  | — |
| `/api/games/room/[roomId]/viewers` | GET/POST/DELETE | mobileJWT | gameRoomViewer |  |  | components,flutter |
| `/api/games/sos` | GET/POST | mobileJWT | sosGame,user |  |  | web |
| `/api/games/sos/[gameId]` | GET/POST/PATCH/DELETE | mobileJWT | sosGame,user |  |  | web,flutter |
| `/api/games/sos/[gameId]/chat` | GET/POST/PATCH | mobileJWT | sosGame,sosGameChat,sosGameViewer |  |  | web,flutter |
| `/api/games/sos/[gameId]/viewers` | GET/POST/DELETE | mobileJWT | sosGame,sosGameViewer |  |  | web,flutter |
| `/api/gift-engine/finish` | POST | mobileJWT,nextauth | — |  |  | — |
| `/api/gift-engine/gifts` | GET | public? | giftType | ✓ |  | — |
| `/api/gift-engine/queue` | GET | public? | — |  |  | — |
| `/api/gifts/catalog` | GET | mobileJWT,nextauth | giftCollection,giftType | ✓ |  | flutter |
| `/api/gifts/check-reciprocal` | POST | mobileJWT | notification |  |  | flutter |
| `/api/gifts/lucky/config` | GET | mobileJWT,nextauth | giftType,luckyGiftTier |  |  | flutter |
| `/api/gifts/lucky/history` | GET | mobileJWT,nextauth | giftType,luckyGiftReward,user |  |  | web,flutter |
| `/api/gifts/lucky/send` | POST | mobileJWT,nextauth | giftType,jetonTransaction,luckyGiftReward,luckyGiftTier,siteAnnouncement… |  |  | flutter |
| `/api/gifts/recent-big` | GET | public? | giftType,notification |  |  | components,flutter |
| `/api/gifts/send` | POST | mobileJWT | giftType,jetonTransaction,notification,siteAnnouncement,user | ✓ |  | web,flutter |
| `/api/gifts/types` | GET | public? | — | ✓ |  | web,flutter |
| `/api/gifts/version` | GET | public? | giftType,roomTheme | ✓ |  | flutter |
| `/api/hashtags/[name]` | GET | mobileJWT | hashtag,shortVideoHashtag |  |  | — |
| `/api/hashtags/search` | GET | public? | hashtag |  |  | — |
| `/api/hashtags/trending` | GET | public? | hashtag |  |  | — |
| `/api/homepage-buttons` | GET | public? | homepageButton | ✓ |  | web,components,flutter |
| `/api/homepage-fortune-cards` | GET | public? | homepageFortuneCard | ✓ |  | web,components,flutter |
| `/api/homepage-ticker` | GET | public? | creditTransaction,customBadge,liveFortuneTeller,sitePresence,tickerMessage… | ✓ |  | components,flutter |
| `/api/horoscope/daily` | GET | mobileJWT,nextauth | fortune,user |  |  | flutter |
| `/api/jeton` | GET/POST | mobileJWT | banaOzelHistory,creditTransaction,dailyTask,user,userFortuneStreak |  |  | web,components,flutter |
| `/api/leaderboards` | GET | mobileJWT | creditTransaction,socialLike,socialPost,streamGift,user | ✓ |  | web,flutter |
| `/api/legal/child-safety` | GET | public? | sitePage | ✓ |  | — |
| `/api/live/create-room` | POST | mobileJWT | follow,liveFortuneTeller,notification,videoStream |  |  | flutter |
| `/api/live/gift-types` | GET | mobileJWT | giftType | ✓ |  | flutter |
| `/api/live/gift/send` | POST | mobileJWT | chatRoom,chatRoomGift,giftType,pKBattle,streamGift… |  |  | flutter |
| `/api/live/heartbeat` | POST | mobileJWT | chatPresence,chatRoom,videoStream,videoStreamViewer,voiceSession |  |  | flutter |
| `/api/live/join-room` | POST | mobileJWT,adminCheck | chatBan,chatPresence,chatRoomGift,chatUserRole,streamGift… | ✓ |  | web,flutter |
| `/api/live/leave-room` | POST | mobileJWT | chatMessage,chatPresence,chatRoom,videoStream,videoStreamViewer… |  |  | flutter |
| `/api/live/message` | GET/POST | mobileJWT | chatMessage,chatPresence,chatRoom,chatUserRole,videoStream… |  |  | flutter |
| `/api/live/online-users` | GET | mobileJWT | chatPresence,user,videoStreamViewer | ✓ |  | flutter |
| `/api/live/pk` | GET/POST | mobileJWT | chatRoom,pKBattle,user,videoStream |  |  | flutter |
| `/api/live/pk/score` | POST | mobileJWT | pKBattle |  |  | flutter |
| `/api/live/rooms` | GET | mobileJWT | chatPresence,chatRoom,videoStream,videoStreamViewer |  |  | flutter |
| `/api/live/seats` | GET/POST | mobileJWT | chatPresence,chatRoom,chatUserRole,user |  |  | flutter |
| `/api/me` | GET/PATCH | mobileJWT | user |  |  | web,flutter |
| `/api/membership-badges` | GET | public? | membershipBadge | ✓ |  | components,flutter |
| `/api/memberships` | GET | public? | membershipPlan | ✓ |  | web,components,flutter |
| `/api/memberships/packages` | GET | public? | membershipPlan | ✓ |  | flutter |
| `/api/memberships/purchase` | POST | mobileJWT | jetonTransaction,membershipPlan,membershipPurchase,user |  |  | web,flutter |
| `/api/messages` | GET | mobileJWT | conversation,directMessage,messageRequest |  |  | web,components,flutter,api2 |
| `/api/messages/[userId]` | GET/POST | mobileJWT | conversation,directMessage,follow,messageRequest,user |  |  | web,flutter |
| `/api/messages/request` | POST/PATCH | mobileJWT | messageRequest |  |  | web,flutter |
| `/api/mic-frames` |  | public? | — |  |  | — |
| `/api/mobile/config` | GET | public? | — | ✓ |  | flutter |
| `/api/mobile/fortune-menu` | GET | mobileJWT | homepageFortuneCard,user | ✓ |  | flutter |
| `/api/mobile/home` | GET | mobileJWT | chatPresence,chatRoom,homepageButton,homepageFortuneCard,liveFortuneTeller… | ✓ |  | flutter |
| `/api/mobile/user-profile/[userId]` | GET | mobileJWT | follow,shortVideo,user,userAchievement,userBlock |  |  | flutter |
| `/api/monitoring` | GET | nextauth,adminCheck | — | ✓ |  | — |
| `/api/music/history` | GET | public? | chatMessage |  |  | — |
| `/api/music/search` | GET | mobileJWT | — |  |  | flutter |
| `/api/name-effects` |  | public? | — |  |  | — |
| `/api/notifications` | GET/POST/DELETE | mobileJWT | notification |  |  | web,components,flutter,api2 |
| `/api/notifications/stream` | GET | mobileJWT | notification | ✓ | ✓ | flutter |
| `/api/online-fal` | GET | public? | onlineFalButton,onlineFalSection |  |  | web,flutter |
| `/api/payments/config` | GET | mobileJWT | — | ✓ |  | flutter |
| `/api/payments/methods` | GET | public? | — | ✓ |  | web,components,flutter |
| `/api/payments/notify` | GET/POST | mobileJWT,nextauth | paymentNotification,user |  |  | components |
| `/api/payments/requests` | GET/POST | mobileJWT | cfcPaymentRequest,user |  |  | flutter |
| `/api/payments/settings` | GET | public? | — | ✓ |  | web |
| `/api/platform/commission-rate` | GET | public? | — | ✓ |  | web,flutter |
| `/api/popups` | GET | mobileJWT,nextauth | adminPopup,chatRoom,videoStream |  |  | components,flutter |
| `/api/presence` | GET/POST | mobileJWT | sitePresence,siteVisit,user,userDailyActivity,userHourlyActivity… |  |  | components,flutter |
| `/api/presence/sections` | GET | public? | sitePresence |  |  | components,flutter |
| `/api/profile-frames` | GET/POST | mobileJWT | profileFrame,user |  |  | web,flutter |
| `/api/public-stats` | GET | public? | chatPresence,chatRoom,fortune,sitePresence,socialPost… |  |  | components,flutter |
| `/api/public/announcement-settings` | GET | public? | — | ✓ |  | web,components |
| `/api/public/jeton-price` | GET | public? | — | ✓ |  | web |
| `/api/referral` | GET | mobileJWT,nextauth | user |  |  | web,flutter |
| `/api/referral/validate` | GET | public? | user |  |  | web |
| `/api/room-themes` |  | public? | — |  |  | — |
| `/api/room-themes/catalog` | GET | mobileJWT,nextauth | roomTheme | ✓ |  | — |
| `/api/room/[sessionId]` | GET/PATCH | mobileJWT,nextauth | liveFortuneTeller,liveSession,tellerChatSession,user | ✓ |  | web,flutter |
| `/api/room/[sessionId]/messages` | GET/POST | mobileJWT,nextauth | liveSession,liveSessionMessage |  |  | web |
| `/api/room/[sessionId]/review` | GET/POST | mobileJWT,nextauth | liveFortuneTeller,liveSession,liveTellerReview |  |  | web |
| `/api/room/[sessionId]/stream` | GET | mobileJWT,nextauth | liveSession | ✓ | ✓ | — |
| `/api/room/[sessionId]/summary` | GET | mobileJWT,nextauth | liveSession | ✓ |  | web |
| `/api/room/[sessionId]/tip` | POST | mobileJWT,nextauth | liveFortuneTeller,liveSession,liveSessionMessage,user | ✓ |  | web |
| `/api/room/signal` | GET/POST/DELETE | mobileJWT,nextauth | liveSession,roomSignal |  |  | web,flutter |
| `/api/search` | GET | public? | miniGame,user |  |  | components,flutter |
| `/api/search/advanced` | GET | mobileJWT | chatRoom,fortuneRequestType,liveFortuneTeller |  |  | web,flutter |
| `/api/seo-settings` | GET | public? | siteSetting |  |  | — |
| `/api/settings/ads` | GET | public? | siteSetting |  |  | components |
| `/api/settings/canlidark-hero` | GET | public? | platformSettings |  |  | components |
| `/api/settings/public` | GET | public? | — | ✓ |  | web,components |
| `/api/settings/themes` | GET | public? | — | ✓ |  | lib |
| `/api/share-card` | GET | mobileJWT | fortune,socialPost |  |  | components |
| `/api/short-videos` | GET | mobileJWT | follow,shortVideo |  |  | components,flutter,api2 |
| `/api/short-videos/[id]` | GET/DELETE | mobileJWT | shortVideo |  |  | web,flutter |
| `/api/short-videos/[id]/comments` | GET/POST | mobileJWT | follow,shortVideo,shortVideoComment,user |  |  | flutter |
| `/api/short-videos/[id]/comments/[commentId]` | DELETE | mobileJWT,adminCheck | shortVideo,shortVideoComment |  |  | flutter |
| `/api/short-videos/[id]/comments/[commentId]/like` | POST | mobileJWT | shortVideoComment,shortVideoCommentLike |  |  | flutter |
| `/api/short-videos/[id]/comments/[commentId]/pin` | POST | mobileJWT | shortVideo,shortVideoComment |  |  | flutter |
| `/api/short-videos/[id]/duets` | GET | mobileJWT | shortVideo |  |  | flutter |
| `/api/short-videos/[id]/like` | POST | mobileJWT | shortVideo,shortVideoLike,user |  |  | flutter |
| `/api/short-videos/[id]/save` | POST | mobileJWT | shortVideo,shortVideoSave |  |  | flutter |
| `/api/short-videos/[id]/share` | POST | mobileJWT | shortVideo |  |  | flutter |
| `/api/short-videos/[id]/view` | POST | mobileJWT | shortVideo,shortVideoView |  |  | flutter |
| `/api/short-videos/explore` | GET | mobileJWT | hashtag,shortVideo,shortVideoMusic |  |  | flutter |
| `/api/short-videos/mentions/search` | GET | public? | user |  |  | flutter |
| `/api/short-videos/music` | GET | public? | shortVideoMusic |  |  | flutter |
| `/api/short-videos/profile/[userId]` | GET | mobileJWT | follow,shortVideo,user |  |  | flutter |
| `/api/short-videos/register` | POST | mobileJWT | — |  |  | flutter |
| `/api/short-videos/upload` | POST | mobileJWT | — |  |  | web,flutter |
| `/api/short-videos/upload-url` | POST | mobileJWT | — |  |  | flutter |
| `/api/short-videos/user/[userId]` | GET | mobileJWT | shortVideo,shortVideoLike,shortVideoSave |  |  | flutter |
| `/api/signup` | POST | public? | follow,referral,user | ✓ |  | web |
| `/api/site-pages/[slug]` | GET | public? | sitePage |  |  | flutter |
| `/api/social/posts` | GET/POST | mobileJWT | fortune,socialPost |  |  | web,components,flutter |
| `/api/social/posts/[postId]` | GET/DELETE | mobileJWT | socialPost |  |  | web,flutter |
| `/api/social/posts/[postId]/comments` | GET/POST/DELETE | mobileJWT | socialComment,socialPost |  |  | web,flutter |
| `/api/social/posts/[postId]/likes` | POST | mobileJWT | socialLike,socialPost |  |  | web,flutter |
| `/api/social/posts/[postId]/view` | POST | public? | fortune,socialPost |  |  | web,flutter |
| `/api/stories` | GET/POST/DELETE | mobileJWT | follow,userStory |  |  | components,flutter,api2 |
| `/api/teller-chat` | GET | mobileJWT,nextauth | liveFortuneTeller,tellerChatMessage,tellerChatSession |  |  | web |
| `/api/teller-chat/[sessionId]` | GET/POST | mobileJWT,nextauth | tellerChatMessage,tellerChatSession |  |  | web,flutter |
| `/api/teller/analytics` | GET | mobileJWT | liveFortuneTeller,liveSession,liveTellerReview |  |  | web |
| `/api/teller/level` | GET | mobileJWT,nextauth | liveFortuneTeller |  |  | web |
| `/api/teller/verification` | GET/POST | mobileJWT | liveFortuneTeller |  |  | — |
| `/api/tencent/webhook` | POST | public? | liveGuestSession,pkMatch,trtcWebhookLog,videoStream,videoStreamViewer |  |  | — |
| `/api/tiktok-videos` | GET | public? | tikTokCategory,tikTokVideo |  |  | components |
| `/api/tiktok-videos/[id]` | GET | public? | tikTokVideo |  |  | web |
| `/api/tiktok-videos/oembed` | GET | public? | — |  |  | — |
| `/api/tmdb` | GET | public? | — |  |  | web |
| `/api/tournaments` | GET | mobileJWT | user,weeklyTournament |  |  | web,flutter |
| `/api/translations` | GET | public? | translation |  |  | lib,flutter |
| `/api/trend-videos` | GET/POST | public? | trendVideo,trendVideoCategory |  |  | web,components,flutter |
| `/api/trends` | GET | public? | trendingTopic |  |  | web,flutter |
| `/api/trends/[slug]` | GET | public? | trendingTopic |  |  | — |
| `/api/trends/[slug]/like` | POST | mobileJWT | trendingTopic |  |  | web |
| `/api/trtc/token` | POST | mobileJWT | — |  |  | flutter |
| `/api/trtc/usersig` | POST | mobileJWT | — |  |  | lib,flutter |
| `/api/trtc/webhook` | POST | public? | — |  |  | — |
| `/api/upload/get-url` | GET/POST | mobileJWT | — |  |  | web,components,flutter |
| `/api/upload/presigned` | POST | mobileJWT | — |  |  | web,components,flutter |
| `/api/user/[userId]/achievements` | GET | mobileJWT | achievement,jetonTransaction,socialLike,user,userAchievement… |  |  | components |
| `/api/user/[userId]/follow` | POST/DELETE | mobileJWT | follow |  |  | web,components,flutter |
| `/api/user/[userId]/follow-status` | GET | mobileJWT | follow |  |  | web,components,flutter |
| `/api/user/achievements` | GET | mobileJWT | achievement,creditTransaction,fortune,socialLike,user… |  |  | web,flutter |
| `/api/user/active-sessions` | GET | mobileJWT | liveSession |  |  | components,flutter |
| `/api/user/activity` | GET/PATCH | mobileJWT | notification |  |  | flutter |
| `/api/user/block` | GET/POST | mobileJWT | follow,user,userBlock |  |  | flutter |
| `/api/user/blocked` | GET/DELETE | mobileJWT | chatBan,streamBan,user,videoStream |  |  | web,flutter |
| `/api/user/broadcast-history` | GET | mobileJWT | videoStream |  |  | flutter |
| `/api/user/co-broadcast-invites` | GET | mobileJWT | streamCoBroadcaster,videoStream |  |  | components,flutter |
| `/api/user/credits` | GET | mobileJWT | user | ✓ |  | web,components,flutter |
| `/api/user/followers` | GET | mobileJWT | follow |  |  | web,flutter |
| `/api/user/following` | GET | mobileJWT | follow |  |  | web,flutter |
| `/api/user/fortunes` | GET | mobileJWT | fortune |  |  | flutter |
| `/api/user/fortunes/[fortuneId]` | PATCH | mobileJWT | fortune |  |  | flutter |
| `/api/user/likers` | GET | mobileJWT | socialLike,socialPost |  |  | web,flutter |
| `/api/user/profile` | GET/PATCH | mobileJWT | socialLike,user |  |  | web,components,flutter |
| `/api/user/received-gifts` | GET | mobileJWT | chatRoomGift |  |  | components,flutter |
| `/api/user/report` | POST | mobileJWT | user,userReport |  |  | flutter |
| `/api/user/statistics` | GET | mobileJWT | creditTransaction,fortune,fortuneRating,profileView,socialComment… | ✓ |  | web,flutter |
| `/api/user/stats` | GET/POST | mobileJWT | fortune,socialLike,user |  |  | flutter |
| `/api/user/theme` | GET/PATCH | mobileJWT | user |  |  | flutter |
| `/api/user/watch-ad` | GET/POST | mobileJWT | siteSetting,user |  |  | components,flutter |
| `/api/user/xp` | GET | mobileJWT | user |  |  | components,flutter |
| `/api/users/[userId]` | GET | mobileJWT | follow,notification,profileView,socialLike,user |  |  | web,components,flutter |
| `/api/users/[userId]/follow` | GET/POST | mobileJWT | follow,user |  |  | web,flutter |
| `/api/users/[userId]/posts` | GET | mobileJWT | socialPost,user |  |  | web,flutter |
| `/api/users/lookup/[username]` | GET | mobileJWT | follow,socialLike,user |  |  | flutter |
| `/api/users/online` | GET | public? | sitePresence,user | ✓ |  | flutter |
| `/api/users/search` | GET | mobileJWT | user |  |  | web,flutter |
| `/api/video-streams` | GET/POST | mobileJWT,nextauth | follow,liveFortuneTeller,notification,videoStream,videoStreamViewer | ✓ |  | web,components,flutter,api2 |
| `/api/video-streams/[streamId]` | GET/PATCH | mobileJWT,nextauth,adminCheck | user,videoStream,videoStreamViewer |  |  | web,flutter |
| `/api/video-streams/[streamId]/auto-close` | GET/POST | mobileJWT | videoStream,videoStreamViewer |  |  | web,flutter |
| `/api/video-streams/[streamId]/ban` | GET/POST/DELETE | mobileJWT | streamBan,streamCoBroadcaster,user,videoStream |  |  | web,flutter |
| `/api/video-streams/[streamId]/co-broadcast` | GET/POST/PATCH | mobileJWT | streamCoBroadcaster,user,videoStream |  |  | web,components,flutter |
| `/api/video-streams/[streamId]/co-broadcast/invite` | POST | mobileJWT | streamCoBroadcaster,videoStream |  |  | flutter |
| `/api/video-streams/[streamId]/comments` | GET/POST | mobileJWT | videoStreamComment |  |  | web,flutter |
| `/api/video-streams/[streamId]/end` | POST | mobileJWT,adminCheck | videoStream,videoStreamViewer |  |  | flutter |
| `/api/video-streams/[streamId]/fortune-requests` | GET/POST/PATCH/DELETE | mobileJWT | fortuneRequestType,streamFortuneRequest,user,videoStream |  |  | web,flutter |
| `/api/video-streams/[streamId]/fortune-requests/my-status` | GET | mobileJWT | streamFortuneRequest |  |  | web,flutter |
| `/api/video-streams/[streamId]/gifts` | GET/POST | mobileJWT,nextauth | giftType,pKBattle,siteAnnouncement,streamGift,user… | ✓ |  | web,flutter |
| `/api/video-streams/[streamId]/join` | POST/DELETE | mobileJWT | videoStream,videoStreamViewer |  |  | web,flutter |
| `/api/video-streams/[streamId]/leave` | POST | mobileJWT | videoStream,videoStreamViewer |  |  | flutter |
| `/api/video-streams/[streamId]/like` | GET/POST | mobileJWT | videoStream |  |  | web,flutter |
| `/api/video-streams/[streamId]/live-started` | POST | mobileJWT | follow,notification,videoStream |  |  | flutter |
| `/api/video-streams/[streamId]/media-heartbeat` | POST | mobileJWT | videoStream |  |  | web |
| `/api/video-streams/[streamId]/messages` | GET/POST | mobileJWT | videoStream,videoStreamComment |  |  | flutter |
| `/api/video-streams/[streamId]/moderators` | GET/POST/DELETE | mobileJWT | streamModerator,user,videoStream |  |  | web,flutter |
| `/api/video-streams/[streamId]/mute` | GET/POST/DELETE | mobileJWT | streamModerator,streamMutedViewer,videoStream |  |  | web,flutter |
| `/api/video-streams/[streamId]/pk-battle` | GET/POST | mobileJWT | pKBattle,user,videoStream |  |  | flutter |
| `/api/video-streams/[streamId]/signal` | GET/POST/DELETE | mobileJWT | videoStreamSignal |  |  | flutter |
| `/api/video-streams/[streamId]/stream` | GET | mobileJWT | videoStream,videoStreamViewer | ✓ | ✓ | flutter |
| `/api/video-streams/[streamId]/viewers` | GET | public? | streamGift,user,videoStreamViewer |  |  | web,flutter |
| `/api/video-streams/gifts` | GET | mobileJWT | — | ✓ |  | web,flutter |
| `/api/video-streams/pk` | GET/POST | mobileJWT,nextauth,adminCheck | chatRoom,chatUserRole,pKBattle,user,videoStream |  |  | web,flutter |
| `/api/video-streams/pk/list` | GET | public? | pKBattle,user |  |  | flutter |
| `/api/video-streams/pk/score` | POST | public? | pKBattle |  |  | web,flutter |
| `/api/video-streams/signal` | GET/POST/DELETE | mobileJWT | videoStreamSignal |  |  | — |
| `/api/wallet` | GET | mobileJWT | user |  |  | flutter |
| `/api/warmup` | GET | public? | — | ✓ |  | flutter |
| `/api/weekly-dream-report` | GET/POST | mobileJWT | dreamDiaryEntry,weeklyDreamReport |  |  | web,flutter |
| `/api/withdrawals` | GET/POST | mobileJWT,nextauth | agencyUser,liveFortuneTeller,user,withdrawalRequest | ✓ |  | web,flutter |
| `/api/youtube/search` | GET | mobileJWT | — |  |  | web,components,flutter,api2 |

## 3. İkinci Backend (Express, `api/`) — Tam Endpoint Tablosu

Kaynak: Flutter reposu içindeki `api/src/index.ts` mount haritası + `api/src/routes/*.ts` (26 router dosyası).

| Path | Metot | Router dosyası |
|---|---|---|
| `/api/admin/bootstrap` | POST | wallet.ts |
| `/api/admin/cfc-payment-requests` | GET | wallet.ts |
| `/api/admin/cfc-payment-requests` | PATCH | wallet.ts |
| `/api/admin/cfc-settings` | GET | wallet.ts |
| `/api/admin/cfc-settings` | POST | wallet.ts |
| `/api/admin/notifications` | GET | wallet.ts |
| `/api/admin/payment-notifications` | GET | wallet.ts |
| `/api/admin/payment-requests` | GET | wallet.ts |
| `/api/admin/payment-requests/dismiss-pending` | POST | wallet.ts |
| `/api/admin/payments/stream` | GET | wallet.ts |
| `/api/admin/voice-room-finance-audit` | GET | voice_room_settings.ts |
| `/api/admin/voice-room-settings` | GET | voice_room_settings.ts |
| `/api/admin/voice-room-settings` | POST | voice_room_settings.ts |
| `/api/advisors/online` | GET | home.ts |
| `/api/announcements` | GET | social.ts |
| `/api/auth/forgot-password` | POST | auth_mobile.ts |
| `/api/auth/google` | POST | auth.ts |
| `/api/auth/login` | POST | auth.ts |
| `/api/auth/logout` | POST | auth.ts |
| `/api/auth/logout-all` | POST | auth.ts |
| `/api/auth/me` | GET | auth.ts |
| `/api/auth/mobile-google` | POST | auth_mobile.ts |
| `/api/auth/mobile-login` | POST | auth_mobile.ts |
| `/api/auth/mobile-refresh` | POST | auth_mobile.ts |
| `/api/auth/mobile-register` | POST | auth_mobile.ts |
| `/api/auth/mobile-send-verification` | POST | auth_mobile.ts |
| `/api/auth/mobile-sessions` | GET | auth_mobile.ts |
| `/api/auth/mobile-sessions/:id` | DELETE | auth_mobile.ts |
| `/api/auth/mobile-tiktok` | POST | auth_mobile.ts |
| `/api/auth/mobile-verify-email` | POST | auth_mobile.ts |
| `/api/auth/refresh` | POST | auth.ts |
| `/api/auth/register` | POST | auth.ts |
| `/api/auth/tiktok` | POST | auth.ts |
| `/api/banners` | GET | home.ts |
| `/api/celebrities/posts/latest` | GET | social.ts |
| `/api/chat/music/popular` | GET | chat_rooms.ts |
| `/api/chat/rooms` | GET | chat_rooms.ts |
| `/api/chat/rooms/:roomId/background` | PATCH | chat_rooms.ts |
| `/api/chat/rooms/:roomId/banned-words` | GET | chat_rooms.ts |
| `/api/chat/rooms/:roomId/banned-words` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/banned-words/:word` | DELETE | chat_rooms.ts |
| `/api/chat/rooms/:roomId/bans` | GET | chat_rooms.ts |
| `/api/chat/rooms/:roomId/bans/:targetUserId` | DELETE | chat_rooms.ts |
| `/api/chat/rooms/:roomId/bans/:targetUserId` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/current-song` | GET | chat_rooms.ts |
| `/api/chat/rooms/:roomId/dj` | GET | chat_rooms.ts |
| `/api/chat/rooms/:roomId/dj` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/dj/:targetUserId` | DELETE | chat_rooms.ts |
| `/api/chat/rooms/:roomId/dj/:targetUserId` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/gifts` | GET | chat_rooms.ts |
| `/api/chat/rooms/:roomId/gifts` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/mentions` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/messages` | DELETE | chat_rooms.ts |
| `/api/chat/rooms/:roomId/messages` | GET | chat_rooms.ts |
| `/api/chat/rooms/:roomId/messages` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/music-queue` | DELETE | chat_rooms.ts |
| `/api/chat/rooms/:roomId/music-queue` | GET | chat_rooms.ts |
| `/api/chat/rooms/:roomId/music-queue` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/music-queue/:itemId` | DELETE | chat_rooms.ts |
| `/api/chat/rooms/:roomId/music-queue/advance` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/music-queue/complete` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/music-request-by-query` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/music-settings` | PATCH | chat_rooms.ts |
| `/api/chat/rooms/:roomId/music-stream` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/pause` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/pk-battle` | GET | chat_rooms.ts |
| `/api/chat/rooms/:roomId/pk-battle` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/presence` | DELETE | chat_rooms.ts |
| `/api/chat/rooms/:roomId/presence` | GET | chat_rooms.ts |
| `/api/chat/rooms/:roomId/presence` | PATCH | chat_rooms.ts |
| `/api/chat/rooms/:roomId/presence` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/queue` | DELETE | chat_rooms.ts |
| `/api/chat/rooms/:roomId/queue` | GET | chat_rooms.ts |
| `/api/chat/rooms/:roomId/resume` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/seats` | PATCH | chat_rooms.ts |
| `/api/chat/rooms/:roomId/seats` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/skip` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/song-request` | GET | chat_rooms.ts |
| `/api/chat/rooms/:roomId/song-request` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/song/:queueId` | DELETE | chat_rooms.ts |
| `/api/chat/rooms/:roomId/speak-request` | DELETE | chat_rooms.ts |
| `/api/chat/rooms/:roomId/speak-request` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/speak-requests` | GET | chat_rooms.ts |
| `/api/chat/rooms/:roomId/speak-requests/:targetUserId/approve` | POST | chat_rooms.ts |
| `/api/chat/rooms/:roomId/stream` | GET | chat_rooms.ts |
| `/api/chat/rooms/:roomId/youtube-search` | GET | chat_rooms.ts |
| `/api/chat/rooms/backgrounds` | GET | chat_rooms.ts |
| `/api/chat/rooms/create` | POST | chat_rooms.ts |
| `/api/chat/youtube-audio` | GET | chat_rooms.ts |
| `/api/chat/youtube-search` | GET | chat_rooms.ts |
| `/api/chat/youtube-stream` | GET | chat_rooms.ts |
| `/api/coins/balance` | GET | social.ts |
| `/api/coins/spend` | POST | social.ts |
| `/api/daily-rewards` | GET | home.ts |
| `/api/devices/fcm` | POST | devices.ts |
| `/api/fortune-tellers` | GET | social.ts |
| `/api/fortune-tellers/:id` | GET | social.ts |
| `/api/fortune-tellers/apply` | POST | social.ts |
| `/api/fortune-tellers/my-profile` | GET | social.ts |
| `/api/fortune-tellers/session` | POST | social.ts |
| `/api/fortune-tellers/session/:sessionId` | GET | social.ts |
| `/api/fortune-tellers/session/:sessionId/respond` | POST | social.ts |
| `/api/fortune-tellers/sessions` | GET | social.ts |
| `/api/fortune-tellers/sessions/:sessionId` | PATCH | social.ts |
| `/api/fortune-tellers/sessions/incoming` | GET | social.ts |
| `/api/fortune-tellers/sessions/stream` | GET | social.ts |
| `/api/fortune-tellers/toggle-online` | POST | social.ts |
| `/api/games` | GET | home.ts |
| `/api/games/auto-match` | POST | games.ts |
| `/api/games/history` | GET | games.ts |
| `/api/games/leaderboard` | POST | games.ts |
| `/api/games/mini-scores` | GET | games.ts |
| `/api/games/mini-scores` | POST | games.ts |
| `/api/games/profile` | GET | games.ts |
| `/api/games/room/:roomId` | POST | games.ts |
| `/api/games/room/:roomId/chat` | POST | games.ts |
| `/api/games/room/:roomId/join` | POST | games.ts |
| `/api/games/rooms` | GET | games.ts |
| `/api/games/rooms` | POST | games.ts |
| `/api/gifts` | GET | gifts.ts |
| `/api/gifts/:streamId/gifts` | GET | gifts.ts |
| `/api/gifts/:streamId/gifts` | POST | gifts.ts |
| `/api/gifts/:streamId/gifts/leaderboard` | GET | gifts.ts |
| `/api/gifts/gifts` | GET | gifts.ts |
| `/api/jeton` | GET | wallet.ts |
| `/api/live/create-room` | POST | live_field.ts |
| `/api/live/fal-request/:requestId` | GET | live_fal_requests.ts |
| `/api/live/fal-request/:requestId/complete` | POST | live_fal_requests.ts |
| `/api/live/fal-request/:requestId/update` | POST | live_fal_requests.ts |
| `/api/live/fal-request/create` | POST | live_fal_requests.ts |
| `/api/live/fal-requests` | GET | live_fal_requests.ts |
| `/api/live/gift-types` | GET | live_field.ts |
| `/api/live/gift/send` | POST | live_field.ts |
| `/api/live/heartbeat` | POST | live_field.ts |
| `/api/live/join-room` | POST | live_field.ts |
| `/api/live/leave-room` | POST | live_field.ts |
| `/api/live/message` | POST | live_field.ts |
| `/api/live/online-users` | GET | live_field.ts |
| `/api/live/pk` | GET | live_field.ts |
| `/api/live/pk` | POST | live_field.ts |
| `/api/live/pk/score` | POST | live_field.ts |
| `/api/live/rooms` | GET | live_field.ts |
| `/api/live/rooms/:id/end` | POST | live_field.ts |
| `/api/live/seats` | GET | live_field.ts |
| `/api/live/seats` | POST | live_field.ts |
| `/api/livekit/token` | POST | livekit.ts |
| `/api/me` | DELETE | users.ts |
| `/api/me` | GET | wallet.ts |
| `/api/me` | PATCH | users.ts |
| `/api/membership/packages` | GET | wallet.ts |
| `/api/membership/purchase` | POST | wallet.ts |
| `/api/messages` | GET | messages.ts |
| `/api/messages/:peerUserId` | GET | messages.ts |
| `/api/messages/:peerUserId` | POST | messages.ts |
| `/api/messages/:peerUserId/:messageId` | DELETE | messages.ts |
| `/api/messages/conversations` | GET | messages.ts |
| `/api/messages/conversations` | POST | messages.ts |
| `/api/messages/conversations/:id/messages` | GET | messages.ts |
| `/api/messages/conversations/:id/messages` | POST | messages.ts |
| `/api/messages/conversations/:id/typing` | POST | messages.ts |
| `/api/music/search` | GET | music.ts |
| `/api/notifications` | GET | notifications.ts |
| `/api/notifications/:id/read` | PATCH | notifications.ts |
| `/api/notifications/payment` | DELETE | notifications.ts |
| `/api/payment/config` | GET | wallet.ts |
| `/api/payment/requests` | GET | wallet.ts |
| `/api/payment/requests` | PATCH | wallet.ts |
| `/api/payment/requests` | POST | wallet.ts |
| `/api/pk/battles` | POST | pk_battles.ts |
| `/api/pk/battles/:id` | GET | pk_battles.ts |
| `/api/pk/battles/:id/accept` | POST | pk_battles.ts |
| `/api/pk/battles/:id/end` | POST | pk_battles.ts |
| `/api/pk/battles/:id/reject` | POST | pk_battles.ts |
| `/api/pk/history` | GET | pk_battles.ts |
| `/api/platform/commission-rate` | GET | voice_room_settings.ts |
| `/api/platform/voice-room-settings` | GET | voice_room_settings.ts |
| `/api/public-stats` | GET | social.ts |
| `/api/referral` | GET | wallet.ts |
| `/api/reports` | POST | reports.ts |
| `/api/short-videos` | GET | short_videos.ts |
| `/api/short-videos/:id` | DELETE | short_videos.ts |
| `/api/short-videos/:id` | GET | short_videos.ts |
| `/api/short-videos/:id/comments` | GET | short_videos.ts |
| `/api/short-videos/:id/comments` | POST | short_videos.ts |
| `/api/short-videos/:id/like` | POST | short_videos.ts |
| `/api/short-videos/:id/save` | POST | short_videos.ts |
| `/api/short-videos/:id/share` | POST | short_videos.ts |
| `/api/short-videos/:id/stream` | GET | short_videos.ts |
| `/api/short-videos/:id/view` | POST | short_videos.ts |
| `/api/short-videos/profile/:userId` | GET | short_videos.ts |
| `/api/short-videos/upload` | POST | short_videos.ts |
| `/api/short-videos/user/:userId` | GET | short_videos.ts |
| `/api/short-videos/viewed/me` | GET | short_videos.ts |
| `/api/social/posts` | GET | socialPosts.ts |
| `/api/social/posts` | POST | socialPosts.ts |
| `/api/social/posts/:id` | DELETE | socialPosts.ts |
| `/api/social/posts/:id/comments` | GET | socialPosts.ts |
| `/api/social/posts/:id/comments` | POST | socialPosts.ts |
| `/api/social/posts/:id/likes` | POST | socialPosts.ts |
| `/api/social/posts/auto-fortune` | POST | socialPosts.ts |
| `/api/social/stories` | GET | stories.ts |
| `/api/social/stories` | POST | stories.ts |
| `/api/stories` | GET | stories.ts |
| `/api/stories` | POST | stories.ts |
| `/api/teller-chat/:sessionId` | GET | social.ts |
| `/api/teller-chat/:sessionId` | POST | social.ts |
| `/api/tournaments` | GET | games.ts |
| `/api/tournaments/join` | POST | games.ts |
| `/api/trend-videos` | GET | social.ts |
| `/api/trtc/token` | POST | live_field.ts |
| `/api/trtc/usersig` | POST | trtc.ts |
| `/api/user/activity` | GET | userFlutterApi.ts |
| `/api/user/activity` | PATCH | userFlutterApi.ts |
| `/api/user/broadcast-history` | GET | userFlutterApi.ts |
| `/api/user/co-broadcast-invites` | GET | userFlutterApi.ts |
| `/api/user/credits` | GET | wallet.ts |
| `/api/user/favorites` | GET | userFlutterApi.ts |
| `/api/user/favorites` | POST | userFlutterApi.ts |
| `/api/user/favorites/:id` | DELETE | userFlutterApi.ts |
| `/api/user/fortunes` | GET | userFlutterApi.ts |
| `/api/user/fortunes` | POST | userFlutterApi.ts |
| `/api/user/fortunes/:fortuneId` | GET | userFlutterApi.ts |
| `/api/users/:userId` | GET | social.ts |
| `/api/users/:userId/follow` | DELETE | social.ts |
| `/api/users/:userId/follow` | POST | social.ts |
| `/api/users/:userId/followers` | GET | profileExtras.ts |
| `/api/users/:userId/following` | GET | profileExtras.ts |
| `/api/users/lookup/:username` | GET | profileExtras.ts |
| `/api/users/me/activity` | GET | profileExtras.ts |
| `/api/users/me/activity` | PATCH | profileExtras.ts |
| `/api/users/me/broadcast-history` | GET | profileExtras.ts |
| `/api/users/me/gifts-received` | GET | profileExtras.ts |
| `/api/users/me/stats` | GET | profileExtras.ts |
| `/api/users/search` | GET | profileExtras.ts |
| `/api/video-streams` | GET | video_streams.ts |
| `/api/video-streams` | POST | video_streams.ts |
| `/api/video-streams/:id` | GET | video_streams.ts |
| `/api/video-streams/:id/ban` | DELETE | video_streams.ts |
| `/api/video-streams/:id/ban` | POST | video_streams.ts |
| `/api/video-streams/:id/co-broadcast` | GET | video_streams.ts |
| `/api/video-streams/:id/co-broadcast` | POST | video_streams.ts |
| `/api/video-streams/:id/co-broadcast/invite` | POST | video_streams.ts |
| `/api/video-streams/:id/end` | POST | video_streams.ts |
| `/api/video-streams/:id/fortune-requests` | DELETE | video_streams.ts |
| `/api/video-streams/:id/fortune-requests` | GET | video_streams.ts |
| `/api/video-streams/:id/fortune-requests` | PATCH | video_streams.ts |
| `/api/video-streams/:id/fortune-requests` | POST | video_streams.ts |
| `/api/video-streams/:id/fortune-requests/:requestId` | PATCH | video_streams.ts |
| `/api/video-streams/:id/fortune-requests/my-status` | GET | video_streams.ts |
| `/api/video-streams/:id/join` | POST | video_streams.ts |
| `/api/video-streams/:id/leave` | POST | video_streams.ts |
| `/api/video-streams/:id/like` | POST | video_streams.ts |
| `/api/video-streams/:id/live-started` | POST | video_streams.ts |
| `/api/video-streams/:id/messages` | GET | video_streams.ts |
| `/api/video-streams/:id/messages` | POST | video_streams.ts |
| `/api/video-streams/:id/moderator` | DELETE | video_streams.ts |
| `/api/video-streams/:id/moderator` | POST | video_streams.ts |
| `/api/video-streams/:id/moderators` | DELETE | video_streams.ts |
| `/api/video-streams/:id/moderators` | GET | video_streams.ts |
| `/api/video-streams/:id/moderators` | POST | video_streams.ts |
| `/api/video-streams/:id/mute` | DELETE | video_streams.ts |
| `/api/video-streams/:id/mute` | POST | video_streams.ts |
| `/api/video-streams/:id/pk-battle` | GET | video_streams.ts |
| `/api/video-streams/:id/pk-battle` | POST | video_streams.ts |
| `/api/video-streams/:id/signal` | GET | video_streams.ts |
| `/api/video-streams/:id/signal` | POST | video_streams.ts |
| `/api/video-streams/:id/stream` | GET | video_streams.ts |
| `/api/video-streams/:streamId/gifts` | GET | gifts.ts |
| `/api/video-streams/:streamId/gifts` | POST | gifts.ts |
| `/api/video-streams/:streamId/gifts/leaderboard` | GET | gifts.ts |
| `/api/video-streams/gifts` | GET | gifts.ts |
| `/api/wallet` | GET | wallet.ts |

## 4. SSE / Realtime Uçları (ana backend)

- `/api/chat/rooms/[roomId]/stream` → `app/api/chat/rooms/[roomId]/stream/route.ts`
- `/api/fortune-tellers/sessions/stream` → `app/api/fortune-tellers/sessions/stream/route.ts`
- `/api/fortunes/ask-uyumu` → `app/api/fortunes/ask-uyumu/route.ts`
- `/api/fortunes/aura-analizi` → `app/api/fortunes/aura-analizi/route.ts`
- `/api/fortunes/burc-yorumu` → `app/api/fortunes/burc-yorumu/route.ts`
- `/api/fortunes/dogum-haritasi` → `app/api/fortunes/dogum-haritasi/route.ts`
- `/api/fortunes/el-fali` → `app/api/fortunes/el-fali/route.ts`
- `/api/fortunes/evet-hayir` → `app/api/fortunes/evet-hayir/route.ts`
- `/api/fortunes/istihare` → `app/api/fortunes/istihare/route.ts`
- `/api/fortunes/kahve-fali` → `app/api/fortunes/kahve-fali/route.ts`
- `/api/fortunes/kahve-fali-image` → `app/api/fortunes/kahve-fali-image/route.ts`
- `/api/fortunes/katina` → `app/api/fortunes/katina/route.ts`
- `/api/fortunes/melek-kartlari` → `app/api/fortunes/melek-kartlari/route.ts`
- `/api/fortunes/numeroloji` → `app/api/fortunes/numeroloji/route.ts`
- `/api/fortunes/ruya-yorumu` → `app/api/fortunes/ruya-yorumu/route.ts`
- `/api/fortunes/tarot-fali` → `app/api/fortunes/tarot-fali/route.ts`
- `/api/notifications/stream` → `app/api/notifications/stream/route.ts`
- `/api/room/[sessionId]/stream` → `app/api/room/[sessionId]/stream/route.ts`
- `/api/video-streams/[streamId]/stream` → `app/api/video-streams/[streamId]/stream/route.ts`

İkinci backend realtime: **Socket.IO** (`api/src/socket/giftHub.ts`) + `/api/admin/payments/stream`, `/api/chat/rooms/*/music-stream`, `/api/short-videos/*/stream`.

## 5. Veritabanı Modeli Kullanımı

Ana şemada **196** model tanımlı. Kod içinde hiç sorgulanmayan **36** model:

`AnonymousFortune`, `AvatarAccessory`, `CelebrityFollow`, `CelebrityPostComment`, `CelebrityPostLike`, `ChatBubbleSkin`, `EmojiPack`, `EntranceEffect`, `FanClub`, `FanClubMember`, `FanClubPoll`, `FanClubPollVote`, `FanClubPost`, `FanClubPostLike`, `GiftBattle`, `GiftBattleParticipant`, `GiftGoal`, `GiftMission`, `LiveGuestInvite`, `MicFrame`, `NameEffect`, `OkeyMatch`, `OkeyMatchPlayer`, `PkBan`, `PkEvent`, `PkGift`, `PkParticipant`, `PkScore`, `PkSeat`, `PkStat`, `RevenueRule`, `Session`, `UserMissionProgress`, `VerificationToken`, `VoiceSignal`, `WeeklyTournamentEntry`

> Bu modellerin bir kısmı Flutter'ın çağırdığı ama backend'de karşılığı olmayan uçlarla birebir örtüşüyor (PK, hediye savaşı, fan kulüp, ünlü profili, kozmetik). Yani **şema hazırlanmış, uç yazılmamış**. Detay: `BACKEND_FLUTTER_PARITY.md`.

## 6. Yöntemin Bilinen Sınırları (dürüstlük notu)

- Path eşleştirmede `${...}` ve `[param]` ifadeleri `*` olarak normalize edildi; dinamik olarak string birleştirilerek üretilen adresler eksik yakalanmış olabilir.
- Catch-all route (`/api/[...unmatched]`) prefix eşleşmesi yapmaz; bu nedenle bazı adresler "eşleşmedi" görünebilir.
- Auth sütunu kod içi desen taramasına dayanır (`getServerSession`, `requireAuth`, `verifyMobileToken` vb.); çalışma zamanında doğrulanmadı.
- **Hiçbir uç canlı ortamda çağrılmadı.** Canlı doğrulama = `NOT PERFORMED`.