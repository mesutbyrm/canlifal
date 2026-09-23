# CANLIFAL_API.md — Endpoint Envanteri (PHASE 1 AUDIT)

> Otomatik üretim: `scripts_docs/generate_api_docs.py` → `backend-docs/endpoints_index.json`. Tarih: 2026-08-27

**Toplam:** 737 handler / 473 benzersiz path / 92 üst grup.

**Auth dağılımı:** dual (mobil JWT + web session) 390, session-only 226, public 121.

**Admin korumalı:** 288 handler. **Rate limit uygulanmış:** 9 handler.

**Metodlar:** GET 345, POST 257, DELETE 68, PATCH 52, PUT 15.


`/api/v1/<path>` çağrıları `middleware.ts` tarafından `/api/<path>`'e rewrite edilir; yanıt `x-api-version: v1` header'ı taşır. Aşağıdaki tüm yollar her iki prefix ile de çalışır.


Legend — AUTH: `public` = kimlik doğrulama yok, `session` = sadece web oturumu, `dual` = mobil Bearer JWT veya web oturumu. ADMIN: rol kontrolü var. RL: rate limit var.


## /api/activities  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/activities` | dual | — | — | — | — |

## /api/admin  (223 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/admin/activity-feed` | session | ✅ | — | — | — |
| POST | `/api/admin/activity-feed` | session | ✅ | — | — | isEnabled, maxItems, specificUserIds, visibleToAdmin, visibleToBasic, visibleToDiamond, visibleToGold, visibleToGuests, visibleToModerator, visibleToPremium |
| DELETE | `/api/admin/ad-networks` | session | ✅ | — | — | — |
| GET | `/api/admin/ad-networks` | session | ✅ | — | — | — |
| POST | `/api/admin/ad-networks` | session | ✅ | — | — | adCode, adUnitId, appId, id, isActive, name, provider, sortOrder |
| DELETE | `/api/admin/agencies` | session | ✅ | — | — | agencyId |
| GET | `/api/admin/agencies` | session | ✅ | — | — | — |
| PATCH | `/api/admin/agencies` | session | ✅ | — | — | action, agencyId |
| GET | `/api/admin/announcement-sections` | session | ✅ | — | — | — |
| POST | `/api/admin/announcement-sections` | session | ✅ | — | — | categoryConfig, categoryKey, categorySettings, giftAnnouncementSettings |
| DELETE | `/api/admin/awards` | session | ✅ | — | — | — |
| GET | `/api/admin/awards` | session | ✅ | — | — | — |
| POST | `/api/admin/awards` | session | ✅ | — | — | awardType, endDate, startDate, tellerId, title |
| GET | `/api/admin/backup` | session | ✅ | — | — | — |
| DELETE | `/api/admin/badges` | session | ✅ | — | — | — |
| GET | `/api/admin/badges` | session | ✅ | — | — | — |
| POST | `/api/admin/badges` | session | ✅ | — | — | bgColor, color, description, icon, name, tier, userId |
| PUT | `/api/admin/badges` | session | ✅ | — | — | bgColor, color, description, icon, id, isActive, name, sortOrder, tier, userId |
| GET | `/api/admin/bana-ozel` | session | ✅ | — | — | — |
| PATCH | `/api/admin/bana-ozel` | session | ✅ | — | — | id |
| POST | `/api/admin/bana-ozel` | session | ✅ | — | — | category, icon, jetonCost, nameEn, nameTr, slug, sortOrder |
| GET | `/api/admin/blog` | session | ✅ | — | — | — |
| POST | `/api/admin/blog` | session | ✅ | — | — | authorName, category, contentEn, contentTr, coverImage, descEn, descTr, isAiGenerated, isEditorPick, isFeatured, isPremium, isPublished… |
| GET | `/api/admin/blog/analytics` | session | ✅ | — | — | — |
| PATCH | `/api/admin/blog/bulk-category` | session | ✅ | — | — | category, postIds |
| POST | `/api/admin/blog/bulk-delete` | session | ✅ | — | — | postIds |
| POST | `/api/admin/blog/bulk-generate` | session | ✅ | — | — | autoPublish, category, topics, zodiacSign |
| POST | `/api/admin/blog/bulk-import` | session | ✅ | — | — | — |
| PATCH | `/api/admin/blog/bulk-publish` | session | ✅ | — | — | isPublished, postIds |
| DELETE | `/api/admin/blog/categories` | session | ✅ | — | — | — |
| GET | `/api/admin/blog/categories` | session | ✅ | — | — | — |
| POST | `/api/admin/blog/categories` | session | ✅ | — | — | nameEn, nameTr, slug |
| GET | `/api/admin/blog/comments` | session | ✅ | — | — | — |
| PATCH | `/api/admin/blog/comments` | session | ✅ | — | — | action, commentId |
| POST | `/api/admin/blog/generate` | session | ✅ | — | — | keywords, mode, title |
| POST | `/api/admin/blog/import` | session | ✅ | — | — | — |
| POST | `/api/admin/blog/schedule-publish` | session | ✅ | — | — | — |
| DELETE | `/api/admin/blog/{postId}` | session | ✅ | — | postId | — |
| PATCH | `/api/admin/blog/{postId}` | session | ✅ | — | postId | authorName, category, contentEn, contentTr, coverImage, descEn, descTr, isAiGenerated, isEditorPick, isFeatured, isPremium, isPublished… |
| PUT | `/api/admin/blog/{postId}` | session | ✅ | — | postId | — |
| GET | `/api/admin/bots` | session | ✅ | — | — | — |
| PATCH | `/api/admin/bots` | session | ✅ | — | — | action, activityLevel, botIds, isActive, personality |
| GET | `/api/admin/bots/simulate` | session | ✅ | — | — | — |
| POST | `/api/admin/bots/simulate` | session | ✅ | — | — | action, roomId |
| GET | `/api/admin/bots/simulate-fortune` | session | ✅ | — | — | — |
| POST | `/api/admin/bots/simulate-fortune` | session | ✅ | — | — | — |
| GET | `/api/admin/bots/simulate-master` | session | ✅ | — | — | — |
| POST | `/api/admin/bots/simulate-master` | session | ✅ | — | — | — |
| GET | `/api/admin/bots/simulate-social` | session | ✅ | — | — | — |
| POST | `/api/admin/bots/simulate-social` | session | ✅ | — | — | — |
| DELETE | `/api/admin/broadcast-images` | session | ✅ | — | — | — |
| GET | `/api/admin/broadcast-images` | session | ✅ | — | — | — |
| PATCH | `/api/admin/broadcast-images` | session | ✅ | — | — | id, imageUrl, isActive, name, sortOrder |
| POST | `/api/admin/broadcast-images` | session | ✅ | — | — | imageUrl, name, sortOrder |
| GET | `/api/admin/button-order` | session | ✅ | — | — | — |
| POST | `/api/admin/button-order` | session | ✅ | — | — | order |
| DELETE | `/api/admin/cache` | session | ✅ | — | — | — |
| GET | `/api/admin/cache` | session | ✅ | — | — | — |
| GET | `/api/admin/cfc-payment-requests` | session | ✅ | — | — | — |
| PATCH | `/api/admin/cfc-payment-requests` | session | ✅ | — | — | action, requestId, reviewNote |
| GET | `/api/admin/cfc-settings` | session | ✅ | — | — | — |
| POST | `/api/admin/cfc-settings` | session | ✅ | — | — | — |
| DELETE | `/api/admin/chat-rooms` | session | ✅ | — | — | roomId |
| GET | `/api/admin/chat-rooms` | session | ✅ | — | — | — |
| POST | `/api/admin/chat-rooms` | session | ✅ | — | — | description, icon, name, roomType |
| PUT | `/api/admin/chat-rooms` | session | ✅ | — | — | backgroundImage, descEn, descTr, giftCommissionPercent, icon, isActive, isMuted, nameEn, nameTr, ownerId, roomId, roomType |
| DELETE | `/api/admin/contests` | session | ✅ | — | — | — |
| GET | `/api/admin/contests` | session | ✅ | — | — | — |
| PATCH | `/api/admin/contests` | session | ✅ | — | — | description, dreamPrompt, endDate, id, isActive, startDate, title |
| POST | `/api/admin/contests` | session | ✅ | — | — | description, dreamPrompt, endDate, startDate, title |
| GET | `/api/admin/credit-packages` | session | ✅ | — | — | — |
| POST | `/api/admin/credit-packages` | session | ✅ | — | — | bonusCredits, credits, currency, isFeatured, name, nameEn, price, sortOrder |
| DELETE | `/api/admin/credit-packages/{packageId}` | session | ✅ | — | packageId | — |
| PATCH | `/api/admin/credit-packages/{packageId}` | session | ✅ | — | packageId | bonusCredits, credits, currency, isActive, isFeatured, name, nameEn, price, sortOrder |
| POST | `/api/admin/credits` | session | ✅ | — | — | amount, currency, userId |
| GET | `/api/admin/currency-config` | session | ✅ | — | — | — |
| POST | `/api/admin/currency-config` | session | ✅ | — | — | area, areaName, cost, currencyType, id, isActive |
| PUT | `/api/admin/currency-config` | session | ✅ | — | — | configs |
| DELETE | `/api/admin/dreams` | session | ✅ | — | — | — |
| GET | `/api/admin/dreams` | session | ✅ | — | — | — |
| POST | `/api/admin/dreams` | session | ✅ | — | — | category, content, isPublished, keywords, metaDescription, summary, title |
| PUT | `/api/admin/dreams` | session | ✅ | — | — | category, content, id, isPublished, keywords, metaDescription, summary, title |
| PATCH | `/api/admin/dreams/bulk-category` | session | ✅ | — | — | category, dreamIds |
| POST | `/api/admin/dreams/bulk-delete` | session | ✅ | — | — | dreamIds |
| POST | `/api/admin/dreams/bulk-import` | session | ✅ | — | — | — |
| PATCH | `/api/admin/dreams/bulk-publish` | session | ✅ | — | — | dreamIds, isPublished |
| POST | `/api/admin/dreams/generate` | session | ✅ | — | — | title |
| GET | `/api/admin/finance` | session | ✅ | — | — | — |
| POST | `/api/admin/finance` | session | ✅ | — | — | action, amount, currency, key, reason, userId, value |
| DELETE | `/api/admin/fortune-request-types` | session | ✅ | — | — | — |
| GET | `/api/admin/fortune-request-types` | session | ✅ | — | — | — |
| PATCH | `/api/admin/fortune-request-types` | session | ✅ | — | — | description, icon, id, isActive, jetonCost, name, nameEn, sortOrder |
| POST | `/api/admin/fortune-request-types` | session | ✅ | — | — | description, icon, jetonCost, name, nameEn, sortOrder |
| GET | `/api/admin/fortunes` | session | ✅ | — | — | — |
| DELETE | `/api/admin/games` | session | ✅ | — | — | — |
| GET | `/api/admin/games` | session | ✅ | — | — | — |
| POST | `/api/admin/games` | session | ✅ | — | — | config, description, entryFee, icon, isActive, maxReward, minReward, slug, sortOrder, title |
| PUT | `/api/admin/games` | session | ✅ | — | — | config, description, entryFee, icon, id, isActive, maxReward, minReward, sortOrder, title |
| DELETE | `/api/admin/games/rooms` | session | ✅ | — | — | roomId |
| GET | `/api/admin/games/rooms` | session | ✅ | — | — | — |
| GET | `/api/admin/games/settings` | session | ✅ | — | — | — |
| PUT | `/api/admin/games/settings` | session | ✅ | — | — | — |
| GET | `/api/admin/gift-collections` | session | ✅ | — | — | — |
| PATCH | `/api/admin/gift-collections` | session | ✅ | — | — | description, iconCloudPath, iconEmoji, iconUrl, id, isActive, name, nameEn, slug, sortOrder |
| POST | `/api/admin/gift-collections` | session | ✅ | — | — | description, iconCloudPath, iconEmoji, iconUrl, isActive, name, nameEn, slug, sortOrder |
| POST | `/api/admin/gift-upload` | session | ✅ | — | — | contentType, fileName, purpose |
| GET | `/api/admin/gifts` | session | ✅ | — | — | — |
| POST | `/api/admin/gifts` | session | ✅ | — | — | animEndPoint, animStartPoint, animation, animationDurationMs, animationType, assetDurationMs, assetHeight, assetMimeType, assetType, assetUrl, assetWidth, campaignEnd… |
| GET | `/api/admin/gifts/stats` | session | ✅ | — | — | — |
| DELETE | `/api/admin/gifts/{giftId}` | session | ✅ | — | giftId | — |
| GET | `/api/admin/gifts/{giftId}` | session | ✅ | — | giftId | — |
| PATCH | `/api/admin/gifts/{giftId}` | session | ✅ | — | giftId | animationType, assetMimeType, assetType, assetUrl, cloudStoragePath, collectionId, iconImageCloudPath, iconImageUrl, musicCloudPath, musicUrl, soundCloudPath, soundUrl… |
| DELETE | `/api/admin/homepage-buttons` | session | ✅ | — | — | — |
| GET | `/api/admin/homepage-buttons` | session | ✅ | — | — | — |
| PATCH | `/api/admin/homepage-buttons` | session | ✅ | — | — | href, icon, id, isVisible, label, reorder, sortOrder, specialBehavior |
| POST | `/api/admin/homepage-buttons` | session | ✅ | — | — | href, icon, label, specialBehavior |
| DELETE | `/api/admin/homepage-fortune-cards` | session | ✅ | — | — | id |
| GET | `/api/admin/homepage-fortune-cards` | session | ✅ | — | — | — |
| PATCH | `/api/admin/homepage-fortune-cards` | session | ✅ | — | — | key, settings, value |
| POST | `/api/admin/homepage-fortune-cards` | session | ✅ | — | — | href, icon, id, image, isActive, name, sortOrder |
| PUT | `/api/admin/homepage-fortune-cards` | session | ✅ | — | — | id |
| GET | `/api/admin/live-tellers` | session | ✅ | — | — | — |
| POST | `/api/admin/live-tellers` | session | ✅ | — | — | bio, displayName, isVerified, pricePerSession, specialties, userId |
| DELETE | `/api/admin/live-tellers/{tellerId}` | session | ✅ | — | tellerId | — |
| GET | `/api/admin/live-tellers/{tellerId}` | session | ✅ | — | tellerId | — |
| PUT | `/api/admin/live-tellers/{tellerId}` | session | ✅ | — | tellerId | bio, displayName, isActive, isVerified, pricePerSession, specialties |
| POST | `/api/admin/live-tellers/{tellerId}/approve` | session | ✅ | — | tellerId | action, note |
| POST | `/api/admin/live-tellers/{tellerId}/ban` | session | ✅ | — | tellerId | action, reason |
| POST | `/api/admin/live-tellers/{tellerId}/bonus` | session | ✅ | — | tellerId | amount, reason |
| POST | `/api/admin/live-tellers/{tellerId}/freeze` | session | ✅ | — | tellerId | action, reason |
| PUT | `/api/admin/live-tellers/{tellerId}/permissions` | session | ✅ | — | tellerId | adminNotes, canChat, canEditProfile, canGoOnline, canSetPrice, canStartSession, canViewEarnings, canWithdraw, commissionRate, maxSessionsPerDay |
| DELETE | `/api/admin/live-tellers/{tellerId}/warning` | session | ✅ | — | tellerId | — |
| POST | `/api/admin/live-tellers/{tellerId}/warning` | session | ✅ | — | tellerId | reason |
| DELETE | `/api/admin/lucky-gifts/tiers` | session | ✅ | — | — | — |
| GET | `/api/admin/lucky-gifts/tiers` | session | ✅ | — | — | — |
| PATCH | `/api/admin/lucky-gifts/tiers` | session | ✅ | — | — | id |
| POST | `/api/admin/lucky-gifts/tiers` | session | ✅ | — | — | color, icon, isActive, isJackpot, multiplier, name, nameEn, sortOrder, weight |
| DELETE | `/api/admin/membership-badges` | session | ✅ | — | — | — |
| GET | `/api/admin/membership-badges` | session | ✅ | — | — | — |
| PATCH | `/api/admin/membership-badges` | session | ✅ | — | — | id, imageUrl, isActive, name, sortOrder, tier |
| POST | `/api/admin/membership-badges` | session | ✅ | — | — | imageUrl, isActive, name, sortOrder, tier |
| DELETE | `/api/admin/memberships` | session | ✅ | — | — | — |
| GET | `/api/admin/memberships` | session | ✅ | — | — | — |
| POST | `/api/admin/memberships` | session | ✅ | — | — | bonusJetons, currency, description, descriptionEn, discountPercent, durationDays, exclusiveBadge, features, isActive, isFeatured, name, nameEn… |
| PUT | `/api/admin/memberships` | session | ✅ | — | — | id |
| GET | `/api/admin/memberships/purchases` | session | ✅ | — | — | — |
| PATCH | `/api/admin/memberships/purchases` | session | ✅ | — | — | action, extendDays, purchaseId |
| POST | `/api/admin/memberships/purchases` | session | ✅ | — | — | customTier, durationDays, freeGrant, planId, userId |
| GET | `/api/admin/moderation` | session | ✅ | — | — | — |
| POST | `/api/admin/moderation` | session | ✅ | — | — | action, reason, targetId |
| DELETE | `/api/admin/notifications` | session | ✅ | — | — | — |
| GET | `/api/admin/notifications` | session | ✅ | — | — | — |
| POST | `/api/admin/notifications` | session | ✅ | — | — | imageUrl, message, scheduledAt, targetType, targetValue, title, url |
| DELETE | `/api/admin/online-fal/buttons` | session | ✅ | — | — | — |
| GET | `/api/admin/online-fal/buttons` | session | ✅ | — | — | — |
| PATCH | `/api/admin/online-fal/buttons` | session | ✅ | — | — | bgColor, borderColor, href, icon, id, isVisible, label, sortOrder, textColor |
| POST | `/api/admin/online-fal/buttons` | session | ✅ | — | — | bgColor, borderColor, href, icon, label, textColor |
| GET | `/api/admin/online-fal/sections` | session | ✅ | — | — | — |
| PATCH | `/api/admin/online-fal/sections` | session | ✅ | — | — | icon, id, isVisible, sortOrder, title |
| POST | `/api/admin/online-fal/sections` | session | ✅ | — | — | order |
| GET | `/api/admin/payment-methods` | session | ✅ | — | — | — |
| POST | `/api/admin/payment-methods` | session | ✅ | — | — | config, description, descriptionEn, isActive, name, nameEn, sortOrder, type |
| GET | `/api/admin/payments` | session | ✅ | — | — | — |
| PATCH | `/api/admin/payments` | session | ✅ | — | — | action, jetonAmount, notificationId |
| POST | `/api/admin/payments` | session | ✅ | — | — | jetonAmount, reason, userId |
| GET | `/api/admin/pending-counts` | session | ✅ | — | — | — |
| DELETE | `/api/admin/popups` | session | ✅ | — | — | — |
| GET | `/api/admin/popups` | session | ✅ | — | — | — |
| POST | `/api/admin/popups` | session | ✅ | — | — | buttons, isActive, maxShowCount, message, popupType, priority, showDelaySeconds, showOnRefresh, showTo, title |
| PUT | `/api/admin/popups` | session | ✅ | — | — | action, buttons, id, isActive, maxShowCount, message, popupType, priority, showDelaySeconds, showOnRefresh, showTo, title |
| DELETE | `/api/admin/profile-frames` | session | ✅ | — | — | — |
| GET | `/api/admin/profile-frames` | session | ✅ | — | — | — |
| POST | `/api/admin/profile-frames` | session | ✅ | — | — | id, imageUrl, isActive, name, sortOrder, tier |
| POST | `/api/admin/profile-frames/assign` | session | ✅ | — | — | frameId, userId |
| GET | `/api/admin/room-themes/backgrounds` | session | ✅ | — | — | — |
| PATCH | `/api/admin/room-themes/backgrounds` | session | ✅ | — | — | backgroundUrl, cloudStoragePath, id, soundCloudPath, soundUrl, thumbnailCloudPath, thumbnailUrl |
| POST | `/api/admin/room-themes/backgrounds` | session | ✅ | — | — | activeFrom, activeTo, animationSpeed, assetType, backgroundUrl, blurAmount, category, cloudStoragePath, description, hasParallax, hasZoom, isActive… |
| GET | `/api/admin/rooms` | session | ✅ | — | — | — |
| PATCH | `/api/admin/rooms` | session | ✅ | — | — | giftBeneficiaryId, giftCommissionPercent, roomId |
| GET | `/api/admin/seo-settings` | session | ✅ | — | — | — |
| POST | `/api/admin/seo-settings` | session | ✅ | — | — | — |
| GET | `/api/admin/settings` | session | ✅ | — | — | — |
| POST | `/api/admin/settings` | session | ✅ | — | — | description, key, value |
| DELETE | `/api/admin/site-pages` | session | ✅ | — | — | — |
| GET | `/api/admin/site-pages` | session | ✅ | — | — | — |
| POST | `/api/admin/site-pages` | session | ✅ | — | — | content, contentEn, isPublished, showInFooter, showInHeader, slug, sortOrder, title, titleEn |
| PUT | `/api/admin/site-pages` | session | ✅ | — | — | content, contentEn, id, isPublished, items, reorder, showInFooter, showInHeader, slug, sortOrder, title, titleEn |
| GET | `/api/admin/statistics` | session | ✅ | — | — | — |
| POST | `/api/admin/teller-levels` | session | ✅ | — | — | — |
| GET | `/api/admin/teller-performance` | session | ✅ | — | — | — |
| GET | `/api/admin/teller-verification` | session | ✅ | — | — | — |
| POST | `/api/admin/teller-verification` | session | ✅ | — | — | action, note, tellerId |
| GET | `/api/admin/ticker-messages` | session | ✅ | — | — | — |
| POST | `/api/admin/ticker-messages` | session | ✅ | — | — | icon, text |
| DELETE | `/api/admin/ticker-messages/{messageId}` | session | ✅ | — | messageId | — |
| PATCH | `/api/admin/ticker-messages/{messageId}` | session | ✅ | — | messageId | icon, isActive, sortOrder, text |
| DELETE | `/api/admin/tiktok-categories` | session | ✅ | — | — | — |
| GET | `/api/admin/tiktok-categories` | session | ✅ | — | — | — |
| PATCH | `/api/admin/tiktok-categories` | session | ✅ | — | — | description, id, isActive, sortOrder, title |
| POST | `/api/admin/tiktok-categories` | session | ✅ | — | — | description, title |
| DELETE | `/api/admin/tiktok-videos` | session | ✅ | — | — | — |
| GET | `/api/admin/tiktok-videos` | session | ✅ | — | — | — |
| PATCH | `/api/admin/tiktok-videos` | session | ✅ | — | — | categoryId, id, isActive, sortOrder, title |
| POST | `/api/admin/tiktok-videos` | session | ✅ | — | — | categoryId, tiktokUrl, tiktokUrls |
| PUT | `/api/admin/tiktok-videos` | session | ✅ | — | — | — |
| GET | `/api/admin/trend-videos` | session | ✅ | — | — | — |
| POST | `/api/admin/trend-videos` | session | ✅ | — | — | action, categoryId, channelName, description, duration, id, isActive, sortOrder, thumbnailUrl, title, videos, youtubeId |
| POST | `/api/admin/trend-videos/youtube` | session | ✅ | — | — | action, maxResults, query, urls |
| DELETE | `/api/admin/trends` | session | ✅ | — | — | — |
| GET | `/api/admin/trends` | session | ✅ | — | — | — |
| POST | `/api/admin/trends` | session | ✅ | — | — | id |
| GET | `/api/admin/users` | session | ✅ | — | — | — |
| GET | `/api/admin/users/search` | session | ✅ | — | — | — |
| POST | `/api/admin/users/withdrawal-limit` | session | ✅ | — | — | limit, userId |
| DELETE | `/api/admin/users/{userId}` | session | ✅ | — | userId | — |
| GET | `/api/admin/users/{userId}` | session | ✅ | — | userId | — |
| PATCH | `/api/admin/users/{userId}` | session | ✅ | — | userId | action, amount, banReason, credits, email, image, membership, membershipExpiresAt, name, newPassword, phone, profileEffect… |
| DELETE | `/api/admin/video-streams` | session | ✅ | — | — | streamId |
| GET | `/api/admin/video-streams` | session | ✅ | — | — | — |
| PATCH | `/api/admin/video-streams` | session | ✅ | — | — | action, streamId |
| GET | `/api/admin/visitor-stats` | session | ✅ | — | — | — |
| GET | `/api/admin/withdrawals` | session | ✅ | — | — | — |
| POST | `/api/admin/withdrawals` | session | ✅ | — | — | action, adminNote, requestId |

