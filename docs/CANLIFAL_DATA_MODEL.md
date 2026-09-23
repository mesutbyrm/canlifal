# CANLIFAL_DATA_MODEL.md — Veri Modeli Dokümanı (§84)

**Sürüm:** 2.0 · **Tarih:** 2026-08-27 · **Kaynak:** `prisma/schema.prisma` (4498 satır)

**Toplam:** 215 model · 2534 alan · 492 `@@index` · 65 `@@unique` · 306 ilişki alanı.

Tek PostgreSQL veritabanı; web ve mobil istemciler aynı şemayı paylaşır. Her modelin birincil anahtarı `id` (cuid/uuid string) — aksi belirtilmedikçe.

> Bu doküman Sürüm 1.0'ın (198 model, PHASE 1 envanteri) yerini alır. Faz 3-23 arasında eklenen 17 yeni model ve kapatılan yapısal boşluklar bölüm 4'te listelenir.


---

## 1. Kategori Özeti

| # | Kategori | Model | Alan | İlişki |
|---|---|---|---|---|
| 1 | Kimlik, Kullanıcı & Cihaz | 20 | 290 | 88 |
| 2 | Yetkilendirme & Güvenlik (RBAC) | 6 | 60 | 4 |
| 3 | Cüzdan, Finans & Defter | 14 | 176 | 7 |
| 4 | Hediye Sistemi | 16 | 274 | 15 |
| 5 | Falcı & Canlı Seans | 13 | 156 | 19 |
| 6 | Fal & Rüya İçeriği | 16 | 147 | 21 |
| 7 | Sesli Sohbet Odaları | 9 | 129 | 21 |
| 8 | Canlı Video Yayın | 15 | 152 | 11 |
| 9 | PK & Turnuva | 13 | 157 | 10 |
| 10 | Sosyal Akış & Mesajlaşma | 10 | 104 | 17 |
| 11 | Kısa Video & Medya | 13 | 137 | 32 |
| 12 | Görev, Ödül & Rozet | 10 | 88 | 3 |
| 13 | Oyunlar | 11 | 145 | 12 |
| 14 | Görsel Efekt & Kozmetik | 10 | 99 | 2 |
| 15 | Ajans | 6 | 92 | 14 |
| 16 | Destek & Şikayet | 2 | 21 | 2 |
| 17 | Platform, CMS & Yapılandırma | 20 | 194 | 0 |
| 18 | Ünlü & Fan Club (legacy) | 11 | 113 | 28 |
| | **TOPLAM** | **215** | **2534** | **306** |

---

## 2. Model Envanteri

### Kimlik, Kullanıcı & Cihaz (20 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `User` | 123 | 4 | 0 | 74 | `users` |
| `PushNotificationLog` | 17 | 3 | 0 | 0 | `push_notification_logs` |
| `BotProfile` | 14 | 2 | 0 | 1 | `bot_profiles` |
| `Verification` | 14 | 5 | 0 | 0 | `verifications` |
| `Account` | 13 | 1 | 1 | 1 | `accounts` |
| `SiteVisit` | 12 | 3 | 0 | 0 | `site_visits` |
| `UserReport` | 10 | 3 | 0 | 2 | `user_reports` |
| `UserDailyActivity` | 10 | 2 | 1 | 0 | `user_daily_activity` |
| `AnonymousUser` | 10 | 0 | 0 | 1 | `anonymous_users` |
| `SitePresence` | 9 | 1 | 0 | 0 | `site_presences` |
| `UserDevice` | 8 | 2 | 1 | 1 | `user_devices` |
| `PasswordResetToken` | 7 | 2 | 0 | 1 | `password_reset_tokens` |
| `UserLoginSession` | 7 | 2 | 0 | 0 | `user_login_sessions` |
| `Referral` | 7 | 2 | 1 | 2 | `referrals` |
| `Follow` | 6 | 2 | 1 | 2 | `follows` |
| `UserBlock` | 6 | 2 | 1 | 2 | `user_blocks` |
| `Session` | 5 | 1 | 0 | 1 | `sessions` |
| `UserHourlyActivity` | 5 | 1 | 1 | 0 | `user_hourly_activity` |
| `ProfileView` | 4 | 2 | 0 | 0 | `profile_views` |
| `VerificationToken` | 3 | 0 | 1 | 0 | `verification_tokens` |

