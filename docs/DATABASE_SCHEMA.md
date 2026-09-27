# DATABASE SCHEMA — Veri Modeli Haritası

> **Kaynak:** Abacus.AI üzerinde çalışan CANLI backend kaynak ağacı (`nextjs_space/`), 2026-09-27 tarihli durum.
> **Üretim yöntemi:** Route dosyaları programatik olarak taranarak (`app/api/**/route.ts`) üretildi; el ile uydurulmuş uç/alan yoktur.
> **Durum etiketleri:** `DOĞRULANDI` (çalışan sistemde test edildi) · `KODDAN TESPİT EDİLDİ` (kaynak koddan okundu, canlı test edilmedi) · `EKSİK` · `ESKİ` · `ERİŞİM BEKLİYOR`


Şema dosyası: `prisma/schema.prisma` (paylaşımlı şemaya sembolik bağ — **yalnızca ekleme** yapılır).

- **Toplam model:** 270
- **Enum:** 0 (durumlar `String` alanlarda tutulur — bu, uygulama katmanında doğrulama gerektirir; bkz. `PERFORMANCE.md` / `SECURITY.md`)

## Flutter akışlarına dokunan başlıca modeller

| Model | Kullanıldığı alan |
|---|---|
| `User` | Hesap, rol, bakiye (jeton/kredi), profil |
| `ChatRoom` | Sesli/yazılı oda kaydı, sahip, ayarlar |
| `ChatPresence` | Odadaki varlık (`lastSeen` tabanlı) |
| `ChatUserRole` | Oda içi roller (admin/DJ/moderatör) |
| `ChatRoomGift` | Oda içi hediye kayıtları |
| `SitePresence` | Site geneli çevrimiçi durumu |
| `VideoStream` | Canlı video yayını |
| `VideoStreamViewer` | Yayın izleyici kaydı |
| `GiftType` | Hediye kataloğu (fiyat, medya) |
| `GiftHistory` | Hediye gönderim geçmişi |
| `StreamGift` | Yayına gönderilen hediye |
| `PKBattle` | PK düellosu |
| `PkBattleParticipant` | PK tarafları |
| `PkScore` | PK skoru |
| `PkGift` | PK sırasında hediye |
| `PkMatch` | PK eşleşmesi |
| `PkSeat` | PK koltuk düzeni |
| `PkParticipant` | PK katılımcısı |
| `CreditTransaction` | Kredi hareketi |
| `JetonTransaction` | Jeton hareketi |
| `MembershipPlan` | Üyelik planı |
| `GiftBox` | Hediye kutusu etkinliği |
| `RoomRevenueLog` | Oda geliri kaydı |
| `RoomTheme` | Oda teması/arka planı |
| `UserDevice` | Push cihaz kaydı |
| `PushNotificationLog` | Gönderilen push kaydı |
| `ShortVideoMusic` | Kısa video müzik kataloğu |
| `GameRoom` | Oyun odası |

## Tüm model adları

