# CANLIFAL_DATA_MODEL.md — Veri Modeli Envanteri (PHASE 1 AUDIT)

> Kaynak: `prisma/schema.prisma` (4092 satır). Tarih: 2026-08-27

**Toplam:** 198 model / 2338 alan / 429 `@@index` / 62 `@@unique` / 180 ilişki tanımı. Tek PostgreSQL veritabanı, web + mobil ortak.

Her modelin birincil anahtarı `id` (cuid/uuid string) — aksi belirtilmedikçe. Aşağıdaki tablolar alan sayısı, indeks sayısı, unique kısıt sayısı, ilişki sayısı ve fiziksel tablo adını gösterir.


## Kimlik & Kullanıcı (18 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `User` | 123 | 4 | 0 | 29 | `users` |
| `BotProfile` | 14 | 2 | 0 | 1 | `bot_profiles` |
| `Account` | 13 | 1 | 1 | 1 | `accounts` |
| `Session` | 5 | 1 | 0 | 1 | `sessions` |
| `VerificationToken` | 3 | 0 | 1 | 0 | `verification_tokens` |
| `PasswordResetToken` | 7 | 2 | 0 | 1 | `password_reset_tokens` |
| `UserLoginSession` | 7 | 2 | 0 | 0 | `user_login_sessions` |
| `UserDevice` | 8 | 2 | 1 | 1 | `user_devices` |
| `PushNotificationLog` | 17 | 3 | 0 | 0 | `push_notification_logs` |
| `Follow` | 6 | 2 | 1 | 2 | `follows` |
| `Referral` | 7 | 2 | 1 | 2 | `referrals` |
| `UserBlock` | 6 | 2 | 1 | 2 | `user_blocks` |
| `UserReport` | 10 | 3 | 0 | 2 | `user_reports` |
| `ProfileView` | 4 | 2 | 0 | 0 | `profile_views` |
| `SitePresence` | 9 | 1 | 0 | 0 | `site_presences` |
| `SiteVisit` | 12 | 3 | 0 | 0 | `site_visits` |
| `UserDailyActivity` | 10 | 2 | 1 | 0 | `user_daily_activity` |
| `UserHourlyActivity` | 5 | 1 | 1 | 0 | `user_hourly_activity` |

## Cüzdan & Finans (13 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `CreditPackage` | 14 | 0 | 0 | 0 | `credit_packages` |
| `CreditTransaction` | 8 | 3 | 0 | 0 | `credit_transactions` |
| `JetonTransaction` | 9 | 3 | 0 | 0 | `jeton_transactions` |
| `Payment` | 14 | 3 | 0 | 2 | `payments` |
| `PaymentMethod` | 11 | 0 | 0 | 0 | `payment_methods` |
| `PaymentNotification` | 13 | 3 | 0 | 0 | `payment_notifications` |
| `CfcPaymentRequest` | 12 | 3 | 0 | 1 | `cfc_payment_requests` |
| `WithdrawalRequest` | 16 | 4 | 0 | 0 | `withdrawal_requests` |
| `RoomRevenueLog` | 13 | 2 | 0 | 1 | `room_revenue_logs` |
| `RevenueRule` | 9 | 0 | 0 | 0 | `revenue_rules` |
| `CurrencyConfig` | 8 | 1 | 0 | 0 | `currency_config` |
| `MembershipPlan` | 21 | 3 | 0 | 0 | `membership_plans` |
| `MembershipPurchase` | 12 | 4 | 0 | 1 | `membership_purchases` |

## Hediye Motoru (17 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `GiftType` | 89 | 4 | 0 | 1 | `gift_types` |
| `GiftCollection` | 13 | 0 | 0 | 0 | `gift_collections` |
| `GiftQueue` | 17 | 3 | 0 | 0 | `gift_queue` |
| `GiftCombo` | 10 | 2 | 1 | 0 | `gift_combos` |
| `GiftHistory` | 13 | 4 | 0 | 0 | `gift_history` |
| `GiftEvent` | 20 | 6 | 0 | 1 | `gift_events` |
| `GiftBattle` | 12 | 2 | 0 | 0 | `gift_battles` |
| `GiftBattleParticipant` | 7 | 1 | 1 | 1 | `gift_battle_participants` |
| `GiftGoal` | 10 | 1 | 0 | 0 | `gift_goals` |
| `GiftMission` | 12 | 0 | 0 | 0 | `gift_missions` |
| `UserMissionProgress` | 9 | 1 | 1 | 0 | `user_mission_progress` |
| `LuckyGiftTier` | 13 | 1 | 0 | 0 | `lucky_gift_tiers` |
| `LuckyGiftReward` | 13 | 3 | 0 | 0 | `lucky_gift_rewards` |
| `StreamGift` | 12 | 2 | 0 | 3 | `stream_gifts` |
| `ChatRoomGift` | 15 | 5 | 0 | 4 | `chat_room_gifts` |
| `TellerGift` | 8 | 3 | 0 | 0 | `teller_gifts` |
| `TellerAward` | 8 | 3 | 0 | 0 | `teller_awards` |