### Yetkilendirme & Güvenlik (RBAC) (6 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `RiskEvent` | 17 | 5 | 0 | 0 | `risk_events` |
| `AuditLog` | 12 | 4 | 0 | 0 | `audit_logs` |
| `Role` | 9 | 1 | 0 | 1 | `roles` |
| `IdempotencyRecord` | 9 | 3 | 0 | 0 | `idempotency_records` |
| `Permission` | 7 | 1 | 0 | 1 | `permissions` |
| `RolePermission` | 6 | 2 | 1 | 2 | `role_permissions` |

### Cüzdan, Finans & Defter (14 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `MembershipPlan` | 21 | 3 | 0 | 1 | `membership_plans` |
| `LedgerEntry` | 16 | 6 | 0 | 0 | `ledger_entries` |
| `WithdrawalRequest` | 16 | 4 | 0 | 0 | `withdrawal_requests` |
| `CreditPackage` | 14 | 0 | 0 | 1 | `credit_packages` |
| `Payment` | 14 | 3 | 0 | 2 | `payments` |
| `PaymentNotification` | 13 | 3 | 0 | 0 | `payment_notifications` |
| `RoomRevenueLog` | 13 | 2 | 0 | 1 | `room_revenue_logs` |
| `CfcPaymentRequest` | 12 | 3 | 0 | 1 | `cfc_payment_requests` |
| `MembershipPurchase` | 12 | 4 | 0 | 1 | `membership_purchases` |
| `PaymentMethod` | 11 | 0 | 0 | 0 | `payment_methods` |
| `JetonTransaction` | 9 | 3 | 0 | 0 | `jeton_transactions` |
| `RevenueRule` | 9 | 0 | 0 | 0 | `revenue_rules` |
| `CreditTransaction` | 8 | 3 | 0 | 0 | `credit_transactions` |
| `CurrencyConfig` | 8 | 1 | 0 | 0 | `currency_config` |

### Hediye Sistemi (16 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `GiftType` | 89 | 4 | 0 | 4 | `gift_types` |
| `GiftEvent` | 20 | 6 | 0 | 1 | `gift_events` |
| `GiftQueue` | 17 | 3 | 0 | 0 | `gift_queue` |
| `ChatRoomGift` | 15 | 5 | 0 | 4 | `chat_room_gifts` |
| `GiftHistory` | 13 | 4 | 0 | 0 | `gift_history` |
| `GiftCollection` | 13 | 0 | 0 | 1 | `gift_collections` |
| `LuckyGiftTier` | 13 | 1 | 0 | 0 | `lucky_gift_tiers` |
| `LuckyGiftReward` | 13 | 3 | 0 | 0 | `lucky_gift_rewards` |
| `GiftMission` | 12 | 0 | 0 | 0 | `gift_missions` |
| `GiftBattle` | 12 | 2 | 0 | 1 | `gift_battles` |
| `StreamGift` | 12 | 2 | 0 | 3 | `stream_gifts` |
| `GiftCombo` | 10 | 2 | 1 | 0 | `gift_combos` |
| `GiftGoal` | 10 | 1 | 0 | 0 | `gift_goals` |
| `SupporterLevel` | 10 | 3 | 1 | 0 | `supporter_levels` |
| `TellerGift` | 8 | 3 | 0 | 0 | `teller_gifts` |
| `GiftBattleParticipant` | 7 | 1 | 1 | 1 | `gift_battle_participants` |

### Falcı & Canlı Seans (13 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `LiveFortuneTeller` | 47 | 7 | 0 | 4 | `live_fortune_tellers` |
| `LiveSession` | 23 | 4 | 0 | 6 | `live_sessions` |
| `TellerChatMessage` | 10 | 2 | 0 | 1 | `teller_chat_messages` |
| `TellerChatSession` | 9 | 3 | 0 | 2 | `teller_chat_sessions` |
| `RoomSignal` | 9 | 2 | 0 | 1 | `room_signals` |
| `VoiceSignal` | 9 | 4 | 0 | 0 | `voice_signals` |
| `LiveActivity` | 9 | 2 | 0 | 1 | `live_activities` |
| `LiveTellerReview` | 8 | 1 | 0 | 2 | `live_teller_reviews` |
| `TellerAward` | 8 | 3 | 0 | 0 | `teller_awards` |
| `VoiceSession` | 8 | 3 | 1 | 0 | `voice_sessions` |
| `LiveSessionMessage` | 6 | 1 | 0 | 1 | `live_session_messages` |
| `TellerWarning` | 6 | 1 | 0 | 1 | `teller_warnings` |
| `FavoriteTeller` | 4 | 2 | 1 | 0 | `favorite_tellers` |