## /api/ads  (2 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/ads/active` | public | — | — | — | — |
| POST | `/api/ads/reward` | dual | — | — | — | — |

## /api/agency  (16 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| POST | `/api/agency/apply` | dual | — | — | — | contactEmail, contactPhone, description, name |
| GET | `/api/agency/earnings` | dual | — | — | — | — |
| GET | `/api/agency/invite` | dual | — | — | — | — |
| POST | `/api/agency/invite` | dual | — | — | — | expiresInDays, maxUses |
| POST | `/api/agency/join` | dual | — | — | — | inviteCode |
| GET | `/api/agency/leaderboard` | public | — | — | — | — |
| DELETE | `/api/agency/leave` | dual | — | — | — | — |
| POST | `/api/agency/leave` | dual | — | — | — | action, reason, requestId, reviewNote |
| DELETE | `/api/agency/members` | dual | — | — | — | — |
| GET | `/api/agency/members` | dual | — | — | — | — |
| POST | `/api/agency/members` | dual | — | — | — | username |
| GET | `/api/agency/my` | dual | — | — | — | — |
| PATCH | `/api/agency/my` | dual | — | — | — | description, name |
| GET | `/api/agency/tasks` | dual | — | — | — | — |
| GET | `/api/agency/withdrawals` | dual | — | — | — | — |
| POST | `/api/agency/withdrawals` | dual | — | — | — | action, note, requestId |

