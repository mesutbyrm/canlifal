/**
 * CanlıFal — TAM PLATFORM SIFIRLAMA
 * ==================================
 * Çalıştırma:  cd nextjs_space && yarn tsx --require dotenv/config scripts/reset-platform.ts
 *
 * KORUNANLAR:
 *  - users tablosu (finansal alanlar sıfırlanır, profil/auth kalır)
 *  - accounts, sessions, verification_tokens, email_verification_tokens, password_reset_tokens
 *  - user_devices (push token)
 *  - platform_settings, site_settings, feature_flags, remote_configs
 *  - credit_packages, payment_methods, membership_plans, membership_tier_defs,
 *    membership_tier_features, membership_features, membership_badges
 *  - gift_types, daily_quests, daily_tasks, daily_rewards, mini_games
 *  - revenue_rules, translations, site_pages, site_announcements
 *  - homepage_buttons, homepage_fortune_cards
 *  - blog_categories, blog_posts (blog_comments, blog_likes, blog_favorites silinir)
 *  - celebrities, celebrity_posts (likes/comments silinir)
 *  - dream_symbols, dream_contests
 *  - online_fal_sections, fortune_request_types
 *  - trend_video_categories, trend_videos
 *  - leaderboard_configs, supporter_levels, emoji_packs
 *  - tiktok_categories, tiktok_videos, ticker_messages
 *  - bana_ozel_items (history silinir)
 *  - currency_config, ad_networks, ad_placements
 *  - sms_providers, sms_provider_health, sms_provider_configs, sms_delivery_logs
 *  - topup_bonus_tiers, activity_feed_config
 *  - profile_frames, mic_frames, entrance_effects, name_effects,
 *    chat_bubble_skins, avatar_accessories
 *  - animations, animation_membership_defaults
 *  - achievements
 *  - roles, permissions, role_permissions
 *  - integration_settings, integration_secrets
 *  - trending_topics, custom_badges, effect_rules, room_themes
 *  - short_video_music, lucky_gift_tiers
 *  - bot_profiles (girlive-bot)
 *
 * SİLİNENLER: geri kalan tüm işlem/etkileşim verileri
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetPlatform() {
  console.log('\n============================');
  console.log('  CanlıFal TAM SIFIRLAMA');
  console.log('============================\n');

  const t0 = Date.now();

  // ── 1. Bağımlı / alt tablolar (önce bunlar silinmeli) ──────────
  const phase1: [string, () => Promise<any>][] = [
    // PK
    ['pkScore', () => prisma.pkScore.deleteMany()],
    ['pkGift', () => prisma.pkGift.deleteMany()],
    ['pkBattleParticipant', () => prisma.pkBattleParticipant.deleteMany()],
    ['pKBattle', () => (prisma as any).pKBattle.deleteMany()],
    ['pkBan', () => prisma.pkBan.deleteMany()],
    ['pkEvent', () => prisma.pkEvent.deleteMany()],
    ['pkSeat', () => prisma.pkSeat.deleteMany()],
    ['pkStat', () => prisma.pkStat.deleteMany()],
    ['pkParticipant', () => prisma.pkParticipant.deleteMany()],
    ['pkMatch', () => prisma.pkMatch.deleteMany()],

    // Gift system
    ['giftBoxEntry', () => prisma.giftBoxEntry.deleteMany()],
    ['giftBox', () => prisma.giftBox.deleteMany()],
    ['giftBattleParticipant', () => prisma.giftBattleParticipant.deleteMany()],
    ['giftBattle', () => prisma.giftBattle.deleteMany()],
    ['giftCombo', () => prisma.giftCombo.deleteMany()],
    ['giftEvent', () => prisma.giftEvent.deleteMany()],
    ['giftGoal', () => prisma.giftGoal.deleteMany()],
    ['giftHistory', () => prisma.giftHistory.deleteMany()],
    ['giftQueue', () => prisma.giftQueue.deleteMany()],
    ['giftMission', () => prisma.giftMission.deleteMany()],
    ['giftCollection', () => prisma.giftCollection.deleteMany()],
    ['luckyGiftReward', () => prisma.luckyGiftReward.deleteMany()],

    // Chat room dependencies
    ['chatRoomGift', () => prisma.chatRoomGift.deleteMany()],
    ['chatMessage', () => prisma.chatMessage.deleteMany()],
    ['chatPresence', () => prisma.chatPresence.deleteMany()],
    ['chatSpeakRequest', () => prisma.chatSpeakRequest.deleteMany()],
    ['chatSpeakBlock', () => prisma.chatSpeakBlock.deleteMany()],
    ['chatBan', () => prisma.chatBan.deleteMany()],
    ['chatMute', () => prisma.chatMute.deleteMany()],
    ['chatUserRole', () => prisma.chatUserRole.deleteMany()],
    ['roomJoinRequest', () => prisma.roomJoinRequest.deleteMany()],
    ['roomPasswordAttempt', () => prisma.roomPasswordAttempt.deleteMany()],
    ['roomSignal', () => prisma.roomSignal.deleteMany()],
    ['roomRevenueLog', () => prisma.roomRevenueLog.deleteMany()],

    // Video stream dependencies
    ['videoStreamComment', () => prisma.videoStreamComment.deleteMany()],
    ['videoStreamLike', () => prisma.videoStreamLike.deleteMany()],
    ['videoStreamViewer', () => prisma.videoStreamViewer.deleteMany()],
    ['videoStreamSignal', () => prisma.videoStreamSignal.deleteMany()],
    ['streamGift', () => prisma.streamGift.deleteMany()],
    ['streamBan', () => prisma.streamBan.deleteMany()],
    ['streamCoBroadcaster', () => prisma.streamCoBroadcaster.deleteMany()],
    ['streamModerator', () => prisma.streamModerator.deleteMany()],
    ['streamMutedViewer', () => prisma.streamMutedViewer.deleteMany()],
    ['streamFortuneRequest', () => prisma.streamFortuneRequest.deleteMany()],

    // Live session dependencies
    ['liveSessionMessage', () => prisma.liveSessionMessage.deleteMany()],
    ['liveGuestInvite', () => prisma.liveGuestInvite.deleteMany()],
    ['liveGuestSession', () => prisma.liveGuestSession.deleteMany()],
    ['liveTellerReview', () => prisma.liveTellerReview.deleteMany()],
    ['tellerChatMessage', () => prisma.tellerChatMessage.deleteMany()],
    ['tellerGift', () => prisma.tellerGift.deleteMany()],
    ['tellerWarning', () => prisma.tellerWarning.deleteMany()],
    ['tellerAward', () => prisma.tellerAward.deleteMany()],

    // Agency dependencies
    ['agencyEarning', () => prisma.agencyEarning.deleteMany()],
    ['agencyLeaveRequest', () => prisma.agencyLeaveRequest.deleteMany()],
    ['agencyPenalty', () => prisma.agencyPenalty.deleteMany()],
    ['agencyTask', () => prisma.agencyTask.deleteMany()],
    ['agencyWalletTransaction', () => prisma.agencyWalletTransaction.deleteMany()],
    ['inviteCode', () => prisma.inviteCode.deleteMany()],
    ['agencyBonusRule', () => prisma.agencyBonusRule.deleteMany()],
    ['agencyCommissionRule', () => prisma.agencyCommissionRule.deleteMany()],

    // User interaction / social
    ['socialAction', () => prisma.socialAction.deleteMany()],
    ['socialComment', () => prisma.socialComment.deleteMany()],
    ['socialLike', () => prisma.socialLike.deleteMany()],
    ['socialPost', () => prisma.socialPost.deleteMany()],
    ['follow', () => prisma.follow.deleteMany()],
    ['profileView', () => prisma.profileView.deleteMany()],
    ['profileVisit', () => prisma.profileVisit.deleteMany()],
    ['shareEvent', () => prisma.shareEvent.deleteMany()],
    ['userBlock', () => prisma.userBlock.deleteMany()],
    ['userReport', () => prisma.userReport.deleteMany()],
    ['userStory', () => prisma.userStory.deleteMany()],
    ['userWarning', () => prisma.userWarning.deleteMany()],
    ['userTimelineEvent', () => prisma.userTimelineEvent.deleteMany()],
    ['userPermissionOverride', () => prisma.userPermissionOverride.deleteMany()],
    ['userModerationAction', () => prisma.userModerationAction.deleteMany()],
    ['userOnlineEvent', () => prisma.userOnlineEvent.deleteMany()],
    ['userVipPreference', () => prisma.userVipPreference.deleteMany()],

    // DM / Conversations
    ['directMessage', () => prisma.directMessage.deleteMany()],
    ['messageRequest', () => prisma.messageRequest.deleteMany()],
    ['conversation', () => prisma.conversation.deleteMany()],

    // Fan clubs
    ['fanClubPollVote', () => prisma.fanClubPollVote.deleteMany()],
    ['fanClubPoll', () => prisma.fanClubPoll.deleteMany()],
    ['fanClubPostLike', () => prisma.fanClubPostLike.deleteMany()],
    ['fanClubPost', () => prisma.fanClubPost.deleteMany()],
    ['fanClubMember', () => prisma.fanClubMember.deleteMany()],
    ['fanClub', () => prisma.fanClub.deleteMany()],

    // Celebrity interaction (keep celebrities + posts)
    ['celebrityPostLike', () => prisma.celebrityPostLike.deleteMany()],
    ['celebrityPostComment', () => prisma.celebrityPostComment.deleteMany()],
    ['celebrityFollow', () => prisma.celebrityFollow.deleteMany()],

    // Short videos (keep music catalog)
    ['shortVideoCommentLike', () => prisma.shortVideoCommentLike.deleteMany()],
    ['shortVideoComment', () => prisma.shortVideoComment.deleteMany()],
    ['shortVideoLike', () => prisma.shortVideoLike.deleteMany()],
    ['shortVideoSave', () => prisma.shortVideoSave.deleteMany()],
    ['shortVideoView', () => prisma.shortVideoView.deleteMany()],
    ['shortVideoMention', () => prisma.shortVideoMention.deleteMany()],
    ['shortVideoHashtag', () => prisma.shortVideoHashtag.deleteMany()],
    ['shortVideo', () => prisma.shortVideo.deleteMany()],

    // Blog interaction (keep posts + categories)
    ['blogComment', () => prisma.blogComment.deleteMany()],
    ['blogLike', () => prisma.blogLike.deleteMany()],
    ['blogFavorite', () => prisma.blogFavorite.deleteMany()],

    // Dreams
    ['dreamComment', () => prisma.dreamComment.deleteMany()],
    ['dreamFavorite', () => prisma.dreamFavorite.deleteMany()],
    ['dreamView', () => prisma.dreamView.deleteMany()],
    ['dreamDiaryEntry', () => prisma.dreamDiaryEntry.deleteMany()],
    ['dreamInterpretation', () => prisma.dreamInterpretation.deleteMany()],
    ['dreamContestVote', () => prisma.dreamContestVote.deleteMany()],
    ['dreamContestEntry', () => prisma.dreamContestEntry.deleteMany()],
    ['weeklyDreamReport', () => prisma.weeklyDreamReport.deleteMany()],

    // Game data
    ['okeyMatchPlayer', () => prisma.okeyMatchPlayer.deleteMany()],
    ['okeyMatch', () => prisma.okeyMatch.deleteMany()],
    ['gameRoomChat', () => prisma.gameRoomChat.deleteMany()],
    ['gameRoomViewer', () => prisma.gameRoomViewer.deleteMany()],
    ['gameRoom', () => prisma.gameRoom.deleteMany()],
    ['gamePlay', () => prisma.gamePlay.deleteMany()],
    ['sosGameChat', () => prisma.sosGameChat.deleteMany()],
    ['sosGameViewer', () => prisma.sosGameViewer.deleteMany()],
    ['sosGame', () => prisma.sosGame.deleteMany()],
    ['userGameProfile', () => prisma.userGameProfile.deleteMany()],

    // CFC
    ['cfcScoreLog', () => prisma.cfcScoreLog.deleteMany()],
    ['cfcParticipant', () => prisma.cfcParticipant.deleteMany()],
    ['cfcContest', () => prisma.cfcContest.deleteMany()],
    ['cfcSeason', () => prisma.cfcSeason.deleteMany()],
    ['cfcPaymentRequest', () => prisma.cfcPaymentRequest.deleteMany()],

    // Financial / ledger
    ['jetonTransaction', () => prisma.jetonTransaction.deleteMany()],
    ['creditTransaction', () => prisma.creditTransaction.deleteMany()],
    ['ledgerEntry', () => prisma.ledgerEntry.deleteMany()],
    ['vipXpLedger', () => prisma.vipXpLedger.deleteMany()],
    ['payment', () => prisma.payment.deleteMany()],
    ['paymentNotification', () => prisma.paymentNotification.deleteMany()],
    ['withdrawalRequest', () => prisma.withdrawalRequest.deleteMany()],
    ['refundRequest', () => prisma.refundRequest.deleteMany()],
    ['membershipPurchase', () => prisma.membershipPurchase.deleteMany()],
    ['membershipGrant', () => prisma.membershipGrant.deleteMany()],
    ['membershipEvent', () => prisma.membershipEvent.deleteMany()],
    ['referralCommission', () => prisma.referralCommission.deleteMany()],
    ['referral', () => prisma.referral.deleteMany()],
    ['storePurchase', () => prisma.storePurchase.deleteMany()],

    // Leaderboard data (keep configs)
    ['leaderboardReward', () => prisma.leaderboardReward.deleteMany()],
    ['leaderboardEntry', () => prisma.leaderboardEntry.deleteMany()],
    ['leaderboardPeriod', () => prisma.leaderboardPeriod.deleteMany()],

    // Weekly tournaments
    ['weeklyTournamentEntry', () => prisma.weeklyTournamentEntry.deleteMany()],
    ['tournamentMatch', () => prisma.tournamentMatch.deleteMany()],
    ['tournamentRound', () => prisma.tournamentRound.deleteMany()],
    ['weeklyTournament', () => prisma.weeklyTournament.deleteMany()],

    // Animation user data (keep catalog + defaults)
    ['animationPlaybackLog', () => prisma.animationPlaybackLog.deleteMany()],
    ['animationAssignment', () => prisma.animationAssignment.deleteMany()],

    // Achievements (user progress, keep definitions)
    ['userAchievement', () => prisma.userAchievement.deleteMany()],
    ['userFortuneStreak', () => prisma.userFortuneStreak.deleteMany()],
    ['userMissionProgress', () => prisma.userMissionProgress.deleteMany()],
    ['dailyLoginReward', () => prisma.dailyLoginReward.deleteMany()],
    ['userDailyActivity', () => prisma.userDailyActivity.deleteMany()],
    ['userHourlyActivity', () => prisma.userHourlyActivity.deleteMany()],

    // Misc logs & transient
    ['notification', () => prisma.notification.deleteMany()],
    ['liveActivity', () => prisma.liveActivity.deleteMany()],
    ['auditLog', () => prisma.auditLog.deleteMany()],
    ['adminUserAction', () => prisma.adminUserAction.deleteMany()],
    ['riskEvent', () => prisma.riskEvent.deleteMany()],
    ['idempotencyRecord', () => prisma.idempotencyRecord.deleteMany()],
    ['realtimeEvent', () => prisma.realtimeEvent.deleteMany()],
    ['adRewardGrant', () => prisma.adRewardGrant.deleteMany()],
    ['ipFortuneUsage', () => prisma.ipFortuneUsage.deleteMany()],
    ['siteVisit', () => prisma.siteVisit.deleteMany()],
    ['sitePresence', () => prisma.sitePresence.deleteMany()],
    ['revokedToken', () => prisma.revokedToken.deleteMany()],
    ['userTokenRevocation', () => prisma.userTokenRevocation.deleteMany()],
    ['userLoginSession', () => prisma.userLoginSession.deleteMany()],
    ['pushNotificationLog', () => prisma.pushNotificationLog.deleteMany()],
    ['trtcWebhookLog', () => prisma.trtcWebhookLog.deleteMany()],
    ['rtcTelemetry', () => prisma.rtcTelemetry.deleteMany()],
    ['accountDeletion', () => prisma.accountDeletion.deleteMany()],
    ['adminPopup', () => prisma.adminPopup.deleteMany()],
    ['phoneOtp', () => prisma.phoneOtp.deleteMany()],
    ['verification', () => prisma.verification.deleteMany()],
    ['anonymousFortune', () => prisma.anonymousFortune.deleteMany()],
    ['anonymousUser', () => prisma.anonymousUser.deleteMany()],
    ['banaOzelHistory', () => prisma.banaOzelHistory.deleteMany()],
    ['broadcastImage', () => prisma.broadcastImage.deleteMany()],
    ['hashtag', () => prisma.hashtag.deleteMany()],
    ['fortune', () => prisma.fortune.deleteMany()],
    ['fortuneRating', () => prisma.fortuneRating.deleteMany()],
    ['favoriteTeller', () => prisma.favoriteTeller.deleteMany()],
  ];

  // ── 2. Ana tablolar (bağımlılar silindikten sonra) ──────────
  const phase2: [string, () => Promise<any>][] = [
    // Chat rooms
    ['chatRoom', () => prisma.chatRoom.deleteMany()],
    // Video streams
    ['videoStream', () => prisma.videoStream.deleteMany()],
    // Live sessions
    ['tellerChatSession', () => prisma.tellerChatSession.deleteMany()],
    ['liveSession', () => prisma.liveSession.deleteMany()],
    ['liveFortuneTeller', () => prisma.liveFortuneTeller.deleteMany()],
    // Voice
    ['voiceSignal', () => prisma.voiceSignal.deleteMany()],
    ['voiceSession', () => prisma.voiceSession.deleteMany()],
    // Agency (parent tables)
    ['agencyUser', () => prisma.agencyUser.deleteMany()],
    ['agencyWallet', () => prisma.agencyWallet.deleteMany()],
    ['agency', () => prisma.agency.deleteMany()],
    // Teams
    ['teamMember', () => prisma.teamMember.deleteMany()],
    ['team', () => prisma.team.deleteMany()],
  ];

  // ── Phase 1 ──
  console.log('Faz 1: Bağımlı tablolar siliniyor...');
  let deletedTotal = 0;
  for (const [name, fn] of phase1) {
    try {
      const result = await fn();
      const count = result?.count ?? 0;
      if (count > 0) console.log(`  ✓ ${name}: ${count} satır silindi`);
      deletedTotal += count;
    } catch (e: any) {
      // P2021 = table does not exist, P2025 = record not found — skip
      if (e?.code === 'P2021' || e?.code === 'P2025') {
        console.log(`  ⊘ ${name}: tablo/kayıt yok, atlandı`);
      } else {
        console.error(`  ✗ ${name}: ${e.message}`);
      }
    }
  }

  // ── Phase 2 ──
  console.log('\nFaz 2: Ana tablolar siliniyor...');
  for (const [name, fn] of phase2) {
    try {
      const result = await fn();
      const count = result?.count ?? 0;
      if (count > 0) console.log(`  ✓ ${name}: ${count} satır silindi`);
      deletedTotal += count;
    } catch (e: any) {
      if (e?.code === 'P2021' || e?.code === 'P2025') {
        console.log(`  ⊘ ${name}: tablo/kayıt yok, atlandı`);
      } else {
        console.error(`  ✗ ${name}: ${e.message}`);
      }
    }
  }

  // ── 3. User bakiyelerini sıfırla ──────────
  console.log('\nFaz 3: Kullanıcı bakiyeleri sıfırlanıyor...');
  const userReset = await prisma.user.updateMany({
    data: {
      jetonBalance: 0,
      fakeJetonBalance: 0,
      cfcBalance: 0,
      credits: 50,           // varsayılan başlangıç
      vipXp: 0,
      xp: 0,
      level: 1,
      loginStreak: 0,
      lastLoginRewardDate: null,
      totalTimeSpentMinutes: 0,
      referralCreditsEarned: 0,
      warningCount: 0,
      // Yasakları kaldır (temiz başlangıç)
      isBanned: false,
      banReason: null,
      bannedAt: null,
      bannedUntil: null,
      bannedBy: null,
      isFrozen: false,
      frozenAt: null,
      frozenReason: null,
      // Withdrawal sıfırla
      withdrawalLimit: 0,
    },
  });
  console.log(`  ✓ ${userReset.count} kullanıcı bakiyesi sıfırlandı`);

  // ── 4. ad_watch sayaçlarını sıfırla (SiteSetting'te) ──────────
  const adCounters = await prisma.siteSetting.deleteMany({
    where: { key: { startsWith: 'ad_watch_' } },
  });
  if (adCounters.count > 0) {
    console.log(`  ✓ ${adCounters.count} reklam izleme sayacı silindi (SiteSetting)`);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n════════════════════════════`);
  console.log(`  SIFIRLAMA TAMAMLANDI`);
  console.log(`  Toplam silinen: ${deletedTotal} satır`);
  console.log(`  Süre: ${elapsed}s`);
  console.log(`════════════════════════════\n`);
}

resetPlatform()
  .catch((e) => {
    console.error('HATA:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