## Sesli Oda / Chat Oda (12 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `ChatRoom` | 37 | 3 | 0 | 2 | `chat_rooms` |
| `ChatMessage` | 7 | 2 | 0 | 2 | `chat_messages` |
| `ChatPresence` | 10 | 2 | 1 | 2 | `chat_presences` |
| `ChatUserRole` | 8 | 1 | 1 | 2 | `chat_user_roles` |
| `ChatMute` | 10 | 1 | 1 | 3 | `chat_mutes` |
| `ChatBan` | 10 | 1 | 1 | 3 | `chat_bans` |
| `ChatSpeakRequest` | 10 | 2 | 1 | 0 | `chat_speak_requests` |
| `ChatSpeakBlock` | 7 | 1 | 1 | 0 | `chat_speak_blocks` |
| `RoomTheme` | 30 | 3 | 0 | 0 | `room_themes` |
| `VoiceSession` | 8 | 3 | 1 | 0 | `voice_sessions` |
| `VoiceSignal` | 9 | 4 | 0 | 0 | `voice_signals` |
| `RoomSignal` | 9 | 2 | 0 | 1 | `room_signals` |

## Canlı Yayın (Video) (15 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `VideoStream` | 24 | 5 | 0 | 1 | `video_streams` |
| `VideoStreamComment` | 9 | 2 | 0 | 2 | `video_stream_comments` |
| `VideoStreamLike` | 6 | 1 | 1 | 2 | `video_stream_likes` |
| `VideoStreamViewer` | 9 | 1 | 1 | 1 | `video_stream_viewers` |
| `VideoStreamSignal` | 8 | 2 | 0 | 0 | `video_stream_signals` |
| `StreamCoBroadcaster` | 9 | 2 | 1 | 0 | `stream_co_broadcasters` |
| `StreamBan` | 5 | 1 | 1 | 0 | `stream_bans` |
| `StreamModerator` | 4 | 2 | 1 | 0 | `stream_moderators` |
| `StreamMutedViewer` | 7 | 1 | 1 | 0 | `stream_muted_viewers` |
| `StreamFortuneRequest` | 14 | 4 | 1 | 1 | `stream_fortune_requests` |
| `LiveGuestSession` | 11 | 3 | 1 | 0 | `live_guest_sessions` |
| `LiveGuestInvite` | 8 | 3 | 0 | 0 | `live_guest_invites` |
| `LiveActivity` | 9 | 2 | 0 | 1 | `live_activities` |
| `ActivityFeedConfig` | 13 | 0 | 0 | 0 | `activity_feed_config` |
| `BroadcastImage` | 7 | 1 | 0 | 0 | `broadcast_images` |

## PK / Battle (10 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `PKBattle` | 19 | 6 | 0 | 0 | `pk_battles` |
| `PkScore` | 7 | 3 | 0 | 1 | `pk_scores` |
| `PkGift` | 10 | 3 | 0 | 1 | `pk_gifts` |
| `PkMatch` | 30 | 6 | 0 | 0 | `pk_matches` |
| `PkSeat` | 15 | 2 | 1 | 1 | `pk_seats` |
| `PkParticipant` | 9 | 3 | 1 | 0 | `pk_participants` |
| `PkStat` | 12 | 2 | 0 | 0 | `pk_stats` |
| `PkEvent` | 8 | 1 | 0 | 0 | `pk_events` |
| `PkBan` | 8 | 1 | 0 | 0 | `pk_bans` |
| `TrtcWebhookLog` | 10 | 4 | 0 | 0 | `trtc_webhook_logs` |