## /api/announcements  (3 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/announcements` | dual | — | — | — | — |
| POST | `/api/announcements` | dual | — | — | — | path, section |
| POST | `/api/announcements/event` | dual | — | — | — | details, eventType |

## /api/anonymous  (3 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/anonymous` | public | — | — | — | — |
| POST | `/api/anonymous` | public | — | — | — | deviceId, username |
| POST | `/api/anonymous/watch-ad` | public | — | — | — | deviceId |

## /api/astrology-panel  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/astrology-panel` | dual | — | — | — | — |

## /api/auth  (14 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| POST | `/api/auth/change-password` | dual | — | — | — | currentPassword, newPassword |
| POST | `/api/auth/forgot-password` | public | — | ✅ | — | email |
| POST | `/api/auth/logout` | dual | — | — | — | — |
| POST | `/api/auth/mobile-apple` | public | — | ✅ | — | fullName, identityToken, referralCode |
| POST | `/api/auth/mobile-google` | public | — | ✅ | — | idToken, referralCode |
| POST | `/api/auth/mobile-login` | public | — | ✅ | — | email, password, username |
| POST | `/api/auth/mobile-refresh` | public | — | — | — | refreshToken |
| POST | `/api/auth/mobile-register` | public | — | ✅ | — | birthDate, birthTime, email, name, password, preferredLanguage, referralCode, username |
| POST | `/api/auth/mobile-tiktok` | public | — | ✅ | — | code, redirectUri, referralCode |
| POST | `/api/auth/reclaim-device` | session | — | — | — | — |
| POST | `/api/auth/reset-password` | public | — | ✅ | — | password, token |
| GET | `/api/auth/verify-device` | session | — | — | — | — |
| GET | `/api/auth/{nextauth}` | public | — | — | nextauth | — |
| POST | `/api/auth/{nextauth}` | public | — | — | nextauth | — |