### Fal & Rüya İçeriği (16 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `DreamInterpretation` | 16 | 5 | 0 | 3 | `dream_interpretations` |
| `Fortune` | 13 | 4 | 0 | 2 | `fortunes` |
| `DreamDiaryEntry` | 12 | 2 | 1 | 1 | `dream_diary_entries` |
| `FortuneRequestType` | 11 | 0 | 0 | 1 | `fortune_request_types` |
| `DreamSymbol` | 10 | 3 | 0 | 0 | `dream_symbols` |
| `DreamComment` | 10 | 3 | 0 | 2 | `dream_comments` |
| `DreamContest` | 10 | 2 | 0 | 1 | `dream_contests` |
| `DreamContestEntry` | 9 | 2 | 1 | 3 | `dream_contest_entries` |
| `WeeklyDreamReport` | 9 | 1 | 1 | 1 | `weekly_dream_reports` |
| `FortuneRating` | 8 | 2 | 0 | 0 | `fortune_ratings` |
| `AnonymousFortune` | 8 | 1 | 0 | 1 | `anonymous_fortunes` |
| `IpFortuneUsage` | 7 | 2 | 1 | 0 | `ip_fortune_usage` |
| `UserFortuneStreak` | 6 | 1 | 0 | 0 | `user_fortune_streaks` |
| `DreamFavorite` | 6 | 2 | 1 | 2 | `dream_favorites` |
| `DreamView` | 6 | 2 | 0 | 2 | `dream_views` |
| `DreamContestVote` | 6 | 2 | 1 | 2 | `dream_contest_votes` |

### Sesli Sohbet Odaları (9 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `ChatRoom` | 37 | 3 | 0 | 9 | `chat_rooms` |
| `RoomTheme` | 30 | 3 | 0 | 0 | `room_themes` |
| `ChatPresence` | 10 | 4 | 1 | 2 | `chat_presences` |
| `ChatMute` | 10 | 1 | 1 | 3 | `chat_mutes` |
| `ChatBan` | 10 | 1 | 1 | 3 | `chat_bans` |
| `ChatSpeakRequest` | 10 | 2 | 1 | 0 | `chat_speak_requests` |
| `ChatUserRole` | 8 | 2 | 1 | 2 | `chat_user_roles` |
| `ChatMessage` | 7 | 2 | 0 | 2 | `chat_messages` |
| `ChatSpeakBlock` | 7 | 1 | 1 | 0 | `chat_speak_blocks` |

### Canlı Video Yayın (15 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `VideoStream` | 24 | 5 | 0 | 5 | `video_streams` |
| `RtcTelemetry` | 21 | 5 | 0 | 0 | `rtc_telemetry` |
| `StreamFortuneRequest` | 14 | 4 | 1 | 1 | `stream_fortune_requests` |
| `LiveGuestSession` | 11 | 3 | 1 | 0 | `live_guest_sessions` |
| `TrtcWebhookLog` | 10 | 4 | 0 | 0 | `trtc_webhook_logs` |
| `VideoStreamComment` | 9 | 2 | 0 | 2 | `video_stream_comments` |
| `VideoStreamViewer` | 9 | 2 | 1 | 1 | `video_stream_viewers` |
| `StreamCoBroadcaster` | 9 | 3 | 1 | 0 | `stream_co_broadcasters` |
| `VideoStreamSignal` | 8 | 2 | 0 | 0 | `video_stream_signals` |
| `LiveGuestInvite` | 8 | 3 | 0 | 0 | `live_guest_invites` |
| `StreamMutedViewer` | 7 | 1 | 1 | 0 | `stream_muted_viewers` |
| `BroadcastImage` | 7 | 1 | 0 | 0 | `broadcast_images` |
| `VideoStreamLike` | 6 | 1 | 1 | 2 | `video_stream_likes` |
| `StreamBan` | 5 | 1 | 1 | 0 | `stream_bans` |
| `StreamModerator` | 4 | 2 | 1 | 0 | `stream_moderators` |