## Falcı & Fal (15 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `LiveFortuneTeller` | 47 | 6 | 0 | 1 | `live_fortune_tellers` |
| `TellerWarning` | 6 | 1 | 0 | 1 | `teller_warnings` |
| `LiveSession` | 23 | 4 | 0 | 2 | `live_sessions` |
| `LiveSessionMessage` | 6 | 1 | 0 | 1 | `live_session_messages` |
| `LiveTellerReview` | 8 | 1 | 0 | 2 | `live_teller_reviews` |
| `Fortune` | 13 | 4 | 0 | 1 | `fortunes` |
| `FortuneRating` | 8 | 2 | 0 | 0 | `fortune_ratings` |
| `FortuneRequestType` | 11 | 0 | 0 | 0 | `fortune_request_types` |
| `UserFortuneStreak` | 6 | 1 | 0 | 0 | `user_fortune_streaks` |
| `IpFortuneUsage` | 7 | 2 | 1 | 0 | `ip_fortune_usage` |
| `FavoriteTeller` | 4 | 2 | 1 | 0 | `favorite_tellers` |
| `TellerChatSession` | 9 | 3 | 0 | 1 | `teller_chat_sessions` |
| `TellerChatMessage` | 10 | 2 | 0 | 1 | `teller_chat_messages` |
| `AnonymousUser` | 10 | 0 | 0 | 0 | `anonymous_users` |
| `AnonymousFortune` | 8 | 1 | 0 | 1 | `anonymous_fortunes` |

## Rüya Modülü (10 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `DreamInterpretation` | 16 | 5 | 0 | 0 | `dream_interpretations` |
| `DreamComment` | 10 | 3 | 0 | 2 | `dream_comments` |
| `DreamFavorite` | 6 | 2 | 1 | 2 | `dream_favorites` |
| `DreamView` | 6 | 2 | 0 | 2 | `dream_views` |
| `DreamSymbol` | 10 | 3 | 0 | 0 | `dream_symbols` |
| `DreamDiaryEntry` | 12 | 2 | 1 | 1 | `dream_diary_entries` |
| `DreamContest` | 10 | 2 | 0 | 0 | `dream_contests` |
| `DreamContestEntry` | 9 | 2 | 1 | 2 | `dream_contest_entries` |
| `DreamContestVote` | 6 | 2 | 1 | 2 | `dream_contest_votes` |
| `WeeklyDreamReport` | 9 | 1 | 1 | 1 | `weekly_dream_reports` |

## Sosyal & İçerik (24 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `SocialPost` | 17 | 4 | 0 | 2 | `social_posts` |
| `SocialComment` | 7 | 2 | 0 | 2 | `social_comments` |
| `SocialLike` | 6 | 1 | 1 | 2 | `social_likes` |
| `UserStory` | 10 | 2 | 0 | 1 | `user_stories` |
| `BlogCategory` | 13 | 0 | 0 | 0 | `blog_categories` |
| `BlogPost` | 28 | 9 | 0 | 0 | `blog_posts` |
| `BlogComment` | 11 | 3 | 0 | 0 | `blog_comments` |
| `BlogLike` | 4 | 1 | 1 | 0 | `blog_likes` |
| `BlogFavorite` | 4 | 2 | 1 | 0 | `blog_favorites` |
| `ShortVideo` | 31 | 5 | 0 | 4 | `short_videos` |
| `ShortVideoLike` | 6 | 2 | 1 | 2 | `short_video_likes` |
| `ShortVideoComment` | 13 | 4 | 0 | 4 | `short_video_comments` |
| `ShortVideoCommentLike` | 6 | 2 | 1 | 2 | `short_video_comment_likes` |
| `ShortVideoView` | 7 | 2 | 1 | 2 | `short_video_views` |
| `ShortVideoSave` | 6 | 2 | 1 | 2 | `short_video_saves` |
| `ShortVideoMention` | 6 | 2 | 1 | 2 | `short_video_mentions` |
| `ShortVideoHashtag` | 6 | 2 | 1 | 2 | `short_video_hashtags` |
| `ShortVideoMusic` | 11 | 2 | 0 | 0 | `short_video_music` |
| `Hashtag` | 6 | 1 | 0 | 0 | `hashtags` |
| `TrendVideoCategory` | 9 | 1 | 0 | 0 | `trend_video_categories` |
| `TrendVideo` | 13 | 2 | 0 | 1 | `trend_videos` |
| `TikTokCategory` | 9 | 1 | 0 | 0 | `tiktok_categories` |
| `TikTokVideo` | 14 | 2 | 0 | 1 | `tiktok_videos` |
| `TrendingTopic` | 18 | 3 | 0 | 0 | `trending_topics` |