## /api/bana-ozel  (2 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/bana-ozel` | dual | — | — | — | — |
| POST | `/api/bana-ozel/open` | dual | — | — | — | slug |

## /api/blog  (10 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/blog` | public | — | — | — | — |
| GET | `/api/blog/categories` | public | — | — | — | — |
| DELETE | `/api/blog/comments` | dual | ✅ | — | — | — |
| GET | `/api/blog/comments` | dual | ✅ | — | — | — |
| POST | `/api/blog/comments` | dual | ✅ | — | — | content, parentId, postId |
| POST | `/api/blog/favorite` | dual | — | — | — | postId |
| GET | `/api/blog/interactions` | dual | — | — | — | — |
| POST | `/api/blog/like` | dual | — | — | — | postId |
| GET | `/api/blog/related` | public | — | — | — | — |
| GET | `/api/blog/zodiac` | public | — | — | — | — |

## /api/broadcast-images  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/broadcast-images` | dual | — | — | — | — |

## /api/cache  (2 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/cache` | dual | ✅ | — | — | — |
| POST | `/api/cache` | dual | ✅ | — | — | channel, data, field, key, member, members, message, op, prefix, score, ttl, value… |

## /api/chat  (54 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/chat/broadcast-images` | public | — | — | — | — |
| DELETE | `/api/chat/cleanup` | public | — | — | — | — |
| GET | `/api/chat/cleanup` | public | — | — | — | — |
| POST | `/api/chat/cleanup` | public | — | — | — | — |
| GET | `/api/chat/rooms` | public | — | — | — | — |
| GET | `/api/chat/rooms/backgrounds` | public | — | — | — | — |
| POST | `/api/chat/rooms/create` | dual | — | — | — | description, icon, name, paymentType, roomType |
| GET | `/api/chat/rooms/pk-list` | public | — | — | — | — |
| GET | `/api/chat/rooms/{roomId}/dj` | dual | ✅ | — | roomId | — |
| POST | `/api/chat/rooms/{roomId}/dj` | dual | ✅ | — | roomId | action, userId |
| GET | `/api/chat/rooms/{roomId}/gifts` | dual | — | — | roomId | — |
| POST | `/api/chat/rooms/{roomId}/gifts` | dual | — | — | roomId | battleId, giftTypeId, platform, quantity, receiverName, senderName, side, streamId |
| DELETE | `/api/chat/rooms/{roomId}/messages` | dual | ✅ | — | roomId | — |
| GET | `/api/chat/rooms/{roomId}/messages` | dual | ✅ | — | roomId | — |
| POST | `/api/chat/rooms/{roomId}/messages` | dual | ✅ | — | roomId | content, nickname |
| GET | `/api/chat/rooms/{roomId}/moderation` | dual | ✅ | — | roomId | — |
| POST | `/api/chat/rooms/{roomId}/moderation` | dual | ✅ | — | roomId | action, duration, message, reason, role, targetUserId, ttl |
| DELETE | `/api/chat/rooms/{roomId}/music` | dual | ✅ | — | roomId | — |
| GET | `/api/chat/rooms/{roomId}/music` | dual | ✅ | — | roomId | — |
| POST | `/api/chat/rooms/{roomId}/music` | dual | ✅ | — | roomId | duration, title, videoId |
| GET | `/api/chat/rooms/{roomId}/music-queue` | dual | — | — | roomId | — |
| POST | `/api/chat/rooms/{roomId}/music/stop` | dual | — | — | roomId | — |
| GET | `/api/chat/rooms/{roomId}/pk` | dual | ✅ | — | roomId | — |
| POST | `/api/chat/rooms/{roomId}/pk` | dual | ✅ | — | roomId | — |
| POST | `/api/chat/rooms/{roomId}/pk/score` | dual | — | — | roomId | amount, battleId, side |
| DELETE | `/api/chat/rooms/{roomId}/presence` | dual | ✅ | — | roomId | — |
| GET | `/api/chat/rooms/{roomId}/presence` | dual | ✅ | — | roomId | — |
| POST | `/api/chat/rooms/{roomId}/presence` | dual | ✅ | — | roomId | nickname, password, seatIndex |
| GET | `/api/chat/rooms/{roomId}/seats` | dual | — | — | roomId | — |
| PATCH | `/api/chat/rooms/{roomId}/seats` | dual | — | — | roomId | forceAssign, forceThrone, seatIndex, targetUserId |
| GET | `/api/chat/rooms/{roomId}/settings` | dual | — | — | roomId | — |
| PATCH | `/api/chat/rooms/{roomId}/settings` | dual | — | — | roomId | backgroundImage, bannedWords, bannerImage, descEn, descTr, giftCommissionPercent, icon, isActive, isMuted, nameEn, nameTr, password… |
| GET | `/api/chat/rooms/{roomId}/song-request` | dual | — | — | roomId | — |
| PATCH | `/api/chat/rooms/{roomId}/song-request` | dual | — | — | roomId | requestId |
| POST | `/api/chat/rooms/{roomId}/song-request` | dual | — | — | roomId | dedication, duration, note, priority, requestType, title, videoId |
| DELETE | `/api/chat/rooms/{roomId}/speak-request` | dual | — | — | roomId | — |
| GET | `/api/chat/rooms/{roomId}/speak-request` | dual | — | — | roomId | — |
| POST | `/api/chat/rooms/{roomId}/speak-request` | dual | — | — | roomId | message |
| DELETE | `/api/chat/rooms/{roomId}/speak-request/{userId}/block` | dual | — | — | roomId, userId | — |
| POST | `/api/chat/rooms/{roomId}/speak-request/{userId}/block` | dual | — | — | roomId, userId | reason |
| DELETE | `/api/chat/rooms/{roomId}/speak-request/{userId}/reject` | dual | — | — | roomId, userId | — |
| POST | `/api/chat/rooms/{roomId}/speak-request/{userId}/reject` | dual | — | — | roomId, userId | — |
| GET | `/api/chat/rooms/{roomId}/speak-requests` | dual | — | — | roomId | — |
| POST | `/api/chat/rooms/{roomId}/speak-requests/{targetUserId}/approve` | dual | — | — | roomId, targetUserId | — |
| GET | `/api/chat/rooms/{roomId}/state` | dual | — | — | roomId | — |
| GET | `/api/chat/rooms/{roomId}/stream` | dual | ✅ | — | roomId | — |
| POST | `/api/chat/rooms/{roomId}/transfer-ownership` | dual | ✅ | — | roomId | newOwnerId |
| GET | `/api/chat/rooms/{roomId}/typing` | dual | — | — | roomId | — |
| POST | `/api/chat/rooms/{roomId}/typing` | dual | — | — | roomId | isTyping |
| GET | `/api/chat/rooms/{roomId}/voice` | dual | ✅ | — | roomId | — |
| POST | `/api/chat/rooms/{roomId}/voice` | dual | ✅ | — | roomId | type |
| GET | `/api/chat/youtube-audio` | public | — | — | — | — |
| POST | `/api/chat/youtube-audio` | public | — | — | — | — |
| GET | `/api/chat/youtube-stream` | public | — | — | — | — |