### PK & Turnuva (13 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `PkMatch` | 30 | 6 | 0 | 1 | `pk_matches` |
| `PKBattle` | 19 | 6 | 0 | 2 | `pk_battles` |
| `PkSeat` | 15 | 2 | 1 | 1 | `pk_seats` |
| `Team` | 13 | 3 | 0 | 1 | `teams` |
| `PkStat` | 12 | 2 | 0 | 0 | `pk_stats` |
| `PkGift` | 10 | 3 | 0 | 1 | `pk_gifts` |
| `WeeklyTournament` | 10 | 1 | 1 | 1 | `weekly_tournaments` |
| `PkParticipant` | 9 | 3 | 1 | 0 | `pk_participants` |
| `WeeklyTournamentEntry` | 9 | 2 | 1 | 1 | `weekly_tournament_entries` |
| `PkEvent` | 8 | 1 | 0 | 0 | `pk_events` |
| `PkBan` | 8 | 1 | 0 | 0 | `pk_bans` |
| `PkScore` | 7 | 3 | 0 | 1 | `pk_scores` |
| `TeamMember` | 7 | 2 | 1 | 1 | `team_members` |

### Sosyal Akış & Mesajlaşma (10 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `TrendingTopic` | 18 | 3 | 0 | 0 | `trending_topics` |
| `SocialPost` | 17 | 4 | 0 | 4 | `social_posts` |
| `Notification` | 14 | 5 | 0 | 1 | `notifications` |
| `UserStory` | 10 | 2 | 0 | 1 | `user_stories` |
| `DirectMessage` | 9 | 6 | 0 | 2 | `direct_messages` |
| `MessageRequest` | 9 | 3 | 1 | 2 | `message_requests` |
| `Conversation` | 8 | 3 | 1 | 2 | `conversations` |
| `SocialComment` | 7 | 2 | 0 | 2 | `social_comments` |
| `SocialLike` | 6 | 1 | 1 | 2 | `social_likes` |
| `Hashtag` | 6 | 1 | 0 | 1 | `hashtags` |

### Kısa Video & Medya (13 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `ShortVideo` | 31 | 5 | 0 | 10 | `short_videos` |
| `TikTokVideo` | 14 | 2 | 0 | 1 | `tiktok_videos` |
| `ShortVideoComment` | 13 | 4 | 0 | 5 | `short_video_comments` |
| `TrendVideo` | 13 | 2 | 0 | 1 | `trend_videos` |
| `ShortVideoMusic` | 11 | 2 | 0 | 1 | `short_video_music` |
| `TikTokCategory` | 9 | 1 | 0 | 1 | `tiktok_categories` |
| `TrendVideoCategory` | 9 | 1 | 0 | 1 | `trend_video_categories` |
| `ShortVideoView` | 7 | 2 | 1 | 2 | `short_video_views` |
| `ShortVideoCommentLike` | 6 | 2 | 1 | 2 | `short_video_comment_likes` |
| `ShortVideoLike` | 6 | 2 | 1 | 2 | `short_video_likes` |
| `ShortVideoSave` | 6 | 2 | 1 | 2 | `short_video_saves` |
| `ShortVideoHashtag` | 6 | 2 | 1 | 2 | `short_video_hashtags` |
| `ShortVideoMention` | 6 | 2 | 1 | 2 | `short_video_mentions` |

### Görev, Ödül & Rozet (10 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `BanaOzelItem` | 14 | 2 | 0 | 0 | `bana_ozel_items` |
| `Achievement` | 13 | 0 | 0 | 0 | `achievements` |
| `InviteCode` | 11 | 2 | 0 | 2 | `invite_codes` |
| `DailyQuest` | 9 | 2 | 1 | 0 | `daily_quests` |
| `UserMissionProgress` | 9 | 1 | 1 | 0 | `user_mission_progress` |
| `DailyLoginReward` | 8 | 1 | 1 | 1 | `daily_login_rewards` |
| `UserAchievement` | 6 | 1 | 1 | 0 | `user_achievements` |
| `DailyTask` | 6 | 2 | 1 | 0 | `daily_tasks` |
| `DailyReward` | 6 | 1 | 1 | 0 | `daily_rewards` |
| `BanaOzelHistory` | 6 | 3 | 0 | 0 | `bana_ozel_history` |

### Oyunlar (11 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `SosGame` | 26 | 5 | 0 | 2 | `sos_games` |
| `GameRoom` | 25 | 4 | 0 | 2 | `game_rooms` |
| `OkeyMatch` | 21 | 3 | 0 | 1 | `okey_matches` |
| `MiniGame` | 14 | 2 | 0 | 1 | `mini_games` |
| `OkeyMatchPlayer` | 13 | 2 | 0 | 1 | `okey_match_players` |
| `UserGameProfile` | 12 | 2 | 0 | 0 | `user_game_profiles` |
| `GamePlay` | 8 | 4 | 0 | 1 | `game_plays` |
| `GameRoomChat` | 7 | 1 | 0 | 1 | `game_room_chats` |
| `SosGameChat` | 7 | 1 | 0 | 1 | `sos_game_chats` |
| `GameRoomViewer` | 6 | 1 | 1 | 1 | `game_room_viewers` |
| `SosGameViewer` | 6 | 1 | 1 | 1 | `sos_game_viewers` |