## Mesajlaşma & Bildirim (7 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `DirectMessage` | 9 | 6 | 0 | 2 | `direct_messages` |
| `Conversation` | 8 | 3 | 1 | 2 | `conversations` |
| `MessageRequest` | 9 | 3 | 1 | 2 | `message_requests` |
| `Notification` | 12 | 4 | 0 | 1 | `notifications` |
| `SiteAnnouncement` | 9 | 2 | 0 | 0 | `site_announcements` |
| `TickerMessage` | 7 | 1 | 0 | 0 | `ticker_messages` |
| `AdminPopup` | 14 | 2 | 0 | 0 | `admin_popups` |

## Ajans (7 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `Agency` | 29 | 3 | 0 | 0 | `agencies` |
| `AgencyUser` | 15 | 3 | 0 | 3 | `agency_users` |
| `AgencyEarning` | 10 | 4 | 0 | 1 | `agency_earnings` |
| `AgencyTask` | 16 | 3 | 1 | 1 | `agency_tasks` |
| `AgencyPenalty` | 11 | 2 | 0 | 1 | `agency_penalties` |
| `AgencyLeaveRequest` | 11 | 3 | 0 | 2 | `agency_leave_requests` |
| `InviteCode` | 11 | 2 | 0 | 1 | `invite_codes` |

## Turnuva & Ödül & Görev (10 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `WeeklyTournament` | 10 | 1 | 1 | 0 | `weekly_tournaments` |
| `WeeklyTournamentEntry` | 9 | 2 | 1 | 1 | `weekly_tournament_entries` |
| `DailyReward` | 6 | 1 | 1 | 0 | `daily_rewards` |
| `DailyQuest` | 9 | 2 | 1 | 0 | `daily_quests` |
| `DailyTask` | 6 | 2 | 1 | 0 | `daily_tasks` |
| `DailyLoginReward` | 8 | 1 | 1 | 1 | `daily_login_rewards` |
| `Achievement` | 13 | 0 | 0 | 0 | `achievements` |
| `UserAchievement` | 6 | 1 | 1 | 0 | `user_achievements` |
| `BanaOzelItem` | 14 | 2 | 0 | 0 | `bana_ozel_items` |
| `BanaOzelHistory` | 6 | 3 | 0 | 0 | `bana_ozel_history` |

## Oyunlar (11 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `MiniGame` | 14 | 2 | 0 | 0 | `mini_games` |
| `GamePlay` | 8 | 4 | 0 | 1 | `game_plays` |
| `SosGame` | 26 | 4 | 0 | 0 | `sos_games` |
| `SosGameChat` | 7 | 1 | 0 | 1 | `sos_game_chats` |
| `SosGameViewer` | 6 | 1 | 1 | 1 | `sos_game_viewers` |
| `GameRoom` | 25 | 4 | 0 | 0 | `game_rooms` |
| `GameRoomChat` | 7 | 1 | 0 | 1 | `game_room_chats` |
| `GameRoomViewer` | 6 | 1 | 1 | 1 | `game_room_viewers` |
| `OkeyMatch` | 21 | 3 | 0 | 0 | `okey_matches` |
| `OkeyMatchPlayer` | 13 | 2 | 0 | 1 | `okey_match_players` |
| `UserGameProfile` | 12 | 2 | 0 | 0 | `user_game_profiles` |

## Görsel Efekt / Kozmetik (9 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `NameEffect` | 9 | 1 | 0 | 0 | `name_effects` |
| `EntranceEffect` | 12 | 1 | 0 | 0 | `entrance_effects` |
| `ChatBubbleSkin` | 8 | 1 | 0 | 0 | `chat_bubble_skins` |
| `MicFrame` | 8 | 1 | 0 | 0 | `mic_frames` |
| `EmojiPack` | 9 | 1 | 0 | 0 | `emoji_packs` |
| `AvatarAccessory` | 9 | 2 | 0 | 0 | `avatar_accessories` |
| `ProfileFrame` | 10 | 1 | 0 | 2 | `profile_frames` |
| `MembershipBadge` | 8 | 1 | 0 | 0 | `membership_badges` |
| `CustomBadge` | 12 | 3 | 0 | 0 | `custom_badges` |