## /api/compatibility  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| POST | `/api/compatibility` | public | — | — | — | moonSign1, moonSign2, risingSign1, risingSign2, sign1, sign2 |

## /api/contact  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| POST | `/api/contact` | public | — | — | — | email, message, name |

## /api/credit-packages  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/credit-packages` | public | — | — | — | — |

## /api/daily-login  (2 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/daily-login` | dual | — | — | — | — |
| POST | `/api/daily-login` | dual | — | — | — | — |

## /api/daily-missions  (2 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/daily-missions` | dual | — | — | — | — |
| POST | `/api/daily-missions` | dual | — | — | — | taskType |

## /api/devices  (2 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| DELETE | `/api/devices/fcm` | dual | — | — | — | token |
| POST | `/api/devices/fcm` | dual | — | — | — | appVersion, platform, token |

## /api/dream-contest  (4 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/dream-contest` | dual | — | — | — | — |
| GET | `/api/dream-contest/{contestId}/entries` | dual | — | — | contestId | — |
| POST | `/api/dream-contest/{contestId}/entries` | dual | — | — | contestId | interpretation |
| POST | `/api/dream-contest/{contestId}/vote` | dual | — | — | contestId | entryId |

## /api/dream-diary  (3 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| DELETE | `/api/dream-diary` | dual | — | — | — | id |
| GET | `/api/dream-diary` | dual | — | — | — | — |
| POST | `/api/dream-diary` | dual | — | — | — | analyzeWithAI, content, dreamDate, lucidity, mood, symbols, title |

## /api/dream-stats  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/dream-stats` | dual | — | — | — | — |

## /api/dream-symbols  (2 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/dream-symbols` | public | — | — | — | — |
| GET | `/api/dream-symbols/{slug}` | public | — | — | slug | — |

## /api/dreams  (14 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/dreams` | public | — | — | — | — |
| GET | `/api/dreams/favorites` | dual | — | — | — | — |
| POST | `/api/dreams/generate` | public | — | — | — | query |
| POST | `/api/dreams/interpret` | dual | — | — | — | dreamText |
| POST | `/api/dreams/morning-reminder` | public | — | — | — | — |
| GET | `/api/dreams/recommendations` | dual | — | — | — | — |
| GET | `/api/dreams/trends` | public | — | — | — | — |
| GET | `/api/dreams/{slug}` | public | — | — | slug | — |
| DELETE | `/api/dreams/{slug}/comments` | dual | ✅ | — | slug | commentId |
| GET | `/api/dreams/{slug}/comments` | dual | ✅ | — | slug | — |
| POST | `/api/dreams/{slug}/comments` | dual | ✅ | — | slug | content, didComeTrue, experienceType |
| GET | `/api/dreams/{slug}/favorite` | dual | — | — | slug | — |
| POST | `/api/dreams/{slug}/favorite` | dual | — | — | slug | — |
| POST | `/api/dreams/{slug}/view` | dual | — | — | slug | — |

## /api/favorite-tellers  (2 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/favorite-tellers` | dual | — | — | — | — |
| POST | `/api/favorite-tellers` | dual | — | — | — | tellerId |

## /api/football  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/football` | public | — | — | — | — |

## /api/fortune-access  (2 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| POST | `/api/fortune-access/check` | dual | — | — | — | adWatched, fortuneType |
| GET | `/api/fortune-access/ip-status` | public | — | — | — | — |

## /api/fortune-request-types  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/fortune-request-types` | public | — | — | — | — |

## /api/fortune-tellers  (18 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/fortune-tellers` | dual | — | — | — | — |
| POST | `/api/fortune-tellers` | dual | — | — | — | bio, displayName, pricePerSession, specialties |
| POST | `/api/fortune-tellers/apply` | dual | — | — | — | applicationNote, bio, displayName, specialties |
| GET | `/api/fortune-tellers/awards` | public | — | — | — | — |
| GET | `/api/fortune-tellers/gifts` | public | — | — | — | — |
| GET | `/api/fortune-tellers/my-profile` | dual | — | — | — | — |
| GET | `/api/fortune-tellers/session` | dual | ✅ | — | — | — |
| POST | `/api/fortune-tellers/session` | dual | ✅ | — | — | duration, fortuneType, tellerId |
| GET | `/api/fortune-tellers/sessions` | dual | — | — | — | — |
| GET | `/api/fortune-tellers/sessions/stream` | dual | — | — | — | — |
| PATCH | `/api/fortune-tellers/sessions/{sessionId}` | dual | — | — | sessionId | action |
| GET | `/api/fortune-tellers/toggle-online` | dual | — | — | — | — |
| POST | `/api/fortune-tellers/toggle-online` | dual | — | — | — | isOnline |
| GET | `/api/fortune-tellers/{tellerId}` | dual | ✅ | — | tellerId | — |
| PATCH | `/api/fortune-tellers/{tellerId}` | dual | ✅ | — | tellerId | avatar, bio, displayName, isActive, isOnline, isVerified, pricePerSession, specialties |
| GET | `/api/fortune-tellers/{tellerId}/reviews` | public | — | — | tellerId | — |
| GET | `/api/fortune-tellers/{tellerId}/session` | dual | ✅ | — | tellerId | — |
| POST | `/api/fortune-tellers/{tellerId}/session` | dual | ✅ | — | tellerId | duration, fortuneType |

## /api/fortunes  (15 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| POST | `/api/fortunes/ask-uyumu` | dual | — | — | — | language, partnerName, partnerSign, yourName, yourSign |
| POST | `/api/fortunes/aura-analizi` | dual | — | — | — | birthDate, currentMood, language, name, recentExperiences |
| POST | `/api/fortunes/burc-yorumu` | dual | — | — | — | language, zodiacSign |
| POST | `/api/fortunes/dogum-haritasi` | dual | — | — | — | birthDate, birthPlace, birthTime, language |
| POST | `/api/fortunes/el-fali` | dual | — | — | — | hand, language, palmImagePath |
| POST | `/api/fortunes/evet-hayir` | dual | — | — | — | language, question |
| POST | `/api/fortunes/istihare` | dual | — | — | — | language, question, situation |
| POST | `/api/fortunes/kahve-fali` | dual | — | — | — | description, language |
| POST | `/api/fortunes/kahve-fali-image` | dual | — | — | — | cupImagePath, language, saucerImagePath |
| POST | `/api/fortunes/katina` | dual | — | — | — | language, question |
| POST | `/api/fortunes/kursundokme` | dual | — | — | — | — |
| POST | `/api/fortunes/melek-kartlari` | dual | — | — | — | cardCount, language, question |
| POST | `/api/fortunes/numeroloji` | dual | — | — | — | birthDate, language, name |
| POST | `/api/fortunes/ruya-yorumu` | dual | — | — | — | dreamDescription, language |
| POST | `/api/fortunes/tarot-fali` | dual | — | — | — | cardCount, language, question |

## /api/games  (40 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/games` | public | — | — | — | — |
| POST | `/api/games/auto-match` | dual | — | — | — | — |
| GET | `/api/games/daily-reward` | dual | — | — | — | — |
| POST | `/api/games/daily-reward` | dual | — | — | — | — |
| POST | `/api/games/daily-spin` | dual | — | — | — | — |
| GET | `/api/games/grid-settings` | public | — | — | — | — |
| GET | `/api/games/lamba-cini` | dual | — | — | — | — |
| POST | `/api/games/lamba-cini` | dual | — | — | — | chestIndex |
| GET | `/api/games/leaderboard` | dual | — | — | — | — |
| GET | `/api/games/lobby` | dual | — | — | — | — |
| POST | `/api/games/play` | dual | — | — | — | gameSlug, result, score |
| GET | `/api/games/profile` | dual | — | — | — | — |
| GET | `/api/games/quests` | dual | — | — | — | — |
| POST | `/api/games/quests` | dual | — | — | — | questType |
| GET | `/api/games/room` | dual | — | — | — | — |
| POST | `/api/games/room` | dual | — | — | — | betAmount, betCurrency, gameType, gridSize, isAI, turnTimer |
| DELETE | `/api/games/room/{roomId}` | dual | ✅ | — | roomId | — |
| GET | `/api/games/room/{roomId}` | dual | ✅ | — | roomId | — |
| PATCH | `/api/games/room/{roomId}` | dual | ✅ | — | roomId | action, currentTurn, fullState, player1Score, player2Score, state, status, winnerId |
| POST | `/api/games/room/{roomId}` | dual | ✅ | — | roomId | — |
| GET | `/api/games/room/{roomId}/chat` | dual | — | — | roomId | — |
| PATCH | `/api/games/room/{roomId}/chat` | dual | — | — | roomId | chatEnabled |
| POST | `/api/games/room/{roomId}/chat` | dual | — | — | roomId | message |
| POST | `/api/games/room/{roomId}/replace-ai` | dual | — | — | roomId | — |
| DELETE | `/api/games/room/{roomId}/viewers` | dual | — | — | roomId | — |
| GET | `/api/games/room/{roomId}/viewers` | dual | — | — | roomId | — |
| POST | `/api/games/room/{roomId}/viewers` | dual | — | — | roomId | — |
| GET | `/api/games/rooms` | public | — | — | — | — |
| GET | `/api/games/sos` | dual | — | — | — | — |
| POST | `/api/games/sos` | dual | — | — | — | betAmount, betCurrency, gridSize, isAI, turnTimer |
| DELETE | `/api/games/sos/{gameId}` | dual | ✅ | — | gameId | — |
| GET | `/api/games/sos/{gameId}` | dual | ✅ | — | gameId | — |
| PATCH | `/api/games/sos/{gameId}` | dual | ✅ | — | gameId | action, aiMoves, col, letter, row |
| POST | `/api/games/sos/{gameId}` | dual | ✅ | — | gameId | — |
| GET | `/api/games/sos/{gameId}/chat` | dual | — | — | gameId | — |
| PATCH | `/api/games/sos/{gameId}/chat` | dual | — | — | gameId | chatEnabled |
| POST | `/api/games/sos/{gameId}/chat` | dual | — | — | gameId | message |
| DELETE | `/api/games/sos/{gameId}/viewers` | dual | — | — | gameId | — |
| GET | `/api/games/sos/{gameId}/viewers` | dual | — | — | gameId | — |
| POST | `/api/games/sos/{gameId}/viewers` | dual | — | — | gameId | — |