`Account`, `AccountDeletion`, `Achievement`, `ActivityFeedConfig`, `AdNetwork`, `AdPlacement`, `AdRewardGrant`, `AdminPopup`, `AdminUserAction`, `Agency`, `AgencyBonusRule`, `AgencyCommissionRule`, `AgencyEarning`, `AgencyLeaveRequest`, `AgencyPenalty`, `AgencyTask`, `AgencyUser`, `AgencyWallet`, `AgencyWalletTransaction`, `Animation`, `AnimationAssignment`, `AnimationMembershipDefault`, `AnimationPlaybackLog`, `AnonymousFortune`, `AnonymousUser`, `AuditLog`, `AvatarAccessory`, `BanaOzelHistory`, `BanaOzelItem`, `BlogCategory`, `BlogComment`, `BlogFavorite`, `BlogLike`, `BlogPost`, `BotProfile`, `BroadcastImage`, `Celebrity`, `CelebrityFollow`, `CelebrityPost`, `CelebrityPostComment`, `CelebrityPostLike`, `CfcContest`, `CfcParticipant`, `CfcPaymentRequest`, `CfcScoreLog`, `CfcSeason`, `CfcTeam`, `ChatBan`, `ChatBubbleSkin`, `ChatMessage`, `ChatMute`, `ChatPresence`, `ChatRoom`, `ChatRoomGift`, `ChatSpeakBlock`, `ChatSpeakRequest`, `ChatUserRole`, `Conversation`, `CreditPackage`, `CreditTransaction`, `CurrencyConfig`, `CustomBadge`, `DailyLoginReward`, `DailyQuest`, `DailyReward`, `DailyTask`, `DirectMessage`, `DreamComment`, `DreamContest`, `DreamContestEntry`, `DreamContestVote`, `DreamDiaryEntry`, `DreamFavorite`, `DreamInterpretation`, `DreamSymbol`, `DreamView`, `EffectRule`, `EmailVerificationToken`, `EmojiPack`, `EntranceEffect`, `FanClub`, `FanClubMember`, `FanClubPoll`, `FanClubPollVote`, `FanClubPost`, `FanClubPostLike`, `FavoriteTeller`, `FeatureFlag`, `Follow`, `Fortune`, `FortuneRating`, `FortuneRequestType`, `GamePlay`, `GameRoom`, `GameRoomChat`, `GameRoomViewer`, `GiftBattle`, `GiftBattleParticipant`, `GiftBox`, `GiftBoxEntry`, `GiftCollection`, `GiftCombo`, `GiftEvent`, `GiftGoal`, `GiftHistory`, `GiftMission`, `GiftQueue`, `GiftType`, `Hashtag`, `HomepageButton`, `HomepageFortuneCard`, `IdempotencyRecord`, `IntegrationSecret`, `IntegrationSetting`, `InviteCode`, `IpFortuneUsage`, `JetonTransaction`, `LeaderboardConfig`, `LeaderboardEntry`, `LeaderboardPeriod`, `LeaderboardReward`, `LedgerEntry`, `LiveActivity`, `LiveFortuneTeller`, `LiveGuestInvite`, `LiveGuestSession`, `LiveSession`, `LiveSessionMessage`, `LiveTellerReview`, `LuckyGiftReward`, `LuckyGiftTier`, `MembershipBadge`, `MembershipEvent`, `MembershipFeature`, `MembershipGrant`, `MembershipPlan`, `MembershipPurchase`, `MembershipTierDef`, `MembershipTierFeature`, `MessageRequest`, `MicFrame`, `MiniGame`, `NameEffect`, `Notification`, `OkeyMatch`, `OkeyMatchPlayer`, `OnlineFalButton`, `OnlineFalSection`, `PKBattle`, `PasswordResetToken`, `Payment`, `PaymentMethod`, `PaymentNotification`, `Permission`, `PhoneOtp`, `PkBan`, `PkBattleParticipant`, `PkEvent`, `PkGift`, `PkMatch`, `PkParticipant`, `PkScore`, `PkSeat`, `PkStat`, `PlatformSettings`, `ProfileFrame`, `ProfileView`, `ProfileVisit`, `PushNotificationLog`, `Referral`, `ReferralCommission`, `RefundRequest`, `RemoteConfig`, `RevenueRule`, `RevokedToken`, `RiskEvent`, `Role`, `RolePermission`, `RoomRevenueLog`, `RoomSignal`, `RoomTheme`, `RtcTelemetry`, `Session`, `ShareEvent`, `ShortVideo`, `ShortVideoComment`, `ShortVideoCommentLike`, `ShortVideoHashtag`, `ShortVideoLike`, `ShortVideoMention`, `ShortVideoMusic`, `ShortVideoSave`, `ShortVideoView`, `SiteAnnouncement`, `SitePage`, `SitePresence`, `SiteSetting`, `SiteVisit`, `SmsDeliveryLog`, `SmsProvider`, `SmsProviderConfig`, `SmsProviderHealth`, `SocialAction`, `SocialComment`, `SocialLike`, `SocialPost`, `SosGame`, `SosGameChat`, `SosGameViewer`, `StorePurchase`, `StreamBan`, `StreamCoBroadcaster`, `StreamFortuneRequest`, `StreamGift`, `StreamModerator`, `StreamMutedViewer`, `SupportMessage`, `SupportTicket`, `SupporterLevel`, `Team`, `TeamMember`, `TellerAward`, `TellerChatMessage`, `TellerChatSession`, `TellerGift`, `TellerWarning`, `TickerMessage`, `TikTokCategory`, `TikTokVideo`, `TopupBonusTier`, `TournamentMatch`, `TournamentRound`, `Translation`, `TrendVideo`, `TrendVideoCategory`, `TrendingTopic`, `TrtcWebhookLog`, `User`, `UserAchievement`, `UserBlock`, `UserDailyActivity`, `UserDevice`, `UserFavorite`, `UserFortuneStreak`, `UserGameProfile`, `UserHourlyActivity`, `UserLoginSession`, `UserMissionProgress`, `UserOnlineEvent`, `UserPermissionOverride`, `UserReport`, `UserStory`, `UserTimelineEvent`, `UserTokenRevocation`, `UserVipPreference`, `UserWarning`, `Verification`, `VerificationToken`, `VideoStream`, `VideoStreamComment`, `VideoStreamLike`, `VideoStreamSignal`, `VideoStreamViewer`, `VipXpLedger`, `VoiceSession`, `VoiceSignal`, `WeeklyDreamReport`, `WeeklyTournament`, `WeeklyTournamentEntry`, `WithdrawalRequest`

## Bağlantı havuzu sınırları (koddan)

`lib/db.ts:15` → `connection_limit=5&pool_timeout=10&connect_timeout=5&statement_timeout=5000`

Bu, **sorgu başına 5 sn üst sınır** demektir. Uzun süren toplu sorgular (özellikle admin raporları)
zaman aşımına uğrayabilir; sayfalama zorunludur.

## Alan düzeyi ayrıntı

Bu doküman **model envanteridir**. Alan listeleri için tek doğru kaynak `prisma/schema.prisma`
dosyasıdır; burada kopyalanmamıştır çünkü kopya şema hızla eskir.
