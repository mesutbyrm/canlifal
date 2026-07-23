# 🗄️ CanlıFal — Veritabanı Referansı (Prisma)

> Toplam **193 model**, **0 enum**. PostgreSQL. Kaynak: `schema.prisma`.

> Tam SQL DDL için `database_schema.sql` dosyasına bakın (193 tablo, 149 foreign key, 527 index).


> **Not:** Proje `prisma db push` kullandığı için ayrı migration geçmişi dosyaları yoktur. `database_schema.sql` tam şemayı (tek migration olarak) içerir.


## Enumlar

Bu şemada Prisma `enum` tanımı kullanılmamıştır. Durum/rol/tip alanları `String` olarak saklanır; geçerli değerler ilgili modelin alan açıklamalarında ve API dokümantasyonunda verilir. Örnekler: `User.role` = `user | admin | yonetici | moderator | finans`, `User.membership` = `basic | premium | gold`.


## İçindekiler (Modeller)

- [User](#model-user)
- [BotProfile](#model-botprofile)
- [Follow](#model-follow)
- [Referral](#model-referral)
- [PasswordResetToken](#model-passwordresettoken)
- [LiveFortuneTeller](#model-livefortuneteller)
- [TellerWarning](#model-tellerwarning)
- [LiveSession](#model-livesession)
- [RoomSignal](#model-roomsignal)
- [LiveSessionMessage](#model-livesessionmessage)
- [LiveTellerReview](#model-livetellerreview)
- [Fortune](#model-fortune)
- [Translation](#model-translation)
- [Account](#model-account)
- [Session](#model-session)
- [VerificationToken](#model-verificationtoken)
- [ChatRoom](#model-chatroom)
- [ChatRoomGift](#model-chatroomgift)
- [ChatMessage](#model-chatmessage)
- [ChatPresence](#model-chatpresence)
- [ChatUserRole](#model-chatuserrole)
- [ChatMute](#model-chatmute)
- [ChatBan](#model-chatban)
- [SiteSetting](#model-sitesetting)
- [SocialPost](#model-socialpost)
- [SocialComment](#model-socialcomment)
- [SocialLike](#model-sociallike)
- [AnonymousUser](#model-anonymoususer)
- [AnonymousFortune](#model-anonymousfortune)
- [SitePresence](#model-sitepresence)
- [SiteVisit](#model-sitevisit)
- [Notification](#model-notification)
- [CreditPackage](#model-creditpackage)
- [Payment](#model-payment)
- [PaymentMethod](#model-paymentmethod)
- [PlatformSettings](#model-platformsettings)
- [TellerChatSession](#model-tellerchatsession)
- [TellerChatMessage](#model-tellerchatmessage)
- [VideoStream](#model-videostream)
- [VideoStreamComment](#model-videostreamcomment)
- [VideoStreamLike](#model-videostreamlike)
- [VideoStreamViewer](#model-videostreamviewer)
- [GiftType](#model-gifttype)
- [GiftCollection](#model-giftcollection)
- [LuckyGiftTier](#model-luckygifttier)
- [LuckyGiftReward](#model-luckygiftreward)
- [StreamGift](#model-streamgift)
- [VideoStreamSignal](#model-videostreamsignal)
- [StreamCoBroadcaster](#model-streamcobroadcaster)
- [StreamBan](#model-streamban)
- [StreamModerator](#model-streammoderator)
- [PKBattle](#model-pkbattle)
- [PkScore](#model-pkscore)
- [PkGift](#model-pkgift)
- [LiveGuestSession](#model-liveguestsession)
- [LiveGuestInvite](#model-liveguestinvite)
- [FortuneRequestType](#model-fortunerequesttype)
- [StreamFortuneRequest](#model-streamfortunerequest)
- [StreamMutedViewer](#model-streammutedviewer)
- [DirectMessage](#model-directmessage)
- [Conversation](#model-conversation)
- [MessageRequest](#model-messagerequest)
- [UserLoginSession](#model-userloginsession)
- [UserDailyActivity](#model-userdailyactivity)
- [UserHourlyActivity](#model-userhourlyactivity)
- [CreditTransaction](#model-credittransaction)
- [FortuneRating](#model-fortunerating)
- [UserAchievement](#model-userachievement)
- [Achievement](#model-achievement)
- [BanaOzelItem](#model-banaozelitem)
- [JetonTransaction](#model-jetontransaction)
- [UserFortuneStreak](#model-userfortunestreak)
- [DailyTask](#model-dailytask)
- [BanaOzelHistory](#model-banaozelhistory)
- [ProfileView](#model-profileview)
- [MembershipPlan](#model-membershipplan)
- [MembershipPurchase](#model-membershippurchase)
- [PaymentNotification](#model-paymentnotification)
- [RoomRevenueLog](#model-roomrevenuelog)
- [VoiceSession](#model-voicesession)
- [VoiceSignal](#model-voicesignal)
- [TickerMessage](#model-tickermessage)
- [HomepageFortuneCard](#model-homepagefortunecard)
- [WithdrawalRequest](#model-withdrawalrequest)
- [TellerAward](#model-telleraward)
- [TellerGift](#model-tellergift)
- [SiteAnnouncement](#model-siteannouncement)
- [MiniGame](#model-minigame)
- [GamePlay](#model-gameplay)
- [SosGame](#model-sosgame)
- [SosGameChat](#model-sosgamechat)
- [SosGameViewer](#model-sosgameviewer)
- [GameRoom](#model-gameroom)
- [GameRoomChat](#model-gameroomchat)
- [GameRoomViewer](#model-gameroomviewer)
- [DailyReward](#model-dailyreward)
- [DailyQuest](#model-dailyquest)
- [BlogCategory](#model-blogcategory)
- [BlogPost](#model-blogpost)
- [BlogComment](#model-blogcomment)
- [BlogLike](#model-bloglike)
- [BlogFavorite](#model-blogfavorite)
- [UserGameProfile](#model-usergameprofile)
- [BroadcastImage](#model-broadcastimage)
- [CustomBadge](#model-custombadge)
- [SitePage](#model-sitepage)
- [PushNotificationLog](#model-pushnotificationlog)
- [UserDevice](#model-userdevice)
- [DreamInterpretation](#model-dreaminterpretation)
- [DreamComment](#model-dreamcomment)
- [DreamFavorite](#model-dreamfavorite)
- [DreamView](#model-dreamview)
- [DreamSymbol](#model-dreamsymbol)
- [DreamDiaryEntry](#model-dreamdiaryentry)
- [DailyLoginReward](#model-dailyloginreward)
- [DreamContest](#model-dreamcontest)
- [DreamContestEntry](#model-dreamcontestentry)
- [DreamContestVote](#model-dreamcontestvote)
- [WeeklyDreamReport](#model-weeklydreamreport)
- [OnlineFalSection](#model-onlinefalsection)
- [OnlineFalButton](#model-onlinefalbutton)
- [HomepageButton](#model-homepagebutton)
- [AdminPopup](#model-adminpopup)
- [ProfileFrame](#model-profileframe)
- [MembershipBadge](#model-membershipbadge)
- [IpFortuneUsage](#model-ipfortuneusage)
- [AdNetwork](#model-adnetwork)
- [CurrencyConfig](#model-currencyconfig)
- [LiveActivity](#model-liveactivity)
- [ActivityFeedConfig](#model-activityfeedconfig)
- [Agency](#model-agency)
- [AgencyUser](#model-agencyuser)
- [AgencyEarning](#model-agencyearning)
- [InviteCode](#model-invitecode)
- [AgencyTask](#model-agencytask)
- [AgencyPenalty](#model-agencypenalty)
- [AgencyLeaveRequest](#model-agencyleaverequest)
- [WeeklyTournament](#model-weeklytournament)
- [WeeklyTournamentEntry](#model-weeklytournamententry)
- [FavoriteTeller](#model-favoriteteller)
- [Celebrity](#model-celebrity)
- [CelebrityFollow](#model-celebrityfollow)
- [FanClub](#model-fanclub)
- [FanClubMember](#model-fanclubmember)
- [FanClubPoll](#model-fanclubpoll)
- [FanClubPollVote](#model-fanclubpollvote)
- [FanClubPost](#model-fanclubpost)
- [FanClubPostLike](#model-fanclubpostlike)
- [TrendingTopic](#model-trendingtopic)
- [CelebrityPost](#model-celebritypost)
- [CelebrityPostLike](#model-celebritypostlike)
- [CelebrityPostComment](#model-celebritypostcomment)
- [UserStory](#model-userstory)
- [TrendVideoCategory](#model-trendvideocategory)
- [TrendVideo](#model-trendvideo)
- [TikTokCategory](#model-tiktokcategory)
- [TikTokVideo](#model-tiktokvideo)
- [CfcPaymentRequest](#model-cfcpaymentrequest)
- [ShortVideo](#model-shortvideo)
- [ShortVideoLike](#model-shortvideolike)
- [ShortVideoComment](#model-shortvideocomment)
- [ShortVideoView](#model-shortvideoview)
- [ShortVideoSave](#model-shortvideosave)
- [ShortVideoCommentLike](#model-shortvideocommentlike)
- [ShortVideoMention](#model-shortvideomention)
- [Hashtag](#model-hashtag)
- [ShortVideoHashtag](#model-shortvideohashtag)
- [ShortVideoMusic](#model-shortvideomusic)
- [OkeyMatch](#model-okeymatch)
- [OkeyMatchPlayer](#model-okeymatchplayer)
- [RevenueRule](#model-revenuerule)
- [GiftEvent](#model-giftevent)
- [GiftBattle](#model-giftbattle)
- [GiftBattleParticipant](#model-giftbattleparticipant)
- [GiftGoal](#model-giftgoal)
- [GiftMission](#model-giftmission)
- [UserMissionProgress](#model-usermissionprogress)
- [PkMatch](#model-pkmatch)
- [PkSeat](#model-pkseat)
- [PkParticipant](#model-pkparticipant)
- [PkStat](#model-pkstat)
- [PkEvent](#model-pkevent)
- [TrtcWebhookLog](#model-trtcwebhooklog)
- [PkBan](#model-pkban)
- [UserBlock](#model-userblock)
- [UserReport](#model-userreport)
- [NameEffect](#model-nameeffect)
- [EntranceEffect](#model-entranceeffect)
- [ChatBubbleSkin](#model-chatbubbleskin)
- [MicFrame](#model-micframe)
- [EmojiPack](#model-emojipack)
- [AvatarAccessory](#model-avataraccessory)
- [RoomTheme](#model-roomtheme)

---


## Modeller


### <a name="model-user"></a>`User` → tablo `users`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `email` | `String` | unique |  |
| `emailVerified` | `DateTime?` | — |  |
| `password` | `String?` | — |  |
| `name` | `String` | — |  |
| `username` | `String?` | unique |  |
| `phone` | `String?` | — |  |
| `image` | `String?` | — |  |
| `preferredLanguage` | `String` | default="tr" |  |
| `credits` | `Int` | default=50 |  |
| `role` | `String` | default="user" |  |
| `membership` | `String` | default="basic" | basic, premium, gold |
| `membershipExpiresAt` | `DateTime?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |
| `referralCode` | `String?` | unique |  |
| `referralCreditsEarned` | `Int` | default=0 |  |
| `referredById` | `String?` | — |  |
| `bio` | `String?` | — | User bio/about text |
| `birthDate` | `DateTime?` | — |  |
| `birthTime` | `String?` | — | HH:mm format for rising sign calculation |
| `zodiacSign` | `String?` | — |  |
| `risingSign` | `String?` | — |  |
| `favoriteTeam` | `String?` | — |  |
| `lastHoroscopeDate` | `DateTime?` | — | Track when daily horoscope was last generated |
| `messagePrivacy` | `String` | default="everyone" | everyone, followers, nobody |
| `hideProfileViews` | `Boolean` | default=false | hide from profile view tracking |
| `theme` | `String` | default="mystical" | mystical, facebook |
| `jetonBalance` | `Int` | default=0 |  |
| `city` | `String?` | — |  |
| `country` | `String?` | default="TR" |  |
| `specialBadges` | `String?` | — | JSON array of special badge types (vip, beta_tester, verified, etc.) |
| `profileEffect` | `String?` | — | Profile background effect (sparkles, fire, rainbow, etc.) |
| `profileFrameId` | `String?` | — | Selected profile frame ID |
| `adminAssignedFrameId` | `String?` | — | Admin-assigned profile frame (overrides user selection) |
| `nameEffect` | `String?` | — | Selected name-text effect key (gold, silver, neon, rainbow, ...) |
| `entranceEffectId` | `String?` | — | Selected entrance (room-join) effect id |
| `chatBubbleId` | `String?` | — | Selected chat bubble skin id |
| `micFrameId` | `String?` | — | Selected microphone frame id |
| `avatarAccessoryIds` | `String?` | — | JSON array of selected avatar accessory ids |
| `withdrawalLimit` | `Int` | default=0 | 0 means cannot withdraw |
| `totalTimeSpentMinutes` | `Int` | default=0 |  |
| `lastActiveAt` | `DateTime?` | — |  |
| `activeDeviceToken` | `String?` | — |  |
| `xp` | `Int` | default=0 |  |
| `level` | `Int` | default=1 |  |
| `loginStreak` | `Int` | default=0 |  |
| `lastLoginRewardDate` | `DateTime?` | — |  |
| `isBot` | `Boolean` | default=false |  |
| `cfcBalance` | `Int` | default=0 |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `profileFrame` | `ProfileFrame?` | "UserProfileFrame", fields: [profileFrameId], references: [id] |  |
| `adminAssignedFrame` | `ProfileFrame?` | "UserAdminFrame", fields: [adminAssignedFrameId], references: [id] |  |
| `accounts` | `Account[]` | — |  |
| `bannedOthers` | `ChatBan[]` | "Banner" |  |
| `bannedIn` | `ChatBan[]` | "BannedUser" |  |
| `chatMessages` | `ChatMessage[]` | — |  |
| `mutedOthers` | `ChatMute[]` | "Muter" |  |
| `mutedIn` | `ChatMute[]` | "MutedUser" |  |
| `chatPresences` | `ChatPresence[]` | — |  |
| `chatRoles` | `ChatUserRole[]` | — |  |
| `ownedChatRooms` | `ChatRoom[]` | "RoomOwner" |  |
| `beneficiaryRooms` | `ChatRoom[]` | "RoomGiftBeneficiary" |  |
| `fortunes` | `Fortune[]` | — |  |
| `fortuneTellerProfile` | `LiveFortuneTeller?` | — |  |
| `liveSessions` | `LiveSession[]` | "SessionUser" |  |
| `notifications` | `Notification[]` | — |  |
| `passwordResets` | `PasswordResetToken[]` | — |  |
| `referredHistory` | `Referral[]` | "Referred" |  |
| `referralHistory` | `Referral[]` | "Referrer" |  |
| `sessions` | `Session[]` | — |  |
| `socialComments` | `SocialComment[]` | — |  |
| `socialLikes` | `SocialLike[]` | — |  |
| `socialPosts` | `SocialPost[]` | — |  |
| `payments` | `Payment[]` | — |  |
| `referredBy` | `User?` | "UserReferrals", fields: [referredById], references: [id] |  |
| `referrals` | `User[]` | "UserReferrals" |  |
| `videoStreams` | `VideoStream[]` | — |  |
| `videoStreamComments` | `VideoStreamComment[]` | — |  |
| `videoStreamLikes` | `VideoStreamLike[]` | — |  |
| `streamGifts` | `StreamGift[]` | — |  |
| `sentChatRoomGifts` | `ChatRoomGift[]` | "ChatGiftSender" |  |
| `receivedChatRoomGifts` | `ChatRoomGift[]` | "ChatGiftRecipient" |  |
| `followers` | `Follow[]` | "Following" |  |
| `following` | `Follow[]` | "Follower" |  |
| `sentMessages` | `DirectMessage[]` | "SentMessages" |  |
| `receivedMessages` | `DirectMessage[]` | "ReceivedMessages" |  |
| `conversationsAsUser1` | `Conversation[]` | "ConversationUser1" |  |
| `conversationsAsUser2` | `Conversation[]` | "ConversationUser2" |  |
| `sentRequests` | `MessageRequest[]` | "SentRequests" |  |
| `receivedRequests` | `MessageRequest[]` | "ReceivedRequests" |  |
| `dreamComments` | `DreamComment[]` | — |  |
| `dreamFavorites` | `DreamFavorite[]` | — |  |
| `dreamViews` | `DreamView[]` | — |  |
| `dreamDiaryEntries` | `DreamDiaryEntry[]` | — |  |
| `dailyLoginRewards` | `DailyLoginReward[]` | — |  |
| `dreamContestEntries` | `DreamContestEntry[]` | — |  |
| `dreamContestVotes` | `DreamContestVote[]` | — |  |
| `weeklyDreamReports` | `WeeklyDreamReport[]` | — |  |
| `liveActivities` | `LiveActivity[]` | "userActivities" |  |
| `agencyMembership` | `AgencyUser?` | — |  |
| `agencyLeaveRequests` | `AgencyLeaveRequest[]` | — |  |
| `celebrityFollows` | `CelebrityFollow[]` | — |  |
| `fanClubMemberships` | `FanClubMember[]` | — |  |
| `fanClubPosts` | `FanClubPost[]` | — |  |
| `fanClubPostLikes` | `FanClubPostLike[]` | — |  |
| `fanClubPolls` | `FanClubPoll[]` | — |  |
| `fanClubPollVotes` | `FanClubPollVote[]` | — |  |
| `celebrityPostLikes` | `CelebrityPostLike[]` | — |  |
| `celebrityPostComments` | `CelebrityPostComment[]` | — |  |
| `stories` | `UserStory[]` | — |  |
| `botProfile` | `BotProfile?` | — |  |
| `cfcPaymentRequests` | `CfcPaymentRequest[]` | — |  |
| `devices` | `UserDevice[]` | — |  |
| `shortVideos` | `ShortVideo[]` | — |  |
| `shortVideoLikes` | `ShortVideoLike[]` | — |  |
| `shortVideoComments` | `ShortVideoComment[]` | — |  |
| `shortVideoViews` | `ShortVideoView[]` | — |  |
| `shortVideoSaves` | `ShortVideoSave[]` | — |  |
| `shortVideoCommentLikes` | `ShortVideoCommentLike[]` | — |  |
| `shortVideoMentions` | `ShortVideoMention[]` | "ShortVideoMentioned" |  |
| `blockedUsers` | `UserBlock[]` | "Blocker" |  |
| `blockedByUsers` | `UserBlock[]` | "Blocked" |  |
| `reportsMade` | `UserReport[]` | "Reporter" |  |
| `reportsReceived` | `UserReport[]` | "Reported" |  |

**Index/Unique:**

- `@@index([referralCode])`
- `@@index([isBot])`
- `@@index([referredById])`
- `@@index([username])`


### <a name="model-botprofile"></a>`BotProfile` → tablo `bot_profiles`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | unique |  |
| `personality` | `String` | — | shy, aggressive, funny, flirty, serious |
| `age` | `Int` | — |  |
| `city` | `String` | — |  |
| `interests` | `String?` | — | JSON array |
| `activityLevel` | `String` | default="medium" | low, medium, high |
| `activeHoursStart` | `Int` | default=9 | 0-23 |
| `activeHoursEnd` | `Int` | default=23 | 0-23 |
| `isActive` | `Boolean` | default=true | admin can enable/disable |
| `lastActionAt` | `DateTime?` | — |  |
| `totalActions` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([isActive])`
- `@@index([personality])`


### <a name="model-follow"></a>`Follow` → tablo `follows`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `followerId` | `String` | — | The user who is following |
| `followingId` | `String` | — | The user being followed |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `follower` | `User` | "Follower", fields: [followerId], references: [id], onDelete: Cascade |  |
| `following` | `User` | "Following", fields: [followingId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([followerId, followingId])`
- `@@index([followerId])`
- `@@index([followingId])`


### <a name="model-referral"></a>`Referral` → tablo `referrals`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `referrerId` | `String` | — |  |
| `referredId` | `String` | — |  |
| `creditsAwarded` | `Int` | default=50 |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `referred` | `User` | "Referred", fields: [referredId], references: [id], onDelete: Cascade |  |
| `referrer` | `User` | "Referrer", fields: [referrerId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([referrerId, referredId])`
- `@@index([referrerId])`
- `@@index([createdAt])`


### <a name="model-passwordresettoken"></a>`PasswordResetToken` → tablo `password_reset_tokens`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `token` | `String` | unique |  |
| `expiresAt` | `DateTime` | — |  |
| `used` | `Boolean` | default=false |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([token])`
- `@@index([userId])`


### <a name="model-livefortuneteller"></a>`LiveFortuneTeller` → tablo `live_fortune_tellers`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | unique |  |
| `displayName` | `String` | — |  |
| `bio` | `String?` | — |  |
| `specialties` | `String[]` | — |  |
| `pricePerSession` | `Int` | default=100 |  |
| `rating` | `Float` | default=5.0 |  |
| `totalSessions` | `Int` | default=0 |  |
| `totalReviews` | `Int` | default=0 |  |
| `isOnline` | `Boolean` | default=false |  |
| `isVerified` | `Boolean` | default=false |  |
| `isActive` | `Boolean` | default=true |  |
| `avatar` | `String?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |
| `applicationNote` | `String?` | — |  |
| `applicationStatus` | `String` | default="pending" |  |
| `approvedAt` | `DateTime?` | — |  |
| `banReason` | `String?` | — |  |
| `bannedAt` | `DateTime?` | — |  |
| `bonusCredits` | `Int` | default=0 |  |
| `freezeReason` | `String?` | — |  |
| `frozenAt` | `DateTime?` | — |  |
| `isBanned` | `Boolean` | default=false |  |
| `isFrozen` | `Boolean` | default=false |  |
| `rejectedAt` | `DateTime?` | — |  |
| `totalEarnings` | `Int` | default=0 |  |
| `tellerLevel` | `String` | default="bronze" | bronze, silver, gold, diamond |
| `levelPoints` | `Int` | default=0 | Accumulated points for level calculation |
| `levelUpdatedAt` | `DateTime?` | — |  |
| `canGoOnline` | `Boolean` | default=true |  |
| `canChat` | `Boolean` | default=true |  |
| `canStartSession` | `Boolean` | default=true |  |
| `canSetPrice` | `Boolean` | default=false |  |
| `canEditProfile` | `Boolean` | default=true |  |
| `canViewEarnings` | `Boolean` | default=true |  |
| `canWithdraw` | `Boolean` | default=false |  |
| `verificationDocUrl` | `String?` | — |  |
| `verificationStatus` | `String` | default="none" | none, pending, approved, rejected |
| `verificationNote` | `String?` | — |  |
| `maxSessionsPerDay` | `Int` | default=10 |  |
| `commissionRate` | `Int` | default=20 |  |
| `adminNotes` | `String?` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |
| `sessions` | `LiveSession[]` | — |  |
| `reviews` | `LiveTellerReview[]` | — |  |
| `warnings` | `TellerWarning[]` | — |  |

**Index/Unique:**

- `@@index([isOnline])`
- `@@index([isVerified])`
- `@@index([rating])`
- `@@index([applicationStatus])`
- `@@index([isBanned])`
- `@@index([isOnline, rating(sort: Desc)])`


### <a name="model-tellerwarning"></a>`TellerWarning` → tablo `teller_warnings`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `tellerId` | `String` | — |  |
| `reason` | `String` | — |  |
| `issuedBy` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `teller` | `LiveFortuneTeller` | fields: [tellerId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([tellerId])`


### <a name="model-livesession"></a>`LiveSession` → tablo `live_sessions`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `tellerId` | `String` | — |  |
| `userId` | `String` | — |  |
| `fortuneType` | `String` | — |  |
| `status` | `String` | default="pending" |  |
| `creditsCharged` | `Int` | — |  |
| `startedAt` | `DateTime?` | — |  |
| `endedAt` | `DateTime?` | — |  |
| `notes` | `String?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |
| `roomId` | `String?` | unique |  |
| `maxMinutes` | `Int` | default=5 |  |
| `minutesUsed` | `Int` | default=0 |  |
| `creditsPerMinute` | `Int` | default=0 |  |
| `lastPingAt` | `DateTime?` | — |  |
| `timerStarted` | `Boolean` | default=false |  |
| `timerStartedAt` | `DateTime?` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `messages` | `LiveSessionMessage[]` | — |  |
| `teller` | `LiveFortuneTeller` | fields: [tellerId], references: [id], onDelete: Cascade |  |
| `user` | `User` | "SessionUser", fields: [userId], references: [id], onDelete: Cascade |  |
| `review` | `LiveTellerReview?` | — |  |
| `chatSession` | `TellerChatSession?` | — |  |
| `roomSignals` | `RoomSignal[]` | — |  |

**Index/Unique:**

- `@@index([tellerId])`
- `@@index([userId])`
- `@@index([status])`
- `@@index([roomId])`


### <a name="model-roomsignal"></a>`RoomSignal` → tablo `room_signals`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `sessionId` | `String` | — |  |
| `senderId` | `String` | — |  |
| `receiverId` | `String` | — |  |
| `signalType` | `String` | — | offer, answer, ice-candidate |
| `signalData` | `String` | — | JSON string of WebRTC signal data |
| `processed` | `Boolean` | default=false |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `session` | `LiveSession` | fields: [sessionId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([sessionId])`
- `@@index([receiverId, processed])`


### <a name="model-livesessionmessage"></a>`LiveSessionMessage` → tablo `live_session_messages`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `sessionId` | `String` | — |  |
| `senderId` | `String` | — |  |
| `message` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `session` | `LiveSession` | fields: [sessionId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([sessionId])`


### <a name="model-livetellerreview"></a>`LiveTellerReview` → tablo `live_teller_reviews`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `tellerId` | `String` | — |  |
| `sessionId` | `String` | unique |  |
| `rating` | `Int` | — |  |
| `comment` | `String?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `session` | `LiveSession` | fields: [sessionId], references: [id], onDelete: Cascade |  |
| `teller` | `LiveFortuneTeller` | fields: [tellerId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([tellerId])`


### <a name="model-fortune"></a>`Fortune` → tablo `fortunes`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `fortuneType` | `String` | — |  |
| `inputData` | `String` | — |  |
| `aiResponse` | `String` | — |  |
| `language` | `String` | — |  |
| `viewCount` | `Int` | default=0 |  |
| `isSaved` | `Boolean` | default=false |  |
| `isPinned` | `Boolean` | default=false |  |
| `pinnedAt` | `DateTime?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |
| `socialPosts` | `SocialPost[]` | — |  |

**Index/Unique:**

- `@@index([userId])`
- `@@index([fortuneType])`
- `@@index([createdAt])`
- `@@index([isPinned])`


### <a name="model-translation"></a>`Translation` → tablo `translations`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `languageCode` | `String` | — |  |
| `translationKey` | `String` | — |  |
| `translationValue` | `String` | — |  |

**Index/Unique:**

- `@@unique([languageCode, translationKey])`
- `@@index([languageCode])`


### <a name="model-account"></a>`Account` → tablo `accounts`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `type` | `String` | — |  |
| `provider` | `String` | — |  |
| `providerAccountId` | `String` | — |  |
| `refresh_token` | `String?` | — |  |
| `access_token` | `String?` | — |  |
| `expires_at` | `Int?` | — |  |
| `token_type` | `String?` | — |  |
| `scope` | `String?` | — |  |
| `id_token` | `String?` | — |  |
| `session_state` | `String?` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([provider, providerAccountId])`
- `@@index([userId])`


### <a name="model-session"></a>`Session` → tablo `sessions`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `sessionToken` | `String` | unique |  |
| `userId` | `String` | — |  |
| `expires` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([userId])`


### <a name="model-verificationtoken"></a>`VerificationToken` → tablo `verification_tokens`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `identifier` | `String` | — |  |
| `token` | `String` | unique |  |
| `expires` | `DateTime` | — |  |

**Index/Unique:**

- `@@unique([identifier, token])`


### <a name="model-chatroom"></a>`ChatRoom` → tablo `chat_rooms`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `slug` | `String` | unique |  |
| `nameEn` | `String` | — |  |
| `nameTr` | `String` | — |  |
| `descEn` | `String` | — |  |
| `descTr` | `String` | — |  |
| `icon` | `String` | — |  |
| `isActive` | `Boolean` | default=true |  |
| `isMuted` | `Boolean` | default=false |  |
| `ownerId` | `String?` | — | User who purchased/owns this room |
| `giftCommissionPercent` | `Int` | default=0 | 0-100, percentage of gift value going to beneficiary |
| `giftBeneficiaryId` | `String?` | — | Who receives the commission (null = room owner) |
| `backgroundImage` | `String?` | — | Background image URL for room |
| `bannedWords` | `String?` | — | JSON array of custom banned words set by room owner |
| `currentMusicVideoId` | `String?` | — | Currently playing YouTube video ID |
| `currentMusicTitle` | `String?` | — | Currently playing music title |
| `currentMusicStartedAt` | `DateTime?` | — | When the music started playing |
| `currentMusicDuration` | `String?` | — | Duration string from YouTube (e.g. "3:45") |
| `djUserIds` | `String?` | — | JSON array of user IDs who can DJ (max 5) |
| `activeDjId` | `String?` | — | Currently active DJ user ID (who has permission to play right now) |
| `whitelistedWords` | `String?` | — | JSON array of words marked as safe (not profanity) |
| `roomType` | `String` | default="FREE" | FREE, NORMAL, VIP |
| `password` | `String?` | — | Room password (NORMAL, VIP only) |
| `welcomeMessage` | `String?` | — | Welcome message for users joining |
| `pinnedAnnouncement` | `String?` | — | Pinned announcement text |
| `tags` | `String?` | — | Comma-separated tags |
| `bannerImage` | `String?` | — | Room banner image URL |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `owner` | `User?` | "RoomOwner", fields: [ownerId], references: [id], onDelete: SetNull |  |
| `giftBeneficiary` | `User?` | "RoomGiftBeneficiary", fields: [giftBeneficiaryId], references: [id], onDelete: SetNull |  |
| `bans` | `ChatBan[]` | — |  |
| `messages` | `ChatMessage[]` | — |  |
| `mutes` | `ChatMute[]` | — |  |
| `presences` | `ChatPresence[]` | — |  |
| `userRoles` | `ChatUserRole[]` | — |  |
| `chatGifts` | `ChatRoomGift[]` | — |  |
| `revenueLogs` | `RoomRevenueLog[]` | — |  |

**Index/Unique:**

- `@@index([isActive, createdAt])`
- `@@index([ownerId])`
- `@@index([roomType])`


### <a name="model-chatroomgift"></a>`ChatRoomGift` → tablo `chat_room_gifts`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `roomId` | `String` | — |  |
| `senderId` | `String` | — |  |
| `recipientId` | `String` | — |  |
| `giftTypeId` | `String` | — |  |
| `quantity` | `Int` | default=1 |  |
| `totalPrice` | `Int` | — | total cost |
| `currencyType` | `String` | default="jeton" | "jeton" or "cfc" |
| `commissionAmount` | `Int` | default=0 | amount taken as commission |
| `beneficiaryId` | `String?` | — | who received commission (null if no commission) |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `room` | `ChatRoom` | fields: [roomId], references: [id], onDelete: Cascade |  |
| `sender` | `User` | "ChatGiftSender", fields: [senderId], references: [id], onDelete: Cascade |  |
| `recipient` | `User` | "ChatGiftRecipient", fields: [recipientId], references: [id], onDelete: Cascade |  |
| `giftType` | `GiftType` | fields: [giftTypeId], references: [id] |  |

**Index/Unique:**

- `@@index([roomId])`
- `@@index([senderId])`
- `@@index([recipientId])`
- `@@index([roomId, senderId])`
- `@@index([roomId, createdAt(sort: Desc)])`


### <a name="model-chatmessage"></a>`ChatMessage` → tablo `chat_messages`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `roomId` | `String` | — |  |
| `userId` | `String` | — |  |
| `content` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `room` | `ChatRoom` | fields: [roomId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([roomId, createdAt])`
- `@@index([userId])`


### <a name="model-chatpresence"></a>`ChatPresence` → tablo `chat_presences`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `roomId` | `String` | — |  |
| `userId` | `String` | — |  |
| `nickname` | `String?` | — |  |
| `isTyping` | `Boolean` | default=false |  |
| `lastTyping` | `DateTime?` | — |  |
| `lastSeen` | `DateTime` | default=now( |  |
| `seatIndex` | `Int` | default=-1 | -1 = no seat, 0-14 = seat position |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `room` | `ChatRoom` | fields: [roomId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([roomId, userId])`
- `@@index([roomId])`
- `@@index([roomId, lastSeen])`


### <a name="model-chatuserrole"></a>`ChatUserRole` → tablo `chat_user_roles`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `roomId` | `String` | — |  |
| `userId` | `String` | — |  |
| `role` | `String` | — |  |
| `grantedBy` | `String?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `room` | `ChatRoom` | fields: [roomId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([roomId, userId])`
- `@@index([roomId])`


### <a name="model-chatmute"></a>`ChatMute` → tablo `chat_mutes`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `roomId` | `String` | — |  |
| `userId` | `String` | — |  |
| `mutedBy` | `String` | — |  |
| `reason` | `String?` | — |  |
| `expiresAt` | `DateTime?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `muter` | `User` | "Muter", fields: [mutedBy], references: [id], onDelete: Cascade |  |
| `room` | `ChatRoom` | fields: [roomId], references: [id], onDelete: Cascade |  |
| `user` | `User` | "MutedUser", fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([roomId, userId])`
- `@@index([roomId])`


### <a name="model-chatban"></a>`ChatBan` → tablo `chat_bans`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `roomId` | `String` | — |  |
| `userId` | `String` | — |  |
| `bannedBy` | `String` | — |  |
| `reason` | `String?` | — |  |
| `expiresAt` | `DateTime?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `banner` | `User` | "Banner", fields: [bannedBy], references: [id], onDelete: Cascade |  |
| `room` | `ChatRoom` | fields: [roomId], references: [id], onDelete: Cascade |  |
| `user` | `User` | "BannedUser", fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([roomId, userId])`
- `@@index([roomId])`


### <a name="model-sitesetting"></a>`SiteSetting` → tablo `site_settings`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `key` | `String` | unique |  |
| `value` | `String` | — |  |
| `updatedAt` | `DateTime` | — |  |


### <a name="model-socialpost"></a>`SocialPost` → tablo `social_posts`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `fortuneId` | `String?` | — |  |
| `content` | `String` | — |  |
| `postType` | `String` | — |  |
| `fortuneType` | `String?` | — |  |
| `isPublic` | `Boolean` | default=true |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |
| `imageUrl` | `String?` | — |  |
| `isAuto` | `Boolean` | default=false |  |
| `audioUrl` | `String?` | — |  |
| `youtubeUrl` | `String?` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `comments` | `SocialComment[]` | — |  |
| `likes` | `SocialLike[]` | — |  |
| `fortune` | `Fortune?` | fields: [fortuneId], references: [id] |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([userId])`
- `@@index([createdAt])`
- `@@index([postType])`
- `@@index([postType, createdAt(sort: Desc)])`


### <a name="model-socialcomment"></a>`SocialComment` → tablo `social_comments`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `postId` | `String` | — |  |
| `userId` | `String` | — |  |
| `content` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `post` | `SocialPost` | fields: [postId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([postId])`
- `@@index([userId])`


### <a name="model-sociallike"></a>`SocialLike` → tablo `social_likes`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `postId` | `String` | — |  |
| `userId` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `post` | `SocialPost` | fields: [postId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([postId, userId])`
- `@@index([postId])`


### <a name="model-anonymoususer"></a>`AnonymousUser` → tablo `anonymous_users`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `username` | `String` | unique |  |
| `deviceId` | `String` | unique |  |
| `credits` | `Int` | default=0 |  |
| `adsWatched` | `Int` | default=0 |  |
| `adsWatchedToday` | `Int` | default=0 |  |
| `lastAdDate` | `DateTime?` | — |  |
| `fortunesUsed` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `anonymousFortunes` | `AnonymousFortune[]` | — |  |


### <a name="model-anonymousfortune"></a>`AnonymousFortune` → tablo `anonymous_fortunes`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `anonymousUserId` | `String` | — |  |
| `fortuneType` | `String` | — |  |
| `inputData` | `String` | — |  |
| `aiResponse` | `String` | — |  |
| `language` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `anonymousUser` | `AnonymousUser` | fields: [anonymousUserId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([anonymousUserId])`


### <a name="model-sitepresence"></a>`SitePresence` → tablo `site_presences`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `visitorId` | `String` | unique |  |
| `userId` | `String?` | — |  |
| `lastSeen` | `DateTime` | default=now( |  |
| `userAgent` | `String?` | — |  |
| `path` | `String?` | — |  |
| `deviceType` | `String?` | — | mobile, tablet, desktop |
| `isBot` | `Boolean` | default=false |  |
| `botName` | `String?` | — |  |

**Index/Unique:**

- `@@index([lastSeen])`


### <a name="model-sitevisit"></a>`SiteVisit` → tablo `site_visits`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `visitorId` | `String` | — |  |
| `userId` | `String?` | — |  |
| `visitedAt` | `DateTime` | default=now( |  |
| `path` | `String?` | — |  |
| `userAgent` | `String?` | — |  |
| `country` | `String?` | — |  |
| `city` | `String?` | — |  |
| `ipHash` | `String?` | — |  |
| `deviceType` | `String?` | — |  |
| `isBot` | `Boolean` | default=false |  |
| `botName` | `String?` | — |  |

**Index/Unique:**

- `@@index([visitedAt])`
- `@@index([visitorId])`
- `@@index([country])`


### <a name="model-notification"></a>`Notification` → tablo `notifications`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `type` | `String` | — |  |
| `title` | `String?` | — |  |
| `message` | `String` | — |  |
| `data` | `String?` | — |  |
| `postId` | `String?` | — |  |
| `fromUserId` | `String?` | — |  |
| `fromUserName` | `String?` | — |  |
| `isRead` | `Boolean` | default=false |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([userId, isRead])`
- `@@index([createdAt])`
- `@@index([userId, createdAt(sort: Desc)])`
- `@@index([userId, isRead, createdAt(sort: Desc)])`


### <a name="model-creditpackage"></a>`CreditPackage` → tablo `credit_packages`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | — |  |
| `nameEn` | `String?` | — |  |
| `credits` | `Int` | — |  |
| `price` | `Float` | — |  |
| `currency` | `String` | default="TRY" |  |
| `stripePriceId` | `String?` | — |  |
| `isActive` | `Boolean` | default=true |  |
| `isFeatured` | `Boolean` | default=false |  |
| `bonusCredits` | `Int` | default=0 |  |
| `sortOrder` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `payments` | `Payment[]` | — |  |


### <a name="model-payment"></a>`Payment` → tablo `payments`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `packageId` | `String?` | — |  |
| `stripeSessionId` | `String?` | unique |  |
| `stripePaymentIntentId` | `String?` | unique |  |
| `amount` | `Float` | — |  |
| `currency` | `String` | default="TRY" |  |
| `creditsAwarded` | `Int` | — |  |
| `status` | `String` | default="pending" | pending, completed, failed, refunded |
| `paymentMethod` | `String?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |
| `completedAt` | `DateTime?` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |
| `package` | `CreditPackage?` | fields: [packageId], references: [id] |  |

**Index/Unique:**

- `@@index([userId])`
- `@@index([status])`
- `@@index([stripeSessionId])`


### <a name="model-paymentmethod"></a>`PaymentMethod` → tablo `payment_methods`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `type` | `String` | unique | credit_card, bitcoin, bank_transfer |
| `name` | `String` | — |  |
| `nameEn` | `String?` | — |  |
| `description` | `String?` | — |  |
| `descriptionEn` | `String?` | — |  |
| `isActive` | `Boolean` | default=true |  |
| `config` | `String?` | — | JSON string for configuration (bank details, wallet address, etc.) |
| `sortOrder` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |


### <a name="model-platformsettings"></a>`PlatformSettings` → tablo `platform_settings`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `key` | `String` | unique |  |
| `value` | `String` | — |  |
| `description` | `String?` | — |  |
| `updatedAt` | `DateTime` | — |  |


### <a name="model-tellerchatsession"></a>`TellerChatSession` → tablo `teller_chat_sessions`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `liveSessionId` | `String` | unique |  |
| `userId` | `String` | — |  |
| `tellerId` | `String` | — |  |
| `status` | `String` | default="active" | active, closed |
| `createdAt` | `DateTime` | default=now( |  |
| `closedAt` | `DateTime?` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `liveSession` | `LiveSession` | fields: [liveSessionId], references: [id], onDelete: Cascade |  |
| `messages` | `TellerChatMessage[]` | — |  |

**Index/Unique:**

- `@@index([userId])`
- `@@index([tellerId])`
- `@@index([status])`


### <a name="model-tellerchatmessage"></a>`TellerChatMessage` → tablo `teller_chat_messages`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `chatSessionId` | `String` | — |  |
| `senderId` | `String` | — |  |
| `senderType` | `String` | — | "user" or "teller" |
| `content` | `String` | — |  |
| `messageType` | `String` | default="text" | text, image |
| `imageUrl` | `String?` | — |  |
| `isRead` | `Boolean` | default=false |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `chatSession` | `TellerChatSession` | fields: [chatSessionId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([chatSessionId])`
- `@@index([createdAt])`


### <a name="model-videostream"></a>`VideoStream` → tablo `video_streams`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `title` | `String?` | — |  |
| `description` | `String?` | — |  |
| `status` | `String` | default="live" | live, ended |
| `viewerCount` | `Int` | default=0 |  |
| `likeCount` | `Int` | default=0 |  |
| `roomId` | `String` | unique, default=cuid( |  |
| `category` | `String?` | — | fortune, chat, general |
| `thumbnailUrl` | `String?` | — |  |
| `broadcastImage` | `String?` | — | Image URL for image-only broadcast mode |
| `isImageMode` | `Boolean` | default=false | Whether broadcasting with image instead of video |
| `backgroundUrl` | `String?` | — | Background image URL for the broadcast |
| `lastGiftAt` | `DateTime?` | — | Last gift received timestamp (for auto-close) |
| `autoClosedAt` | `DateTime?` | — | When stream was auto-closed due to no gifts |
| `startedAt` | `DateTime` | default=now( |  |
| `endedAt` | `DateTime?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |
| `comments` | `VideoStreamComment[]` | — |  |
| `likes` | `VideoStreamLike[]` | — |  |
| `viewers` | `VideoStreamViewer[]` | — |  |
| `gifts` | `StreamGift[]` | — |  |

**Index/Unique:**

- `@@index([userId])`
- `@@index([status])`
- `@@index([startedAt])`
- `@@index([status, startedAt(sort: Desc)])`
- `@@index([status, category, startedAt(sort: Desc)])`


### <a name="model-videostreamcomment"></a>`VideoStreamComment` → tablo `video_stream_comments`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `streamId` | `String` | — |  |
| `userId` | `String` | — |  |
| `content` | `String` | — |  |
| `nickname` | `String?` | — | Optional custom nickname for the comment |
| `isHidden` | `Boolean` | default=false | Whether viewer is hidden in this stream |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `stream` | `VideoStream` | fields: [streamId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([streamId])`
- `@@index([createdAt])`


### <a name="model-videostreamlike"></a>`VideoStreamLike` → tablo `video_stream_likes`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `streamId` | `String` | — |  |
| `userId` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `stream` | `VideoStream` | fields: [streamId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([streamId, userId])`
- `@@index([streamId])`


### <a name="model-videostreamviewer"></a>`VideoStreamViewer` → tablo `video_stream_viewers`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `streamId` | `String` | — |  |
| `viewerId` | `String` | — |  |
| `viewerName` | `String?` | — |  |
| `nickname` | `String?` | — | Custom nickname for this stream |
| `isHidden` | `Boolean` | default=false | Whether viewer wants to be hidden |
| `joinedAt` | `DateTime` | default=now( |  |
| `leftAt` | `DateTime?` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `stream` | `VideoStream` | fields: [streamId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([streamId, viewerId])`
- `@@index([streamId])`


### <a name="model-gifttype"></a>`GiftType` → tablo `gift_types`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | — |  |
| `nameEn` | `String` | — |  |
| `icon` | `String` | — | emoji or icon name |
| `animation` | `String?` | — | animation type |
| `price` | `Int` | — | price in credits |
| `sortOrder` | `Int` | default=0 |  |
| `isActive` | `Boolean` | default=true |  |
| `createdAt` | `DateTime` | default=now( |  |
| `thumbnailUrl` | `String?` | — | small preview image (ready-to-use URL) |
| `assetUrl` | `String?` | — | full gift asset URL (video/lottie/svga/gif/png) |
| `assetType` | `String?` | default="image" | image | video | lottie | svga | gif |
| `cloudStoragePath` | `String?` | — | internal storage key for the asset |
| `thumbnailCloudPath` | `String?` | — | internal storage key for the thumbnail |
| `category` | `String?` | — | optional grouping (e.g. "luxury", "romantic") |
| `description` | `String?` | — |  |
| `updatedAt` | `DateTime` | default=now( |  |
| `soundUrl` | `String?` | — | optional sound effect URL |
| `soundCloudPath` | `String?` | — | internal storage key for the sound |
| `animationDurationMs` | `Int?` | — | animation duration in ms |
| `isFullscreen` | `Boolean` | default=false | full-screen animation gift |
| `tier` | `String` | default="small" | small | big | huge (animation intensity) |
| `isPopular` | `Boolean` | default=false |  |
| `isNew` | `Boolean` | default=false |  |
| `isSpecialEvent` | `Boolean` | default=false |  |
| `isHidden` | `Boolean` | default=false | "gizli" gift — invisible until first sent/owned |
| `seasonStart` | `DateTime?` | — | seasonal availability window start |
| `seasonEnd` | `DateTime?` | — | seasonal availability window end |
| `isFeatured` | `Boolean` | default=false | "Hediye Günü" highlight |
| `firstReleasedAt` | `DateTime?` | — | album: first release date |
| `iconImageUrl` | `String?` | — | static PNG/webP icon shown in panel/list (distinct from emoji `icon`) |
| `iconImageCloudPath` | `String?` | — | internal storage key for the static icon image |
| `effectColor` | `String?` | — | hex effect color, e.g. #FF6B6B |
| `comboEnabled` | `Boolean` | default=false | gift supports combo sending |
| `isPremium` | `Boolean` | default=false | premium gift |
| `visibleInVoiceRoom` | `Boolean` | default=true |  |
| `visibleInLiveStream` | `Boolean` | default=true |  |
| `visibleInPK` | `Boolean` | default=true |  |
| `visibleInProfile` | `Boolean` | default=false |  |
| `visibleInMessaging` | `Boolean` | default=false |  |
| `visibleInTrend` | `Boolean` | default=false |  |
| `visibleInStories` | `Boolean` | default=false |  |
| `visibleInFortune` | `Boolean` | default=false |  |
| `visibleInNotification` | `Boolean` | default=false |  |
| `visibleAsMini` | `Boolean` | default=false | mini animasyon |
| `visibleAsFullscreen` | `Boolean` | default=false | tam ekran animasyon |
| `displayType` | `String` | default="static" | static|animation|video|3d|lottie|effect|fullscreen|mini|continuous|play_once |
| `requiresVip` | `Boolean` | default=false |  |
| `eventOnly` | `Boolean` | default=false |  |
| `pkOnly` | `Boolean` | default=false |  |
| `liveOnly` | `Boolean` | default=false |  |
| `voiceOnly` | `Boolean` | default=false |  |
| `newUserOnly` | `Boolean` | default=false |  |
| `timedCampaign` | `Boolean` | default=false |  |
| `campaignStart` | `DateTime?` | — |  |
| `campaignEnd` | `DateTime?` | — |  |
| `isSeasonal` | `Boolean` | default=false |  |
| `isReusable` | `Boolean` | default=true |  |
| `dailySendLimit` | `Int?` | — | null = sınırsız |
| `startDelayMs` | `Int?` | — | animasyon başlangıç gecikmesi (ms) |
| `displayDurationMs` | `Int?` | — | ekranda kalma süresi (ms) |
| `repeatCount` | `Int` | default=1 | tekrar sayısı (0 = sonsuz) |
| `volume` | `Int` | default=100 | ses seviyesi 0-100 |
| `particleEffect` | `String?` | — | confetti|heart|star|light|glow|none |
| `hasVibration` | `Boolean` | default=false |  |
| `hasColorChange` | `Boolean` | default=false |  |
| `screenPosition` | `String` | default="center" | bottom|top|center|right|left|above_seat|user_avatar|room_center|fullscreen|background|message_area|header|footer |
| `animStartPoint` | `String?` | — | animasyon başlangıç noktası |
| `animEndPoint` | `String?` | — | animasyon bitiş noktası |
| `collectionId` | `String?` | — |  |
| `musicUrl` | `String?` | — | hediye özel müzik |
| `musicCloudPath` | `String?` | — | müzik cloud key |
| `isLucky` | `Boolean` | default=false | şanslı hediye — gönderiminde jeton ödülü kazandırır |
| `contentVersion` | `Int` | default=1 | her değişiklikte artar |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `collection` | `GiftCollection?` | fields: [collectionId], references: [id] |  |
| `gifts` | `StreamGift[]` | — |  |
| `chatRoomGifts` | `ChatRoomGift[]` | — |  |
| `giftEvents` | `GiftEvent[]` | — |  |

**Index/Unique:**

- `@@index([collectionId])`
- `@@index([displayType])`
- `@@index([contentVersion])`


### <a name="model-giftcollection"></a>`GiftCollection` → tablo `gift_collections`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | — | Romantik, VIP, Komik, Lüks... |
| `nameEn` | `String` | default="" |  |
| `slug` | `String` | unique |  |
| `description` | `String?` | — |  |
| `iconEmoji` | `String?` | — | 💕, 👑, 🎉... |
| `iconUrl` | `String?` | — | opsiyonel ikon görseli |
| `iconCloudPath` | `String?` | — |  |
| `sortOrder` | `Int` | default=0 |  |
| `isActive` | `Boolean` | default=true |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `gifts` | `GiftType[]` | — |  |


### <a name="model-luckygifttier"></a>`LuckyGiftTier` → tablo `lucky_gift_tiers`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | — | "2x", "Jackpot 500x"... |
| `nameEn` | `String` | default="" |  |
| `multiplier` | `Int` | — | ödül çarpanı — kazanılan jeton = betJetons * multiplier (0 = ödül yok) |
| `weight` | `Int` | default=1 | ağırlıklı olasılık payı (yüksek = daha olası) |
| `isJackpot` | `Boolean` | default=false | jackpot kademesi — oda geneli duyuru tetikler |
| `color` | `String?` | — | hex renk, ör. #FFD700 |
| `icon` | `String?` | — | emoji/ikon |
| `isActive` | `Boolean` | default=true |  |
| `sortOrder` | `Int` | default=0 |  |
| `contentVersion` | `Int` | default=1 |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@index([isActive])`


### <a name="model-luckygiftreward"></a>`LuckyGiftReward` → tablo `lucky_gift_rewards`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `giftTypeId` | `String` | — |  |
| `context` | `String?` | — | voice_room | live_stream | pk | profile | messaging |
| `contextId` | `String?` | — | roomId | streamId |
| `betJetons` | `Int` | — | harcanan jeton (hediye fiyatı * adet) |
| `quantity` | `Int` | default=1 |  |
| `multiplier` | `Int` | — | uygulanan çarpan |
| `wonJetons` | `Int` | — | kazanılan jeton |
| `netJetons` | `Int` | — | wonJetons - betJetons (kar/zarar) |
| `isJackpot` | `Boolean` | default=false |  |
| `tierId` | `String?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@index([userId, createdAt])`
- `@@index([isJackpot, createdAt])`
- `@@index([createdAt])`


### <a name="model-streamgift"></a>`StreamGift` → tablo `stream_gifts`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `streamId` | `String` | — |  |
| `senderId` | `String` | — |  |
| `giftTypeId` | `String` | — |  |
| `quantity` | `Int` | default=1 |  |
| `totalPrice` | `Int` | — | total credits spent (gross / display value) |
| `receiverAmount` | `Int` | default=0 | jetons credited to broadcaster |
| `siteAmount` | `Int` | default=0 | jetons kept by the site |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `stream` | `VideoStream` | fields: [streamId], references: [id], onDelete: Cascade |  |
| `sender` | `User` | fields: [senderId], references: [id], onDelete: Cascade |  |
| `giftType` | `GiftType` | fields: [giftTypeId], references: [id] |  |

**Index/Unique:**

- `@@index([streamId])`
- `@@index([senderId])`


### <a name="model-videostreamsignal"></a>`VideoStreamSignal` → tablo `video_stream_signals`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `streamId` | `String` | — |  |
| `senderId` | `String` | — |  |
| `receiverId` | `String?` | — |  |
| `signalType` | `String` | — | offer, answer, ice-candidate, join |
| `signalData` | `String` | — |  |
| `processed` | `Boolean` | default=false |  |
| `createdAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@index([streamId])`
- `@@index([receiverId, processed])`


### <a name="model-streamcobroadcaster"></a>`StreamCoBroadcaster` → tablo `stream_co_broadcasters`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `streamId` | `String` | — |  |
| `userId` | `String` | — |  |
| `status` | `String` | default="invited" | invited, active, ended |
| `isMuted` | `Boolean` | default=false |  |
| `isVideoOff` | `Boolean` | default=false |  |
| `invitedAt` | `DateTime` | default=now( |  |
| `joinedAt` | `DateTime?` | — |  |
| `leftAt` | `DateTime?` | — |  |

**Index/Unique:**

- `@@unique([streamId, userId])`
- `@@index([streamId])`
- `@@index([userId])`


### <a name="model-streamban"></a>`StreamBan` → tablo `stream_bans`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `streamId` | `String` | — |  |
| `bannedUserId` | `String` | — |  |
| `reason` | `String?` | — |  |
| `bannedAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@unique([streamId, bannedUserId])`
- `@@index([streamId])`


### <a name="model-streammoderator"></a>`StreamModerator` → tablo `stream_moderators`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `streamId` | `String` | — |  |
| `userId` | `String` | — |  |
| `addedAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@unique([streamId, userId])`
- `@@index([streamId])`
- `@@index([userId])`


### <a name="model-pkbattle"></a>`PKBattle` → tablo `pk_battles`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `stream1Id` | `String` | — | Challenger stream |
| `stream2Id` | `String` | — | Opponent stream |
| `user1Id` | `String` | — | Challenger user |
| `user2Id` | `String` | — | Opponent user |
| `score1` | `Int` | default=0 | Gift points for stream1 |
| `score2` | `Int` | default=0 | Gift points for stream2 |
| `status` | `String` | default="pending" | pending, active, completed, cancelled, rejected |
| `duration` | `Int` | default=300 | Duration in seconds (default 5 min, admin-configurable) |
| `startedAt` | `DateTime?` | — |  |
| `endedAt` | `DateTime?` | — |  |
| `winnerId` | `String?` | — | Winner user ID |
| `createdAt` | `DateTime` | default=now( |  |
| `acceptedAt` | `DateTime?` | — | when the opponent accepted |
| `endsAt` | `DateTime?` | — | authoritative countdown end (server clock) for synced timers |
| `isDraw` | `Boolean` | default=false | true when scores are equal at finish |
| `winnerSide` | `Int?` | — | 1 or 2 (null on draw / not finished) |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `scoreLogs` | `PkScore[]` | — |  |
| `pkGifts` | `PkGift[]` | — |  |

**Index/Unique:**

- `@@index([stream1Id])`
- `@@index([stream2Id])`
- `@@index([user1Id])`
- `@@index([user2Id])`
- `@@index([status])`
- `@@index([status, endsAt])`


### <a name="model-pkscore"></a>`PkScore` → tablo `pk_scores`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `battleId` | `String` | — |  |
| `side` | `Int` | — | 1 = left/host, 2 = right/opponent |
| `contributorId` | `String` | — | the viewer who sent the gift that scored these points |
| `points` | `Int` | — | gross jeton value added |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `battle` | `PKBattle` | fields: [battleId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([battleId])`
- `@@index([battleId, side])`
- `@@index([battleId, contributorId])`


### <a name="model-pkgift"></a>`PkGift` → tablo `pk_gifts`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `battleId` | `String` | — |  |
| `side` | `Int` | — | 1 or 2 (which side the gift scored for) |
| `senderId` | `String` | — | viewer who sent |
| `receiverId` | `String` | — | the broadcaster on that side |
| `giftTypeId` | `String` | — |  |
| `quantity` | `Int` | default=1 |  |
| `points` | `Int` | — | gross jeton value (added to that side's score) |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `battle` | `PKBattle` | fields: [battleId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([battleId])`
- `@@index([battleId, side])`
- `@@index([senderId])`


### <a name="model-liveguestsession"></a>`LiveGuestSession` → tablo `live_guest_sessions`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `streamId` | `String` | — |  |
| `userId` | `String` | — |  |
| `status` | `String` | default="active" | active, left, removed |
| `slot` | `Int` | — | 1..8 seat index |
| `isMuted` | `Boolean` | default=false | audio muted (self or by host) |
| `isVideoOff` | `Boolean` | default=false | camera off |
| `mutedByHost` | `Boolean` | default=false | true when host force-muted |
| `joinedAt` | `DateTime` | default=now( |  |
| `lastSeenAt` | `DateTime` | default=now( | heartbeat for reconnect detection |
| `leftAt` | `DateTime?` | — |  |

**Index/Unique:**

- `@@unique([streamId, userId])`
- `@@index([streamId])`
- `@@index([streamId, status])`
- `@@index([userId])`


### <a name="model-liveguestinvite"></a>`LiveGuestInvite` → tablo `live_guest_invites`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `streamId` | `String` | — |  |
| `hostId` | `String` | — | stream owner who invited |
| `guestId` | `String` | — | invited user |
| `status` | `String` | default="pending" | pending, accepted, rejected, expired, cancelled |
| `createdAt` | `DateTime` | default=now( |  |
| `respondedAt` | `DateTime?` | — |  |
| `expiresAt` | `DateTime` | — | invite auto-expires |

**Index/Unique:**

- `@@index([streamId])`
- `@@index([guestId, status])`
- `@@index([status, expiresAt])`


### <a name="model-fortunerequesttype"></a>`FortuneRequestType` → tablo `fortune_request_types`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | — | Turkish name |
| `nameEn` | `String` | — | English name |
| `icon` | `String` | default="☕" | Emoji icon |
| `jetonCost` | `Int` | — | Required jetons |
| `description` | `String?` | — | Description |
| `sortOrder` | `Int` | default=0 |  |
| `isActive` | `Boolean` | default=true |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `fortuneRequests` | `StreamFortuneRequest[]` | — |  |


### <a name="model-streamfortunerequest"></a>`StreamFortuneRequest` → tablo `stream_fortune_requests`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `streamId` | `String` | — |  |
| `userId` | `String` | — |  |
| `typeId` | `String?` | — | Fortune request type |
| `nickname` | `String?` | — | Optional nickname to show instead of real name |
| `isHidden` | `Boolean` | default=false | Whether user wants to be hidden |
| `question` | `String?` | — | User's custom question |
| `jetonAmount` | `Int` | default=0 | Jetons spent for this request |
| `status` | `String` | default="pending" | pending, selected, completed, refunded |
| `refundedAt` | `DateTime?` | — | When tokens were refunded (if applicable) |
| `createdAt` | `DateTime` | default=now( |  |
| `selectedAt` | `DateTime?` | — |  |
| `completedAt` | `DateTime?` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `type` | `FortuneRequestType?` | fields: [typeId], references: [id] |  |

**Index/Unique:**

- `@@unique([streamId, userId])`
- `@@index([streamId])`
- `@@index([userId])`
- `@@index([jetonAmount])`
- `@@index([status])`


### <a name="model-streammutedviewer"></a>`StreamMutedViewer` → tablo `stream_muted_viewers`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `streamId` | `String` | — |  |
| `viewerId` | `String` | — |  |
| `mutedBy` | `String` | — | userId of who muted them |
| `reason` | `String?` | — |  |
| `mutedAt` | `DateTime` | default=now( |  |
| `expiresAt` | `DateTime?` | — | null = permanent |

**Index/Unique:**

- `@@unique([streamId, viewerId])`
- `@@index([streamId])`


### <a name="model-directmessage"></a>`DirectMessage` → tablo `direct_messages`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `senderId` | `String` | — |  |
| `receiverId` | `String` | — |  |
| `content` | `String` | — |  |
| `imageUrl` | `String?` | — |  |
| `isRead` | `Boolean` | default=false |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `sender` | `User` | "SentMessages", fields: [senderId], references: [id], onDelete: Cascade |  |
| `receiver` | `User` | "ReceivedMessages", fields: [receiverId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([senderId])`
- `@@index([receiverId])`
- `@@index([createdAt])`
- `@@index([senderId, receiverId, createdAt(sort: Desc)])`
- `@@index([receiverId, senderId, createdAt(sort: Desc)])`
- `@@index([receiverId, isRead])`


### <a name="model-conversation"></a>`Conversation` → tablo `conversations`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `user1Id` | `String` | — |  |
| `user2Id` | `String` | — |  |
| `lastMessageAt` | `DateTime` | default=now( |  |
| `lastMessageText` | `String?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user1` | `User` | "ConversationUser1", fields: [user1Id], references: [id], onDelete: Cascade |  |
| `user2` | `User` | "ConversationUser2", fields: [user2Id], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([user1Id, user2Id])`
- `@@index([user1Id])`
- `@@index([user2Id])`
- `@@index([lastMessageAt])`


### <a name="model-messagerequest"></a>`MessageRequest` → tablo `message_requests`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `senderId` | `String` | — |  |
| `receiverId` | `String` | — |  |
| `status` | `String` | default="pending" | pending, accepted, rejected |
| `message` | `String?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `sender` | `User` | "SentRequests", fields: [senderId], references: [id], onDelete: Cascade |  |
| `receiver` | `User` | "ReceivedRequests", fields: [receiverId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([senderId, receiverId])`
- `@@index([senderId])`
- `@@index([receiverId])`
- `@@index([status])`


### <a name="model-userloginsession"></a>`UserLoginSession` → tablo `user_login_sessions`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `loginAt` | `DateTime` | default=now( |  |
| `logoutAt` | `DateTime?` | — |  |
| `duration` | `Int` | default=0 | in minutes |
| `deviceType` | `String?` | — | mobile, desktop, tablet |
| `browser` | `String?` | — |  |

**Index/Unique:**

- `@@index([userId])`
- `@@index([loginAt])`


### <a name="model-userdailyactivity"></a>`UserDailyActivity` → tablo `user_daily_activity`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `date` | `DateTime` | — |  |
| `minutesSpent` | `Int` | default=0 |  |
| `fortunesViewed` | `Int` | default=0 |  |
| `postsCreated` | `Int` | default=0 |  |
| `messagesCount` | `Int` | default=0 |  |
| `streamsWatched` | `Int` | default=0 |  |
| `creditsSpent` | `Int` | default=0 |  |
| `creditsEarned` | `Int` | default=0 |  |

**Index/Unique:**

- `@@unique([userId, date])`
- `@@index([userId])`
- `@@index([date])`


### <a name="model-userhourlyactivity"></a>`UserHourlyActivity` → tablo `user_hourly_activity`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `hour` | `Int` | — | 0-23 |
| `totalMinutes` | `Int` | default=0 |  |
| `loginCount` | `Int` | default=0 |  |

**Index/Unique:**

- `@@unique([userId, hour])`
- `@@index([userId])`


### <a name="model-credittransaction"></a>`CreditTransaction` → tablo `credit_transactions`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `amount` | `Int` | — | positive for earned, negative for spent |
| `type` | `String` | — | purchase, gift_sent, gift_received, fortune, stream, reward, referral |
| `description` | `String?` | — |  |
| `relatedId` | `String?` | — | related fortune/stream/gift id |
| `balance` | `Int` | — | balance after transaction |
| `createdAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@index([userId])`
- `@@index([type])`
- `@@index([createdAt])`


### <a name="model-fortunerating"></a>`FortuneRating` → tablo `fortune_ratings`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `fortuneId` | `String` | unique |  |
| `userId` | `String` | — |  |
| `satisfaction` | `Int?` | — | 1-5 rating |
| `accuracy` | `Int?` | — | 1-5 rating (can be updated later) |
| `feedback` | `String?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([userId])`
- `@@index([fortuneId])`


### <a name="model-userachievement"></a>`UserAchievement` → tablo `user_achievements`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `achievementId` | `String` | — |  |
| `earnedAt` | `DateTime` | default=now( |  |
| `progress` | `Int` | default=0 |  |
| `isCompleted` | `Boolean` | default=false |  |

**Index/Unique:**

- `@@unique([userId, achievementId])`
- `@@index([userId])`


### <a name="model-achievement"></a>`Achievement` → tablo `achievements`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `code` | `String` | unique |  |
| `nameTr` | `String` | — |  |
| `nameEn` | `String` | — |  |
| `descriptionTr` | `String` | — |  |
| `descriptionEn` | `String` | — |  |
| `icon` | `String` | — |  |
| `category` | `String` | — | fortune, social, stream, coin, activity |
| `targetValue` | `Int` | — | target to complete |
| `rewardCredits` | `Int` | default=0 |  |
| `sortOrder` | `Int` | default=0 |  |
| `isActive` | `Boolean` | default=true |  |
| `createdAt` | `DateTime` | default=now( |  |


### <a name="model-banaozelitem"></a>`BanaOzelItem` → tablo `bana_ozel_items`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `slug` | `String` | unique |  |
| `nameTr` | `String` | — |  |
| `nameEn` | `String` | — |  |
| `descTr` | `String?` | — |  |
| `descEn` | `String?` | — |  |
| `icon` | `String` | — | emoji icon |
| `jetonCost` | `Int` | default=5 |  |
| `category` | `String` | default="fortune" | fortune, tarot, astrology, spiritual |
| `isActive` | `Boolean` | default=true |  |
| `sortOrder` | `Int` | default=0 |  |
| `contentPool` | `String?` | — | JSON array of possible content/prompts |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([isActive])`
- `@@index([sortOrder])`


### <a name="model-jetontransaction"></a>`JetonTransaction` → tablo `jeton_transactions`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `amount` | `Int` | — | positive for earned, negative for spent |
| `type` | `String` | — | spend, daily_bonus, streak_bonus, task, purchase, welcome |
| `description` | `String?` | — |  |
| `itemSlug` | `String?` | — | related BanaOzelItem slug |
| `balanceBefore` | `Int` | — |  |
| `balanceAfter` | `Int` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@index([userId])`
- `@@index([type])`
- `@@index([createdAt])`


### <a name="model-userfortunestreak"></a>`UserFortuneStreak` → tablo `user_fortune_streaks`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | unique |  |
| `currentStreak` | `Int` | default=0 |  |
| `longestStreak` | `Int` | default=0 |  |
| `lastFortuneDate` | `DateTime?` | — |  |
| `totalFortunes` | `Int` | default=0 |  |

**Index/Unique:**

- `@@index([userId])`


### <a name="model-dailytask"></a>`DailyTask` → tablo `daily_tasks`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `taskType` | `String` | — | login, open_fortune, share, watch_stream, profile_complete |
| `completedAt` | `DateTime` | default=now( |  |
| `jetonEarned` | `Int` | default=0 |  |
| `date` | `DateTime` | — |  |

**Index/Unique:**

- `@@unique([userId, taskType, date])`
- `@@index([userId])`
- `@@index([date])`


### <a name="model-banaozelhistory"></a>`BanaOzelHistory` → tablo `bana_ozel_history`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `itemSlug` | `String` | — |  |
| `content` | `String` | — | Generated content |
| `jetonSpent` | `Int` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@index([userId])`
- `@@index([itemSlug])`
- `@@index([createdAt])`


### <a name="model-profileview"></a>`ProfileView` → tablo `profile_views`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `viewedUserId` | `String` | — |  |
| `viewerId` | `String?` | — |  |
| `viewedAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@index([viewedUserId])`
- `@@index([viewedAt])`


### <a name="model-membershipplan"></a>`MembershipPlan` → tablo `membership_plans`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | — | Plan name (e.g., "Gold 1 Aylık") |
| `nameEn` | `String?` | — | English name |
| `description` | `String?` | — |  |
| `descriptionEn` | `String?` | — |  |
| `tier` | `String` | — | basic, premium, gold, diamond |
| `durationDays` | `Int` | — | Duration in days |
| `priceType` | `String` | — | jeton, money |
| `price` | `Int` | — | Price in jetons or currency minor units (kuruş) |
| `currency` | `String` | default="TRY" | For money payments |
| `features` | `String?` | — | JSON array of features |
| `bonusJetons` | `Int` | default=0 | Bonus jetons on purchase |
| `discountPercent` | `Int` | default=0 | Discount on fortune readings |
| `prioritySupport` | `Boolean` | default=false |  |
| `exclusiveBadge` | `String?` | — | Badge icon/text |
| `sortOrder` | `Int` | default=0 |  |
| `isActive` | `Boolean` | default=true |  |
| `isFeatured` | `Boolean` | default=false |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `purchases` | `MembershipPurchase[]` | — |  |

**Index/Unique:**

- `@@index([tier])`
- `@@index([priceType])`
- `@@index([isActive])`


### <a name="model-membershippurchase"></a>`MembershipPurchase` → tablo `membership_purchases`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `planId` | `String?` | — |  |
| `priceType` | `String` | — | jeton, money |
| `pricePaid` | `Int` | — | Amount paid |
| `currency` | `String` | default="TRY" |  |
| `startsAt` | `DateTime` | default=now( |  |
| `expiresAt` | `DateTime` | — |  |
| `status` | `String` | default="active" | active, expired, cancelled |
| `createdAt` | `DateTime` | default=now( |  |
| `grantedBy` | `String?` | — | Admin who granted the membership (for free grants) |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `plan` | `MembershipPlan?` | fields: [planId], references: [id] |  |

**Index/Unique:**

- `@@index([userId])`
- `@@index([planId])`
- `@@index([status])`
- `@@index([expiresAt])`


### <a name="model-paymentnotification"></a>`PaymentNotification` → tablo `payment_notifications`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `username` | `String` | — | User's username at time of submission |
| `paymentMethod` | `String` | — | papara, bank_transfer, etc. |
| `amount` | `Float` | — | Amount paid in TRY |
| `transactionId` | `String?` | — | Transaction/Reference ID |
| `senderName` | `String?` | — | Name of sender (for bank transfers) |
| `notes` | `String?` | — | Additional notes |
| `status` | `String` | default="pending" | pending, approved, rejected |
| `jetonLoaded` | `Int?` | — | Jeton amount loaded by admin |
| `processedBy` | `String?` | — | Admin who processed |
| `processedAt` | `DateTime?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@index([userId])`
- `@@index([status])`
- `@@index([createdAt])`


### <a name="model-roomrevenuelog"></a>`RoomRevenueLog` → tablo `room_revenue_logs`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `roomId` | `String` | — |  |
| `eventType` | `String` | — | gift, music_request, etc. |
| `totalAmount` | `Int` | — | total jeton amount of the transaction |
| `receiverAmount` | `Int` | default=0 | amount given to gift receiver |
| `ownerAmount` | `Int` | default=0 | amount given to room owner |
| `siteAmount` | `Int` | default=0 | amount taken by site |
| `senderId` | `String?` | — | who initiated the transaction |
| `receiverId` | `String?` | — | gift receiver (if applicable) |
| `ownerId` | `String?` | — | room owner at the time |
| `metadata` | `String?` | — | JSON: extra info like giftName, videoTitle etc. |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `room` | `ChatRoom` | fields: [roomId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([roomId, createdAt])`
- `@@index([eventType])`


### <a name="model-voicesession"></a>`VoiceSession` → tablo `voice_sessions`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `roomId` | `String` | — |  |
| `userId` | `String` | — |  |
| `userName` | `String` | — |  |
| `agoraUid` | `Int` | default=0 |  |
| `joinedAt` | `DateTime` | default=now( |  |
| `lastPing` | `DateTime` | default=now( |  |
| `isActive` | `Boolean` | default=true |  |

**Index/Unique:**

- `@@unique([roomId, userId])`
- `@@index([roomId])`
- `@@index([isActive])`
- `@@index([lastPing])`


### <a name="model-voicesignal"></a>`VoiceSignal` → tablo `voice_signals`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `roomId` | `String` | — |  |
| `fromUserId` | `String` | — |  |
| `fromUserName` | `String` | — |  |
| `toUserId` | `String?` | — | null means broadcast |
| `type` | `String` | — | offer, answer, ice-candidate, join, leave |
| `data` | `String?` | — |  |
| `processed` | `Boolean` | default=false |  |
| `createdAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@index([roomId])`
- `@@index([toUserId])`
- `@@index([processed])`
- `@@index([createdAt])`


### <a name="model-tickermessage"></a>`TickerMessage` → tablo `ticker_messages`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `text` | `String` | — |  |
| `icon` | `String` | default="✨" |  |
| `isActive` | `Boolean` | default=true |  |
| `sortOrder` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([isActive])`


### <a name="model-homepagefortunecard"></a>`HomepageFortuneCard` → tablo `homepage_fortune_cards`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | — | Display name e.g. "Kahve Falı" |
| `icon` | `String` | default="🔮" | Emoji icon |
| `image` | `String` | default="" | Image URL for card |
| `href` | `String` | default="/fallar" | Link destination |
| `isActive` | `Boolean` | default=true |  |
| `sortOrder` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([isActive, sortOrder])`


### <a name="model-withdrawalrequest"></a>`WithdrawalRequest` → tablo `withdrawal_requests`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `amount` | `Int` | — | Amount in jetons to withdraw |
| `amountTL` | `Float` | — | Equivalent TL amount |
| `method` | `String` | — | bank_transfer, papara, etc. |
| `accountDetails` | `String?` | — | JSON: IBAN, name, etc. |
| `status` | `String` | default="pending" | pending, agency_approved, approved, rejected, processing, completed |
| `agencyId` | `String?` | — | Agency of the teller (if any) |
| `agencyApprovedBy` | `String?` | — | Agency owner/manager who approved |
| `agencyApprovedAt` | `DateTime?` | — |  |
| `agencyNote` | `String?` | — |  |
| `adminNote` | `String?` | — |  |
| `processedBy` | `String?` | — |  |
| `processedAt` | `DateTime?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([userId])`
- `@@index([agencyId])`
- `@@index([status])`
- `@@index([createdAt])`


### <a name="model-telleraward"></a>`TellerAward` → tablo `teller_awards`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `tellerId` | `String` | — |  |
| `awardType` | `String` | — | medium_of_day, medium_of_week, medium_of_month |
| `title` | `String?` | — |  |
| `awardedBy` | `String?` | — | admin who awarded |
| `startDate` | `DateTime` | default=now( |  |
| `endDate` | `DateTime` | — | When the award expires |
| `createdAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@index([tellerId])`
- `@@index([awardType])`
- `@@index([endDate])`


### <a name="model-tellergift"></a>`TellerGift` → tablo `teller_gifts`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `tellerId` | `String` | — |  |
| `senderId` | `String` | — |  |
| `giftTypeId` | `String` | — |  |
| `quantity` | `Int` | default=1 |  |
| `totalPrice` | `Int` | — | total jetons spent |
| `message` | `String?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@index([tellerId])`
- `@@index([senderId])`
- `@@index([createdAt])`


### <a name="model-siteannouncement"></a>`SiteAnnouncement` → tablo `site_announcements`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `type` | `String` | — | login, custom |
| `message` | `String` | — |  |
| `color` | `String` | default="red" | red, gold, etc. |
| `userId` | `String?` | — |  |
| `userName` | `String?` | — |  |
| `maxPasses` | `Int` | default=1 | how many times banner scrolls across screen |
| `createdAt` | `DateTime` | default=now( |  |
| `expiresAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([createdAt])`
- `@@index([expiresAt])`


### <a name="model-minigame"></a>`MiniGame` → tablo `mini_games`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `slug` | `String` | unique | fal-carki, tarot-sec, memory, quiz, sans-kutusu, sayi-tahmin |
| `title` | `String` | — |  |
| `description` | `String?` | — |  |
| `icon` | `String` | default="🎮" |  |
| `isActive` | `Boolean` | default=true |  |
| `entryFee` | `Int` | default=0 | jeton cost to play |
| `minReward` | `Int` | default=5 |  |
| `maxReward` | `Int` | default=50 |  |
| `sortOrder` | `Int` | default=0 |  |
| `config` | `String?` | — | JSON config for game-specific settings |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `plays` | `GamePlay[]` | — |  |

**Index/Unique:**

- `@@index([slug])`
- `@@index([isActive])`


### <a name="model-gameplay"></a>`GamePlay` → tablo `game_plays`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `gameId` | `String` | — |  |
| `reward` | `Int` | default=0 | jetons earned |
| `score` | `Int?` | — | optional score |
| `result` | `String?` | — | JSON result data |
| `playedAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `game` | `MiniGame` | fields: [gameId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([userId])`
- `@@index([gameId])`
- `@@index([playedAt])`
- `@@index([userId, gameId])`


### <a name="model-sosgame"></a>`SosGame` → tablo `sos_games`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `gridSize` | `Int` | default=6 | 6, 8, 10 |
| `player1Id` | `String` | — |  |
| `player2Id` | `String?` | — | null = waiting or AI |
| `isAI` | `Boolean` | default=false |  |
| `betAmount` | `Int` | default=0 | 0 = free |
| `betCurrency` | `String` | default="FREE" | FREE, CFC, JETON |
| `board` | `String` | default="[]" | JSON: grid state |
| `lines` | `String` | default="[]" | JSON: scored SOS lines |
| `currentTurn` | `Int` | default=1 | 1 or 2 |
| `player1Score` | `Int` | default=0 |  |
| `player2Score` | `Int` | default=0 |  |
| `status` | `String` | default="waiting" | waiting, active, completed, cancelled |
| `winnerId` | `String?` | — |  |
| `player1Name` | `String` | default="Oyuncu 1" |  |
| `player2Name` | `String` | default="Oyuncu 2" |  |
| `turnTimer` | `Int` | default=0 | 0=no timer, 10/15/20 seconds |
| `chatEnabled` | `Boolean` | default=true |  |
| `lastMoveAt` | `DateTime?` | — | for timer enforcement |
| `disconnectedPlayerId` | `String?` | — | Track which player disconnected (for AI takeover & reconnection) |
| `player1LastSeen` | `DateTime?` | — | Last poll time for player 1 |
| `player2LastSeen` | `DateTime?` | — | Last poll time for player 2 |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `chatMessages` | `SosGameChat[]` | — |  |
| `viewers` | `SosGameViewer[]` | — |  |

**Index/Unique:**

- `@@index([status])`
- `@@index([player1Id])`
- `@@index([player2Id])`
- `@@index([createdAt])`


### <a name="model-sosgamechat"></a>`SosGameChat` → tablo `sos_game_chats`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `gameId` | `String` | — |  |
| `userId` | `String` | — |  |
| `userName` | `String` | — |  |
| `message` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `game` | `SosGame` | fields: [gameId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([gameId, createdAt])`


### <a name="model-sosgameviewer"></a>`SosGameViewer` → tablo `sos_game_viewers`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `gameId` | `String` | — |  |
| `userId` | `String` | — |  |
| `userName` | `String` | — |  |
| `joinedAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `game` | `SosGame` | fields: [gameId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([gameId, userId])`
- `@@index([gameId])`


### <a name="model-gameroom"></a>`GameRoom` → tablo `game_rooms`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `gameType` | `String` | — | xox, tombala, tavla, pisti, sayi_tahmin, zar |
| `player1Id` | `String` | — |  |
| `player2Id` | `String?` | — |  |
| `isAI` | `Boolean` | default=false |  |
| `betAmount` | `Int` | default=0 |  |
| `betCurrency` | `String` | default="FREE" |  |
| `state` | `String` | default="{}" | JSON game state |
| `currentTurn` | `Int` | default=1 |  |
| `player1Score` | `Int` | default=0 |  |
| `player2Score` | `Int` | default=0 |  |
| `status` | `String` | default="waiting" |  |
| `winnerId` | `String?` | — |  |
| `player1Name` | `String` | default="Oyuncu 1" |  |
| `player2Name` | `String` | default="Oyuncu 2" |  |
| `turnTimer` | `Int` | default=0 |  |
| `chatEnabled` | `Boolean` | default=true |  |
| `lastMoveAt` | `DateTime?` | — |  |
| `disconnectedPlayerId` | `String?` | — | Track which player disconnected (for AI takeover & reconnection) |
| `player1LastSeen` | `DateTime?` | — | Last poll time for player 1 |
| `player2LastSeen` | `DateTime?` | — | Last poll time for player 2 |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `chatMessages` | `GameRoomChat[]` | — |  |
| `viewers` | `GameRoomViewer[]` | — |  |

**Index/Unique:**

- `@@index([gameType, status])`
- `@@index([status])`
- `@@index([player1Id])`
- `@@index([createdAt])`


### <a name="model-gameroomchat"></a>`GameRoomChat` → tablo `game_room_chats`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `roomId` | `String` | — |  |
| `userId` | `String` | — |  |
| `userName` | `String` | — |  |
| `message` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `room` | `GameRoom` | fields: [roomId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([roomId, createdAt])`


### <a name="model-gameroomviewer"></a>`GameRoomViewer` → tablo `game_room_viewers`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `roomId` | `String` | — |  |
| `userId` | `String` | — |  |
| `userName` | `String` | — |  |
| `joinedAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `room` | `GameRoom` | fields: [roomId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([roomId, userId])`
- `@@index([roomId])`


### <a name="model-dailyreward"></a>`DailyReward` → tablo `daily_rewards`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `rewardDate` | `DateTime` | — |  |
| `streak` | `Int` | default=1 |  |
| `jetonReward` | `Int` | default=5 |  |
| `claimedAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@unique([userId, rewardDate])`
- `@@index([userId])`


### <a name="model-dailyquest"></a>`DailyQuest` → tablo `daily_quests`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `questDate` | `DateTime` | — |  |
| `questType` | `String` | — | daily_login, play_3_games, buy_fortune |
| `progress` | `Int` | default=0 |  |
| `target` | `Int` | default=1 |  |
| `reward` | `Int` | default=10 |  |
| `claimed` | `Boolean` | default=false |  |
| `claimedAt` | `DateTime?` | — |  |

**Index/Unique:**

- `@@unique([userId, questDate, questType])`
- `@@index([userId])`
- `@@index([questDate])`


### <a name="model-blogcategory"></a>`BlogCategory` → tablo `blog_categories`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `slug` | `String` | unique |  |
| `nameTr` | `String` | — |  |
| `nameEn` | `String` | default="" |  |
| `descTr` | `String` | default="" |  |
| `descEn` | `String` | default="" |  |
| `icon` | `String` | default="BookOpen" |  |
| `color` | `String` | default="#8B5CF6" |  |
| `coverImage` | `String` | default="" |  |
| `sortOrder` | `Int` | default=0 |  |
| `isActive` | `Boolean` | default=true |  |
| `postCount` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |


### <a name="model-blogpost"></a>`BlogPost` → tablo `blog_posts`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `slug` | `String` | unique |  |
| `titleTr` | `String` | — |  |
| `titleEn` | `String` | default="" |  |
| `descTr` | `String` | — |  |
| `descEn` | `String` | default="" |  |
| `contentTr` | `String` | — |  |
| `contentEn` | `String` | default="" |  |
| `category` | `String` | default="genel" |  |
| `keywords` | `String[]` | default=[] |  |
| `metaDescription` | `String` | default="" |  |
| `coverImage` | `String` | default="" |  |
| `readTime` | `Int` | default=5 |  |
| `views` | `Int` | default=0 |  |
| `likes` | `Int` | default=0 |  |
| `isPublished` | `Boolean` | default=false |  |
| `isFeatured` | `Boolean` | default=false |  |
| `isTrending` | `Boolean` | default=false |  |
| `isEditorPick` | `Boolean` | default=false |  |
| `isAiGenerated` | `Boolean` | default=false |  |
| `isPremium` | `Boolean` | default=false |  |
| `zodiacSign` | `String` | default="" |  |
| `authorId` | `String?` | — |  |
| `authorName` | `String` | default="Canlifal Editör" |  |
| `publishedAt` | `DateTime?` | — |  |
| `scheduledAt` | `DateTime?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([isPublished])`
- `@@index([category])`
- `@@index([slug])`
- `@@index([isFeatured])`
- `@@index([isTrending])`
- `@@index([views])`
- `@@index([publishedAt])`
- `@@index([isPremium])`
- `@@index([zodiacSign])`


### <a name="model-blogcomment"></a>`BlogComment` → tablo `blog_comments`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `postId` | `String` | — |  |
| `userId` | `String` | — |  |
| `userName` | `String` | default="Anonim" |  |
| `userAvatar` | `String` | default="" |  |
| `content` | `String` | — |  |
| `isApproved` | `Boolean` | default=true |  |
| `likes` | `Int` | default=0 |  |
| `parentId` | `String?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([postId])`
- `@@index([userId])`
- `@@index([parentId])`


### <a name="model-bloglike"></a>`BlogLike` → tablo `blog_likes`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `postId` | `String` | — |  |
| `userId` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@unique([postId, userId])`
- `@@index([postId])`


### <a name="model-blogfavorite"></a>`BlogFavorite` → tablo `blog_favorites`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `postId` | `String` | — |  |
| `userId` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@unique([postId, userId])`
- `@@index([postId])`
- `@@index([userId])`


### <a name="model-usergameprofile"></a>`UserGameProfile` → tablo `user_game_profiles`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | unique |  |
| `totalJetons` | `Int` | default=0 | lifetime jetons earned from games |
| `totalGames` | `Int` | default=0 |  |
| `level` | `Int` | default=1 |  |
| `levelTitle` | `String` | default="Yeni Üye" |  |
| `dailySpinsUsed` | `Int` | default=0 | daily free spin count |
| `lastSpinDate` | `DateTime?` | — |  |
| `referralCode` | `String?` | unique |  |
| `referralCount` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([userId])`
- `@@index([totalJetons])`


### <a name="model-broadcastimage"></a>`BroadcastImage` → tablo `broadcast_images`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | — | Display name for the image |
| `imageUrl` | `String` | — | URL to the image |
| `sortOrder` | `Int` | default=0 |  |
| `isActive` | `Boolean` | default=true |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([isActive, sortOrder])`


### <a name="model-custombadge"></a>`CustomBadge` → tablo `custom_badges`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | — | Badge display name |
| `icon` | `String` | — | Emoji or icon identifier |
| `color` | `String` | default="#fbbf24" | Badge color (hex) |
| `bgColor` | `String` | default="#78350f" | Background color (hex) |
| `description` | `String?` | — | Description of badge |
| `tier` | `String?` | — | If set, auto-assigned to this membership tier (basic, premium, gold, diamond) |
| `userId` | `String?` | — | If set, assigned to specific user |
| `isActive` | `Boolean` | default=true |  |
| `sortOrder` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([tier])`
- `@@index([userId])`
- `@@index([isActive])`


### <a name="model-sitepage"></a>`SitePage` → tablo `site_pages`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `title` | `String` | — | Page title |
| `titleEn` | `String?` | — | English title |
| `slug` | `String` | unique | URL slug |
| `content` | `String` | — | HTML content |
| `contentEn` | `String?` | — | English content |
| `isPublished` | `Boolean` | default=true |  |
| `showInFooter` | `Boolean` | default=true |  |
| `showInHeader` | `Boolean` | default=false |  |
| `sortOrder` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([slug])`
- `@@index([isPublished])`
- `@@index([sortOrder])`


### <a name="model-pushnotificationlog"></a>`PushNotificationLog` → tablo `push_notification_logs`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `onesignalId` | `String?` | — | OneSignal notification ID for tracking |
| `title` | `String` | — |  |
| `message` | `String` | — |  |
| `url` | `String?` | — |  |
| `imageUrl` | `String?` | — |  |
| `targetType` | `String` | — | all, segment, tag, player_id, quick_action |
| `targetValue` | `String?` | — | segment name, tag filter, player_id, etc. |
| `scheduledAt` | `DateTime?` | — | null = sent immediately |
| `status` | `String` | default="sent" | sent, scheduled, failed, cancelled |
| `recipientCount` | `Int` | default=0 |  |
| `deliveredCount` | `Int` | default=0 |  |
| `clickedCount` | `Int` | default=0 |  |
| `errorMessage` | `String?` | — |  |
| `createdBy` | `String` | — | admin user id |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([status])`
- `@@index([createdAt])`
- `@@index([targetType])`


### <a name="model-userdevice"></a>`UserDevice` → tablo `user_devices`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `token` | `String` | — | FCM or APNs token |
| `platform` | `String` | default="android" | android | ios | web |
| `appVersion` | `String?` | — | e.g. "1.2.3" |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([userId, token])`
- `@@index([userId])`
- `@@index([token])`


### <a name="model-dreaminterpretation"></a>`DreamInterpretation` → tablo `dream_interpretations`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `title` | `String` | — |  |
| `slug` | `String` | unique |  |
| `content` | `String` | — |  |
| `summary` | `String?` | — |  |
| `keywords` | `String[]` | default=[] |  |
| `metaDescription` | `String?` | — |  |
| `category` | `String` | default="genel" |  |
| `views` | `Int` | default=0 |  |
| `isPublished` | `Boolean` | default=true |  |
| `isAiGenerated` | `Boolean` | default=false |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `comments` | `DreamComment[]` | — |  |
| `favorites` | `DreamFavorite[]` | — |  |
| `dreamViews` | `DreamView[]` | — |  |

**Index/Unique:**

- `@@index([slug])`
- `@@index([views])`
- `@@index([createdAt])`
- `@@index([isPublished])`
- `@@index([category])`


### <a name="model-dreamcomment"></a>`DreamComment` → tablo `dream_comments`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `content` | `String` | — |  |
| `userId` | `String` | — |  |
| `dreamId` | `String` | — |  |
| `experienceType` | `String` | default="yorum" | yorum | deneyim |
| `didComeTrue` | `Boolean?` | — | null = belirtilmedi, true = gerçekleşti, false = gerçekleşmedi |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |
| `dream` | `DreamInterpretation` | fields: [dreamId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([dreamId, createdAt])`
- `@@index([userId])`
- `@@index([experienceType])`


### <a name="model-dreamfavorite"></a>`DreamFavorite` → tablo `dream_favorites`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `dreamId` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |
| `dream` | `DreamInterpretation` | fields: [dreamId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([userId, dreamId])`
- `@@index([userId])`
- `@@index([dreamId])`


### <a name="model-dreamview"></a>`DreamView` → tablo `dream_views`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `dreamId` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |
| `dream` | `DreamInterpretation` | fields: [dreamId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([userId, createdAt])`
- `@@index([dreamId])`


### <a name="model-dreamsymbol"></a>`DreamSymbol` → tablo `dream_symbols`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | unique |  |
| `slug` | `String` | unique |  |
| `letter` | `String` | — | First letter for A-Z grouping |
| `meaning` | `String` | — |  |
| `detailedMeaning` | `String?` | — |  |
| `relatedSymbols` | `String[]` | default=[] |  |
| `isPublished` | `Boolean` | default=true |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([letter])`
- `@@index([slug])`
- `@@index([isPublished])`


### <a name="model-dreamdiaryentry"></a>`DreamDiaryEntry` → tablo `dream_diary_entries`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `dreamDate` | `DateTime` | — |  |
| `title` | `String` | — |  |
| `content` | `String` | — |  |
| `symbols` | `String[]` | default=[] |  |
| `mood` | `String?` | — | happy, sad, scared, confused, neutral |
| `lucidity` | `Int?` | — | 1-5 lucidity scale |
| `aiAnalysis` | `String?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([userId, dreamDate])`
- `@@index([userId, dreamDate])`
- `@@index([createdAt])`


### <a name="model-dailyloginreward"></a>`DailyLoginReward` → tablo `daily_login_rewards`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `rewardDate` | `DateTime` | — |  |
| `streak` | `Int` | default=1 |  |
| `xpEarned` | `Int` | default=10 |  |
| `jetonEarned` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([userId, rewardDate])`
- `@@index([userId])`


### <a name="model-dreamcontest"></a>`DreamContest` → tablo `dream_contests`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `title` | `String` | — |  |
| `description` | `String` | — |  |
| `dreamPrompt` | `String` | — |  |
| `startDate` | `DateTime` | — |  |
| `endDate` | `DateTime` | — |  |
| `isActive` | `Boolean` | default=true |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `entries` | `DreamContestEntry[]` | — |  |

**Index/Unique:**

- `@@index([isActive])`
- `@@index([endDate])`


### <a name="model-dreamcontestentry"></a>`DreamContestEntry` → tablo `dream_contest_entries`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `contestId` | `String` | — |  |
| `userId` | `String` | — |  |
| `interpretation` | `String` | — |  |
| `voteCount` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `contest` | `DreamContest` | fields: [contestId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |
| `votes` | `DreamContestVote[]` | — |  |

**Index/Unique:**

- `@@unique([contestId, userId])`
- `@@index([contestId, voteCount])`
- `@@index([userId])`


### <a name="model-dreamcontestvote"></a>`DreamContestVote` → tablo `dream_contest_votes`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `entryId` | `String` | — |  |
| `userId` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `entry` | `DreamContestEntry` | fields: [entryId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([entryId, userId])`
- `@@index([entryId])`
- `@@index([userId])`


### <a name="model-weeklydreamreport"></a>`WeeklyDreamReport` → tablo `weekly_dream_reports`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `weekStart` | `DateTime` | — |  |
| `weekEnd` | `DateTime` | — |  |
| `reportContent` | `String` | — |  |
| `dreamCount` | `Int` | default=0 |  |
| `topSymbols` | `String[]` | default=[] |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([userId, weekStart])`
- `@@index([userId])`


### <a name="model-onlinefalsection"></a>`OnlineFalSection` → tablo `online_fal_sections`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `key` | `String` | unique | e.g. "fortune_types", "bana_ozel", "custom_buttons" |
| `title` | `String` | — | Display title |
| `icon` | `String` | default="✨" | Emoji icon |
| `isVisible` | `Boolean` | default=true |  |
| `sortOrder` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([sortOrder])`


### <a name="model-onlinefalbutton"></a>`OnlineFalButton` → tablo `online_fal_buttons`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `label` | `String` | — | Button label |
| `icon` | `String` | default="🔗" | Emoji icon |
| `href` | `String` | — | Destination URL/path |
| `isVisible` | `Boolean` | default=true |  |
| `sortOrder` | `Int` | default=0 |  |
| `bgColor` | `String` | default="from-purple-600/30 to-fuchsia-600/30" | Gradient classes |
| `borderColor` | `String` | default="border-purple-400/50" | Border class |
| `textColor` | `String` | default="text-purple-200" | Text color class |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([sortOrder])`


### <a name="model-homepagebutton"></a>`HomepageButton` → tablo `homepage_buttons`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `key` | `String` | unique | unique identifier e.g. "games", "gifts", "custom_1" |
| `label` | `String` | — | Display label |
| `icon` | `String` | default="🔗" | Emoji icon |
| `href` | `String` | — | Destination URL/path (relative) |
| `isVisible` | `Boolean` | default=true |  |
| `sortOrder` | `Int` | default=0 |  |
| `specialBehavior` | `String?` | — | null for normal link, "bana-ozel" for popup, "teller" for role-based |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([sortOrder])`


### <a name="model-adminpopup"></a>`AdminPopup` → tablo `admin_popups`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `title` | `String` | — | Popup title/heading |
| `message` | `String` | — | Main message text |
| `buttons` | `String` | default="[]" | JSON array: [{label, href, color?}] |
| `isActive` | `Boolean` | default=true |  |
| `showTo` | `String` | default="all" | all, logged_in, guests |
| `popupType` | `String` | default="custom" | custom, live_streams, chat_rooms |
| `priority` | `Int` | default=0 | higher = shown first |
| `maxShowCount` | `Int` | default=1 | 0 = unlimited, otherwise max times per user |
| `showOnRefresh` | `Boolean` | default=false | false = show only once per session (tab) |
| `showDelaySeconds` | `Int` | default=1 | seconds to wait before showing popup |
| `lastSentAt` | `DateTime` | default=now( | Updated when admin re-sends popup |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([isActive, priority])`
- `@@index([isActive, lastSentAt])`


### <a name="model-profileframe"></a>`ProfileFrame` → tablo `profile_frames`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | — | Frame display name |
| `imageUrl` | `String` | — | URL to frame image (PNG with transparency) |
| `tier` | `String` | default="gold" | free, gold, admin_only |
| `isActive` | `Boolean` | default=true |  |
| `sortOrder` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `usersSelected` | `User[]` | "UserProfileFrame" |  |
| `usersAssigned` | `User[]` | "UserAdminFrame" |  |

**Index/Unique:**

- `@@index([tier, isActive])`


### <a name="model-membershipbadge"></a>`MembershipBadge` → tablo `membership_badges`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | — | Display name (e.g., "Gold Şerit", "Premium Rozet") |
| `tier` | `String` | — | basic, premium, gold, diamond, admin |
| `imageUrl` | `String` | — | URL to banner/ribbon image |
| `isActive` | `Boolean` | default=true |  |
| `sortOrder` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([tier, isActive])`


### <a name="model-ipfortuneusage"></a>`IpFortuneUsage` → tablo `ip_fortune_usage`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `ipAddress` | `String` | — |  |
| `date` | `DateTime` | — | Date only (no time) |
| `count` | `Int` | default=1 | Number of fortunes used today |
| `adWatched` | `Boolean` | default=false | Whether ad was watched for 2nd fortune |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@unique([ipAddress, date])`
- `@@index([ipAddress])`
- `@@index([date])`


### <a name="model-adnetwork"></a>`AdNetwork` → tablo `ad_networks`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | — | Display name (Google AdSense, Unity Ads, etc.) |
| `provider` | `String` | unique | google_adsense, google_admob, unity_ads, facebook_audience, applovin, ironsource, vungle, chartboost, adcolony, tapjoy, mintegral, inmobi, startio |
| `adCode` | `String?` | — | Ad code/script from the provider |
| `adUnitId` | `String?` | — | Ad unit/slot ID |
| `appId` | `String?` | — | App ID (for SDK-based networks) |
| `isActive` | `Boolean` | default=false |  |
| `sortOrder` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([isActive])`


### <a name="model-currencyconfig"></a>`CurrencyConfig` → tablo `currency_config`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `area` | `String` | unique | fortune_tarot, fortune_coffee, live_session, live_gift, chat_gift, stream_gift, bana_ozel etc. |
| `areaName` | `String` | — | Display name in Turkish |
| `currencyType` | `String` | default="cfc" | cfc, jeton, free |
| `cost` | `Int` | default=0 | Cost in the specified currency |
| `isActive` | `Boolean` | default=true |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([currencyType])`


### <a name="model-liveactivity"></a>`LiveActivity` → tablo `live_activities`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String?` | — | null for anonymous users |
| `userName` | `String` | — | display name (can be anonymous) |
| `userAvatar` | `String?` | — | avatar URL |
| `activityType` | `String` | — | fortune_read, chat_join, dream_shared, stream_started, gift_sent, signup, blog_read, etc. |
| `detail` | `String?` | — | e.g. "Tarot Falı baktırdı", "Sohbete katıldı" |
| `targetUrl` | `String?` | — | link to related page |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User?` | "userActivities", fields: [userId], references: [id], onDelete: SetNull |  |

**Index/Unique:**

- `@@index([createdAt])`
- `@@index([activityType])`


### <a name="model-activityfeedconfig"></a>`ActivityFeedConfig` → tablo `activity_feed_config`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `isEnabled` | `Boolean` | default=true |  |
| `maxItems` | `Int` | default=20 | max items to show |
| `visibleToGuests` | `Boolean` | default=true | kayıtsız kullanıcılar |
| `visibleToBasic` | `Boolean` | default=true | basic üyeler |
| `visibleToPremium` | `Boolean` | default=true | premium üyeler |
| `visibleToGold` | `Boolean` | default=true | gold üyeler |
| `visibleToDiamond` | `Boolean` | default=true | diamond üyeler |
| `visibleToModerator` | `Boolean` | default=true | moderatörler |
| `visibleToAdmin` | `Boolean` | default=true | adminler |
| `specificUserIds` | `String?` | — | comma-separated user IDs |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |


### <a name="model-agency"></a>`Agency` → tablo `agencies`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | unique |  |
| `description` | `String?` | — |  |
| `ownerId` | `String` | — | User who applied |
| `ownerName` | `String` | — |  |
| `status` | `String` | default="pending" | pending, approved, rejected, suspended |
| `commissionRate` | `Float` | default=5.0 | Agency commission % on member earnings |
| `contactEmail` | `String?` | — |  |
| `contactPhone` | `String?` | — |  |
| `logoUrl` | `String?` | — |  |
| `totalEarnings` | `Float` | default=0 |  |
| `totalMembers` | `Int` | default=0 |  |
| `activeMembers` | `Int` | default=0 |  |
| `performanceScore` | `Float` | default=0 | APS: 0-100 |
| `penaltyLevel` | `Int` | default=0 | 0=clean, 1=warning, 2=invites_disabled, 3=commission_reduced, 4=suspended |
| `penaltyNote` | `String?` | — |  |
| `invitesDisabled` | `Boolean` | default=false |  |
| `approvedAt` | `DateTime?` | — |  |
| `rejectedAt` | `DateTime?` | — |  |
| `rejectedReason` | `String?` | — |  |
| `suspendedAt` | `DateTime?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `members` | `AgencyUser[]` | — |  |
| `earnings` | `AgencyEarning[]` | — |  |
| `inviteCodes` | `InviteCode[]` | — |  |
| `tasks` | `AgencyTask[]` | — |  |
| `penalties` | `AgencyPenalty[]` | — |  |
| `leaveRequests` | `AgencyLeaveRequest[]` | — |  |

**Index/Unique:**

- `@@index([ownerId])`
- `@@index([status])`
- `@@index([createdAt])`


### <a name="model-agencyuser"></a>`AgencyUser` → tablo `agency_users`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `agencyId` | `String` | — |  |
| `userId` | `String` | unique | One user can only be in one agency |
| `role` | `String` | default="member" | owner, manager, member |
| `joinedVia` | `String?` | — | invite_code, referral_link, direct |
| `inviteCodeId` | `String?` | — |  |
| `totalEarnings` | `Float` | default=0 | Total earnings contributed to agency |
| `isActive` | `Boolean` | default=true |  |
| `joinedAt` | `DateTime` | default=now( |  |
| `leftAt` | `DateTime?` | — |  |
| `joinIp` | `String?` | — |  |
| `joinDeviceId` | `String?` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `agency` | `Agency` | fields: [agencyId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |
| `inviteCode` | `InviteCode?` | fields: [inviteCodeId], references: [id] |  |

**Index/Unique:**

- `@@index([agencyId])`
- `@@index([userId])`
- `@@index([isActive])`


### <a name="model-agencyearning"></a>`AgencyEarning` → tablo `agency_earnings`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `agencyId` | `String` | — |  |
| `userId` | `String` | — | The member who generated the earning |
| `amount` | `Float` | — | Commission amount earned by agency |
| `sourceType` | `String` | — | chat_gift, stream_gift, direct_gift, tip, bonus |
| `sourceId` | `String?` | — | Gift/transaction ID |
| `originalAmount` | `Float` | — | Original gift amount before commission |
| `commissionRate` | `Float` | — | Rate applied at the time |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `agency` | `Agency` | fields: [agencyId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([agencyId])`
- `@@index([userId])`
- `@@index([createdAt])`
- `@@index([sourceType])`


### <a name="model-invitecode"></a>`InviteCode` → tablo `invite_codes`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `agencyId` | `String` | — |  |
| `code` | `String` | unique |  |
| `createdById` | `String` | — | User who created the code |
| `maxUses` | `Int` | default=0 | 0 = unlimited |
| `usedCount` | `Int` | default=0 |  |
| `isActive` | `Boolean` | default=true |  |
| `expiresAt` | `DateTime?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `agency` | `Agency` | fields: [agencyId], references: [id], onDelete: Cascade |  |
| `usedBy` | `AgencyUser[]` | — |  |

**Index/Unique:**

- `@@index([agencyId])`
- `@@index([code])`


### <a name="model-agencytask"></a>`AgencyTask` → tablo `agency_tasks`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `agencyId` | `String` | — |  |
| `weekStart` | `DateTime` | — | Monday of the task week |
| `weekEnd` | `DateTime` | — | Sunday of the task week |
| `earningsTarget` | `Float` | default=0 |  |
| `newUsersTarget` | `Int` | default=0 |  |
| `activeUsersTarget` | `Int` | default=0 |  |
| `earningsActual` | `Float` | default=0 |  |
| `newUsersActual` | `Int` | default=0 |  |
| `activeUsersActual` | `Int` | default=0 |  |
| `completionPercent` | `Float` | default=0 |  |
| `bonusAwarded` | `Float` | default=0 |  |
| `status` | `String` | default="active" | active, completed, failed |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `agency` | `Agency` | fields: [agencyId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([agencyId, weekStart])`
- `@@index([agencyId])`
- `@@index([weekStart])`
- `@@index([status])`


### <a name="model-agencypenalty"></a>`AgencyPenalty` → tablo `agency_penalties`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `agencyId` | `String` | — |  |
| `level` | `Int` | — | 1=warning, 2=disable_invites, 3=reduce_commission, 4=suspend |
| `reason` | `String` | — |  |
| `appliedBy` | `String?` | — | Admin userId or 'system' |
| `isActive` | `Boolean` | default=true |  |
| `resolvedAt` | `DateTime?` | — |  |
| `resolvedBy` | `String?` | — |  |
| `resolvedNote` | `String?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `agency` | `Agency` | fields: [agencyId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([agencyId])`
- `@@index([isActive])`


### <a name="model-agencyleaverequest"></a>`AgencyLeaveRequest` → tablo `agency_leave_requests`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `agencyId` | `String` | — |  |
| `userId` | `String` | — |  |
| `reason` | `String?` | — |  |
| `status` | `String` | default="pending" | pending, approved, rejected |
| `reviewedBy` | `String?` | — | Agency owner/manager who reviewed |
| `reviewNote` | `String?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |
| `reviewedAt` | `DateTime?` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `agency` | `Agency` | fields: [agencyId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([agencyId])`
- `@@index([userId])`
- `@@index([status])`


### <a name="model-weeklytournament"></a>`WeeklyTournament` → tablo `weekly_tournaments`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `weekStart` | `DateTime` | — |  |
| `weekEnd` | `DateTime` | — |  |
| `type` | `String` | default="jeton_spend" | jeton_spend, session_count, gift_sent, fortune_count |
| `title` | `String` | — |  |
| `description` | `String?` | — |  |
| `status` | `String` | default="active" | active, completed |
| `rewards` | `String?` | — | JSON: [{ rank: 1, prize: 500 }, ...] |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `entries` | `WeeklyTournamentEntry[]` | — |  |

**Index/Unique:**

- `@@unique([weekStart, type])`
- `@@index([status])`


### <a name="model-weeklytournamententry"></a>`WeeklyTournamentEntry` → tablo `weekly_tournament_entries`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `tournamentId` | `String` | — |  |
| `userId` | `String` | — |  |
| `score` | `Int` | default=0 |  |
| `rank` | `Int?` | — |  |
| `rewarded` | `Boolean` | default=false |  |
| `updatedAt` | `DateTime` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `tournament` | `WeeklyTournament` | fields: [tournamentId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([tournamentId, userId])`
- `@@index([tournamentId])`
- `@@index([userId])`


### <a name="model-favoriteteller"></a>`FavoriteTeller` → tablo `favorite_tellers`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `tellerId` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@unique([userId, tellerId])`
- `@@index([userId])`
- `@@index([tellerId])`


### <a name="model-celebrity"></a>`Celebrity` → tablo `celebrities`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | — |  |
| `slug` | `String` | unique |  |
| `category` | `String` | — | oyuncu, sarkici, futbolcu, youtuber, influencer, yonetmen, diger |
| `bio` | `String?` | — |  |
| `profileImage` | `String?` | — |  |
| `coverImage` | `String?` | — |  |
| `isVerified` | `Boolean` | default=true |  |
| `isActive` | `Boolean` | default=true |  |
| `followerCount` | `Int` | default=0 |  |
| `birthDate` | `DateTime?` | — |  |
| `birthPlace` | `String?` | — |  |
| `zodiacSign` | `String?` | — |  |
| `socialLinks` | `String?` | — | JSON: {instagram, twitter, youtube, tiktok, website} |
| `achievements` | `String?` | — | JSON array of notable achievements |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `followers` | `CelebrityFollow[]` | — |  |
| `fanClub` | `FanClub?` | — |  |
| `posts` | `CelebrityPost[]` | — |  |

**Index/Unique:**

- `@@index([category])`
- `@@index([isActive])`
- `@@index([followerCount])`
- `@@index([slug])`


### <a name="model-celebrityfollow"></a>`CelebrityFollow` → tablo `celebrity_follows`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `celebrityId` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |
| `celebrity` | `Celebrity` | fields: [celebrityId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([userId, celebrityId])`
- `@@index([userId])`
- `@@index([celebrityId])`


### <a name="model-fanclub"></a>`FanClub` → tablo `fan_clubs`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `celebrityId` | `String` | unique |  |
| `description` | `String?` | — |  |
| `rules` | `String?` | — | JSON array of rules |
| `coverImage` | `String?` | — |  |
| `memberCount` | `Int` | default=0 |  |
| `isActive` | `Boolean` | default=true |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `celebrity` | `Celebrity` | fields: [celebrityId], references: [id], onDelete: Cascade |  |
| `members` | `FanClubMember[]` | — |  |
| `posts` | `FanClubPost[]` | — |  |
| `polls` | `FanClubPoll[]` | — |  |

**Index/Unique:**

- `@@index([isActive])`


### <a name="model-fanclubmember"></a>`FanClubMember` → tablo `fan_club_members`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `fanClubId` | `String` | — |  |
| `userId` | `String` | — |  |
| `role` | `String` | default="member" | member, moderator |
| `xp` | `Int` | default=0 |  |
| `level` | `String` | default="yeni_fan" | yeni_fan, aktif_fan, super_fan, vip_fan, efsane_fan |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `fanClub` | `FanClub` | fields: [fanClubId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([fanClubId, userId])`
- `@@index([fanClubId])`
- `@@index([userId])`


### <a name="model-fanclubpoll"></a>`FanClubPoll` → tablo `fan_club_polls`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `fanClubId` | `String` | — |  |
| `userId` | `String` | — |  |
| `question` | `String` | — |  |
| `options` | `Json` | — | Array of { text: string } |
| `isActive` | `Boolean` | default=true |  |
| `endsAt` | `DateTime?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `fanClub` | `FanClub` | fields: [fanClubId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |
| `votes` | `FanClubPollVote[]` | — |  |

**Index/Unique:**

- `@@index([fanClubId, isActive])`
- `@@index([userId])`


### <a name="model-fanclubpollvote"></a>`FanClubPollVote` → tablo `fan_club_poll_votes`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `pollId` | `String` | — |  |
| `userId` | `String` | — |  |
| `optionIndex` | `Int` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `poll` | `FanClubPoll` | fields: [pollId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([pollId, userId])`
- `@@index([pollId])`
- `@@index([userId])`


### <a name="model-fanclubpost"></a>`FanClubPost` → tablo `fan_club_posts`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `fanClubId` | `String` | — |  |
| `userId` | `String` | — |  |
| `content` | `String` | — |  |
| `image` | `String?` | — |  |
| `likeCount` | `Int` | default=0 |  |
| `isPinned` | `Boolean` | default=false |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `fanClub` | `FanClub` | fields: [fanClubId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |
| `likes` | `FanClubPostLike[]` | — |  |

**Index/Unique:**

- `@@index([fanClubId, createdAt])`
- `@@index([userId])`


### <a name="model-fanclubpostlike"></a>`FanClubPostLike` → tablo `fan_club_post_likes`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `postId` | `String` | — |  |
| `userId` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `post` | `FanClubPost` | fields: [postId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([postId, userId])`
- `@@index([postId])`
- `@@index([userId])`


### <a name="model-trendingtopic"></a>`TrendingTopic` → tablo `trending_topics`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `title` | `String` | — | Topic title |
| `slug` | `String` | unique |  |
| `category` | `String` | — | burc, fal, unlu, genel, oyun, etkinlik |
| `description` | `String?` | — |  |
| `image` | `String?` | — | Cover image URL |
| `icon` | `String?` | — | Emoji or icon |
| `trendScore` | `Int` | default=0 | Calculated popularity score |
| `viewCount` | `Int` | default=0 |  |
| `likeCount` | `Int` | default=0 |  |
| `isActive` | `Boolean` | default=true |  |
| `isPinned` | `Boolean` | default=false | Admin pinned |
| `relatedUrl` | `String?` | — | Link to related page |
| `tags` | `String?` | — | JSON array of tags |
| `startDate` | `DateTime` | default=now( |  |
| `endDate` | `DateTime?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([category])`
- `@@index([isActive, trendScore])`
- `@@index([isPinned])`


### <a name="model-celebritypost"></a>`CelebrityPost` → tablo `celebrity_posts`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `celebrityId` | `String` | — |  |
| `platform` | `String` | — | instagram, x, youtube, tiktok |
| `postType` | `String` | default="photo" | photo, video, reel, story, tweet, short |
| `content` | `String?` | — |  |
| `mediaUrl` | `String?` | — | Image or video thumbnail URL |
| `externalUrl` | `String?` | — | Link to original post |
| `likeCount` | `Int` | default=0 |  |
| `commentCount` | `Int` | default=0 |  |
| `isActive` | `Boolean` | default=true |  |
| `isPinned` | `Boolean` | default=false |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `celebrity` | `Celebrity` | fields: [celebrityId], references: [id], onDelete: Cascade |  |
| `likes` | `CelebrityPostLike[]` | — |  |
| `comments` | `CelebrityPostComment[]` | — |  |

**Index/Unique:**

- `@@index([celebrityId, createdAt])`
- `@@index([platform])`
- `@@index([isActive])`
- `@@index([isPinned])`


### <a name="model-celebritypostlike"></a>`CelebrityPostLike` → tablo `celebrity_post_likes`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `postId` | `String` | — |  |
| `userId` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `post` | `CelebrityPost` | fields: [postId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([postId, userId])`
- `@@index([postId])`
- `@@index([userId])`


### <a name="model-celebritypostcomment"></a>`CelebrityPostComment` → tablo `celebrity_post_comments`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `postId` | `String` | — |  |
| `userId` | `String` | — |  |
| `content` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `post` | `CelebrityPost` | fields: [postId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([postId, createdAt])`
- `@@index([userId])`


### <a name="model-userstory"></a>`UserStory` → tablo `user_stories`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `mediaUrl` | `String` | — |  |
| `mediaType` | `String` | default="image" | image or video |
| `caption` | `String?` | — |  |
| `viewCount` | `Int` | default=0 |  |
| `isActive` | `Boolean` | default=true |  |
| `expiresAt` | `DateTime` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([userId, isActive, expiresAt])`
- `@@index([expiresAt])`


### <a name="model-trendvideocategory"></a>`TrendVideoCategory` → tablo `trend_video_categories`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `title` | `String` | — |  |
| `slug` | `String` | unique |  |
| `description` | `String?` | — |  |
| `sortOrder` | `Int` | default=0 |  |
| `isActive` | `Boolean` | default=true |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `videos` | `TrendVideo[]` | — |  |

**Index/Unique:**

- `@@index([isActive, sortOrder])`


### <a name="model-trendvideo"></a>`TrendVideo` → tablo `trend_videos`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `categoryId` | `String` | — |  |
| `title` | `String` | — |  |
| `youtubeId` | `String` | — | YouTube video ID |
| `thumbnailUrl` | `String?` | — | YouTube thumbnail |
| `channelName` | `String?` | — |  |
| `duration` | `String?` | — | e.g. "12:34" |
| `viewCount` | `Int` | default=0 |  |
| `sortOrder` | `Int` | default=0 |  |
| `isActive` | `Boolean` | default=true |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `category` | `TrendVideoCategory` | fields: [categoryId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([categoryId, sortOrder])`
- `@@index([isActive, createdAt])`


### <a name="model-tiktokcategory"></a>`TikTokCategory` → tablo `tiktok_categories`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `title` | `String` | — |  |
| `slug` | `String` | unique |  |
| `description` | `String?` | — |  |
| `sortOrder` | `Int` | default=0 |  |
| `isActive` | `Boolean` | default=true |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `videos` | `TikTokVideo[]` | — |  |

**Index/Unique:**

- `@@index([isActive, sortOrder])`


### <a name="model-tiktokvideo"></a>`TikTokVideo` → tablo `tiktok_videos`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `tiktokUrl` | `String` | — | Full TikTok video URL |
| `tiktokId` | `String?` | — | Extracted video ID |
| `title` | `String?` | — |  |
| `authorName` | `String?` | — |  |
| `authorAvatar` | `String?` | — |  |
| `thumbnailUrl` | `String?` | — |  |
| `embedHtml` | `String?` | — |  |
| `categoryId` | `String?` | — |  |
| `sortOrder` | `Int` | default=0 |  |
| `isActive` | `Boolean` | default=true |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `category` | `TikTokCategory?` | fields: [categoryId], references: [id] |  |

**Index/Unique:**

- `@@index([isActive, sortOrder])`
- `@@index([categoryId])`


### <a name="model-cfcpaymentrequest"></a>`CfcPaymentRequest` → tablo `cfc_payment_requests`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `amount` | `Int` | — | CFC amount requested |
| `method` | `String` | — | whatsapp, papara, bank_transfer |
| `senderInfo` | `String?` | — | Sender name or phone for verification |
| `notes` | `String?` | — |  |
| `status` | `String` | default="pending" | pending, approved, rejected |
| `reviewedBy` | `String?` | — | Admin user id who reviewed |
| `reviewNote` | `String?` | — | Admin note on approval/rejection |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([userId])`
- `@@index([status])`
- `@@index([createdAt])`


### <a name="model-shortvideo"></a>`ShortVideo` → tablo `short_videos`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `videoUrl` | `String` | — | R2/CDN full URL |
| `thumbnailUrl` | `String?` | — | R2/CDN thumbnail URL |
| `description` | `String?` | — |  |
| `durationSec` | `Float?` | — |  |
| `viewsCount` | `Int` | default=0 |  |
| `likesCount` | `Int` | default=0 |  |
| `commentsCount` | `Int` | default=0 |  |
| `sharesCount` | `Int` | default=0 |  |
| `savesCount` | `Int` | default=0 |  |
| `visibility` | `String` | default="everyone" |  |
| `commentSetting` | `String` | default="everyone" |  |
| `allowDuet` | `Boolean` | default=true |  |
| `locationName` | `String?` | — |  |
| `locationLat` | `Float?` | — |  |
| `locationLng` | `Float?` | — |  |
| `musicId` | `String?` | — |  |
| `duetOfId` | `String?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |
| `music` | `ShortVideoMusic?` | fields: [musicId], references: [id], onDelete: SetNull |  |
| `duetOf` | `ShortVideo?` | "Duet", fields: [duetOfId], references: [id], onDelete: SetNull |  |
| `duets` | `ShortVideo[]` | "Duet" |  |
| `likes` | `ShortVideoLike[]` | — |  |
| `comments` | `ShortVideoComment[]` | — |  |
| `views` | `ShortVideoView[]` | — |  |
| `saves` | `ShortVideoSave[]` | — |  |
| `mentions` | `ShortVideoMention[]` | — |  |
| `hashtags` | `ShortVideoHashtag[]` | — |  |

**Index/Unique:**

- `@@index([createdAt(sort: Desc)])`
- `@@index([userId, createdAt(sort: Desc)])`
- `@@index([visibility, createdAt(sort: Desc)])`
- `@@index([musicId])`
- `@@index([duetOfId])`


### <a name="model-shortvideolike"></a>`ShortVideoLike` → tablo `short_video_likes`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `videoId` | `String` | — |  |
| `userId` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `video` | `ShortVideo` | fields: [videoId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([videoId, userId])`
- `@@index([videoId])`
- `@@index([userId])`


### <a name="model-shortvideocomment"></a>`ShortVideoComment` → tablo `short_video_comments`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `videoId` | `String` | — |  |
| `userId` | `String` | — |  |
| `content` | `String` | — |  |
| `likesCount` | `Int` | default=0 |  |
| `isPinned` | `Boolean` | default=false |  |
| `parentId` | `String?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `video` | `ShortVideo` | fields: [videoId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |
| `parent` | `ShortVideoComment?` | "CommentReplies", fields: [parentId], references: [id], onDelete: Cascade |  |
| `replies` | `ShortVideoComment[]` | "CommentReplies" |  |
| `likes` | `ShortVideoCommentLike[]` | — |  |

**Index/Unique:**

- `@@index([videoId, createdAt(sort: Desc)])`
- `@@index([videoId, parentId, createdAt(sort: Desc)])`
- `@@index([parentId])`
- `@@index([userId])`


### <a name="model-shortvideoview"></a>`ShortVideoView` → tablo `short_video_views`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `videoId` | `String` | — |  |
| `userId` | `String` | — |  |
| `watchedSec` | `Float?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `video` | `ShortVideo` | fields: [videoId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([videoId, userId])`
- `@@index([videoId])`
- `@@index([userId])`


### <a name="model-shortvideosave"></a>`ShortVideoSave` → tablo `short_video_saves`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `videoId` | `String` | — |  |
| `userId` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `video` | `ShortVideo` | fields: [videoId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([videoId, userId])`
- `@@index([videoId])`
- `@@index([userId, createdAt(sort: Desc)])`


### <a name="model-shortvideocommentlike"></a>`ShortVideoCommentLike` → tablo `short_video_comment_likes`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `commentId` | `String` | — |  |
| `userId` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `comment` | `ShortVideoComment` | fields: [commentId], references: [id], onDelete: Cascade |  |
| `user` | `User` | fields: [userId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([commentId, userId])`
- `@@index([commentId])`
- `@@index([userId])`


### <a name="model-shortvideomention"></a>`ShortVideoMention` → tablo `short_video_mentions`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `videoId` | `String` | — |  |
| `mentionedUserId` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `video` | `ShortVideo` | fields: [videoId], references: [id], onDelete: Cascade |  |
| `mentionedUser` | `User` | "ShortVideoMentioned", fields: [mentionedUserId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([videoId, mentionedUserId])`
- `@@index([videoId])`
- `@@index([mentionedUserId])`


### <a name="model-hashtag"></a>`Hashtag` → tablo `hashtags`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | unique | '#' olmadan, küçük harf normalize |
| `videosCount` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `videos` | `ShortVideoHashtag[]` | — |  |

**Index/Unique:**

- `@@index([videosCount(sort: Desc)])`


### <a name="model-shortvideohashtag"></a>`ShortVideoHashtag` → tablo `short_video_hashtags`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `videoId` | `String` | — |  |
| `hashtagId` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `video` | `ShortVideo` | fields: [videoId], references: [id], onDelete: Cascade |  |
| `hashtag` | `Hashtag` | fields: [hashtagId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([videoId, hashtagId])`
- `@@index([hashtagId, createdAt(sort: Desc)])`
- `@@index([videoId])`


### <a name="model-shortvideomusic"></a>`ShortVideoMusic` → tablo `short_video_music`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `title` | `String` | — |  |
| `artist` | `String?` | — |  |
| `audioUrl` | `String` | — | R2/CDN URL |
| `coverUrl` | `String?` | — |  |
| `durationSec` | `Float?` | — |  |
| `usesCount` | `Int` | default=0 |  |
| `isActive` | `Boolean` | default=true |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `videos` | `ShortVideo[]` | — |  |

**Index/Unique:**

- `@@index([usesCount(sort: Desc)])`
- `@@index([isActive])`


### <a name="model-okeymatch"></a>`OkeyMatch` → tablo `okey_matches`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `mode` | `String` | — | "okey" | "okey101" |
| `tableName` | `String?` | — |  |
| `isPrivate` | `Boolean` | default=false |  |
| `hasPassword` | `Boolean` | default=false |  |
| `betAmount` | `Int` | default=0 |  |
| `betCurrency` | `String` | default="FREE" | FREE | credits | jeton |
| `commissionPct` | `Int` | default=0 |  |
| `potAmount` | `Int` | default=0 |  |
| `status` | `String` | default="finished" | finished | abandoned | cancelled |
| `winnerId` | `String?` | — |  |
| `winnerName` | `String?` | — |  |
| `reason` | `String?` | — | normal | timeout | abandon | server_recovery |
| `durationSec` | `Int` | default=0 |  |
| `roundCount` | `Int` | default=1 |  |
| `indicatorTile` | `String?` | — | gösterge |
| `okeyTile` | `String?` | — | okey taşı |
| `startedAt` | `DateTime` | default=now( |  |
| `finishedAt` | `DateTime` | default=now( |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `players` | `OkeyMatchPlayer[]` | — |  |

**Index/Unique:**

- `@@index([mode, status])`
- `@@index([winnerId])`
- `@@index([createdAt])`


### <a name="model-okeymatchplayer"></a>`OkeyMatchPlayer` → tablo `okey_match_players`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `matchId` | `String` | — |  |
| `userId` | `String` | — |  |
| `userName` | `String` | — |  |
| `seat` | `Int` | — | 0..3 |
| `isWinner` | `Boolean` | default=false |  |
| `score` | `Int` | default=0 |  |
| `penaltyScore` | `Int` | default=0 | Okey101 negative scoring |
| `betPaid` | `Int` | default=0 |  |
| `rewardWon` | `Int` | default=0 |  |
| `leftEarly` | `Boolean` | default=false |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `match` | `OkeyMatch` | fields: [matchId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([matchId])`
- `@@index([userId])`


### <a name="model-revenuerule"></a>`RevenueRule` → tablo `revenue_rules`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `context` | `String` | unique | live_stream | voice_room | video | short_video | fortune |
| `label` | `String` | — | human label, e.g. "Canlı Yayın" |
| `sitePercent` | `Int` | default=50 |  |
| `receiverPercent` | `Int` | default=50 | broadcaster / video owner / teller / room owner (when gift to owner) |
| `ownerCutOfRemainderPercent` | `Int` | default=30 | owner's cut of the (gross - site) remainder for seat gifts |
| `isActive` | `Boolean` | default=true |  |
| `updatedAt` | `DateTime` | default=now( |  |
| `createdAt` | `DateTime` | default=now( |  |


### <a name="model-giftevent"></a>`GiftEvent` → tablo `gift_events`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `idempotencyKey` | `String?` | unique | prevents double-processing / double-click |
| `giftTypeId` | `String` | — |  |
| `senderId` | `String` | — |  |
| `receiverId` | `String` | — |  |
| `context` | `String` | — | live_stream | voice_room | video | short_video | fortune |
| `contextId` | `String?` | — | streamId | roomId | videoId | tellerId |
| `quantity` | `Int` | default=1 |  |
| `grossAmount` | `Int` | — | total jetons spent (display value) |
| `siteAmount` | `Int` | default=0 |  |
| `receiverAmount` | `Int` | default=0 |  |
| `ownerAmount` | `Int` | default=0 |  |
| `ownerId` | `String?` | — | room owner (voice_room seat gifts) |
| `recipientIsOwner` | `Boolean` | default=false |  |
| `senderCity` | `String?` | — |  |
| `senderCountry` | `String?` | — |  |
| `battleId` | `String?` | — | if sent during a gift battle |
| `status` | `String` | default="completed" | completed | refunded | cancelled |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `giftType` | `GiftType` | fields: [giftTypeId], references: [id] |  |

**Index/Unique:**

- `@@index([senderId, createdAt])`
- `@@index([receiverId, createdAt])`
- `@@index([context, createdAt])`
- `@@index([giftTypeId])`
- `@@index([battleId])`
- `@@index([createdAt])`


### <a name="model-giftbattle"></a>`GiftBattle` → tablo `gift_battles`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `context` | `String` | — | live_stream | voice_room |
| `contextId` | `String` | — | streamId | roomId |
| `createdById` | `String` | — |  |
| `status` | `String` | default="active" | active | finished | cancelled |
| `durationSec` | `Int` | default=180 |  |
| `startedAt` | `DateTime` | default=now( |  |
| `endsAt` | `DateTime` | — |  |
| `winnerId` | `String?` | — |  |
| `totalScore` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `participants` | `GiftBattleParticipant[]` | — |  |

**Index/Unique:**

- `@@index([context, contextId, status])`
- `@@index([status, endsAt])`


### <a name="model-giftbattleparticipant"></a>`GiftBattleParticipant` → tablo `gift_battle_participants`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `battleId` | `String` | — |  |
| `participantId` | `String` | — | the user receiving gifts (a side of the battle) |
| `displayName` | `String?` | — |  |
| `score` | `Int` | default=0 | total gross jetons gifted to this side during the battle |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `battle` | `GiftBattle` | fields: [battleId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([battleId, participantId])`
- `@@index([battleId, score])`


### <a name="model-giftgoal"></a>`GiftGoal` → tablo `gift_goals`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `context` | `String` | — | live_stream | voice_room |
| `contextId` | `String` | — |  |
| `ownerId` | `String` | — |  |
| `title` | `String?` | — |  |
| `targetAmount` | `Int` | — |  |
| `currentAmount` | `Int` | default=0 |  |
| `status` | `String` | default="active" | active | completed | cancelled |
| `startedAt` | `DateTime` | default=now( |  |
| `completedAt` | `DateTime?` | — |  |

**Index/Unique:**

- `@@index([context, contextId, status])`


### <a name="model-giftmission"></a>`GiftMission` → tablo `gift_missions`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `code` | `String` | unique | e.g. first_gift, five_people, thousand_jetons |
| `title` | `String` | — |  |
| `description` | `String?` | — |  |
| `type` | `String` | — | count_gifts | distinct_receivers | total_jetons | context_gift |
| `target` | `Int` | default=1 |  |
| `context` | `String?` | — | optional context requirement |
| `rewardJetons` | `Int` | default=0 |  |
| `rewardCredits` | `Int` | default=0 |  |
| `isActive` | `Boolean` | default=true |  |
| `sortOrder` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |


### <a name="model-usermissionprogress"></a>`UserMissionProgress` → tablo `user_mission_progress`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `missionId` | `String` | — |  |
| `dayKey` | `String` | — | YYYY-MM-DD (UTC) — daily reset |
| `progress` | `Int` | default=0 |  |
| `completed` | `Boolean` | default=false |  |
| `claimed` | `Boolean` | default=false |  |
| `updatedAt` | `DateTime` | default=now( |  |
| `createdAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@unique([userId, missionId, dayKey])`
- `@@index([userId, dayKey])`


### <a name="model-pkmatch"></a>`PkMatch` → tablo `pk_matches`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `hostUserId` | `String` | — |  |
| `hostStreamId` | `String` | — |  |
| `hostName` | `String?` | — |  |
| `hostImage` | `String?` | — |  |
| `guestUserId` | `String` | — |  |
| `guestStreamId` | `String?` | — |  |
| `guestName` | `String?` | — |  |
| `guestImage` | `String?` | — |  |
| `status` | `String` | default="pending" |  |
| `durationSec` | `Int` | default=180 | 60 | 180 | 300 | 600 |
| `hostScore` | `Int` | default=0 | gross jetons gifted to host side |
| `guestScore` | `Int` | default=0 | gross jetons gifted to guest side |
| `result` | `String?` | — |  |
| `winnerUserId` | `String?` | — |  |
| `finalSprint` | `Boolean` | default=false | set true in the last 30 seconds |
| `mode` | `String` | default="1v1" | 1v1 | guest | team |
| `seatCount` | `Int` | default=2 | total seats (guest: up to 9; team: even 2/4/6/8) |
| `leftScore` | `Int` | default=0 | team mode: aggregate gross for Sol team |
| `rightScore` | `Int` | default=0 | team mode: aggregate gross for Sağ team |
| `leftName` | `String?` | — | team label (default "Takım Sol") |
| `rightName` | `String?` | — | team label (default "Takım Sağ") |
| `requestedAt` | `DateTime` | default=now( |  |
| `respondedAt` | `DateTime?` | — |  |
| `startedAt` | `DateTime?` | — |  |
| `endsAt` | `DateTime?` | — |  |
| `finishedAt` | `DateTime?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `seats` | `PkSeat[]` | — |  |

**Index/Unique:**

- `@@index([hostUserId, status])`
- `@@index([guestUserId, status])`
- `@@index([status, endsAt])`
- `@@index([hostStreamId])`
- `@@index([guestStreamId])`
- `@@index([status, mode])`


### <a name="model-pkseat"></a>`PkSeat` → tablo `pk_seats`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `matchId` | `String` | — |  |
| `seatIndex` | `Int` | — | 0-based position in the room |
| `team` | `String` | default="none" | left | right | none (guest mode) |
| `userId` | `String` | — |  |
| `userName` | `String?` | — |  |
| `userImage` | `String?` | — |  |
| `streamId` | `String?` | — | the guest's own stream if they are broadcasting |
| `score` | `Int` | default=0 | gross jetons gifted to this guest |
| `status` | `String` | default="active" | active | left | kicked |
| `joinedAt` | `DateTime` | default=now( |  |
| `leftAt` | `DateTime?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `match` | `PkMatch` | fields: [matchId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([matchId, seatIndex])`
- `@@index([matchId, status])`
- `@@index([userId, status])`


### <a name="model-pkparticipant"></a>`PkParticipant` → tablo `pk_participants`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `matchId` | `String` | — |  |
| `userId` | `String` | — |  |
| `mode` | `String` | — | 1v1 | guest | team |
| `side` | `String` | — | host | guest | left | right | seat |
| `score` | `Int` | default=0 | gross jetons this user pulled in during the match |
| `outcome` | `String` | — | win | loss | draw | completed |
| `finishedAt` | `DateTime` | default=now( |  |
| `createdAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@unique([matchId, userId])`
- `@@index([userId, finishedAt])`
- `@@index([finishedAt])`
- `@@index([outcome, finishedAt])`


### <a name="model-pkstat"></a>`PkStat` → tablo `pk_stats`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `userId` | `String` | PK |  |
| `matches` | `Int` | default=0 |  |
| `wins` | `Int` | default=0 |  |
| `losses` | `Int` | default=0 |  |
| `draws` | `Int` | default=0 |  |
| `totalScore` | `Int` | default=0 | cumulative gross pulled in across all PK |
| `bestScore` | `Int` | default=0 | best single-match score |
| `currentStreak` | `Int` | default=0 | consecutive wins (resets on non-win) |
| `bestStreak` | `Int` | default=0 |  |
| `lastPlayedAt` | `DateTime?` | — |  |
| `updatedAt` | `DateTime` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@index([wins])`
- `@@index([totalScore])`


### <a name="model-pkevent"></a>`PkEvent` → tablo `pk_events`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `matchId` | `String` | — |  |
| `type` | `String` | — |  |
| `multiplier` | `Float` | default=2.0 |  |
| `startsAt` | `DateTime` | default=now( |  |
| `endsAt` | `DateTime` | — |  |
| `createdBy` | `String` | — | userId (host) or admin who triggered it |
| `createdAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@index([matchId, endsAt])`


### <a name="model-trtcwebhooklog"></a>`TrtcWebhookLog` → tablo `trtc_webhook_logs`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `eventGroupId` | `Int` | — | 1=Room, 2=Media, 3=Recording, 4=Relay |
| `eventType` | `Int` | — | 101=RoomCreated, 102=RoomDissolved, 103=Enter, 104=Leave, 105=RoleSwitch |
| `sdkAppId` | `Int` | — |  |
| `roomId` | `String?` | — | TRTC room ID |
| `userId` | `String?` | — | TRTC user ID (our user cuid) |
| `payload` | `String` | — | full JSON body |
| `processedOk` | `Boolean` | default=true |  |
| `errorMessage` | `String?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**Index/Unique:**

- `@@index([eventGroupId, eventType])`
- `@@index([roomId])`
- `@@index([userId])`
- `@@index([createdAt])`


### <a name="model-pkban"></a>`PkBan` → tablo `pk_bans`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `userId` | `String` | — |  |
| `reason` | `String?` | — |  |
| `bannedBy` | `String` | — | admin userId |
| `active` | `Boolean` | default=true |  |
| `expiresAt` | `DateTime?` | — | null = permanent |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([userId, active])`


### <a name="model-userblock"></a>`UserBlock` → tablo `user_blocks`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `blockerId` | `String` | — |  |
| `blockedId` | `String` | — |  |
| `createdAt` | `DateTime` | default=now( |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `blocker` | `User` | "Blocker", fields: [blockerId], references: [id], onDelete: Cascade |  |
| `blocked` | `User` | "Blocked", fields: [blockedId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@unique([blockerId, blockedId])`
- `@@index([blockerId])`
- `@@index([blockedId])`


### <a name="model-userreport"></a>`UserReport` → tablo `user_reports`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `reporterId` | `String` | — |  |
| `reportedId` | `String` | — |  |
| `reason` | `String` | — |  |
| `details` | `String?` | — |  |
| `status` | `String` | default="pending" | pending, reviewed, dismissed |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**İlişkiler:**

| Alan | Hedef | @relation | Açıklama |
|------|-------|-----------|----------|
| `reporter` | `User` | "Reporter", fields: [reporterId], references: [id], onDelete: Cascade |  |
| `reported` | `User` | "Reported", fields: [reportedId], references: [id], onDelete: Cascade |  |

**Index/Unique:**

- `@@index([reporterId])`
- `@@index([reportedId])`
- `@@index([status])`


### <a name="model-nameeffect"></a>`NameEffect` → tablo `name_effects`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `key` | `String` | unique | gold, silver, diamond, neon, rainbow, fire, crystal, glass, hologram |
| `name` | `String` | — |  |
| `tier` | `String` | default="gold" | free, gold, admin_only |
| `cssPreset` | `String?` | — | JSON: colors/gradient/animation params for clients |
| `isActive` | `Boolean` | default=true |  |
| `sortOrder` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([tier, isActive])`


### <a name="model-entranceeffect"></a>`EntranceEffect` → tablo `entrance_effects`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | — |  |
| `assetUrl` | `String` | — | lottie/svga/mp4/gif URL |
| `assetType` | `String` | default="lottie" | lottie, svga, gif, video, image |
| `tier` | `String` | default="gold" |  |
| `durationMs` | `Int` | default=3000 |  |
| `isActive` | `Boolean` | default=true |  |
| `sortOrder` | `Int` | default=0 |  |
| `activeFrom` | `DateTime?` | — |  |
| `activeTo` | `DateTime?` | — |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([tier, isActive])`


### <a name="model-chatbubbleskin"></a>`ChatBubbleSkin` → tablo `chat_bubble_skins`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | — |  |
| `assetUrl` | `String` | — | background image / 9-patch asset |
| `tier` | `String` | default="gold" |  |
| `isActive` | `Boolean` | default=true |  |
| `sortOrder` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([tier, isActive])`


### <a name="model-micframe"></a>`MicFrame` → tablo `mic_frames`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | — |  |
| `assetUrl` | `String` | — | PNG/Lottie overlay around mic seat avatar |
| `tier` | `String` | default="gold" |  |
| `isActive` | `Boolean` | default=true |  |
| `sortOrder` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([tier, isActive])`


### <a name="model-emojipack"></a>`EmojiPack` → tablo `emoji_packs`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | — |  |
| `coverUrl` | `String` | — | pack cover image |
| `emojis` | `String` | — | JSON array of { key, imageUrl } |
| `tier` | `String` | default="gold" |  |
| `isActive` | `Boolean` | default=true |  |
| `sortOrder` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([tier, isActive])`


### <a name="model-avataraccessory"></a>`AvatarAccessory` → tablo `avatar_accessories`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | — |  |
| `slot` | `String` | default="hat" | hat, crown, glasses, wings, mask, other |
| `assetUrl` | `String` | — |  |
| `tier` | `String` | default="gold" |  |
| `isActive` | `Boolean` | default=true |  |
| `sortOrder` | `Int` | default=0 |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([slot, isActive])`
- `@@index([tier, isActive])`


### <a name="model-roomtheme"></a>`RoomTheme` → tablo `room_themes`

| Alan | Tip | Nitelikler | Açıklama |
|------|-----|-----------|----------|
| `id` | `String` | PK, default=cuid( |  |
| `name` | `String` | — |  |
| `nameEn` | `String` | default="" |  |
| `backgroundUrl` | `String` | — | static image / lottie / mp4 |
| `cloudStoragePath` | `String?` | — | S3 key for the background |
| `thumbnailUrl` | `String?` | — | small preview |
| `thumbnailCloudPath` | `String?` | — |  |
| `assetType` | `String` | default="image" | image|lottie|video|gradient|animated|svg |
| `tier` | `String` | default="free" | free|gold|vip|premium|event |
| `isActive` | `Boolean` | default=true |  |
| `activeFrom` | `DateTime?` | — | seasonal themes window |
| `activeTo` | `DateTime?` | — |  |
| `sortOrder` | `Int` | default=0 |  |
| `category` | `String?` | — | night|day|season|event|theme|custom |
| `description` | `String?` | — |  |
| `animationSpeed` | `Float?` | default=1.0 | 0.1-3.0 |
| `blurAmount` | `Int?` | default=0 | 0-20 px |
| `opacity` | `Float?` | default=1.0 | 0.0-1.0 |
| `hasParallax` | `Boolean` | default=false |  |
| `hasZoom` | `Boolean` | default=false |  |
| `videoLoop` | `Boolean` | default=true |  |
| `soundUrl` | `String?` | — | ambient sound for this background |
| `soundCloudPath` | `String?` | — |  |
| `soundVolume` | `Int?` | default=50 | 0-100 |
| `isPremium` | `Boolean` | default=false |  |
| `isVipOnly` | `Boolean` | default=false |  |
| `isEventOnly` | `Boolean` | default=false |  |
| `contentVersion` | `Int` | default=1 |  |
| `createdAt` | `DateTime` | default=now( |  |
| `updatedAt` | `DateTime` | — |  |

**Index/Unique:**

- `@@index([tier, isActive])`
- `@@index([category])`
- `@@index([contentVersion])`