## /api/gift-engine  (3 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| POST | `/api/gift-engine/finish` | dual | — | — | — | — |
| GET | `/api/gift-engine/gifts` | public | — | — | — | — |
| GET | `/api/gift-engine/queue` | public | — | — | — | — |

## /api/gifts  (27 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/gifts/battles` | dual | — | — | — | — |
| POST | `/api/gifts/battles` | dual | — | — | — | participants |
| GET | `/api/gifts/battles/{battleId}` | public | — | — | battleId | — |
| GET | `/api/gifts/catalog` | dual | — | — | — | — |
| POST | `/api/gifts/check-reciprocal` | dual | — | — | — | recipientId |
| GET | `/api/gifts/goals` | dual | — | — | — | — |
| POST | `/api/gifts/goals` | dual | — | — | — | — |
| GET | `/api/gifts/insights/album/{userId}` | public | — | — | userId | — |
| GET | `/api/gifts/insights/badge/{userId}` | public | — | — | userId | — |
| GET | `/api/gifts/insights/collection/{userId}` | public | — | — | userId | — |
| GET | `/api/gifts/insights/feed` | public | — | — | — | — |
| GET | `/api/gifts/insights/first-gifter/{context}/{contextId}` | public | — | — | context, contextId | — |
| GET | `/api/gifts/insights/leaderboard` | public | — | — | — | — |
| GET | `/api/gifts/insights/map` | public | — | — | — | — |
| GET | `/api/gifts/insights/me/badge` | dual | — | — | — | — |
| GET | `/api/gifts/insights/me/history` | dual | — | — | — | — |
| GET | `/api/gifts/insights/me/recommendations` | dual | — | — | — | — |
| GET | `/api/gifts/lucky/config` | dual | — | — | — | — |
| GET | `/api/gifts/lucky/history` | dual | — | — | — | — |
| POST | `/api/gifts/lucky/send` | dual | — | — | — | context, contextId, giftTypeId, quantity |
| GET | `/api/gifts/missions` | public | — | — | — | — |
| GET | `/api/gifts/missions/me` | dual | — | — | — | — |
| POST | `/api/gifts/missions/{missionId}/claim` | dual | — | — | missionId | — |
| GET | `/api/gifts/recent-big` | public | — | — | — | — |
| POST | `/api/gifts/send` | dual | ✅ | ✅ | — | giftTypeId, jetonAmount, recipientUsername, type |
| GET | `/api/gifts/types` | public | — | — | — | — |
| GET | `/api/gifts/version` | public | — | — | — | — |

## /api/hashtags  (3 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/hashtags/search` | public | — | — | — | — |
| GET | `/api/hashtags/trending` | public | — | — | — | — |
| GET | `/api/hashtags/{name}` | dual | — | — | name | — |

## /api/homepage-buttons  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/homepage-buttons` | public | — | — | — | — |

## /api/homepage-fortune-cards  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/homepage-fortune-cards` | public | — | — | — | — |

## /api/homepage-ticker  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/homepage-ticker` | public | — | — | — | — |

## /api/horoscope  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/horoscope/daily` | dual | — | — | — | — |

## /api/jeton  (2 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/jeton` | dual | — | — | — | — |
| POST | `/api/jeton` | dual | — | — | — | action |

## /api/leaderboards  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/leaderboards` | dual | — | — | — | — |

## /api/legal  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/legal/child-safety` | public | — | — | — | — |

## /api/live  (19 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| POST | `/api/live/create-room` | dual | — | — | — | category, coverUrl, description, thumbnailUrl, title |
| GET | `/api/live/gift-types` | dual | — | — | — | — |
| POST | `/api/live/gift/send` | dual | — | — | — | giftTypeId, quantity, recipientId, roomId, roomType |
| GET | `/api/live/guest` | dual | — | — | — | — |
| POST | `/api/live/guest` | dual | — | — | — | muted, videoOff |
| GET | `/api/live/guest/list` | public | — | — | — | — |
| POST | `/api/live/heartbeat` | dual | — | — | — | roomId, roomType |
| POST | `/api/live/join-room` | dual | — | — | — | — |
| POST | `/api/live/leave-room` | dual | — | — | — | roomId, roomType |
| GET | `/api/live/message` | dual | ✅ | — | — | — |
| POST | `/api/live/message` | dual | ✅ | — | — | content, roomId, roomType |
| GET | `/api/live/online-users` | dual | — | — | — | — |
| GET | `/api/live/pk` | dual | — | — | — | — |
| POST | `/api/live/pk` | dual | — | — | — | action, battleId, duration, roomId, targetRoomId |
| GET | `/api/live/pk/active` | public | — | — | — | — |
| POST | `/api/live/pk/score` | dual | — | — | — | amount, battleId, roomId, side |
| GET | `/api/live/rooms` | dual | — | — | — | — |
| GET | `/api/live/seats` | dual | — | — | — | — |
| POST | `/api/live/seats` | dual | — | — | — | action, roomId, seatIndex, targetUserId |

## /api/me  (2 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/me` | dual | — | — | — | — |
| PATCH | `/api/me` | dual | — | — | — | — |

## /api/membership  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/membership/plans` | public | — | — | — | — |

## /api/membership-badges  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/membership-badges` | public | — | — | — | — |

## /api/memberships  (3 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/memberships` | public | — | — | — | — |
| GET | `/api/memberships/packages` | public | — | — | — | — |
| POST | `/api/memberships/purchase` | dual | — | — | — | paymentMethod, planId |

## /api/messages  (5 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/messages` | dual | — | — | — | — |
| PATCH | `/api/messages/request` | dual | — | — | — | action, requestId |
| POST | `/api/messages/request` | dual | — | — | — | message, receiverId |
| GET | `/api/messages/{userId}` | dual | — | — | userId | — |
| POST | `/api/messages/{userId}` | dual | — | — | userId | content, imageUrl |

## /api/mobile  (4 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/mobile/config` | public | — | — | — | — |
| GET | `/api/mobile/fortune-menu` | dual | — | — | — | — |
| GET | `/api/mobile/home` | dual | — | — | — | — |
| GET | `/api/mobile/user-profile/{userId}` | dual | — | — | userId | — |

## /api/monitoring  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/monitoring` | session | — | — | — | — |

## /api/music  (2 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/music/history` | public | — | — | — | — |
| GET | `/api/music/search` | dual | — | — | — | — |

## /api/notifications  (4 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| DELETE | `/api/notifications` | dual | — | — | — | — |
| GET | `/api/notifications` | dual | — | — | — | — |
| POST | `/api/notifications` | dual | — | — | — | markAll, notificationIds |
| GET | `/api/notifications/stream` | dual | — | — | — | — |

## /api/online-fal  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/online-fal` | public | — | — | — | — |

## /api/payments  (7 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/payments/config` | dual | — | — | — | — |
| GET | `/api/payments/methods` | public | — | — | — | — |
| GET | `/api/payments/notify` | dual | — | — | — | — |
| POST | `/api/payments/notify` | dual | — | — | — | amount, notes, paymentMethod, senderName, transactionId |
| GET | `/api/payments/requests` | dual | — | — | — | — |
| POST | `/api/payments/requests` | dual | — | — | — | amount, method, notes, senderInfo |
| GET | `/api/payments/settings` | public | — | — | — | — |