### Görsel Efekt & Kozmetik (10 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `EffectRule` | 14 | 3 | 0 | 0 | `effect_rules` |
| `EntranceEffect` | 12 | 1 | 0 | 0 | `entrance_effects` |
| `CustomBadge` | 12 | 3 | 0 | 0 | `custom_badges` |
| `ProfileFrame` | 10 | 1 | 0 | 2 | `profile_frames` |
| `NameEffect` | 9 | 1 | 0 | 0 | `name_effects` |
| `EmojiPack` | 9 | 1 | 0 | 0 | `emoji_packs` |
| `AvatarAccessory` | 9 | 2 | 0 | 0 | `avatar_accessories` |
| `ChatBubbleSkin` | 8 | 1 | 0 | 0 | `chat_bubble_skins` |
| `MicFrame` | 8 | 1 | 0 | 0 | `mic_frames` |
| `MembershipBadge` | 8 | 1 | 0 | 0 | `membership_badges` |

### Ajans (6 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `Agency` | 29 | 3 | 0 | 6 | `agencies` |
| `AgencyTask` | 16 | 3 | 1 | 1 | `agency_tasks` |
| `AgencyUser` | 15 | 3 | 0 | 3 | `agency_users` |
| `AgencyPenalty` | 11 | 2 | 0 | 1 | `agency_penalties` |
| `AgencyLeaveRequest` | 11 | 3 | 0 | 2 | `agency_leave_requests` |
| `AgencyEarning` | 10 | 5 | 0 | 1 | `agency_earnings` |

### Destek & Şikayet (2 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `SupportTicket` | 12 | 5 | 0 | 1 | `support_tickets` |
| `SupportMessage` | 9 | 3 | 0 | 1 | `support_messages` |

### Platform, CMS & Yapılandırma (20 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `BlogPost` | 28 | 9 | 0 | 0 | `blog_posts` |
| `AdminPopup` | 14 | 2 | 0 | 0 | `admin_popups` |
| `ActivityFeedConfig` | 13 | 0 | 0 | 0 | `activity_feed_config` |
| `BlogCategory` | 13 | 0 | 0 | 0 | `blog_categories` |
| `SitePage` | 12 | 3 | 0 | 0 | `site_pages` |
| `OnlineFalButton` | 11 | 1 | 0 | 0 | `online_fal_buttons` |
| `BlogComment` | 11 | 3 | 0 | 0 | `blog_comments` |
| `HomepageButton` | 10 | 1 | 0 | 0 | `homepage_buttons` |
| `AdNetwork` | 10 | 1 | 0 | 0 | `ad_networks` |
| `FeatureFlag` | 9 | 1 | 0 | 0 | `feature_flags` |
| `RemoteConfig` | 9 | 2 | 0 | 0 | `remote_configs` |
| `HomepageFortuneCard` | 9 | 1 | 0 | 0 | `homepage_fortune_cards` |
| `SiteAnnouncement` | 9 | 2 | 0 | 0 | `site_announcements` |
| `OnlineFalSection` | 8 | 1 | 0 | 0 | `online_fal_sections` |
| `TickerMessage` | 7 | 1 | 0 | 0 | `ticker_messages` |
| `PlatformSettings` | 5 | 0 | 0 | 0 | `platform_settings` |
| `SiteSetting` | 4 | 0 | 0 | 0 | `site_settings` |
| `Translation` | 4 | 1 | 1 | 0 | `translations` |
| `BlogLike` | 4 | 1 | 1 | 0 | `blog_likes` |
| `BlogFavorite` | 4 | 2 | 1 | 0 | `blog_favorites` |