## Platform / CMS / Ayar (9 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `SiteSetting` | 4 | 0 | 0 | 0 | `site_settings` |
| `PlatformSettings` | 5 | 0 | 0 | 0 | `platform_settings` |
| `SitePage` | 12 | 3 | 0 | 0 | `site_pages` |
| `HomepageButton` | 10 | 1 | 0 | 0 | `homepage_buttons` |
| `HomepageFortuneCard` | 9 | 1 | 0 | 0 | `homepage_fortune_cards` |
| `OnlineFalSection` | 8 | 1 | 0 | 0 | `online_fal_sections` |
| `OnlineFalButton` | 11 | 1 | 0 | 0 | `online_fal_buttons` |
| `AdNetwork` | 10 | 1 | 0 | 0 | `ad_networks` |
| `Translation` | 4 | 1 | 1 | 0 | `translations` |

## Ünlü / Fan Club (legacy) (11 model)

| Model | Alan | @@index | @@unique | İlişki | Tablo |
|---|---|---|---|---|---|
| `Celebrity` | 20 | 4 | 0 | 0 | `celebrities` |
| `CelebrityFollow` | 6 | 2 | 1 | 2 | `celebrity_follows` |
| `CelebrityPost` | 16 | 4 | 0 | 1 | `celebrity_posts` |
| `CelebrityPostLike` | 6 | 2 | 1 | 2 | `celebrity_post_likes` |
| `CelebrityPostComment` | 7 | 2 | 0 | 2 | `celebrity_post_comments` |
| `FanClub` | 13 | 1 | 0 | 1 | `fan_clubs` |
| `FanClubMember` | 9 | 2 | 1 | 2 | `fan_club_members` |
| `FanClubPoll` | 11 | 2 | 0 | 2 | `fan_club_polls` |
| `FanClubPollVote` | 7 | 2 | 1 | 2 | `fan_club_poll_votes` |
| `FanClubPost` | 12 | 2 | 0 | 2 | `fan_club_posts` |
| `FanClubPostLike` | 6 | 2 | 1 | 2 | `fan_club_post_likes` |

## Transaction gerektiren akışlar (mevcut durum)

Kod tabanında **33 dosya** atomik transaction kullanıyor. Kritik para akışları:

| Akış | Atomik mi? | Not |
|---|---|---|
| Hediye gönderimi (oda) | ✅ | Jeton düşümü + hediye kaydı + alıcı alacağı tek transaction |
| Hediye gönderimi (canlı yayın) | ✅ | Aynı desen |
| Jeton satın alma / ödeme onayı | ✅ | |
| Üyelik satın alma | ✅ | |
| Para çekme talebi | ✅ | Durum geçişleri transaction içinde |
| Ajans komisyonu | ⚠️ | Kısmen; `AgencyEarning` ayrı yazılıyor |
| PK skor güncelleme | ⚠️ | Skor artışı transaction dışında olabiliyor |
| Liderlik tablosu toplamları | ⚠️ | Okuma anında hesaplanıyor, materialize edilmemiş |

## Tespit edilen veri modeli boşlukları (spec karşılığı)

| Eksik | Spec bölümü | Etki |
|---|---|---|
| `FeatureFlag` modeli yok | §7 | Bayraklar `platform_settings` içinde 8 anahtarlık sabit allowlist ile sunuluyor |
| `RemoteConfig` modeli yok | §8 | Seviye eşikleri, PK süreleri, ödüller kodda sabit |
| `Role` / `Permission` modeli yok | §6 | Yetki kontrolü rol string'i üzerinden dağınık şekilde yapılıyor |
| Değiştirilemez `Ledger` modeli yok | §44 | Finansal hareketler `CreditTransaction` + `JetonTransaction` içinde, silinebilir/güncellenebilir |
| `AuditLog` modeli yok | §73 | Admin işlemleri izlenmiyor |
| `SupportTicket` / `TicketMessage` yok | §56 | Destek sistemi yok |
| `Verification` (mavi tik) modeli yok | §60 | `User` üzerinde tek boolean var, iş akışı yok |
| `Team` modeli yok | §17 | Takım sistemi yok |
| `SupporterLevel` (yayıncıya özel destekçi seviyesi) yok | §34 | Yok |
| `EffectRule` (efekt tetikleyici motoru) yok | §14-§16 | Efektler kozmetik tablolar halinde, tetikleyici/öncelik motoru yok |
| `Device` oturum/güvenlik alanları kısıtlı | §48-§49 | `UserDevice` var ama IP/şehir/oturum geçmişi eksik |