## /api/pk  (5 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/pk/active` | public | — | — | — | — |
| GET | `/api/pk/leaderboard` | public | — | — | — | — |
| GET | `/api/pk/me/invites` | dual | — | — | — | — |
| GET | `/api/pk/{matchId}` | public | — | — | matchId | — |
| GET | `/api/pk/{matchId}/stream` | public | — | — | matchId | — |

## /api/platform  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/platform/commission-rate` | public | — | — | — | — |

## /api/popups  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/popups` | dual | — | — | — | — |

## /api/presence  (3 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/presence` | dual | — | — | — | — |
| POST | `/api/presence` | dual | — | — | — | isNewSession, path, visitorId |
| GET | `/api/presence/sections` | public | — | — | — | — |

## /api/profile-frames  (2 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/profile-frames` | dual | — | — | — | — |
| POST | `/api/profile-frames` | dual | — | — | — | frameId |

## /api/public  (2 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/public/announcement-settings` | public | — | — | — | — |
| GET | `/api/public/jeton-price` | public | — | — | — | — |

## /api/public-stats  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/public-stats` | public | — | — | — | — |

## /api/referral  (2 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/referral` | dual | — | — | — | — |
| GET | `/api/referral/validate` | public | — | — | — | — |

## /api/room  (12 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| DELETE | `/api/room/signal` | dual | — | — | — | — |
| GET | `/api/room/signal` | dual | — | — | — | — |
| POST | `/api/room/signal` | dual | — | — | — | receiverId, sessionId, signalData, signalType |
| GET | `/api/room/{sessionId}` | dual | ✅ | — | sessionId | — |
| PATCH | `/api/room/{sessionId}` | dual | ✅ | — | sessionId | action, minutes |
| GET | `/api/room/{sessionId}/messages` | dual | — | — | sessionId | — |
| POST | `/api/room/{sessionId}/messages` | dual | — | — | sessionId | message |
| GET | `/api/room/{sessionId}/review` | dual | — | — | sessionId | — |
| POST | `/api/room/{sessionId}/review` | dual | — | — | sessionId | comment, rating |
| GET | `/api/room/{sessionId}/stream` | dual | — | — | sessionId | — |
| GET | `/api/room/{sessionId}/summary` | dual | — | — | sessionId | — |
| POST | `/api/room/{sessionId}/tip` | dual | ✅ | — | sessionId | amount |

## /api/room-themes  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/room-themes/catalog` | dual | — | — | — | — |

## /api/search  (2 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/search` | public | — | — | — | — |
| GET | `/api/search/advanced` | dual | — | — | — | — |

## /api/seo-settings  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/seo-settings` | public | — | — | — | — |

## /api/settings  (4 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/settings/ads` | public | — | — | — | — |
| GET | `/api/settings/canlidark-hero` | public | — | — | — | — |
| GET | `/api/settings/public` | public | — | — | — | — |
| GET | `/api/settings/themes` | public | — | — | — | — |

## /api/share-card  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/share-card` | dual | — | — | — | — |

## /api/short-videos  (21 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/short-videos` | dual | — | — | — | — |
| GET | `/api/short-videos/explore` | dual | — | — | — | — |
| GET | `/api/short-videos/mentions/search` | public | — | — | — | — |
| GET | `/api/short-videos/music` | public | — | — | — | — |
| GET | `/api/short-videos/profile/{userId}` | dual | — | — | userId | — |
| POST | `/api/short-videos/register` | dual | — | — | — | — |
| POST | `/api/short-videos/upload` | dual | — | — | — | — |
| POST | `/api/short-videos/upload-url` | dual | — | — | — | — |
| GET | `/api/short-videos/user/{userId}` | dual | — | — | userId | — |
| DELETE | `/api/short-videos/{id}` | dual | ✅ | — | id | — |
| GET | `/api/short-videos/{id}` | dual | ✅ | — | id | — |
| GET | `/api/short-videos/{id}/comments` | dual | — | — | id | — |
| POST | `/api/short-videos/{id}/comments` | dual | — | — | id | content, parentId |
| DELETE | `/api/short-videos/{id}/comments/{commentId}` | dual | ✅ | — | id, commentId | — |
| POST | `/api/short-videos/{id}/comments/{commentId}/like` | dual | — | — | id, commentId | — |
| POST | `/api/short-videos/{id}/comments/{commentId}/pin` | dual | ✅ | — | id, commentId | — |
| GET | `/api/short-videos/{id}/duets` | dual | — | — | id | — |
| POST | `/api/short-videos/{id}/like` | dual | — | — | id | — |
| POST | `/api/short-videos/{id}/save` | dual | — | — | id | — |
| POST | `/api/short-videos/{id}/share` | dual | — | — | id | — |
| POST | `/api/short-videos/{id}/view` | dual | — | — | id | watchedSec |

## /api/signup  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| POST | `/api/signup` | public | — | ✅ | — | birthDate, birthTime, email, name, password, preferredLanguage, referralCode, username |

## /api/site-pages  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/site-pages/{slug}` | public | — | — | slug | — |

## /api/social  (9 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/social/posts` | dual | — | — | — | — |
| POST | `/api/social/posts` | dual | — | — | — | content, fortuneId, fortuneType, imageUrl, isPublic, postType, youtubeUrl |
| DELETE | `/api/social/posts/{postId}` | dual | ✅ | — | postId | — |
| GET | `/api/social/posts/{postId}` | dual | ✅ | — | postId | — |
| DELETE | `/api/social/posts/{postId}/comments` | dual | ✅ | — | postId | — |
| GET | `/api/social/posts/{postId}/comments` | dual | ✅ | — | postId | — |
| POST | `/api/social/posts/{postId}/comments` | dual | ✅ | — | postId | content |
| POST | `/api/social/posts/{postId}/likes` | dual | — | — | postId | — |
| POST | `/api/social/posts/{postId}/view` | public | — | — | postId | — |

## /api/stories  (3 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| DELETE | `/api/stories` | dual | — | — | — | — |
| GET | `/api/stories` | dual | — | — | — | — |
| POST | `/api/stories` | dual | — | — | — | caption, mediaType, mediaUrl |

## /api/teller  (4 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/teller/analytics` | dual | — | — | — | — |
| GET | `/api/teller/level` | dual | — | — | — | — |
| GET | `/api/teller/verification` | dual | — | — | — | — |
| POST | `/api/teller/verification` | dual | — | — | — | docUrl |

## /api/teller-chat  (3 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/teller-chat` | dual | — | — | — | — |
| GET | `/api/teller-chat/{sessionId}` | dual | — | — | sessionId | — |
| POST | `/api/teller-chat/{sessionId}` | dual | — | — | sessionId | content, imageUrl, messageType |

## /api/tencent  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| POST | `/api/tencent/webhook` | public | — | — | — | CallbackTs, EventGroupId, EventInfo, EventType |

## /api/tiktok-videos  (3 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/tiktok-videos` | public | — | — | — | — |
| GET | `/api/tiktok-videos/oembed` | public | — | — | — | — |
| GET | `/api/tiktok-videos/{id}` | public | — | — | id | — |

## /api/tmdb  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/tmdb` | public | — | — | — | — |

## /api/tournaments  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/tournaments` | dual | — | — | — | — |

## /api/translations  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/translations` | public | — | — | — | — |

## /api/trend-videos  (2 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/trend-videos` | public | — | — | — | — |
| POST | `/api/trend-videos` | public | — | — | — | videoId |

## /api/trends  (3 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/trends` | public | — | — | — | — |
| GET | `/api/trends/{slug}` | public | — | — | slug | — |
| POST | `/api/trends/{slug}/like` | dual | — | — | slug | — |

## /api/trtc  (3 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| POST | `/api/trtc/token` | dual | — | — | — | role, roomId |
| POST | `/api/trtc/usersig` | dual | — | — | — | — |
| POST | `/api/trtc/webhook` | public | — | — | — | — |

## /api/upload  (3 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/upload/get-url` | dual | — | — | — | — |
| POST | `/api/upload/get-url` | dual | — | — | — | cloud_storage_path, isPublic |
| POST | `/api/upload/presigned` | dual | — | — | — | contentType, fileName, folder, isPublic |