### Ünlü & Fan Club (legacy) (11 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `Celebrity` | 20 | 4 | 0 | 3 | `celebrities` |
| `CelebrityPost` | 16 | 4 | 0 | 3 | `celebrity_posts` |
| `FanClub` | 13 | 1 | 0 | 4 | `fan_clubs` |
| `FanClubPost` | 12 | 2 | 0 | 3 | `fan_club_posts` |
| `FanClubPoll` | 11 | 2 | 0 | 3 | `fan_club_polls` |
| `FanClubMember` | 9 | 2 | 1 | 2 | `fan_club_members` |
| `CelebrityPostComment` | 7 | 2 | 0 | 2 | `celebrity_post_comments` |
| `FanClubPollVote` | 7 | 2 | 1 | 2 | `fan_club_poll_votes` |
| `CelebrityFollow` | 6 | 2 | 1 | 2 | `celebrity_follows` |
| `CelebrityPostLike` | 6 | 2 | 1 | 2 | `celebrity_post_likes` |
| `FanClubPostLike` | 6 | 2 | 1 | 2 | `fan_club_post_likes` |

---

## 3. İlişki Haritası

### 3.1 Topoloji: `User` merkezli yıldız

Şema tek bir merkez etrafında kuruludur. `User` modeli **123 alan** ve **74 ilişki alanı** taşır; 215 modelin büyük çoğunluğu doğrudan veya bir ara model üzerinden `User`'a bağlanır. Bu, istemci tarafında şu pratik sonuçları doğurur:

- Kullanıcıya ait herhangi bir kaynak (hediye, mesaj, yayın, fal, ödeme) her zaman `userId` benzeri bir yabancı anahtar taşır — hiçbir uçta kullanıcı kimliği URL parametresinden türetilmez, oturumdan alınır.
- `User` üzerinde okuma yaparken `include` yerine `select` kullanılır; 123 alanın tamamı hiçbir uçta dönmez.
- Kullanıcı silindiğinde 135 ilişki `Cascade`, 5 ilişki `SetNull` davranır (bkz. 3.5).

### 3.2 Çekirdek zincirler

Aşağıdaki yedi zincir, platformun tüm iş akışlarını kapsar.

**A. Falcı seansı (ücretli birebir görüşme)**

```
User ──> LiveSession <── LiveFortuneTeller ──> User (falcı hesabı)
             │
             ├─> LiveSessionMessage   (seans içi sohbet)
             ├─> RoomSignal           (WebRTC sinyalleşmesi)
             ├─> LiveTellerReview     (seans sonrası puan)
             └─> LedgerEntry          (kredi düşümü + falcı alacağı + komisyon)
```

`LiveSession.status` alanı `pending → active → completed | cancelled | rejected` geçişlerini tutar. Kredi rezervasyonu `pending` anında yapılır; iptal/ret durumunda iade edilir.

**B. Sesli sohbet odası**

```
ChatRoom ──> ChatPresence      (o an odadaki kullanıcılar + koltuk numarası)
   │    ──> ChatUserRole       (oda sahibi / yönetici / DJ rolleri)
   │    ──> ChatMessage        (metin akışı)
   │    ──> ChatMute, ChatBan, ChatSpeakRequest, ChatSpeakBlock
   │    ──> ChatRoomGift ──> GiftType
   └──> owner: User? (SetNull), giftBeneficiary: User? (SetNull)
```

`ChatPresence` hem "kim odada" hem "kim hangi koltukta" sorusunu tek tabloda cevaplar; koltuk atama işlemi TOCTOU yarışına açık olduğu için etkileşimli transaction içinde yürütülür.

**C. Canlı video yayın**

```
VideoStream ──> VideoStreamViewer   (leftAt = null olanlar aktif izleyici)
     │      ──> VideoStreamComment
     │      ──> VideoStreamLike
     │      ──> VideoStreamSignal    (WebRTC)
     │      ──> StreamCoBroadcaster, StreamModerator, StreamBan, StreamMutedViewer
     │      ──> StreamGift ──> GiftType
     └──> RtcTelemetry               (bağlantı kalitesi ölçümleri)
```

Aktif izleyici sayısı `VideoStreamViewer` üzerinde `leftAt: null` filtresiyle hesaplanır — bu yüzden `@@index([streamId, leftAt])` kritik yoldadır.

**D. Hediye ve gelir dağıtımı**

```
GiftType ──> ChatRoomGift | StreamGift | TellerGift | PkGift
                    │
                    ├─> LedgerEntry     (çok bacaklı: gönderen − / alıcı + / platform +)
                    ├─> AgencyEarning   (alıcı bir ajansa bağlıysa)
                    ├─> GiftEvent       (analitik akış)
                    ├─> GiftCombo / GiftGoal / GiftMission / GiftBattle (kampanya katmanı)
                    └─> SupporterLevel  (yayıncıya özel destekçi seviyesi)
```

Hediye gönderimi platformun tek en karmaşık yazma işlemidir: tek transaction içinde jeton düşümü, alıcı alacağı, platform komisyonu, ajans payı ve defter kaydı birlikte yazılır.

