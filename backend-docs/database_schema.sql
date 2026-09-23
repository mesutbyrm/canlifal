-- ============================================================
-- CanliFal — Tam Veritabani DDL (PostgreSQL)
-- prisma schema.prisma'dan uretildi (prisma migrate diff)
-- Bu dosya, projenin tek gercek migration kaynagidir (proje 'prisma db push' kullanir).
-- ============================================================

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "phone" TEXT,
    "image" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'tr',
    "credits" INTEGER NOT NULL DEFAULT 50,
    "role" TEXT NOT NULL DEFAULT 'user',
    "membership" TEXT NOT NULL DEFAULT 'basic',
    "membershipExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referralCode" TEXT,
    "referralCreditsEarned" INTEGER NOT NULL DEFAULT 0,
    "referredById" TEXT,
    "bio" TEXT,
    "birthDate" TIMESTAMP(3),
    "birthTime" TEXT,
    "zodiacSign" TEXT,
    "risingSign" TEXT,
    "favoriteTeam" TEXT,
    "lastHoroscopeDate" TIMESTAMP(3),
    "messagePrivacy" TEXT NOT NULL DEFAULT 'everyone',
    "hideProfileViews" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT NOT NULL DEFAULT 'mystical',
    "jetonBalance" INTEGER NOT NULL DEFAULT 0,
    "city" TEXT,
    "country" TEXT DEFAULT 'TR',
    "specialBadges" TEXT,
    "profileEffect" TEXT,
    "profileFrameId" TEXT,
    "adminAssignedFrameId" TEXT,
    "nameEffect" TEXT,
    "entranceEffectId" TEXT,
    "chatBubbleId" TEXT,
    "micFrameId" TEXT,
    "avatarAccessoryIds" TEXT,
    "withdrawalLimit" INTEGER NOT NULL DEFAULT 0,
    "totalTimeSpentMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3),
    "activeDeviceToken" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "loginStreak" INTEGER NOT NULL DEFAULT 0,
    "lastLoginRewardDate" DATE,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "cfcBalance" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "interests" TEXT,
    "activityLevel" TEXT NOT NULL DEFAULT 'medium',
    "activeHoursStart" INTEGER NOT NULL DEFAULT 9,
    "activeHoursEnd" INTEGER NOT NULL DEFAULT 23,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActionAt" TIMESTAMP(3),
    "totalActions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "creditsAwarded" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_fortune_tellers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "specialties" TEXT[],
    "pricePerSession" INTEGER NOT NULL DEFAULT 100,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "applicationNote" TEXT,
    "applicationStatus" TEXT NOT NULL DEFAULT 'pending',
    "approvedAt" TIMESTAMP(3),
    "banReason" TEXT,
    "bannedAt" TIMESTAMP(3),
    "bonusCredits" INTEGER NOT NULL DEFAULT 0,
    "freezeReason" TEXT,
    "frozenAt" TIMESTAMP(3),
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "rejectedAt" TIMESTAMP(3),
    "totalEarnings" INTEGER NOT NULL DEFAULT 0,
    "tellerLevel" TEXT NOT NULL DEFAULT 'bronze',
    "levelPoints" INTEGER NOT NULL DEFAULT 0,
    "levelUpdatedAt" TIMESTAMP(3),
    "canGoOnline" BOOLEAN NOT NULL DEFAULT true,
    "canChat" BOOLEAN NOT NULL DEFAULT true,
    "canStartSession" BOOLEAN NOT NULL DEFAULT true,
    "canSetPrice" BOOLEAN NOT NULL DEFAULT false,
    "canEditProfile" BOOLEAN NOT NULL DEFAULT true,
    "canViewEarnings" BOOLEAN NOT NULL DEFAULT true,
    "canWithdraw" BOOLEAN NOT NULL DEFAULT false,
    "verificationDocUrl" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'none',
    "verificationNote" TEXT,
    "maxSessionsPerDay" INTEGER NOT NULL DEFAULT 10,
    "commissionRate" INTEGER NOT NULL DEFAULT 20,
    "adminNotes" TEXT,

    CONSTRAINT "live_fortune_tellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teller_warnings" (
    "id" TEXT NOT NULL,
    "tellerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teller_warnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_sessions" (
    "id" TEXT NOT NULL,
    "tellerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fortuneType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "creditsCharged" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roomId" TEXT,
    "maxMinutes" INTEGER NOT NULL DEFAULT 5,
    "minutesUsed" INTEGER NOT NULL DEFAULT 0,
    "creditsPerMinute" INTEGER NOT NULL DEFAULT 0,
    "lastPingAt" TIMESTAMP(3),
    "timerStarted" BOOLEAN NOT NULL DEFAULT false,
    "timerStartedAt" TIMESTAMP(3),

    CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_signals" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "signalData" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_session_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_session_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_teller_reviews" (
    "id" TEXT NOT NULL,
    "tellerId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_teller_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fortunes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fortuneType" TEXT NOT NULL,
    "inputData" TEXT NOT NULL,
    "aiResponse" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isSaved" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fortunes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translations" (
    "id" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "translationKey" TEXT NOT NULL,
    "translationValue" TEXT NOT NULL,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameTr" TEXT NOT NULL,
    "descEn" TEXT NOT NULL,
    "descTr" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "giftCommissionPercent" INTEGER NOT NULL DEFAULT 0,
    "giftBeneficiaryId" TEXT,
    "backgroundImage" TEXT,
    "bannedWords" TEXT,
    "currentMusicVideoId" TEXT,
    "currentMusicTitle" TEXT,
    "currentMusicStartedAt" TIMESTAMP(3),
    "currentMusicDuration" TEXT,
    "djUserIds" TEXT,
    "activeDjId" TEXT,
    "whitelistedWords" TEXT,
    "roomType" TEXT NOT NULL DEFAULT 'FREE',
    "password" TEXT,
    "welcomeMessage" TEXT,
    "pinnedAnnouncement" TEXT,
    "tags" TEXT,
    "bannerImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_room_gifts" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "giftTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" INTEGER NOT NULL,
    "currencyType" TEXT NOT NULL DEFAULT 'jeton',
    "commissionAmount" INTEGER NOT NULL DEFAULT 0,
    "beneficiaryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_room_gifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_presences" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nickname" TEXT,
    "isTyping" BOOLEAN NOT NULL DEFAULT false,
    "lastTyping" TIMESTAMP(3),
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seatIndex" INTEGER NOT NULL DEFAULT -1,

    CONSTRAINT "chat_presences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_user_roles" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "grantedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_mutes" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mutedBy" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_mutes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_bans" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bannedBy" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_bans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_posts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fortuneId" TEXT,
    "content" TEXT NOT NULL,
    "postType" TEXT NOT NULL,
    "fortuneType" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "imageUrl" TEXT,
    "isAuto" BOOLEAN NOT NULL DEFAULT false,
    "audioUrl" TEXT,
    "youtubeUrl" TEXT,

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_likes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anonymous_users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "adsWatched" INTEGER NOT NULL DEFAULT 0,
    "adsWatchedToday" INTEGER NOT NULL DEFAULT 0,
    "lastAdDate" TIMESTAMP(3),
    "fortunesUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anonymous_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anonymous_fortunes" (
    "id" TEXT NOT NULL,
    "anonymousUserId" TEXT NOT NULL,
    "fortuneType" TEXT NOT NULL,
    "inputData" TEXT NOT NULL,
    "aiResponse" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anonymous_fortunes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_presences" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "path" TEXT,
    "deviceType" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "botName" TEXT,

    CONSTRAINT "site_presences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_visits" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "path" TEXT,
    "userAgent" TEXT,
    "country" TEXT,
    "city" TEXT,
    "ipHash" TEXT,
    "deviceType" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "botName" TEXT,

    CONSTRAINT "site_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "postId" TEXT,
    "fromUserId" TEXT,
    "fromUserName" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "credits" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "stripePriceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "bonusCredits" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "creditsAwarded" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "descriptionEn" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teller_chat_sessions" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tellerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "teller_chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teller_chat_messages" (
    "id" TEXT NOT NULL,
    "chatSessionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "imageUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teller_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_streams" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'live',
    "viewerCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "roomId" TEXT NOT NULL,
    "category" TEXT,
    "thumbnailUrl" TEXT,
    "broadcastImage" TEXT,
    "isImageMode" BOOLEAN NOT NULL DEFAULT false,
    "backgroundUrl" TEXT,
    "lastGiftAt" TIMESTAMP(3),
    "autoClosedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_stream_comments" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "nickname" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_stream_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_stream_likes" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_stream_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_stream_viewers" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "viewerName" TEXT,
    "nickname" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "video_stream_viewers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "animation" TEXT,
    "price" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thumbnailUrl" TEXT,
    "assetUrl" TEXT,
    "assetType" TEXT DEFAULT 'image',
    "cloudStoragePath" TEXT,
    "thumbnailCloudPath" TEXT,
    "category" TEXT,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soundUrl" TEXT,
    "soundCloudPath" TEXT,
    "animationDurationMs" INTEGER,
    "isFullscreen" BOOLEAN NOT NULL DEFAULT false,
    "tier" TEXT NOT NULL DEFAULT 'small',
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "isSpecialEvent" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "seasonStart" TIMESTAMP(3),
    "seasonEnd" TIMESTAMP(3),
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "firstReleasedAt" TIMESTAMP(3),
    "iconImageUrl" TEXT,
    "iconImageCloudPath" TEXT,
    "effectColor" TEXT,
    "comboEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "visibleInVoiceRoom" BOOLEAN NOT NULL DEFAULT true,
    "visibleInLiveStream" BOOLEAN NOT NULL DEFAULT true,
    "visibleInPK" BOOLEAN NOT NULL DEFAULT true,
    "visibleInProfile" BOOLEAN NOT NULL DEFAULT false,
    "visibleInMessaging" BOOLEAN NOT NULL DEFAULT false,
    "visibleInTrend" BOOLEAN NOT NULL DEFAULT false,
    "visibleInStories" BOOLEAN NOT NULL DEFAULT false,
    "visibleInFortune" BOOLEAN NOT NULL DEFAULT false,
    "visibleInNotification" BOOLEAN NOT NULL DEFAULT false,
    "visibleAsMini" BOOLEAN NOT NULL DEFAULT false,
    "visibleAsFullscreen" BOOLEAN NOT NULL DEFAULT false,
    "displayType" TEXT NOT NULL DEFAULT 'static',
    "requiresVip" BOOLEAN NOT NULL DEFAULT false,
    "eventOnly" BOOLEAN NOT NULL DEFAULT false,
    "pkOnly" BOOLEAN NOT NULL DEFAULT false,
    "liveOnly" BOOLEAN NOT NULL DEFAULT false,
    "voiceOnly" BOOLEAN NOT NULL DEFAULT false,
    "newUserOnly" BOOLEAN NOT NULL DEFAULT false,
    "timedCampaign" BOOLEAN NOT NULL DEFAULT false,
    "campaignStart" TIMESTAMP(3),
    "campaignEnd" TIMESTAMP(3),
    "isSeasonal" BOOLEAN NOT NULL DEFAULT false,
    "isReusable" BOOLEAN NOT NULL DEFAULT true,
    "dailySendLimit" INTEGER,
    "startDelayMs" INTEGER,
    "displayDurationMs" INTEGER,
    "repeatCount" INTEGER NOT NULL DEFAULT 1,
    "volume" INTEGER NOT NULL DEFAULT 100,
    "particleEffect" TEXT,
    "hasVibration" BOOLEAN NOT NULL DEFAULT false,
    "hasColorChange" BOOLEAN NOT NULL DEFAULT false,
    "screenPosition" TEXT NOT NULL DEFAULT 'center',
    "animStartPoint" TEXT,
    "animEndPoint" TEXT,
    "collectionId" TEXT,
    "musicUrl" TEXT,
    "musicCloudPath" TEXT,
    "isLucky" BOOLEAN NOT NULL DEFAULT false,
    "contentVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "gift_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_collections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "iconEmoji" TEXT,
    "iconUrl" TEXT,
    "iconCloudPath" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lucky_gift_tiers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL DEFAULT '',
    "multiplier" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "isJackpot" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "contentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lucky_gift_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lucky_gift_rewards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "giftTypeId" TEXT NOT NULL,
    "context" TEXT,
    "contextId" TEXT,
    "betJetons" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "multiplier" INTEGER NOT NULL,
    "wonJetons" INTEGER NOT NULL,
    "netJetons" INTEGER NOT NULL,
    "isJackpot" BOOLEAN NOT NULL DEFAULT false,
    "tierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lucky_gift_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stream_gifts" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "giftTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" INTEGER NOT NULL,
    "receiverAmount" INTEGER NOT NULL DEFAULT 0,
    "siteAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stream_gifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_stream_signals" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT,
    "signalType" TEXT NOT NULL,
    "signalData" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_stream_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stream_co_broadcasters" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isVideoOff" BOOLEAN NOT NULL DEFAULT false,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "stream_co_broadcasters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stream_bans" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "bannedUserId" TEXT NOT NULL,
    "reason" TEXT,
    "bannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stream_bans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stream_moderators" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stream_moderators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pk_battles" (
    "id" TEXT NOT NULL,
    "stream1Id" TEXT NOT NULL,
    "stream2Id" TEXT NOT NULL,
    "user1Id" TEXT NOT NULL,
    "user2Id" TEXT NOT NULL,
    "score1" INTEGER NOT NULL DEFAULT 0,
    "score2" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "duration" INTEGER NOT NULL DEFAULT 300,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "winnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isDraw" BOOLEAN NOT NULL DEFAULT false,
    "winnerSide" INTEGER,

    CONSTRAINT "pk_battles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pk_scores" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "side" INTEGER NOT NULL,
    "contributorId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pk_gifts" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "side" INTEGER NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "giftTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_gifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_guest_sessions" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "slot" INTEGER NOT NULL,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isVideoOff" BOOLEAN NOT NULL DEFAULT false,
    "mutedByHost" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "live_guest_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_guest_invites" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_guest_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fortune_request_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '☕',
    "jetonCost" INTEGER NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fortune_request_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stream_fortune_requests" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "typeId" TEXT,
    "nickname" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "question" TEXT,
    "jetonAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selectedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "stream_fortune_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stream_muted_viewers" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "mutedBy" TEXT NOT NULL,
    "reason" TEXT,
    "mutedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "stream_muted_viewers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_messages" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "user1Id" TEXT NOT NULL,
    "user2Id" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_requests" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_login_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutAt" TIMESTAMP(3),
    "duration" INTEGER NOT NULL DEFAULT 0,
    "deviceType" TEXT,
    "browser" TEXT,

    CONSTRAINT "user_login_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_daily_activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "minutesSpent" INTEGER NOT NULL DEFAULT 0,
    "fortunesViewed" INTEGER NOT NULL DEFAULT 0,
    "postsCreated" INTEGER NOT NULL DEFAULT 0,
    "messagesCount" INTEGER NOT NULL DEFAULT 0,
    "streamsWatched" INTEGER NOT NULL DEFAULT 0,
    "creditsSpent" INTEGER NOT NULL DEFAULT 0,
    "creditsEarned" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_daily_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_hourly_activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hour" INTEGER NOT NULL,
    "totalMinutes" INTEGER NOT NULL DEFAULT 0,
    "loginCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_hourly_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "relatedId" TEXT,
    "balance" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fortune_ratings" (
    "id" TEXT NOT NULL,
    "fortuneId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "satisfaction" INTEGER,
    "accuracy" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fortune_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameTr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionTr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "rewardCredits" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bana_ozel_items" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameTr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descTr" TEXT,
    "descEn" TEXT,
    "icon" TEXT NOT NULL,
    "jetonCost" INTEGER NOT NULL DEFAULT 5,
    "category" TEXT NOT NULL DEFAULT 'fortune',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "contentPool" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bana_ozel_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jeton_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "itemSlug" TEXT,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jeton_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_fortune_streaks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastFortuneDate" TIMESTAMP(3),
    "totalFortunes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "user_fortune_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jetonEarned" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,

    CONSTRAINT "daily_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bana_ozel_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemSlug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "jetonSpent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bana_ozel_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_views" (
    "id" TEXT NOT NULL,
    "viewedUserId" TEXT NOT NULL,
    "viewerId" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "descriptionEn" TEXT,
    "tier" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "priceType" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "features" TEXT,
    "bonusJetons" INTEGER NOT NULL DEFAULT 0,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "prioritySupport" BOOLEAN NOT NULL DEFAULT false,
    "exclusiveBadge" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT,
    "priceType" TEXT NOT NULL,
    "pricePaid" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT,

    CONSTRAINT "membership_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "transactionId" TEXT,
    "senderName" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "jetonLoaded" INTEGER,
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_revenue_logs" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "receiverAmount" INTEGER NOT NULL DEFAULT 0,
    "ownerAmount" INTEGER NOT NULL DEFAULT 0,
    "siteAmount" INTEGER NOT NULL DEFAULT 0,
    "senderId" TEXT,
    "receiverId" TEXT,
    "ownerId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_revenue_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_sessions" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "agoraUid" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPing" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "voice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_signals" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "fromUserName" TEXT NOT NULL,
    "toUserId" TEXT,
    "type" TEXT NOT NULL,
    "data" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticker_messages" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '✨',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticker_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_fortune_cards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🔮',
    "image" TEXT NOT NULL DEFAULT '',
    "href" TEXT NOT NULL DEFAULT '/fallar',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_fortune_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "amountTL" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "accountDetails" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "agencyId" TEXT,
    "agencyApprovedBy" TEXT,
    "agencyApprovedAt" TIMESTAMP(3),
    "agencyNote" TEXT,
    "adminNote" TEXT,
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teller_awards" (
    "id" TEXT NOT NULL,
    "tellerId" TEXT NOT NULL,
    "awardType" TEXT NOT NULL,
    "title" TEXT,
    "awardedBy" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teller_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teller_gifts" (
    "id" TEXT NOT NULL,
    "tellerId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "giftTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" INTEGER NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teller_gifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_announcements" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'red',
    "userId" TEXT,
    "userName" TEXT,
    "maxPasses" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mini_games" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT '🎮',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "entryFee" INTEGER NOT NULL DEFAULT 0,
    "minReward" INTEGER NOT NULL DEFAULT 5,
    "maxReward" INTEGER NOT NULL DEFAULT 50,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "config" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mini_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_plays" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "reward" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,
    "result" TEXT,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_plays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_games" (
    "id" TEXT NOT NULL,
    "gridSize" INTEGER NOT NULL DEFAULT 6,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT,
    "isAI" BOOLEAN NOT NULL DEFAULT false,
    "betAmount" INTEGER NOT NULL DEFAULT 0,
    "betCurrency" TEXT NOT NULL DEFAULT 'FREE',
    "board" TEXT NOT NULL DEFAULT '[]',
    "lines" TEXT NOT NULL DEFAULT '[]',
    "currentTurn" INTEGER NOT NULL DEFAULT 1,
    "player1Score" INTEGER NOT NULL DEFAULT 0,
    "player2Score" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "winnerId" TEXT,
    "player1Name" TEXT NOT NULL DEFAULT 'Oyuncu 1',
    "player2Name" TEXT NOT NULL DEFAULT 'Oyuncu 2',
    "turnTimer" INTEGER NOT NULL DEFAULT 0,
    "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastMoveAt" TIMESTAMP(3),
    "disconnectedPlayerId" TEXT,
    "player1LastSeen" TIMESTAMP(3),
    "player2LastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sos_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_game_chats" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sos_game_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_game_viewers" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sos_game_viewers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_rooms" (
    "id" TEXT NOT NULL,
    "gameType" TEXT NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT,
    "isAI" BOOLEAN NOT NULL DEFAULT false,
    "betAmount" INTEGER NOT NULL DEFAULT 0,
    "betCurrency" TEXT NOT NULL DEFAULT 'FREE',
    "state" TEXT NOT NULL DEFAULT '{}',
    "currentTurn" INTEGER NOT NULL DEFAULT 1,
    "player1Score" INTEGER NOT NULL DEFAULT 0,
    "player2Score" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "winnerId" TEXT,
    "player1Name" TEXT NOT NULL DEFAULT 'Oyuncu 1',
    "player2Name" TEXT NOT NULL DEFAULT 'Oyuncu 2',
    "turnTimer" INTEGER NOT NULL DEFAULT 0,
    "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastMoveAt" TIMESTAMP(3),
    "disconnectedPlayerId" TEXT,
    "player1LastSeen" TIMESTAMP(3),
    "player2LastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_room_chats" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_room_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_room_viewers" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_room_viewers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_rewards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardDate" DATE NOT NULL,
    "streak" INTEGER NOT NULL DEFAULT 1,
    "jetonReward" INTEGER NOT NULL DEFAULT 5,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_quests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questDate" DATE NOT NULL,
    "questType" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "target" INTEGER NOT NULL DEFAULT 1,
    "reward" INTEGER NOT NULL DEFAULT 10,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "daily_quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameTr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL DEFAULT '',
    "descTr" TEXT NOT NULL DEFAULT '',
    "descEn" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT 'BookOpen',
    "color" TEXT NOT NULL DEFAULT '#8B5CF6',
    "coverImage" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleTr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL DEFAULT '',
    "descTr" TEXT NOT NULL,
    "descEn" TEXT NOT NULL DEFAULT '',
    "contentTr" TEXT NOT NULL,
    "contentEn" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'genel',
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metaDescription" TEXT NOT NULL DEFAULT '',
    "coverImage" TEXT NOT NULL DEFAULT '',
    "readTime" INTEGER NOT NULL DEFAULT 5,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "isEditorPick" BOOLEAN NOT NULL DEFAULT false,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "zodiacSign" TEXT NOT NULL DEFAULT '',
    "authorId" TEXT,
    "authorName" TEXT NOT NULL DEFAULT 'Canlifal Editör',
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL DEFAULT 'Anonim',
    "userAvatar" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_likes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_favorites" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_game_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalJetons" INTEGER NOT NULL DEFAULT 0,
    "totalGames" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "levelTitle" TEXT NOT NULL DEFAULT 'Yeni Üye',
    "dailySpinsUsed" INTEGER NOT NULL DEFAULT 0,
    "lastSpinDate" DATE,
    "referralCode" TEXT,
    "referralCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_game_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_images" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcast_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_badges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#fbbf24',
    "bgColor" TEXT NOT NULL DEFAULT '#78350f',
    "description" TEXT,
    "tier" TEXT,
    "userId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_pages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentEn" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "showInFooter" BOOLEAN NOT NULL DEFAULT true,
    "showInHeader" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_notification_logs" (
    "id" TEXT NOT NULL,
    "onesignalId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "url" TEXT,
    "imageUrl" TEXT,
    "targetType" TEXT NOT NULL,
    "targetValue" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'sent',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "clickedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'android',
    "appVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dream_interpretations" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metaDescription" TEXT,
    "category" TEXT NOT NULL DEFAULT 'genel',
    "views" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dream_interpretations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dream_comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dreamId" TEXT NOT NULL,
    "experienceType" TEXT NOT NULL DEFAULT 'yorum',
    "didComeTrue" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dream_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dream_favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dreamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dream_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dream_views" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dreamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dream_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dream_symbols" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "letter" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "detailedMeaning" TEXT,
    "relatedSymbols" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dream_symbols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dream_diary_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dreamDate" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "symbols" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mood" TEXT,
    "lucidity" INTEGER,
    "aiAnalysis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dream_diary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_login_rewards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardDate" DATE NOT NULL,
    "streak" INTEGER NOT NULL DEFAULT 1,
    "xpEarned" INTEGER NOT NULL DEFAULT 10,
    "jetonEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_login_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dream_contests" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dreamPrompt" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dream_contests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dream_contest_entries" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "interpretation" TEXT NOT NULL,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dream_contest_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dream_contest_votes" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dream_contest_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_dream_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "weekEnd" DATE NOT NULL,
    "reportContent" TEXT NOT NULL,
    "dreamCount" INTEGER NOT NULL DEFAULT 0,
    "topSymbols" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_dream_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "online_fal_sections" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '✨',
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "online_fal_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "online_fal_buttons" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🔗',
    "href" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "bgColor" TEXT NOT NULL DEFAULT 'from-purple-600/30 to-fuchsia-600/30',
    "borderColor" TEXT NOT NULL DEFAULT 'border-purple-400/50',
    "textColor" TEXT NOT NULL DEFAULT 'text-purple-200',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "online_fal_buttons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_buttons" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🔗',
    "href" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "specialBehavior" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_buttons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_popups" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "buttons" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showTo" TEXT NOT NULL DEFAULT 'all',
    "popupType" TEXT NOT NULL DEFAULT 'custom',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "maxShowCount" INTEGER NOT NULL DEFAULT 1,
    "showOnRefresh" BOOLEAN NOT NULL DEFAULT false,
    "showDelaySeconds" INTEGER NOT NULL DEFAULT 1,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_popups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_frames" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'gold',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_frames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_badges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ip_fortune_usage" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "adWatched" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ip_fortune_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_networks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "adCode" TEXT,
    "adUnitId" TEXT,
    "appId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_networks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_config" (
    "id" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "areaName" TEXT NOT NULL,
    "currencyType" TEXT NOT NULL DEFAULT 'cfc',
    "cost" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currency_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "userAvatar" TEXT,
    "activityType" TEXT NOT NULL,
    "detail" TEXT,
    "targetUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_feed_config" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxItems" INTEGER NOT NULL DEFAULT 20,
    "visibleToGuests" BOOLEAN NOT NULL DEFAULT true,
    "visibleToBasic" BOOLEAN NOT NULL DEFAULT true,
    "visibleToPremium" BOOLEAN NOT NULL DEFAULT true,
    "visibleToGold" BOOLEAN NOT NULL DEFAULT true,
    "visibleToDiamond" BOOLEAN NOT NULL DEFAULT true,
    "visibleToModerator" BOOLEAN NOT NULL DEFAULT true,
    "visibleToAdmin" BOOLEAN NOT NULL DEFAULT true,
    "specificUserIds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_feed_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "logoUrl" TEXT,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalMembers" INTEGER NOT NULL DEFAULT 0,
    "activeMembers" INTEGER NOT NULL DEFAULT 0,
    "performanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "penaltyLevel" INTEGER NOT NULL DEFAULT 0,
    "penaltyNote" TEXT,
    "invitesDisabled" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_users" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedVia" TEXT,
    "inviteCodeId" TEXT,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "joinIp" TEXT,
    "joinDeviceId" TEXT,

    CONSTRAINT "agency_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_earnings" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "originalAmount" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_codes" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 0,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_tasks" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "earningsTarget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "newUsersTarget" INTEGER NOT NULL DEFAULT 0,
    "activeUsersTarget" INTEGER NOT NULL DEFAULT 0,
    "earningsActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "newUsersActual" INTEGER NOT NULL DEFAULT 0,
    "activeUsersActual" INTEGER NOT NULL DEFAULT 0,
    "completionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonusAwarded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_penalties" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "appliedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolvedNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_penalties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_leave_requests" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "agency_leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_tournaments" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'jeton_spend',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "rewards" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_tournament_entries" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "rewarded" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_tournament_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_tellers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_tellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "celebrities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "bio" TEXT,
    "profileImage" TEXT,
    "coverImage" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "birthDate" TIMESTAMP(3),
    "birthPlace" TEXT,
    "zodiacSign" TEXT,
    "socialLinks" TEXT,
    "achievements" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "celebrities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "celebrity_follows" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "celebrityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "celebrity_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fan_clubs" (
    "id" TEXT NOT NULL,
    "celebrityId" TEXT NOT NULL,
    "description" TEXT,
    "rules" TEXT,
    "coverImage" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fan_clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fan_club_members" (
    "id" TEXT NOT NULL,
    "fanClubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" TEXT NOT NULL DEFAULT 'yeni_fan',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fan_club_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fan_club_polls" (
    "id" TEXT NOT NULL,
    "fanClubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fan_club_polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fan_club_poll_votes" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optionIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fan_club_poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fan_club_posts" (
    "id" TEXT NOT NULL,
    "fanClubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image" TEXT,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fan_club_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fan_club_post_likes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fan_club_post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trending_topics" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "icon" TEXT,
    "trendScore" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "relatedUrl" TEXT,
    "tags" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trending_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "celebrity_posts" (
    "id" TEXT NOT NULL,
    "celebrityId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "postType" TEXT NOT NULL DEFAULT 'photo',
    "content" TEXT,
    "mediaUrl" TEXT,
    "externalUrl" TEXT,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "celebrity_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "celebrity_post_likes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "celebrity_post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "celebrity_post_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "celebrity_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL DEFAULT 'image',
    "caption" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trend_video_categories" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trend_video_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trend_videos" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "channelName" TEXT,
    "duration" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trend_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiktok_categories" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tiktok_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiktok_videos" (
    "id" TEXT NOT NULL,
    "tiktokUrl" TEXT NOT NULL,
    "tiktokId" TEXT,
    "title" TEXT,
    "authorName" TEXT,
    "authorAvatar" TEXT,
    "thumbnailUrl" TEXT,
    "embedHtml" TEXT,
    "categoryId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tiktok_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cfc_payment_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "senderInfo" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cfc_payment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_videos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "description" VARCHAR(500),
    "durationSec" DOUBLE PRECISION,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "sharesCount" INTEGER NOT NULL DEFAULT 0,
    "savesCount" INTEGER NOT NULL DEFAULT 0,
    "visibility" TEXT NOT NULL DEFAULT 'everyone',
    "commentSetting" TEXT NOT NULL DEFAULT 'everyone',
    "allowDuet" BOOLEAN NOT NULL DEFAULT true,
    "locationName" TEXT,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "musicId" TEXT,
    "duetOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "short_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_video_likes" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "short_video_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_video_comments" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "short_video_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_video_views" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "watchedSec" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "short_video_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_video_saves" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "short_video_saves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_video_comment_likes" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "short_video_comment_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_video_mentions" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "mentionedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "short_video_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hashtags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "videosCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hashtags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_video_hashtags" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "hashtagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "short_video_hashtags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_video_music" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "audioUrl" TEXT NOT NULL,
    "coverUrl" TEXT,
    "durationSec" DOUBLE PRECISION,
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "short_video_music_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "okey_matches" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "tableName" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "hasPassword" BOOLEAN NOT NULL DEFAULT false,
    "betAmount" INTEGER NOT NULL DEFAULT 0,
    "betCurrency" TEXT NOT NULL DEFAULT 'FREE',
    "commissionPct" INTEGER NOT NULL DEFAULT 0,
    "potAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'finished',
    "winnerId" TEXT,
    "winnerName" TEXT,
    "reason" TEXT,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "roundCount" INTEGER NOT NULL DEFAULT 1,
    "indicatorTile" TEXT,
    "okeyTile" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "okey_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "okey_match_players" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "seat" INTEGER NOT NULL,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "penaltyScore" INTEGER NOT NULL DEFAULT 0,
    "betPaid" INTEGER NOT NULL DEFAULT 0,
    "rewardWon" INTEGER NOT NULL DEFAULT 0,
    "leftEarly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "okey_match_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_rules" (
    "id" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sitePercent" INTEGER NOT NULL DEFAULT 50,
    "receiverPercent" INTEGER NOT NULL DEFAULT 50,
    "ownerCutOfRemainderPercent" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_events" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "giftTypeId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "contextId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "grossAmount" INTEGER NOT NULL,
    "siteAmount" INTEGER NOT NULL DEFAULT 0,
    "receiverAmount" INTEGER NOT NULL DEFAULT 0,
    "ownerAmount" INTEGER NOT NULL DEFAULT 0,
    "ownerId" TEXT,
    "recipientIsOwner" BOOLEAN NOT NULL DEFAULT false,
    "senderCity" TEXT,
    "senderCountry" TEXT,
    "battleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_battles" (
    "id" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "durationSec" INTEGER NOT NULL DEFAULT 180,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "winnerId" TEXT,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_battles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_battle_participants" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "displayName" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_battle_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_goals" (
    "id" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT,
    "targetAmount" INTEGER NOT NULL,
    "currentAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "gift_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_missions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "target" INTEGER NOT NULL DEFAULT 1,
    "context" TEXT,
    "rewardJetons" INTEGER NOT NULL DEFAULT 0,
    "rewardCredits" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_mission_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_mission_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pk_matches" (
    "id" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "hostStreamId" TEXT NOT NULL,
    "hostName" TEXT,
    "hostImage" TEXT,
    "guestUserId" TEXT NOT NULL,
    "guestStreamId" TEXT,
    "guestName" TEXT,
    "guestImage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "durationSec" INTEGER NOT NULL DEFAULT 180,
    "hostScore" INTEGER NOT NULL DEFAULT 0,
    "guestScore" INTEGER NOT NULL DEFAULT 0,
    "result" TEXT,
    "winnerUserId" TEXT,
    "finalSprint" BOOLEAN NOT NULL DEFAULT false,
    "mode" TEXT NOT NULL DEFAULT '1v1',
    "seatCount" INTEGER NOT NULL DEFAULT 2,
    "leftScore" INTEGER NOT NULL DEFAULT 0,
    "rightScore" INTEGER NOT NULL DEFAULT 0,
    "leftName" TEXT,
    "rightName" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pk_seats" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "seatIndex" INTEGER NOT NULL,
    "team" TEXT NOT NULL DEFAULT 'none',
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "userImage" TEXT,
    "streamId" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pk_participants" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "outcome" TEXT NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pk_stats" (
    "userId" TEXT NOT NULL,
    "matches" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_stats_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "pk_events" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trtc_webhook_logs" (
    "id" TEXT NOT NULL,
    "eventGroupId" INTEGER NOT NULL,
    "eventType" INTEGER NOT NULL,
    "sdkAppId" INTEGER NOT NULL,
    "roomId" TEXT,
    "userId" TEXT,
    "payload" TEXT NOT NULL,
    "processedOk" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trtc_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pk_bans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "bannedBy" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pk_bans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blocks" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "name_effects" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'gold',
    "cssPreset" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "name_effects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrance_effects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetUrl" TEXT NOT NULL,
    "assetType" TEXT NOT NULL DEFAULT 'lottie',
    "tier" TEXT NOT NULL DEFAULT 'gold',
    "durationMs" INTEGER NOT NULL DEFAULT 3000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "activeFrom" TIMESTAMP(3),
    "activeTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entrance_effects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_bubble_skins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetUrl" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'gold',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_bubble_skins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mic_frames" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetUrl" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'gold',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mic_frames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emoji_packs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coverUrl" TEXT NOT NULL,
    "emojis" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'gold',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emoji_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avatar_accessories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slot" TEXT NOT NULL DEFAULT 'hat',
    "assetUrl" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'gold',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avatar_accessories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_themes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL DEFAULT '',
    "backgroundUrl" TEXT NOT NULL,
    "cloudStoragePath" TEXT,
    "thumbnailUrl" TEXT,
    "thumbnailCloudPath" TEXT,
    "assetType" TEXT NOT NULL DEFAULT 'image',
    "tier" TEXT NOT NULL DEFAULT 'free',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "activeFrom" TIMESTAMP(3),
    "activeTo" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "description" TEXT,
    "animationSpeed" DOUBLE PRECISION DEFAULT 1.0,
    "blurAmount" INTEGER DEFAULT 0,
    "opacity" DOUBLE PRECISION DEFAULT 1.0,
    "hasParallax" BOOLEAN NOT NULL DEFAULT false,
    "hasZoom" BOOLEAN NOT NULL DEFAULT false,
    "videoLoop" BOOLEAN NOT NULL DEFAULT true,
    "soundUrl" TEXT,
    "soundCloudPath" TEXT,
    "soundVolume" INTEGER DEFAULT 50,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isVipOnly" BOOLEAN NOT NULL DEFAULT false,
    "isEventOnly" BOOLEAN NOT NULL DEFAULT false,
    "contentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_themes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- CreateIndex
CREATE INDEX "users_referralCode_idx" ON "users"("referralCode");

-- CreateIndex
CREATE INDEX "users_isBot_idx" ON "users"("isBot");

-- CreateIndex
CREATE INDEX "users_referredById_idx" ON "users"("referredById");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "bot_profiles_userId_key" ON "bot_profiles"("userId");

-- CreateIndex
CREATE INDEX "bot_profiles_isActive_idx" ON "bot_profiles"("isActive");

-- CreateIndex
CREATE INDEX "bot_profiles_personality_idx" ON "bot_profiles"("personality");

-- CreateIndex
CREATE INDEX "follows_followerId_idx" ON "follows"("followerId");

-- CreateIndex
CREATE INDEX "follows_followingId_idx" ON "follows"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "referrals_referrerId_idx" ON "referrals"("referrerId");

-- CreateIndex
CREATE INDEX "referrals_createdAt_idx" ON "referrals"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referrerId_referredId_key" ON "referrals"("referrerId", "referredId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "live_fortune_tellers_userId_key" ON "live_fortune_tellers"("userId");

-- CreateIndex
CREATE INDEX "live_fortune_tellers_isOnline_idx" ON "live_fortune_tellers"("isOnline");

-- CreateIndex
CREATE INDEX "live_fortune_tellers_isVerified_idx" ON "live_fortune_tellers"("isVerified");

-- CreateIndex
CREATE INDEX "live_fortune_tellers_rating_idx" ON "live_fortune_tellers"("rating");

-- CreateIndex
CREATE INDEX "live_fortune_tellers_applicationStatus_idx" ON "live_fortune_tellers"("applicationStatus");

-- CreateIndex
CREATE INDEX "live_fortune_tellers_isBanned_idx" ON "live_fortune_tellers"("isBanned");

-- CreateIndex
CREATE INDEX "live_fortune_tellers_isOnline_rating_idx" ON "live_fortune_tellers"("isOnline", "rating" DESC);

-- CreateIndex
CREATE INDEX "teller_warnings_tellerId_idx" ON "teller_warnings"("tellerId");

-- CreateIndex
CREATE UNIQUE INDEX "live_sessions_roomId_key" ON "live_sessions"("roomId");

-- CreateIndex
CREATE INDEX "live_sessions_tellerId_idx" ON "live_sessions"("tellerId");

-- CreateIndex
CREATE INDEX "live_sessions_userId_idx" ON "live_sessions"("userId");

-- CreateIndex
CREATE INDEX "live_sessions_status_idx" ON "live_sessions"("status");

-- CreateIndex
CREATE INDEX "live_sessions_roomId_idx" ON "live_sessions"("roomId");

-- CreateIndex
CREATE INDEX "room_signals_sessionId_idx" ON "room_signals"("sessionId");

-- CreateIndex
CREATE INDEX "room_signals_receiverId_processed_idx" ON "room_signals"("receiverId", "processed");

-- CreateIndex
CREATE INDEX "live_session_messages_sessionId_idx" ON "live_session_messages"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "live_teller_reviews_sessionId_key" ON "live_teller_reviews"("sessionId");

-- CreateIndex
CREATE INDEX "live_teller_reviews_tellerId_idx" ON "live_teller_reviews"("tellerId");

-- CreateIndex
CREATE INDEX "fortunes_userId_idx" ON "fortunes"("userId");

-- CreateIndex
CREATE INDEX "fortunes_fortuneType_idx" ON "fortunes"("fortuneType");

-- CreateIndex
CREATE INDEX "fortunes_createdAt_idx" ON "fortunes"("createdAt");

-- CreateIndex
CREATE INDEX "fortunes_isPinned_idx" ON "fortunes"("isPinned");

-- CreateIndex
CREATE INDEX "translations_languageCode_idx" ON "translations"("languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "translations_languageCode_translationKey_key" ON "translations"("languageCode", "translationKey");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "chat_rooms_slug_key" ON "chat_rooms"("slug");

-- CreateIndex
CREATE INDEX "chat_rooms_isActive_createdAt_idx" ON "chat_rooms"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "chat_rooms_ownerId_idx" ON "chat_rooms"("ownerId");

-- CreateIndex
CREATE INDEX "chat_rooms_roomType_idx" ON "chat_rooms"("roomType");

-- CreateIndex
CREATE INDEX "chat_room_gifts_roomId_idx" ON "chat_room_gifts"("roomId");

-- CreateIndex
CREATE INDEX "chat_room_gifts_senderId_idx" ON "chat_room_gifts"("senderId");

-- CreateIndex
CREATE INDEX "chat_room_gifts_recipientId_idx" ON "chat_room_gifts"("recipientId");

-- CreateIndex
CREATE INDEX "chat_room_gifts_roomId_senderId_idx" ON "chat_room_gifts"("roomId", "senderId");

-- CreateIndex
CREATE INDEX "chat_room_gifts_roomId_createdAt_idx" ON "chat_room_gifts"("roomId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "chat_messages_roomId_createdAt_idx" ON "chat_messages"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_messages_userId_idx" ON "chat_messages"("userId");

-- CreateIndex
CREATE INDEX "chat_presences_roomId_idx" ON "chat_presences"("roomId");

-- CreateIndex
CREATE INDEX "chat_presences_roomId_lastSeen_idx" ON "chat_presences"("roomId", "lastSeen");

-- CreateIndex
CREATE UNIQUE INDEX "chat_presences_roomId_userId_key" ON "chat_presences"("roomId", "userId");

-- CreateIndex
CREATE INDEX "chat_user_roles_roomId_idx" ON "chat_user_roles"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_user_roles_roomId_userId_key" ON "chat_user_roles"("roomId", "userId");

-- CreateIndex
CREATE INDEX "chat_mutes_roomId_idx" ON "chat_mutes"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_mutes_roomId_userId_key" ON "chat_mutes"("roomId", "userId");

-- CreateIndex
CREATE INDEX "chat_bans_roomId_idx" ON "chat_bans"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_bans_roomId_userId_key" ON "chat_bans"("roomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_key_key" ON "site_settings"("key");

-- CreateIndex
CREATE INDEX "social_posts_userId_idx" ON "social_posts"("userId");

-- CreateIndex
CREATE INDEX "social_posts_createdAt_idx" ON "social_posts"("createdAt");

-- CreateIndex
CREATE INDEX "social_posts_postType_idx" ON "social_posts"("postType");

-- CreateIndex
CREATE INDEX "social_posts_postType_createdAt_idx" ON "social_posts"("postType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "social_comments_postId_idx" ON "social_comments"("postId");

-- CreateIndex
CREATE INDEX "social_comments_userId_idx" ON "social_comments"("userId");

-- CreateIndex
CREATE INDEX "social_likes_postId_idx" ON "social_likes"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "social_likes_postId_userId_key" ON "social_likes"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "anonymous_users_username_key" ON "anonymous_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "anonymous_users_deviceId_key" ON "anonymous_users"("deviceId");

-- CreateIndex
CREATE INDEX "anonymous_fortunes_anonymousUserId_idx" ON "anonymous_fortunes"("anonymousUserId");

-- CreateIndex
CREATE UNIQUE INDEX "site_presences_visitorId_key" ON "site_presences"("visitorId");

-- CreateIndex
CREATE INDEX "site_presences_lastSeen_idx" ON "site_presences"("lastSeen");

-- CreateIndex
CREATE INDEX "site_visits_visitedAt_idx" ON "site_visits"("visitedAt");

-- CreateIndex
CREATE INDEX "site_visits_visitorId_idx" ON "site_visits"("visitorId");

-- CreateIndex
CREATE INDEX "site_visits_country_idx" ON "site_visits"("country");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripeSessionId_key" ON "payments"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripePaymentIntentId_key" ON "payments"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_stripeSessionId_idx" ON "payments"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_type_key" ON "payment_methods"("type");

-- CreateIndex
CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "teller_chat_sessions_liveSessionId_key" ON "teller_chat_sessions"("liveSessionId");

-- CreateIndex
CREATE INDEX "teller_chat_sessions_userId_idx" ON "teller_chat_sessions"("userId");

-- CreateIndex
CREATE INDEX "teller_chat_sessions_tellerId_idx" ON "teller_chat_sessions"("tellerId");

-- CreateIndex
CREATE INDEX "teller_chat_sessions_status_idx" ON "teller_chat_sessions"("status");

-- CreateIndex
CREATE INDEX "teller_chat_messages_chatSessionId_idx" ON "teller_chat_messages"("chatSessionId");

-- CreateIndex
CREATE INDEX "teller_chat_messages_createdAt_idx" ON "teller_chat_messages"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "video_streams_roomId_key" ON "video_streams"("roomId");

-- CreateIndex
CREATE INDEX "video_streams_userId_idx" ON "video_streams"("userId");

-- CreateIndex
CREATE INDEX "video_streams_status_idx" ON "video_streams"("status");

-- CreateIndex
CREATE INDEX "video_streams_startedAt_idx" ON "video_streams"("startedAt");

-- CreateIndex
CREATE INDEX "video_streams_status_startedAt_idx" ON "video_streams"("status", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "video_streams_status_category_startedAt_idx" ON "video_streams"("status", "category", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "video_stream_comments_streamId_idx" ON "video_stream_comments"("streamId");

-- CreateIndex
CREATE INDEX "video_stream_comments_createdAt_idx" ON "video_stream_comments"("createdAt");

-- CreateIndex
CREATE INDEX "video_stream_likes_streamId_idx" ON "video_stream_likes"("streamId");

-- CreateIndex
CREATE UNIQUE INDEX "video_stream_likes_streamId_userId_key" ON "video_stream_likes"("streamId", "userId");

-- CreateIndex
CREATE INDEX "video_stream_viewers_streamId_idx" ON "video_stream_viewers"("streamId");

-- CreateIndex
CREATE UNIQUE INDEX "video_stream_viewers_streamId_viewerId_key" ON "video_stream_viewers"("streamId", "viewerId");

-- CreateIndex
CREATE INDEX "gift_types_collectionId_idx" ON "gift_types"("collectionId");

-- CreateIndex
CREATE INDEX "gift_types_displayType_idx" ON "gift_types"("displayType");

-- CreateIndex
CREATE INDEX "gift_types_contentVersion_idx" ON "gift_types"("contentVersion");

-- CreateIndex
CREATE UNIQUE INDEX "gift_collections_slug_key" ON "gift_collections"("slug");

-- CreateIndex
CREATE INDEX "lucky_gift_tiers_isActive_idx" ON "lucky_gift_tiers"("isActive");

-- CreateIndex
CREATE INDEX "lucky_gift_rewards_userId_createdAt_idx" ON "lucky_gift_rewards"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "lucky_gift_rewards_isJackpot_createdAt_idx" ON "lucky_gift_rewards"("isJackpot", "createdAt");

-- CreateIndex
CREATE INDEX "lucky_gift_rewards_createdAt_idx" ON "lucky_gift_rewards"("createdAt");

-- CreateIndex
CREATE INDEX "stream_gifts_streamId_idx" ON "stream_gifts"("streamId");

-- CreateIndex
CREATE INDEX "stream_gifts_senderId_idx" ON "stream_gifts"("senderId");

-- CreateIndex
CREATE INDEX "video_stream_signals_streamId_idx" ON "video_stream_signals"("streamId");

-- CreateIndex
CREATE INDEX "video_stream_signals_receiverId_processed_idx" ON "video_stream_signals"("receiverId", "processed");

-- CreateIndex
CREATE INDEX "stream_co_broadcasters_streamId_idx" ON "stream_co_broadcasters"("streamId");

-- CreateIndex
CREATE INDEX "stream_co_broadcasters_userId_idx" ON "stream_co_broadcasters"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "stream_co_broadcasters_streamId_userId_key" ON "stream_co_broadcasters"("streamId", "userId");

-- CreateIndex
CREATE INDEX "stream_bans_streamId_idx" ON "stream_bans"("streamId");

-- CreateIndex
CREATE UNIQUE INDEX "stream_bans_streamId_bannedUserId_key" ON "stream_bans"("streamId", "bannedUserId");

-- CreateIndex
CREATE INDEX "stream_moderators_streamId_idx" ON "stream_moderators"("streamId");

-- CreateIndex
CREATE INDEX "stream_moderators_userId_idx" ON "stream_moderators"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "stream_moderators_streamId_userId_key" ON "stream_moderators"("streamId", "userId");

-- CreateIndex
CREATE INDEX "pk_battles_stream1Id_idx" ON "pk_battles"("stream1Id");

-- CreateIndex
CREATE INDEX "pk_battles_stream2Id_idx" ON "pk_battles"("stream2Id");

-- CreateIndex
CREATE INDEX "pk_battles_user1Id_idx" ON "pk_battles"("user1Id");

-- CreateIndex
CREATE INDEX "pk_battles_user2Id_idx" ON "pk_battles"("user2Id");

-- CreateIndex
CREATE INDEX "pk_battles_status_idx" ON "pk_battles"("status");

-- CreateIndex
CREATE INDEX "pk_battles_status_endsAt_idx" ON "pk_battles"("status", "endsAt");

-- CreateIndex
CREATE INDEX "pk_scores_battleId_idx" ON "pk_scores"("battleId");

-- CreateIndex
CREATE INDEX "pk_scores_battleId_side_idx" ON "pk_scores"("battleId", "side");

-- CreateIndex
CREATE INDEX "pk_scores_battleId_contributorId_idx" ON "pk_scores"("battleId", "contributorId");

-- CreateIndex
CREATE INDEX "pk_gifts_battleId_idx" ON "pk_gifts"("battleId");

-- CreateIndex
CREATE INDEX "pk_gifts_battleId_side_idx" ON "pk_gifts"("battleId", "side");

-- CreateIndex
CREATE INDEX "pk_gifts_senderId_idx" ON "pk_gifts"("senderId");

-- CreateIndex
CREATE INDEX "live_guest_sessions_streamId_idx" ON "live_guest_sessions"("streamId");

-- CreateIndex
CREATE INDEX "live_guest_sessions_streamId_status_idx" ON "live_guest_sessions"("streamId", "status");

-- CreateIndex
CREATE INDEX "live_guest_sessions_userId_idx" ON "live_guest_sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "live_guest_sessions_streamId_userId_key" ON "live_guest_sessions"("streamId", "userId");

-- CreateIndex
CREATE INDEX "live_guest_invites_streamId_idx" ON "live_guest_invites"("streamId");

-- CreateIndex
CREATE INDEX "live_guest_invites_guestId_status_idx" ON "live_guest_invites"("guestId", "status");

-- CreateIndex
CREATE INDEX "live_guest_invites_status_expiresAt_idx" ON "live_guest_invites"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "stream_fortune_requests_streamId_idx" ON "stream_fortune_requests"("streamId");

-- CreateIndex
CREATE INDEX "stream_fortune_requests_userId_idx" ON "stream_fortune_requests"("userId");

-- CreateIndex
CREATE INDEX "stream_fortune_requests_jetonAmount_idx" ON "stream_fortune_requests"("jetonAmount");

-- CreateIndex
CREATE INDEX "stream_fortune_requests_status_idx" ON "stream_fortune_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stream_fortune_requests_streamId_userId_key" ON "stream_fortune_requests"("streamId", "userId");

-- CreateIndex
CREATE INDEX "stream_muted_viewers_streamId_idx" ON "stream_muted_viewers"("streamId");

-- CreateIndex
CREATE UNIQUE INDEX "stream_muted_viewers_streamId_viewerId_key" ON "stream_muted_viewers"("streamId", "viewerId");

-- CreateIndex
CREATE INDEX "direct_messages_senderId_idx" ON "direct_messages"("senderId");

-- CreateIndex
CREATE INDEX "direct_messages_receiverId_idx" ON "direct_messages"("receiverId");

-- CreateIndex
CREATE INDEX "direct_messages_createdAt_idx" ON "direct_messages"("createdAt");

-- CreateIndex
CREATE INDEX "direct_messages_senderId_receiverId_createdAt_idx" ON "direct_messages"("senderId", "receiverId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "direct_messages_receiverId_senderId_createdAt_idx" ON "direct_messages"("receiverId", "senderId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "direct_messages_receiverId_isRead_idx" ON "direct_messages"("receiverId", "isRead");

-- CreateIndex
CREATE INDEX "conversations_user1Id_idx" ON "conversations"("user1Id");

-- CreateIndex
CREATE INDEX "conversations_user2Id_idx" ON "conversations"("user2Id");

-- CreateIndex
CREATE INDEX "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_user1Id_user2Id_key" ON "conversations"("user1Id", "user2Id");

-- CreateIndex
CREATE INDEX "message_requests_senderId_idx" ON "message_requests"("senderId");

-- CreateIndex
CREATE INDEX "message_requests_receiverId_idx" ON "message_requests"("receiverId");

-- CreateIndex
CREATE INDEX "message_requests_status_idx" ON "message_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "message_requests_senderId_receiverId_key" ON "message_requests"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "user_login_sessions_userId_idx" ON "user_login_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_login_sessions_loginAt_idx" ON "user_login_sessions"("loginAt");

-- CreateIndex
CREATE INDEX "user_daily_activity_userId_idx" ON "user_daily_activity"("userId");

-- CreateIndex
CREATE INDEX "user_daily_activity_date_idx" ON "user_daily_activity"("date");

-- CreateIndex
CREATE UNIQUE INDEX "user_daily_activity_userId_date_key" ON "user_daily_activity"("userId", "date");

-- CreateIndex
CREATE INDEX "user_hourly_activity_userId_idx" ON "user_hourly_activity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_hourly_activity_userId_hour_key" ON "user_hourly_activity"("userId", "hour");

-- CreateIndex
CREATE INDEX "credit_transactions_userId_idx" ON "credit_transactions"("userId");

-- CreateIndex
CREATE INDEX "credit_transactions_type_idx" ON "credit_transactions"("type");

-- CreateIndex
CREATE INDEX "credit_transactions_createdAt_idx" ON "credit_transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "fortune_ratings_fortuneId_key" ON "fortune_ratings"("fortuneId");

-- CreateIndex
CREATE INDEX "fortune_ratings_userId_idx" ON "fortune_ratings"("userId");

-- CreateIndex
CREATE INDEX "fortune_ratings_fortuneId_idx" ON "fortune_ratings"("fortuneId");

-- CreateIndex
CREATE INDEX "user_achievements_userId_idx" ON "user_achievements"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_userId_achievementId_key" ON "user_achievements"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_code_key" ON "achievements"("code");

-- CreateIndex
CREATE UNIQUE INDEX "bana_ozel_items_slug_key" ON "bana_ozel_items"("slug");

-- CreateIndex
CREATE INDEX "bana_ozel_items_isActive_idx" ON "bana_ozel_items"("isActive");

-- CreateIndex
CREATE INDEX "bana_ozel_items_sortOrder_idx" ON "bana_ozel_items"("sortOrder");

-- CreateIndex
CREATE INDEX "jeton_transactions_userId_idx" ON "jeton_transactions"("userId");

-- CreateIndex
CREATE INDEX "jeton_transactions_type_idx" ON "jeton_transactions"("type");

-- CreateIndex
CREATE INDEX "jeton_transactions_createdAt_idx" ON "jeton_transactions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_fortune_streaks_userId_key" ON "user_fortune_streaks"("userId");

-- CreateIndex
CREATE INDEX "user_fortune_streaks_userId_idx" ON "user_fortune_streaks"("userId");

-- CreateIndex
CREATE INDEX "daily_tasks_userId_idx" ON "daily_tasks"("userId");

-- CreateIndex
CREATE INDEX "daily_tasks_date_idx" ON "daily_tasks"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_tasks_userId_taskType_date_key" ON "daily_tasks"("userId", "taskType", "date");

-- CreateIndex
CREATE INDEX "bana_ozel_history_userId_idx" ON "bana_ozel_history"("userId");

-- CreateIndex
CREATE INDEX "bana_ozel_history_itemSlug_idx" ON "bana_ozel_history"("itemSlug");

-- CreateIndex
CREATE INDEX "bana_ozel_history_createdAt_idx" ON "bana_ozel_history"("createdAt");

-- CreateIndex
CREATE INDEX "profile_views_viewedUserId_idx" ON "profile_views"("viewedUserId");

-- CreateIndex
CREATE INDEX "profile_views_viewedAt_idx" ON "profile_views"("viewedAt");

-- CreateIndex
CREATE INDEX "membership_plans_tier_idx" ON "membership_plans"("tier");

-- CreateIndex
CREATE INDEX "membership_plans_priceType_idx" ON "membership_plans"("priceType");

-- CreateIndex
CREATE INDEX "membership_plans_isActive_idx" ON "membership_plans"("isActive");

-- CreateIndex
CREATE INDEX "membership_purchases_userId_idx" ON "membership_purchases"("userId");

-- CreateIndex
CREATE INDEX "membership_purchases_planId_idx" ON "membership_purchases"("planId");

-- CreateIndex
CREATE INDEX "membership_purchases_status_idx" ON "membership_purchases"("status");

-- CreateIndex
CREATE INDEX "membership_purchases_expiresAt_idx" ON "membership_purchases"("expiresAt");

-- CreateIndex
CREATE INDEX "payment_notifications_userId_idx" ON "payment_notifications"("userId");

-- CreateIndex
CREATE INDEX "payment_notifications_status_idx" ON "payment_notifications"("status");

-- CreateIndex
CREATE INDEX "payment_notifications_createdAt_idx" ON "payment_notifications"("createdAt");

-- CreateIndex
CREATE INDEX "room_revenue_logs_roomId_createdAt_idx" ON "room_revenue_logs"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "room_revenue_logs_eventType_idx" ON "room_revenue_logs"("eventType");

-- CreateIndex
CREATE INDEX "voice_sessions_roomId_idx" ON "voice_sessions"("roomId");

-- CreateIndex
CREATE INDEX "voice_sessions_isActive_idx" ON "voice_sessions"("isActive");

-- CreateIndex
CREATE INDEX "voice_sessions_lastPing_idx" ON "voice_sessions"("lastPing");

-- CreateIndex
CREATE UNIQUE INDEX "voice_sessions_roomId_userId_key" ON "voice_sessions"("roomId", "userId");

-- CreateIndex
CREATE INDEX "voice_signals_roomId_idx" ON "voice_signals"("roomId");

-- CreateIndex
CREATE INDEX "voice_signals_toUserId_idx" ON "voice_signals"("toUserId");

-- CreateIndex
CREATE INDEX "voice_signals_processed_idx" ON "voice_signals"("processed");

-- CreateIndex
CREATE INDEX "voice_signals_createdAt_idx" ON "voice_signals"("createdAt");

-- CreateIndex
CREATE INDEX "ticker_messages_isActive_idx" ON "ticker_messages"("isActive");

-- CreateIndex
CREATE INDEX "homepage_fortune_cards_isActive_sortOrder_idx" ON "homepage_fortune_cards"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "withdrawal_requests_userId_idx" ON "withdrawal_requests"("userId");

-- CreateIndex
CREATE INDEX "withdrawal_requests_agencyId_idx" ON "withdrawal_requests"("agencyId");

-- CreateIndex
CREATE INDEX "withdrawal_requests_status_idx" ON "withdrawal_requests"("status");

-- CreateIndex
CREATE INDEX "withdrawal_requests_createdAt_idx" ON "withdrawal_requests"("createdAt");

-- CreateIndex
CREATE INDEX "teller_awards_tellerId_idx" ON "teller_awards"("tellerId");

-- CreateIndex
CREATE INDEX "teller_awards_awardType_idx" ON "teller_awards"("awardType");

-- CreateIndex
CREATE INDEX "teller_awards_endDate_idx" ON "teller_awards"("endDate");

-- CreateIndex
CREATE INDEX "teller_gifts_tellerId_idx" ON "teller_gifts"("tellerId");

-- CreateIndex
CREATE INDEX "teller_gifts_senderId_idx" ON "teller_gifts"("senderId");

-- CreateIndex
CREATE INDEX "teller_gifts_createdAt_idx" ON "teller_gifts"("createdAt");

-- CreateIndex
CREATE INDEX "site_announcements_createdAt_idx" ON "site_announcements"("createdAt");

-- CreateIndex
CREATE INDEX "site_announcements_expiresAt_idx" ON "site_announcements"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "mini_games_slug_key" ON "mini_games"("slug");

-- CreateIndex
CREATE INDEX "mini_games_slug_idx" ON "mini_games"("slug");

-- CreateIndex
CREATE INDEX "mini_games_isActive_idx" ON "mini_games"("isActive");

-- CreateIndex
CREATE INDEX "game_plays_userId_idx" ON "game_plays"("userId");

-- CreateIndex
CREATE INDEX "game_plays_gameId_idx" ON "game_plays"("gameId");

-- CreateIndex
CREATE INDEX "game_plays_playedAt_idx" ON "game_plays"("playedAt");

-- CreateIndex
CREATE INDEX "game_plays_userId_gameId_idx" ON "game_plays"("userId", "gameId");

-- CreateIndex
CREATE INDEX "sos_games_status_idx" ON "sos_games"("status");

-- CreateIndex
CREATE INDEX "sos_games_player1Id_idx" ON "sos_games"("player1Id");

-- CreateIndex
CREATE INDEX "sos_games_player2Id_idx" ON "sos_games"("player2Id");

-- CreateIndex
CREATE INDEX "sos_games_createdAt_idx" ON "sos_games"("createdAt");

-- CreateIndex
CREATE INDEX "sos_game_chats_gameId_createdAt_idx" ON "sos_game_chats"("gameId", "createdAt");

-- CreateIndex
CREATE INDEX "sos_game_viewers_gameId_idx" ON "sos_game_viewers"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "sos_game_viewers_gameId_userId_key" ON "sos_game_viewers"("gameId", "userId");

-- CreateIndex
CREATE INDEX "game_rooms_gameType_status_idx" ON "game_rooms"("gameType", "status");

-- CreateIndex
CREATE INDEX "game_rooms_status_idx" ON "game_rooms"("status");

-- CreateIndex
CREATE INDEX "game_rooms_player1Id_idx" ON "game_rooms"("player1Id");

-- CreateIndex
CREATE INDEX "game_rooms_createdAt_idx" ON "game_rooms"("createdAt");

-- CreateIndex
CREATE INDEX "game_room_chats_roomId_createdAt_idx" ON "game_room_chats"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "game_room_viewers_roomId_idx" ON "game_room_viewers"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "game_room_viewers_roomId_userId_key" ON "game_room_viewers"("roomId", "userId");

-- CreateIndex
CREATE INDEX "daily_rewards_userId_idx" ON "daily_rewards"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_rewards_userId_rewardDate_key" ON "daily_rewards"("userId", "rewardDate");

-- CreateIndex
CREATE INDEX "daily_quests_userId_idx" ON "daily_quests"("userId");

-- CreateIndex
CREATE INDEX "daily_quests_questDate_idx" ON "daily_quests"("questDate");

-- CreateIndex
CREATE UNIQUE INDEX "daily_quests_userId_questDate_questType_key" ON "daily_quests"("userId", "questDate", "questType");

-- CreateIndex
CREATE UNIQUE INDEX "blog_categories_slug_key" ON "blog_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_isPublished_idx" ON "blog_posts"("isPublished");

-- CreateIndex
CREATE INDEX "blog_posts_category_idx" ON "blog_posts"("category");

-- CreateIndex
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_isFeatured_idx" ON "blog_posts"("isFeatured");

-- CreateIndex
CREATE INDEX "blog_posts_isTrending_idx" ON "blog_posts"("isTrending");

-- CreateIndex
CREATE INDEX "blog_posts_views_idx" ON "blog_posts"("views");

-- CreateIndex
CREATE INDEX "blog_posts_publishedAt_idx" ON "blog_posts"("publishedAt");

-- CreateIndex
CREATE INDEX "blog_posts_isPremium_idx" ON "blog_posts"("isPremium");

-- CreateIndex
CREATE INDEX "blog_posts_zodiacSign_idx" ON "blog_posts"("zodiacSign");

-- CreateIndex
CREATE INDEX "blog_comments_postId_idx" ON "blog_comments"("postId");

-- CreateIndex
CREATE INDEX "blog_comments_userId_idx" ON "blog_comments"("userId");

-- CreateIndex
CREATE INDEX "blog_comments_parentId_idx" ON "blog_comments"("parentId");

-- CreateIndex
CREATE INDEX "blog_likes_postId_idx" ON "blog_likes"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_likes_postId_userId_key" ON "blog_likes"("postId", "userId");

-- CreateIndex
CREATE INDEX "blog_favorites_postId_idx" ON "blog_favorites"("postId");

-- CreateIndex
CREATE INDEX "blog_favorites_userId_idx" ON "blog_favorites"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_favorites_postId_userId_key" ON "blog_favorites"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_game_profiles_userId_key" ON "user_game_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_game_profiles_referralCode_key" ON "user_game_profiles"("referralCode");

-- CreateIndex
CREATE INDEX "user_game_profiles_userId_idx" ON "user_game_profiles"("userId");

-- CreateIndex
CREATE INDEX "user_game_profiles_totalJetons_idx" ON "user_game_profiles"("totalJetons");

-- CreateIndex
CREATE INDEX "broadcast_images_isActive_sortOrder_idx" ON "broadcast_images"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "custom_badges_tier_idx" ON "custom_badges"("tier");

-- CreateIndex
CREATE INDEX "custom_badges_userId_idx" ON "custom_badges"("userId");

-- CreateIndex
CREATE INDEX "custom_badges_isActive_idx" ON "custom_badges"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "site_pages_slug_key" ON "site_pages"("slug");

-- CreateIndex
CREATE INDEX "site_pages_slug_idx" ON "site_pages"("slug");

-- CreateIndex
CREATE INDEX "site_pages_isPublished_idx" ON "site_pages"("isPublished");

-- CreateIndex
CREATE INDEX "site_pages_sortOrder_idx" ON "site_pages"("sortOrder");

-- CreateIndex
CREATE INDEX "push_notification_logs_status_idx" ON "push_notification_logs"("status");

-- CreateIndex
CREATE INDEX "push_notification_logs_createdAt_idx" ON "push_notification_logs"("createdAt");

-- CreateIndex
CREATE INDEX "push_notification_logs_targetType_idx" ON "push_notification_logs"("targetType");

-- CreateIndex
CREATE INDEX "user_devices_userId_idx" ON "user_devices"("userId");

-- CreateIndex
CREATE INDEX "user_devices_token_idx" ON "user_devices"("token");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_userId_token_key" ON "user_devices"("userId", "token");

-- CreateIndex
CREATE UNIQUE INDEX "dream_interpretations_slug_key" ON "dream_interpretations"("slug");

-- CreateIndex
CREATE INDEX "dream_interpretations_slug_idx" ON "dream_interpretations"("slug");

-- CreateIndex
CREATE INDEX "dream_interpretations_views_idx" ON "dream_interpretations"("views");

-- CreateIndex
CREATE INDEX "dream_interpretations_createdAt_idx" ON "dream_interpretations"("createdAt");

-- CreateIndex
CREATE INDEX "dream_interpretations_isPublished_idx" ON "dream_interpretations"("isPublished");

-- CreateIndex
CREATE INDEX "dream_interpretations_category_idx" ON "dream_interpretations"("category");

-- CreateIndex
CREATE INDEX "dream_comments_dreamId_createdAt_idx" ON "dream_comments"("dreamId", "createdAt");

-- CreateIndex
CREATE INDEX "dream_comments_userId_idx" ON "dream_comments"("userId");

-- CreateIndex
CREATE INDEX "dream_comments_experienceType_idx" ON "dream_comments"("experienceType");

-- CreateIndex
CREATE INDEX "dream_favorites_userId_idx" ON "dream_favorites"("userId");

-- CreateIndex
CREATE INDEX "dream_favorites_dreamId_idx" ON "dream_favorites"("dreamId");

-- CreateIndex
CREATE UNIQUE INDEX "dream_favorites_userId_dreamId_key" ON "dream_favorites"("userId", "dreamId");

-- CreateIndex
CREATE INDEX "dream_views_userId_createdAt_idx" ON "dream_views"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "dream_views_dreamId_idx" ON "dream_views"("dreamId");

-- CreateIndex
CREATE UNIQUE INDEX "dream_symbols_name_key" ON "dream_symbols"("name");

-- CreateIndex
CREATE UNIQUE INDEX "dream_symbols_slug_key" ON "dream_symbols"("slug");

-- CreateIndex
CREATE INDEX "dream_symbols_letter_idx" ON "dream_symbols"("letter");

-- CreateIndex
CREATE INDEX "dream_symbols_slug_idx" ON "dream_symbols"("slug");

-- CreateIndex
CREATE INDEX "dream_symbols_isPublished_idx" ON "dream_symbols"("isPublished");

-- CreateIndex
CREATE INDEX "dream_diary_entries_userId_dreamDate_idx" ON "dream_diary_entries"("userId", "dreamDate");

-- CreateIndex
CREATE INDEX "dream_diary_entries_createdAt_idx" ON "dream_diary_entries"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "dream_diary_entries_userId_dreamDate_key" ON "dream_diary_entries"("userId", "dreamDate");

-- CreateIndex
CREATE INDEX "daily_login_rewards_userId_idx" ON "daily_login_rewards"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_login_rewards_userId_rewardDate_key" ON "daily_login_rewards"("userId", "rewardDate");

-- CreateIndex
CREATE INDEX "dream_contests_isActive_idx" ON "dream_contests"("isActive");

-- CreateIndex
CREATE INDEX "dream_contests_endDate_idx" ON "dream_contests"("endDate");

-- CreateIndex
CREATE INDEX "dream_contest_entries_contestId_voteCount_idx" ON "dream_contest_entries"("contestId", "voteCount");

-- CreateIndex
CREATE INDEX "dream_contest_entries_userId_idx" ON "dream_contest_entries"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "dream_contest_entries_contestId_userId_key" ON "dream_contest_entries"("contestId", "userId");

-- CreateIndex
CREATE INDEX "dream_contest_votes_entryId_idx" ON "dream_contest_votes"("entryId");

-- CreateIndex
CREATE INDEX "dream_contest_votes_userId_idx" ON "dream_contest_votes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "dream_contest_votes_entryId_userId_key" ON "dream_contest_votes"("entryId", "userId");

-- CreateIndex
CREATE INDEX "weekly_dream_reports_userId_idx" ON "weekly_dream_reports"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_dream_reports_userId_weekStart_key" ON "weekly_dream_reports"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "online_fal_sections_key_key" ON "online_fal_sections"("key");

-- CreateIndex
CREATE INDEX "online_fal_sections_sortOrder_idx" ON "online_fal_sections"("sortOrder");

-- CreateIndex
CREATE INDEX "online_fal_buttons_sortOrder_idx" ON "online_fal_buttons"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "homepage_buttons_key_key" ON "homepage_buttons"("key");

-- CreateIndex
CREATE INDEX "homepage_buttons_sortOrder_idx" ON "homepage_buttons"("sortOrder");

-- CreateIndex
CREATE INDEX "admin_popups_isActive_priority_idx" ON "admin_popups"("isActive", "priority");

-- CreateIndex
CREATE INDEX "admin_popups_isActive_lastSentAt_idx" ON "admin_popups"("isActive", "lastSentAt");

-- CreateIndex
CREATE INDEX "profile_frames_tier_isActive_idx" ON "profile_frames"("tier", "isActive");

-- CreateIndex
CREATE INDEX "membership_badges_tier_isActive_idx" ON "membership_badges"("tier", "isActive");

-- CreateIndex
CREATE INDEX "ip_fortune_usage_ipAddress_idx" ON "ip_fortune_usage"("ipAddress");

-- CreateIndex
CREATE INDEX "ip_fortune_usage_date_idx" ON "ip_fortune_usage"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ip_fortune_usage_ipAddress_date_key" ON "ip_fortune_usage"("ipAddress", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ad_networks_provider_key" ON "ad_networks"("provider");

-- CreateIndex
CREATE INDEX "ad_networks_isActive_idx" ON "ad_networks"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "currency_config_area_key" ON "currency_config"("area");

-- CreateIndex
CREATE INDEX "currency_config_currencyType_idx" ON "currency_config"("currencyType");

-- CreateIndex
CREATE INDEX "live_activities_createdAt_idx" ON "live_activities"("createdAt");

-- CreateIndex
CREATE INDEX "live_activities_activityType_idx" ON "live_activities"("activityType");

-- CreateIndex
CREATE UNIQUE INDEX "agencies_name_key" ON "agencies"("name");

-- CreateIndex
CREATE INDEX "agencies_ownerId_idx" ON "agencies"("ownerId");

-- CreateIndex
CREATE INDEX "agencies_status_idx" ON "agencies"("status");

-- CreateIndex
CREATE INDEX "agencies_createdAt_idx" ON "agencies"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "agency_users_userId_key" ON "agency_users"("userId");

-- CreateIndex
CREATE INDEX "agency_users_agencyId_idx" ON "agency_users"("agencyId");

-- CreateIndex
CREATE INDEX "agency_users_userId_idx" ON "agency_users"("userId");

-- CreateIndex
CREATE INDEX "agency_users_isActive_idx" ON "agency_users"("isActive");

-- CreateIndex
CREATE INDEX "agency_earnings_agencyId_idx" ON "agency_earnings"("agencyId");

-- CreateIndex
CREATE INDEX "agency_earnings_userId_idx" ON "agency_earnings"("userId");

-- CreateIndex
CREATE INDEX "agency_earnings_createdAt_idx" ON "agency_earnings"("createdAt");

-- CreateIndex
CREATE INDEX "agency_earnings_sourceType_idx" ON "agency_earnings"("sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "invite_codes_code_key" ON "invite_codes"("code");

-- CreateIndex
CREATE INDEX "invite_codes_agencyId_idx" ON "invite_codes"("agencyId");

-- CreateIndex
CREATE INDEX "invite_codes_code_idx" ON "invite_codes"("code");

-- CreateIndex
CREATE INDEX "agency_tasks_agencyId_idx" ON "agency_tasks"("agencyId");

-- CreateIndex
CREATE INDEX "agency_tasks_weekStart_idx" ON "agency_tasks"("weekStart");

-- CreateIndex
CREATE INDEX "agency_tasks_status_idx" ON "agency_tasks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "agency_tasks_agencyId_weekStart_key" ON "agency_tasks"("agencyId", "weekStart");

-- CreateIndex
CREATE INDEX "agency_penalties_agencyId_idx" ON "agency_penalties"("agencyId");

-- CreateIndex
CREATE INDEX "agency_penalties_isActive_idx" ON "agency_penalties"("isActive");

-- CreateIndex
CREATE INDEX "agency_leave_requests_agencyId_idx" ON "agency_leave_requests"("agencyId");

-- CreateIndex
CREATE INDEX "agency_leave_requests_userId_idx" ON "agency_leave_requests"("userId");

-- CreateIndex
CREATE INDEX "agency_leave_requests_status_idx" ON "agency_leave_requests"("status");

-- CreateIndex
CREATE INDEX "weekly_tournaments_status_idx" ON "weekly_tournaments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_tournaments_weekStart_type_key" ON "weekly_tournaments"("weekStart", "type");

-- CreateIndex
CREATE INDEX "weekly_tournament_entries_tournamentId_idx" ON "weekly_tournament_entries"("tournamentId");

-- CreateIndex
CREATE INDEX "weekly_tournament_entries_userId_idx" ON "weekly_tournament_entries"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_tournament_entries_tournamentId_userId_key" ON "weekly_tournament_entries"("tournamentId", "userId");

-- CreateIndex
CREATE INDEX "favorite_tellers_userId_idx" ON "favorite_tellers"("userId");

-- CreateIndex
CREATE INDEX "favorite_tellers_tellerId_idx" ON "favorite_tellers"("tellerId");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_tellers_userId_tellerId_key" ON "favorite_tellers"("userId", "tellerId");

-- CreateIndex
CREATE UNIQUE INDEX "celebrities_slug_key" ON "celebrities"("slug");

-- CreateIndex
CREATE INDEX "celebrities_category_idx" ON "celebrities"("category");

-- CreateIndex
CREATE INDEX "celebrities_isActive_idx" ON "celebrities"("isActive");

-- CreateIndex
CREATE INDEX "celebrities_followerCount_idx" ON "celebrities"("followerCount");

-- CreateIndex
CREATE INDEX "celebrities_slug_idx" ON "celebrities"("slug");

-- CreateIndex
CREATE INDEX "celebrity_follows_userId_idx" ON "celebrity_follows"("userId");

-- CreateIndex
CREATE INDEX "celebrity_follows_celebrityId_idx" ON "celebrity_follows"("celebrityId");

-- CreateIndex
CREATE UNIQUE INDEX "celebrity_follows_userId_celebrityId_key" ON "celebrity_follows"("userId", "celebrityId");

-- CreateIndex
CREATE UNIQUE INDEX "fan_clubs_celebrityId_key" ON "fan_clubs"("celebrityId");

-- CreateIndex
CREATE INDEX "fan_clubs_isActive_idx" ON "fan_clubs"("isActive");

-- CreateIndex
CREATE INDEX "fan_club_members_fanClubId_idx" ON "fan_club_members"("fanClubId");

-- CreateIndex
CREATE INDEX "fan_club_members_userId_idx" ON "fan_club_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "fan_club_members_fanClubId_userId_key" ON "fan_club_members"("fanClubId", "userId");

-- CreateIndex
CREATE INDEX "fan_club_polls_fanClubId_isActive_idx" ON "fan_club_polls"("fanClubId", "isActive");

-- CreateIndex
CREATE INDEX "fan_club_polls_userId_idx" ON "fan_club_polls"("userId");

-- CreateIndex
CREATE INDEX "fan_club_poll_votes_pollId_idx" ON "fan_club_poll_votes"("pollId");

-- CreateIndex
CREATE INDEX "fan_club_poll_votes_userId_idx" ON "fan_club_poll_votes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "fan_club_poll_votes_pollId_userId_key" ON "fan_club_poll_votes"("pollId", "userId");

-- CreateIndex
CREATE INDEX "fan_club_posts_fanClubId_createdAt_idx" ON "fan_club_posts"("fanClubId", "createdAt");

-- CreateIndex
CREATE INDEX "fan_club_posts_userId_idx" ON "fan_club_posts"("userId");

-- CreateIndex
CREATE INDEX "fan_club_post_likes_postId_idx" ON "fan_club_post_likes"("postId");

-- CreateIndex
CREATE INDEX "fan_club_post_likes_userId_idx" ON "fan_club_post_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "fan_club_post_likes_postId_userId_key" ON "fan_club_post_likes"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "trending_topics_slug_key" ON "trending_topics"("slug");

-- CreateIndex
CREATE INDEX "trending_topics_category_idx" ON "trending_topics"("category");

-- CreateIndex
CREATE INDEX "trending_topics_isActive_trendScore_idx" ON "trending_topics"("isActive", "trendScore");

-- CreateIndex
CREATE INDEX "trending_topics_isPinned_idx" ON "trending_topics"("isPinned");

-- CreateIndex
CREATE INDEX "celebrity_posts_celebrityId_createdAt_idx" ON "celebrity_posts"("celebrityId", "createdAt");

-- CreateIndex
CREATE INDEX "celebrity_posts_platform_idx" ON "celebrity_posts"("platform");

-- CreateIndex
CREATE INDEX "celebrity_posts_isActive_idx" ON "celebrity_posts"("isActive");

-- CreateIndex
CREATE INDEX "celebrity_posts_isPinned_idx" ON "celebrity_posts"("isPinned");

-- CreateIndex
CREATE INDEX "celebrity_post_likes_postId_idx" ON "celebrity_post_likes"("postId");

-- CreateIndex
CREATE INDEX "celebrity_post_likes_userId_idx" ON "celebrity_post_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "celebrity_post_likes_postId_userId_key" ON "celebrity_post_likes"("postId", "userId");

-- CreateIndex
CREATE INDEX "celebrity_post_comments_postId_createdAt_idx" ON "celebrity_post_comments"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "celebrity_post_comments_userId_idx" ON "celebrity_post_comments"("userId");

-- CreateIndex
CREATE INDEX "user_stories_userId_isActive_expiresAt_idx" ON "user_stories"("userId", "isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "user_stories_expiresAt_idx" ON "user_stories"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "trend_video_categories_slug_key" ON "trend_video_categories"("slug");

-- CreateIndex
CREATE INDEX "trend_video_categories_isActive_sortOrder_idx" ON "trend_video_categories"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "trend_videos_categoryId_sortOrder_idx" ON "trend_videos"("categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "trend_videos_isActive_createdAt_idx" ON "trend_videos"("isActive", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "tiktok_categories_slug_key" ON "tiktok_categories"("slug");

-- CreateIndex
CREATE INDEX "tiktok_categories_isActive_sortOrder_idx" ON "tiktok_categories"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "tiktok_videos_isActive_sortOrder_idx" ON "tiktok_videos"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "tiktok_videos_categoryId_idx" ON "tiktok_videos"("categoryId");

-- CreateIndex
CREATE INDEX "cfc_payment_requests_userId_idx" ON "cfc_payment_requests"("userId");

-- CreateIndex
CREATE INDEX "cfc_payment_requests_status_idx" ON "cfc_payment_requests"("status");

-- CreateIndex
CREATE INDEX "cfc_payment_requests_createdAt_idx" ON "cfc_payment_requests"("createdAt");

-- CreateIndex
CREATE INDEX "short_videos_createdAt_idx" ON "short_videos"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "short_videos_userId_createdAt_idx" ON "short_videos"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "short_videos_visibility_createdAt_idx" ON "short_videos"("visibility", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "short_videos_musicId_idx" ON "short_videos"("musicId");

-- CreateIndex
CREATE INDEX "short_videos_duetOfId_idx" ON "short_videos"("duetOfId");

-- CreateIndex
CREATE INDEX "short_video_likes_videoId_idx" ON "short_video_likes"("videoId");

-- CreateIndex
CREATE INDEX "short_video_likes_userId_idx" ON "short_video_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "short_video_likes_videoId_userId_key" ON "short_video_likes"("videoId", "userId");

-- CreateIndex
CREATE INDEX "short_video_comments_videoId_createdAt_idx" ON "short_video_comments"("videoId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "short_video_comments_videoId_parentId_createdAt_idx" ON "short_video_comments"("videoId", "parentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "short_video_comments_parentId_idx" ON "short_video_comments"("parentId");

-- CreateIndex
CREATE INDEX "short_video_comments_userId_idx" ON "short_video_comments"("userId");

-- CreateIndex
CREATE INDEX "short_video_views_videoId_idx" ON "short_video_views"("videoId");

-- CreateIndex
CREATE INDEX "short_video_views_userId_idx" ON "short_video_views"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "short_video_views_videoId_userId_key" ON "short_video_views"("videoId", "userId");

-- CreateIndex
CREATE INDEX "short_video_saves_videoId_idx" ON "short_video_saves"("videoId");

-- CreateIndex
CREATE INDEX "short_video_saves_userId_createdAt_idx" ON "short_video_saves"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "short_video_saves_videoId_userId_key" ON "short_video_saves"("videoId", "userId");

-- CreateIndex
CREATE INDEX "short_video_comment_likes_commentId_idx" ON "short_video_comment_likes"("commentId");

-- CreateIndex
CREATE INDEX "short_video_comment_likes_userId_idx" ON "short_video_comment_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "short_video_comment_likes_commentId_userId_key" ON "short_video_comment_likes"("commentId", "userId");

-- CreateIndex
CREATE INDEX "short_video_mentions_videoId_idx" ON "short_video_mentions"("videoId");

-- CreateIndex
CREATE INDEX "short_video_mentions_mentionedUserId_idx" ON "short_video_mentions"("mentionedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "short_video_mentions_videoId_mentionedUserId_key" ON "short_video_mentions"("videoId", "mentionedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "hashtags_name_key" ON "hashtags"("name");

-- CreateIndex
CREATE INDEX "hashtags_videosCount_idx" ON "hashtags"("videosCount" DESC);

-- CreateIndex
CREATE INDEX "short_video_hashtags_hashtagId_createdAt_idx" ON "short_video_hashtags"("hashtagId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "short_video_hashtags_videoId_idx" ON "short_video_hashtags"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "short_video_hashtags_videoId_hashtagId_key" ON "short_video_hashtags"("videoId", "hashtagId");

-- CreateIndex
CREATE INDEX "short_video_music_usesCount_idx" ON "short_video_music"("usesCount" DESC);

-- CreateIndex
CREATE INDEX "short_video_music_isActive_idx" ON "short_video_music"("isActive");

-- CreateIndex
CREATE INDEX "okey_matches_mode_status_idx" ON "okey_matches"("mode", "status");

-- CreateIndex
CREATE INDEX "okey_matches_winnerId_idx" ON "okey_matches"("winnerId");

-- CreateIndex
CREATE INDEX "okey_matches_createdAt_idx" ON "okey_matches"("createdAt");

-- CreateIndex
CREATE INDEX "okey_match_players_matchId_idx" ON "okey_match_players"("matchId");

-- CreateIndex
CREATE INDEX "okey_match_players_userId_idx" ON "okey_match_players"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_rules_context_key" ON "revenue_rules"("context");

-- CreateIndex
CREATE UNIQUE INDEX "gift_events_idempotencyKey_key" ON "gift_events"("idempotencyKey");

-- CreateIndex
CREATE INDEX "gift_events_senderId_createdAt_idx" ON "gift_events"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "gift_events_receiverId_createdAt_idx" ON "gift_events"("receiverId", "createdAt");

-- CreateIndex
CREATE INDEX "gift_events_context_createdAt_idx" ON "gift_events"("context", "createdAt");

-- CreateIndex
CREATE INDEX "gift_events_giftTypeId_idx" ON "gift_events"("giftTypeId");

-- CreateIndex
CREATE INDEX "gift_events_battleId_idx" ON "gift_events"("battleId");

-- CreateIndex
CREATE INDEX "gift_events_createdAt_idx" ON "gift_events"("createdAt");

-- CreateIndex
CREATE INDEX "gift_battles_context_contextId_status_idx" ON "gift_battles"("context", "contextId", "status");

-- CreateIndex
CREATE INDEX "gift_battles_status_endsAt_idx" ON "gift_battles"("status", "endsAt");

-- CreateIndex
CREATE INDEX "gift_battle_participants_battleId_score_idx" ON "gift_battle_participants"("battleId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "gift_battle_participants_battleId_participantId_key" ON "gift_battle_participants"("battleId", "participantId");

-- CreateIndex
CREATE INDEX "gift_goals_context_contextId_status_idx" ON "gift_goals"("context", "contextId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "gift_missions_code_key" ON "gift_missions"("code");

-- CreateIndex
CREATE INDEX "user_mission_progress_userId_dayKey_idx" ON "user_mission_progress"("userId", "dayKey");

-- CreateIndex
CREATE UNIQUE INDEX "user_mission_progress_userId_missionId_dayKey_key" ON "user_mission_progress"("userId", "missionId", "dayKey");

-- CreateIndex
CREATE INDEX "pk_matches_hostUserId_status_idx" ON "pk_matches"("hostUserId", "status");

-- CreateIndex
CREATE INDEX "pk_matches_guestUserId_status_idx" ON "pk_matches"("guestUserId", "status");

-- CreateIndex
CREATE INDEX "pk_matches_status_endsAt_idx" ON "pk_matches"("status", "endsAt");

-- CreateIndex
CREATE INDEX "pk_matches_hostStreamId_idx" ON "pk_matches"("hostStreamId");

-- CreateIndex
CREATE INDEX "pk_matches_guestStreamId_idx" ON "pk_matches"("guestStreamId");

-- CreateIndex
CREATE INDEX "pk_matches_status_mode_idx" ON "pk_matches"("status", "mode");

-- CreateIndex
CREATE INDEX "pk_seats_matchId_status_idx" ON "pk_seats"("matchId", "status");

-- CreateIndex
CREATE INDEX "pk_seats_userId_status_idx" ON "pk_seats"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pk_seats_matchId_seatIndex_key" ON "pk_seats"("matchId", "seatIndex");

-- CreateIndex
CREATE INDEX "pk_participants_userId_finishedAt_idx" ON "pk_participants"("userId", "finishedAt");

-- CreateIndex
CREATE INDEX "pk_participants_finishedAt_idx" ON "pk_participants"("finishedAt");

-- CreateIndex
CREATE INDEX "pk_participants_outcome_finishedAt_idx" ON "pk_participants"("outcome", "finishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "pk_participants_matchId_userId_key" ON "pk_participants"("matchId", "userId");

-- CreateIndex
CREATE INDEX "pk_stats_wins_idx" ON "pk_stats"("wins");

-- CreateIndex
CREATE INDEX "pk_stats_totalScore_idx" ON "pk_stats"("totalScore");

-- CreateIndex
CREATE INDEX "pk_events_matchId_endsAt_idx" ON "pk_events"("matchId", "endsAt");

-- CreateIndex
CREATE INDEX "trtc_webhook_logs_eventGroupId_eventType_idx" ON "trtc_webhook_logs"("eventGroupId", "eventType");

-- CreateIndex
CREATE INDEX "trtc_webhook_logs_roomId_idx" ON "trtc_webhook_logs"("roomId");

-- CreateIndex
CREATE INDEX "trtc_webhook_logs_userId_idx" ON "trtc_webhook_logs"("userId");

-- CreateIndex
CREATE INDEX "trtc_webhook_logs_createdAt_idx" ON "trtc_webhook_logs"("createdAt");

-- CreateIndex
CREATE INDEX "pk_bans_userId_active_idx" ON "pk_bans"("userId", "active");

-- CreateIndex
CREATE INDEX "user_blocks_blockerId_idx" ON "user_blocks"("blockerId");

-- CreateIndex
CREATE INDEX "user_blocks_blockedId_idx" ON "user_blocks"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "user_blocks_blockerId_blockedId_key" ON "user_blocks"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "user_reports_reporterId_idx" ON "user_reports"("reporterId");

-- CreateIndex
CREATE INDEX "user_reports_reportedId_idx" ON "user_reports"("reportedId");

-- CreateIndex
CREATE INDEX "user_reports_status_idx" ON "user_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "name_effects_key_key" ON "name_effects"("key");

-- CreateIndex
CREATE INDEX "name_effects_tier_isActive_idx" ON "name_effects"("tier", "isActive");

-- CreateIndex
CREATE INDEX "entrance_effects_tier_isActive_idx" ON "entrance_effects"("tier", "isActive");

-- CreateIndex
CREATE INDEX "chat_bubble_skins_tier_isActive_idx" ON "chat_bubble_skins"("tier", "isActive");

-- CreateIndex
CREATE INDEX "mic_frames_tier_isActive_idx" ON "mic_frames"("tier", "isActive");

-- CreateIndex
CREATE INDEX "emoji_packs_tier_isActive_idx" ON "emoji_packs"("tier", "isActive");

-- CreateIndex
CREATE INDEX "avatar_accessories_slot_isActive_idx" ON "avatar_accessories"("slot", "isActive");

-- CreateIndex
CREATE INDEX "avatar_accessories_tier_isActive_idx" ON "avatar_accessories"("tier", "isActive");

-- CreateIndex
CREATE INDEX "room_themes_tier_isActive_idx" ON "room_themes"("tier", "isActive");

-- CreateIndex
CREATE INDEX "room_themes_category_idx" ON "room_themes"("category");

-- CreateIndex
CREATE INDEX "room_themes_contentVersion_idx" ON "room_themes"("contentVersion");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_profileFrameId_fkey" FOREIGN KEY ("profileFrameId") REFERENCES "profile_frames"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_adminAssignedFrameId_fkey" FOREIGN KEY ("adminAssignedFrameId") REFERENCES "profile_frames"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_profiles" ADD CONSTRAINT "bot_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_fortune_tellers" ADD CONSTRAINT "live_fortune_tellers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teller_warnings" ADD CONSTRAINT "teller_warnings_tellerId_fkey" FOREIGN KEY ("tellerId") REFERENCES "live_fortune_tellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_tellerId_fkey" FOREIGN KEY ("tellerId") REFERENCES "live_fortune_tellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_signals" ADD CONSTRAINT "room_signals_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_session_messages" ADD CONSTRAINT "live_session_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_teller_reviews" ADD CONSTRAINT "live_teller_reviews_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_teller_reviews" ADD CONSTRAINT "live_teller_reviews_tellerId_fkey" FOREIGN KEY ("tellerId") REFERENCES "live_fortune_tellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fortunes" ADD CONSTRAINT "fortunes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_giftBeneficiaryId_fkey" FOREIGN KEY ("giftBeneficiaryId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_gifts" ADD CONSTRAINT "chat_room_gifts_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_gifts" ADD CONSTRAINT "chat_room_gifts_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_gifts" ADD CONSTRAINT "chat_room_gifts_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_gifts" ADD CONSTRAINT "chat_room_gifts_giftTypeId_fkey" FOREIGN KEY ("giftTypeId") REFERENCES "gift_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_presences" ADD CONSTRAINT "chat_presences_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_presences" ADD CONSTRAINT "chat_presences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_user_roles" ADD CONSTRAINT "chat_user_roles_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_user_roles" ADD CONSTRAINT "chat_user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_mutes" ADD CONSTRAINT "chat_mutes_mutedBy_fkey" FOREIGN KEY ("mutedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_mutes" ADD CONSTRAINT "chat_mutes_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_mutes" ADD CONSTRAINT "chat_mutes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_bans" ADD CONSTRAINT "chat_bans_bannedBy_fkey" FOREIGN KEY ("bannedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_bans" ADD CONSTRAINT "chat_bans_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_bans" ADD CONSTRAINT "chat_bans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_fortuneId_fkey" FOREIGN KEY ("fortuneId") REFERENCES "fortunes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_comments" ADD CONSTRAINT "social_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_comments" ADD CONSTRAINT "social_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_likes" ADD CONSTRAINT "social_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_likes" ADD CONSTRAINT "social_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anonymous_fortunes" ADD CONSTRAINT "anonymous_fortunes_anonymousUserId_fkey" FOREIGN KEY ("anonymousUserId") REFERENCES "anonymous_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "credit_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teller_chat_sessions" ADD CONSTRAINT "teller_chat_sessions_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teller_chat_messages" ADD CONSTRAINT "teller_chat_messages_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "teller_chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_streams" ADD CONSTRAINT "video_streams_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_stream_comments" ADD CONSTRAINT "video_stream_comments_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "video_streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_stream_comments" ADD CONSTRAINT "video_stream_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_stream_likes" ADD CONSTRAINT "video_stream_likes_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "video_streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_stream_likes" ADD CONSTRAINT "video_stream_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_stream_viewers" ADD CONSTRAINT "video_stream_viewers_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "video_streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_types" ADD CONSTRAINT "gift_types_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "gift_collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_gifts" ADD CONSTRAINT "stream_gifts_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "video_streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_gifts" ADD CONSTRAINT "stream_gifts_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_gifts" ADD CONSTRAINT "stream_gifts_giftTypeId_fkey" FOREIGN KEY ("giftTypeId") REFERENCES "gift_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pk_scores" ADD CONSTRAINT "pk_scores_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "pk_battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pk_gifts" ADD CONSTRAINT "pk_gifts_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "pk_battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_fortune_requests" ADD CONSTRAINT "stream_fortune_requests_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "fortune_request_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_requests" ADD CONSTRAINT "message_requests_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_requests" ADD CONSTRAINT "message_requests_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_purchases" ADD CONSTRAINT "membership_purchases_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_revenue_logs" ADD CONSTRAINT "room_revenue_logs_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_plays" ADD CONSTRAINT "game_plays_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "mini_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_game_chats" ADD CONSTRAINT "sos_game_chats_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "sos_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_game_viewers" ADD CONSTRAINT "sos_game_viewers_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "sos_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_room_chats" ADD CONSTRAINT "game_room_chats_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "game_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_room_viewers" ADD CONSTRAINT "game_room_viewers_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "game_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dream_comments" ADD CONSTRAINT "dream_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dream_comments" ADD CONSTRAINT "dream_comments_dreamId_fkey" FOREIGN KEY ("dreamId") REFERENCES "dream_interpretations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dream_favorites" ADD CONSTRAINT "dream_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dream_favorites" ADD CONSTRAINT "dream_favorites_dreamId_fkey" FOREIGN KEY ("dreamId") REFERENCES "dream_interpretations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dream_views" ADD CONSTRAINT "dream_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dream_views" ADD CONSTRAINT "dream_views_dreamId_fkey" FOREIGN KEY ("dreamId") REFERENCES "dream_interpretations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dream_diary_entries" ADD CONSTRAINT "dream_diary_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_login_rewards" ADD CONSTRAINT "daily_login_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dream_contest_entries" ADD CONSTRAINT "dream_contest_entries_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "dream_contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dream_contest_entries" ADD CONSTRAINT "dream_contest_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dream_contest_votes" ADD CONSTRAINT "dream_contest_votes_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "dream_contest_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dream_contest_votes" ADD CONSTRAINT "dream_contest_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_dream_reports" ADD CONSTRAINT "weekly_dream_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_activities" ADD CONSTRAINT "live_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_users" ADD CONSTRAINT "agency_users_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_users" ADD CONSTRAINT "agency_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_users" ADD CONSTRAINT "agency_users_inviteCodeId_fkey" FOREIGN KEY ("inviteCodeId") REFERENCES "invite_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_earnings" ADD CONSTRAINT "agency_earnings_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_tasks" ADD CONSTRAINT "agency_tasks_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_penalties" ADD CONSTRAINT "agency_penalties_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_leave_requests" ADD CONSTRAINT "agency_leave_requests_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_leave_requests" ADD CONSTRAINT "agency_leave_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_tournament_entries" ADD CONSTRAINT "weekly_tournament_entries_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "weekly_tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celebrity_follows" ADD CONSTRAINT "celebrity_follows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celebrity_follows" ADD CONSTRAINT "celebrity_follows_celebrityId_fkey" FOREIGN KEY ("celebrityId") REFERENCES "celebrities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fan_clubs" ADD CONSTRAINT "fan_clubs_celebrityId_fkey" FOREIGN KEY ("celebrityId") REFERENCES "celebrities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fan_club_members" ADD CONSTRAINT "fan_club_members_fanClubId_fkey" FOREIGN KEY ("fanClubId") REFERENCES "fan_clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fan_club_members" ADD CONSTRAINT "fan_club_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fan_club_polls" ADD CONSTRAINT "fan_club_polls_fanClubId_fkey" FOREIGN KEY ("fanClubId") REFERENCES "fan_clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fan_club_polls" ADD CONSTRAINT "fan_club_polls_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fan_club_poll_votes" ADD CONSTRAINT "fan_club_poll_votes_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "fan_club_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fan_club_poll_votes" ADD CONSTRAINT "fan_club_poll_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fan_club_posts" ADD CONSTRAINT "fan_club_posts_fanClubId_fkey" FOREIGN KEY ("fanClubId") REFERENCES "fan_clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fan_club_posts" ADD CONSTRAINT "fan_club_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fan_club_post_likes" ADD CONSTRAINT "fan_club_post_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "fan_club_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fan_club_post_likes" ADD CONSTRAINT "fan_club_post_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celebrity_posts" ADD CONSTRAINT "celebrity_posts_celebrityId_fkey" FOREIGN KEY ("celebrityId") REFERENCES "celebrities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celebrity_post_likes" ADD CONSTRAINT "celebrity_post_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "celebrity_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celebrity_post_likes" ADD CONSTRAINT "celebrity_post_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celebrity_post_comments" ADD CONSTRAINT "celebrity_post_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "celebrity_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celebrity_post_comments" ADD CONSTRAINT "celebrity_post_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stories" ADD CONSTRAINT "user_stories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_videos" ADD CONSTRAINT "trend_videos_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "trend_video_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiktok_videos" ADD CONSTRAINT "tiktok_videos_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "tiktok_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cfc_payment_requests" ADD CONSTRAINT "cfc_payment_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_videos" ADD CONSTRAINT "short_videos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_videos" ADD CONSTRAINT "short_videos_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES "short_video_music"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_videos" ADD CONSTRAINT "short_videos_duetOfId_fkey" FOREIGN KEY ("duetOfId") REFERENCES "short_videos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_video_likes" ADD CONSTRAINT "short_video_likes_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "short_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_video_likes" ADD CONSTRAINT "short_video_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_video_comments" ADD CONSTRAINT "short_video_comments_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "short_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_video_comments" ADD CONSTRAINT "short_video_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_video_comments" ADD CONSTRAINT "short_video_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "short_video_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_video_views" ADD CONSTRAINT "short_video_views_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "short_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_video_views" ADD CONSTRAINT "short_video_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_video_saves" ADD CONSTRAINT "short_video_saves_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "short_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_video_saves" ADD CONSTRAINT "short_video_saves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_video_comment_likes" ADD CONSTRAINT "short_video_comment_likes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "short_video_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_video_comment_likes" ADD CONSTRAINT "short_video_comment_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_video_mentions" ADD CONSTRAINT "short_video_mentions_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "short_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_video_mentions" ADD CONSTRAINT "short_video_mentions_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_video_hashtags" ADD CONSTRAINT "short_video_hashtags_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "short_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "short_video_hashtags" ADD CONSTRAINT "short_video_hashtags_hashtagId_fkey" FOREIGN KEY ("hashtagId") REFERENCES "hashtags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "okey_match_players" ADD CONSTRAINT "okey_match_players_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "okey_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_events" ADD CONSTRAINT "gift_events_giftTypeId_fkey" FOREIGN KEY ("giftTypeId") REFERENCES "gift_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_battle_participants" ADD CONSTRAINT "gift_battle_participants_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "gift_battles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pk_seats" ADD CONSTRAINT "pk_seats_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "pk_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