## /api/user  (32 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/user/achievements` | dual | — | — | — | — |
| GET | `/api/user/active-sessions` | dual | — | — | — | — |
| GET | `/api/user/activity` | dual | — | — | — | — |
| PATCH | `/api/user/activity` | dual | — | — | — | markAllRead, notificationIds |
| GET | `/api/user/block` | dual | — | — | — | — |
| POST | `/api/user/block` | dual | — | — | — | userId |
| DELETE | `/api/user/blocked` | dual | — | — | — | id, type |
| GET | `/api/user/blocked` | dual | — | — | — | — |
| GET | `/api/user/broadcast-history` | dual | — | — | — | — |
| GET | `/api/user/co-broadcast-invites` | dual | — | — | — | — |
| GET | `/api/user/credits` | dual | — | — | — | — |
| GET | `/api/user/followers` | dual | — | — | — | — |
| GET | `/api/user/following` | dual | — | — | — | — |
| GET | `/api/user/fortunes` | dual | — | — | — | — |
| PATCH | `/api/user/fortunes/{fortuneId}` | dual | — | — | fortuneId | action |
| GET | `/api/user/likers` | dual | — | — | — | — |
| GET | `/api/user/profile` | dual | — | — | — | — |
| PATCH | `/api/user/profile` | dual | — | — | — | bio, birthDate, birthTime, email, favoriteTeam, hideProfileViews, image, messagePrivacy, name, phone, risingSign, username… |
| GET | `/api/user/received-gifts` | dual | — | — | — | — |
| POST | `/api/user/report` | dual | — | — | — | details, reason, userId |
| GET | `/api/user/statistics` | dual | — | — | — | — |
| GET | `/api/user/stats` | dual | — | — | — | — |
| POST | `/api/user/stats` | dual | — | — | — | minutesToAdd |
| GET | `/api/user/theme` | dual | — | — | — | — |
| PATCH | `/api/user/theme` | dual | — | — | — | theme |
| GET | `/api/user/watch-ad` | dual | — | — | — | — |
| POST | `/api/user/watch-ad` | dual | — | — | — | — |
| GET | `/api/user/xp` | dual | — | — | — | — |
| GET | `/api/user/{userId}/achievements` | dual | — | — | userId | — |
| DELETE | `/api/user/{userId}/follow` | dual | — | — | userId | — |
| POST | `/api/user/{userId}/follow` | dual | — | — | userId | — |
| GET | `/api/user/{userId}/follow-status` | dual | — | — | userId | — |

## /api/users  (7 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/users/lookup/{username}` | dual | — | — | username | — |
| GET | `/api/users/online` | public | — | — | — | — |
| GET | `/api/users/search` | dual | — | — | — | — |
| GET | `/api/users/{userId}` | dual | — | — | userId | — |
| GET | `/api/users/{userId}/follow` | dual | — | — | userId | — |
| POST | `/api/users/{userId}/follow` | dual | — | — | userId | — |
| GET | `/api/users/{userId}/posts` | dual | — | — | userId | — |

## /api/video-streams  (53 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/video-streams` | dual | — | — | — | — |
| POST | `/api/video-streams` | dual | — | — | — | category, coverUrl, description, tags, thumbnailUrl, title |
| GET | `/api/video-streams/gifts` | dual | — | — | — | — |
| GET | `/api/video-streams/pk` | dual | ✅ | — | — | — |
| POST | `/api/video-streams/pk` | dual | ✅ | — | — | action, battleId, duration, opponentVoiceRoomId, streamId, targetStreamId |
| GET | `/api/video-streams/pk/list` | public | — | — | — | — |
| POST | `/api/video-streams/pk/score` | public | — | — | — | battleId, points, streamId |
| DELETE | `/api/video-streams/signal` | dual | — | — | — | — |
| GET | `/api/video-streams/signal` | dual | — | — | — | — |
| POST | `/api/video-streams/signal` | dual | — | — | — | data, receiverId, streamId, type |
| GET | `/api/video-streams/{streamId}` | dual | ✅ | — | streamId | — |
| PATCH | `/api/video-streams/{streamId}` | dual | ✅ | — | streamId | backgroundUrl, broadcastImage, description, isImageMode, status, title |
| GET | `/api/video-streams/{streamId}/auto-close` | dual | — | — | streamId | — |
| POST | `/api/video-streams/{streamId}/auto-close` | dual | — | — | streamId | — |
| DELETE | `/api/video-streams/{streamId}/ban` | dual | — | — | streamId | — |
| GET | `/api/video-streams/{streamId}/ban` | dual | — | — | streamId | — |
| POST | `/api/video-streams/{streamId}/ban` | dual | — | — | streamId | reason, userId |
| GET | `/api/video-streams/{streamId}/co-broadcast` | dual | — | — | streamId | — |
| PATCH | `/api/video-streams/{streamId}/co-broadcast` | dual | — | — | streamId | action |
| POST | `/api/video-streams/{streamId}/co-broadcast` | dual | — | — | streamId | action, userId |
| POST | `/api/video-streams/{streamId}/co-broadcast/invite` | dual | — | — | streamId | inviteeId |
| GET | `/api/video-streams/{streamId}/comments` | dual | — | — | streamId | — |
| POST | `/api/video-streams/{streamId}/comments` | dual | — | — | streamId | content, isHidden, nickname |
| POST | `/api/video-streams/{streamId}/end` | dual | ✅ | — | streamId | — |
| DELETE | `/api/video-streams/{streamId}/fortune-requests` | dual | ✅ | — | streamId | — |
| GET | `/api/video-streams/{streamId}/fortune-requests` | dual | ✅ | — | streamId | — |
| PATCH | `/api/video-streams/{streamId}/fortune-requests` | dual | ✅ | — | streamId | action, requestId |
| POST | `/api/video-streams/{streamId}/fortune-requests` | dual | ✅ | — | streamId | — |
| GET | `/api/video-streams/{streamId}/fortune-requests/my-status` | dual | — | — | streamId | — |
| GET | `/api/video-streams/{streamId}/gifts` | dual | — | — | streamId | — |
| POST | `/api/video-streams/{streamId}/gifts` | dual | — | — | streamId | giftTypeId, quantity |
| DELETE | `/api/video-streams/{streamId}/join` | dual | — | — | streamId | — |
| POST | `/api/video-streams/{streamId}/join` | dual | — | — | streamId | — |
| POST | `/api/video-streams/{streamId}/leave` | dual | — | — | streamId | viewerId |
| GET | `/api/video-streams/{streamId}/like` | dual | — | — | streamId | — |
| POST | `/api/video-streams/{streamId}/like` | dual | — | — | streamId | count |
| POST | `/api/video-streams/{streamId}/live-started` | dual | — | — | streamId | — |
| POST | `/api/video-streams/{streamId}/media-heartbeat` | dual | — | — | streamId | — |
| GET | `/api/video-streams/{streamId}/messages` | dual | — | — | streamId | — |
| POST | `/api/video-streams/{streamId}/messages` | dual | — | — | streamId | — |
| DELETE | `/api/video-streams/{streamId}/moderators` | dual | — | — | streamId | userId |
| GET | `/api/video-streams/{streamId}/moderators` | dual | — | — | streamId | — |
| POST | `/api/video-streams/{streamId}/moderators` | dual | — | — | streamId | userId |
| DELETE | `/api/video-streams/{streamId}/mute` | dual | — | — | streamId | viewerId |
| GET | `/api/video-streams/{streamId}/mute` | dual | — | — | streamId | — |
| POST | `/api/video-streams/{streamId}/mute` | dual | — | — | streamId | expiresAt, reason, viewerId |
| GET | `/api/video-streams/{streamId}/pk-battle` | dual | — | — | streamId | — |
| POST | `/api/video-streams/{streamId}/pk-battle` | dual | — | — | streamId | action, battleId, duration, targetStreamId |
| DELETE | `/api/video-streams/{streamId}/signal` | dual | — | — | streamId | — |
| GET | `/api/video-streams/{streamId}/signal` | dual | — | — | streamId | — |
| POST | `/api/video-streams/{streamId}/signal` | dual | — | — | streamId | data, receiverId, type |
| GET | `/api/video-streams/{streamId}/stream` | dual | — | — | streamId | — |
| GET | `/api/video-streams/{streamId}/viewers` | public | — | — | streamId | — |

## /api/wallet  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/wallet` | dual | — | — | — | — |

## /api/warmup  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/warmup` | public | — | — | — | — |

## /api/weekly-dream-report  (2 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/weekly-dream-report` | dual | — | — | — | — |
| POST | `/api/weekly-dream-report` | dual | — | — | — | — |

## /api/withdrawals  (2 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/withdrawals` | dual | — | — | — | — |
| POST | `/api/withdrawals` | dual | — | — | — | accountDetails, amount, method |

## /api/youtube  (1 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| GET | `/api/youtube/search` | dual | — | — | — | — |

## /api/{unmatched}  (5 handler)

| METHOD | PATH | AUTH | ADMIN | RL | PATH PARAMS | BODY FIELDS |
|---|---|---|---|---|---|---|
| DELETE | `/api/{unmatched}` | public | — | — | unmatched | — |
| GET | `/api/{unmatched}` | public | — | — | unmatched | — |
| PATCH | `/api/{unmatched}` | public | — | — | unmatched | — |
| POST | `/api/{unmatched}` | public | — | — | unmatched | — |
| PUT | `/api/{unmatched}` | public | — | — | unmatched | — |