**E. Cüzdan ve para çekme**

```
CreditPackage ──> Payment ──> PaymentMethod
                     └─> CreditTransaction / JetonTransaction ──> LedgerEntry
User.jetonBalance ──> WithdrawalRequest ──> (admin onayı) ──> LedgerEntry
MembershipPlan ──> MembershipPurchase ──> MembershipBadge
```

`LedgerEntry` değiştirilemez (append-only) kayıt katmanıdır; `CreditTransaction` ve `JetonTransaction` kullanıcıya gösterilen özet görünümdür.

**F. Sosyal akış ve mesajlaşma**

```
SocialPost ──> SocialComment ──> SocialLike
     └──> Hashtag ──> TrendingTopic
Conversation (user1, user2) ──> DirectMessage
MessageRequest  (tanımadığı kişiden ilk mesaj filtresi)
Notification    (dedupeKey + deepLink ile tekilleştirilmiş)
```

`Conversation` iki taraflı sabit bir kayıt; `user1Id`/`user2Id` çifti unique. Mesaj listeleri imleç tabanlı sayfalamayı destekler.

**G. PK, takım ve turnuva**

```
PkMatch ──> PkParticipant ──> PkScore ──> PkGift
   └──> PkSeat, PkEvent, PkBan
PkStat        (kümülatif kullanıcı istatistiği)
Team ──> TeamMember ──> (takım puanı = üyelerin PK katkısı)
WeeklyTournament ──> WeeklyTournamentEntry
```

### 3.3 Kendine referanslı ilişkiler

| Model | Alan çifti | Anlamı |
|---|---|---|
| `User` | `referredBy` / `referrals` | Davet zinciri (bir kullanıcı birden çok kişiyi davet eder) |
| `ShortVideo` | `duetOf` / `duets` | Düet videolar; kaynak video silinirse `SetNull` |
| `ShortVideoComment` | `parent` / `replies` | İç içe yorum ağacı |

### 3.4 Çok-çoka ilişkiler

Prisma implicit many-to-many kullanılmaz; tüm çok-çoka bağlar **açık join modeli** ile kurulur ve bileşik `@@unique` ile tekilleştirilir:

| Join modeli | Bağladığı taraflar | Tekillik kısıtı |
|---|---|---|
| `RolePermission` | `Role` ↔ `Permission` | `[roleId, permissionId]` |
| `Follow` | `User` ↔ `User` | `[followerId, followingId]` |
| `UserBlock` | `User` ↔ `User` | `[blockerId, blockedId]` |
| `ChatUserRole` | `User` ↔ `ChatRoom` | `[roomId, userId]` |
| `TeamMember` | `User` ↔ `Team` | `[teamId, userId]` |
| `ShortVideoHashtag` | `ShortVideo` ↔ `Hashtag` | `[videoId, hashtagId]` |
| `FanClubMember` | `User` ↔ `FanClub` | `[fanClubId, userId]` |
| `UserAchievement` | `User` ↔ `Achievement` | `[userId, achievementId]` |

Bu desen, çift kayıt oluşmasını veritabanı seviyesinde engeller; uygulama katmanında `P2002` hatası yakalanıp idempotent yanıt döndürülür.

### 3.5 Silme davranışı

| Davranış | Sayı | Nerede |
|---|---|---|
| `onDelete: Cascade` | 135 | Sahibine bağlı türev kayıtlar (mesaj, beğeni, izleyici, sinyal, katılım) |
| `onDelete: SetNull` | 5 | `ChatRoom.owner`, `ChatRoom.giftBeneficiary`, `LiveActivity.user`, `ShortVideo.music`, `ShortVideo.duetOf` |
| Varsayılan (`Restrict`) | kalanlar | Finansal ve denetim kayıtları — silinmeyi engeller |

**Kural:** `LedgerEntry`, `AuditLog`, `Payment`, `WithdrawalRequest` hiçbir cascade zincirinin ucunda değildir. Kullanıcı silinse bile finansal iz kaybolmaz.

### 3.6 Denormalize sayaçlar

Performans için bazı sayımlar ilişki üzerinden `count` yerine üst kayıtta tutulur:

| Alan | Model | Yazan akış |
|---|---|---|
| `likeCount` | `VideoStream`, `CelebrityPost`, `FanClubPost`, `TrendingTopic` | Beğeni ucu `increment` ile artırır |
| `commentCount` | `CelebrityPost` | Yorum oluşturma |
| `viewCount` | `Fortune`, `UserStory`, `TrendVideo`, `TrendingTopic` | Görüntüleme ucu |
| `followerCount` | `Celebrity` | Takip/bırakma akışı |
| `totalEarnings` | `LiveFortuneTeller`, `Agency`, `AgencyUser` | Hediye/seans transaction'ı |

Not: `ShortVideo`, `SocialPost` ve `User` üzerinde denormalize sayaç **yoktur**; bu modellerde sayımlar ilişki tablosundan `count` ile alınır.

Bu alanlar **tek doğruluk kaynağı değildir**; kesin rakam gerektiğinde ilgili tablodan `count` alınır. İstemci bu alanları ekranda göstermek için kullanabilir, mutabakat için kullanamaz.

---

## 4. Faz 3-23'te Eklenen 17 Model

Sürüm 1.0'da "eksik" olarak işaretlenen yapısal boşlukların tamamı kapatıldı.

| Model | Faz | Kapattığı boşluk |
|---|---|---|
| `FeatureFlag` | 3 | Özellik bayrakları sabit allowlist yerine tabloda |
| `RemoteConfig` | 3 | Eşikler/süreler/ödüller kod dışında, gruplu JSON olarak |
| `Role` | 4 | Rol tanımları |
| `Permission` | 4 | İzin tanımları |
| `RolePermission` | 4 | Rol ↔ izin eşlemesi |
| `LedgerEntry` | 6 | Değiştirilemez finansal defter |
| `AuditLog` | 7 | Admin işlem izi |
| `RiskEvent` | 8 | Anti-fraud sinyalleri |
| `IdempotencyRecord` | 9 | Tekrar gönderim koruması (24sa TTL) |
| `RtcTelemetry` | 11 | Bağlantı kalitesi ölçümü |
| `SupportTicket` | 13 | Destek talebi |
| `SupportMessage` | 13 | Destek yazışması |
| `Verification` | 14 | Mavi tik iş akışı |
| `Team` | 15 | Takım sistemi |
| `TeamMember` | 15 | Takım üyeliği |
| `SupporterLevel` | 16 | Yayıncıya özel destekçi seviyesi |
| `EffectRule` | 16 | Efekt tetikleyici/öncelik motoru |

Sürüm 1.0'da "kısmen atomik" işaretlenen üç akış (ajans komisyonu, PK skor güncelleme, koltuk atama) Faz 20 ve Faz 23'te etkileşimli transaction'a alındı. Kod tabanında bugün **50 `$transaction` çağrısı / 38 dosya** vardır.

---

## 5. İndeks Stratejisi

492 `@@index` tanımının dağılımı ve seçim kuralları:

| Desen | Örnek | Neden |
|---|---|---|
| `[ownerId, createdAt(desc)]` | `Notification`, `GiftEvent`, `AuditLog` | Sahibe ait son N kaydın imleçli listelenmesi |
| `[parentId, statusAlanı]` | `VideoStreamViewer([streamId, leftAt])` | Aktif alt kayıt sayımı |
| Bileşik unique | `Follow([followerId, followingId])` | Çift kayıt engelleme + arama |
| Tekil enum/durum | `LiveFortuneTeller([verificationStatus])` | Admin filtre ekranları |
| Tekilleştirme penceresi | `Notification([userId, dedupeKey, createdAt desc])` | Bildirim kopya kontrolü |

**Kural:** Tutarlı büyük/küçük harfle saklanan enum benzeri alanlarda `ILIKE` / `mode: 'insensitive'` kullanılmaz — B-Tree indeksini devre dışı bırakır. Eşleşme `equals` / `in` ile yapılır.

---

## 6. İstemci İçin Notlar

1. Kimlik daima oturumdan çıkarılır; hiçbir uç `userId`'yi istekten kabul etmez.
2. Sayfalama iki modludur: klasik `page/limit` (varsayılan, geriye dönük uyumlu) ve opt-in imleç (`?cursor=` veya `?paginate=cursor`). İmleçli 12 uç mevcut.
3. Para etkileyen uçlarda `x-idempotency-key` başlığı gönderilmelidir (11 uç, 24 saat TTL).
4. Sayaç alanları (`likeCount` vb.) yaklaşık değerdir; bakiye ve kazanç ekranlarında cüzdan uçları kullanılmalıdır.
5. Silinmiş kullanıcıya ait oda `ownerId: null` döner — istemci bu durumu boş sahip olarak işlemelidir.
