// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { createNotificationWithPush } from '@/lib/notify'

export const dynamic = 'force-dynamic'

// Achievement definitions
const ACHIEVEMENTS = [
  // Fortune achievements
  { code: 'fortune_explorer', nameTr: 'Fal Kaşifi', nameEn: 'Fortune Explorer', descriptionTr: '50 fal baktır', descriptionEn: 'Get 50 fortunes', icon: '🔮', category: 'fortune', targetValue: 50, rewardCredits: 100 },
  { code: 'coffee_master', nameTr: 'Kahve Ustası', nameEn: 'Coffee Master', descriptionTr: '100 kahve falı baktır', descriptionEn: 'Get 100 coffee fortunes', icon: '☕', category: 'fortune', targetValue: 100, rewardCredits: 200 },
  { code: 'tarot_addict', nameTr: 'Tarot Bağımlısı', nameEn: 'Tarot Addict', descriptionTr: '50 tarot falı baktır', descriptionEn: 'Get 50 tarot readings', icon: '🃏', category: 'fortune', targetValue: 50, rewardCredits: 150 },
  { code: 'astrology_expert', nameTr: 'Astroloji Uzmanı', nameEn: 'Astrology Expert', descriptionTr: '50 burç yorumu oku', descriptionEn: 'Read 50 horoscopes', icon: '⭐', category: 'fortune', targetValue: 50, rewardCredits: 150 },
  { code: 'dream_interpreter', nameTr: 'Rüya Yorumcusu', nameEn: 'Dream Interpreter', descriptionTr: '25 rüya tabiri yaptır', descriptionEn: 'Get 25 dream interpretations', icon: '🌙', category: 'fortune', targetValue: 25, rewardCredits: 100 },
  { code: 'fortune_master', nameTr: 'Fal Ustası', nameEn: 'Fortune Master', descriptionTr: '500 fal baktır', descriptionEn: 'Get 500 fortunes', icon: '👑', category: 'fortune', targetValue: 500, rewardCredits: 500 },
  
  // Social achievements
  { code: 'social_butterfly', nameTr: 'Sosyal Kelebek', nameEn: 'Social Butterfly', descriptionTr: '100 takipçiye ulaş', descriptionEn: 'Reach 100 followers', icon: '🦋', category: 'social', targetValue: 100, rewardCredits: 200 },
  { code: 'influencer', nameTr: 'Influencer', nameEn: 'Influencer', descriptionTr: '500 takipçiye ulaş', descriptionEn: 'Reach 500 followers', icon: '🌟', category: 'social', targetValue: 500, rewardCredits: 500 },
  { code: 'liked_creator', nameTr: 'Sevilen İçerik', nameEn: 'Liked Creator', descriptionTr: '100 beğeni al', descriptionEn: 'Receive 100 likes', icon: '❤️', category: 'social', targetValue: 100, rewardCredits: 100 },
  { code: 'viral_star', nameTr: 'Viral Yıldız', nameEn: 'Viral Star', descriptionTr: '1000 beğeni al', descriptionEn: 'Receive 1000 likes', icon: '🔥', category: 'social', targetValue: 1000, rewardCredits: 300 },
  { code: 'content_creator', nameTr: 'İçerik Üreticisi', nameEn: 'Content Creator', descriptionTr: '50 paylaşım yap', descriptionEn: 'Make 50 posts', icon: '📝', category: 'social', targetValue: 50, rewardCredits: 100 },
  
  // Stream achievements
  { code: 'live_star', nameTr: 'Canlı Yıldızı', nameEn: 'Live Star', descriptionTr: '10 canlı yayın yap', descriptionEn: 'Host 10 live streams', icon: '📺', category: 'stream', targetValue: 10, rewardCredits: 200 },
  { code: 'streaming_pro', nameTr: 'Yayın Profesyoneli', nameEn: 'Streaming Pro', descriptionTr: '50 canlı yayın yap', descriptionEn: 'Host 50 live streams', icon: '🎥', category: 'stream', targetValue: 50, rewardCredits: 500 },
  { code: 'crowd_pleaser', nameTr: 'Kalabalık Ustası', nameEn: 'Crowd Pleaser', descriptionTr: '100 izleyiciye aynı anda ulaş', descriptionEn: 'Reach 100 concurrent viewers', icon: '👥', category: 'stream', targetValue: 100, rewardCredits: 300 },
  
  // Coin achievements
  { code: 'generous_user', nameTr: 'Cömert Kullanıcı', nameEn: 'Generous User', descriptionTr: '10,000 jeton hediye et', descriptionEn: 'Gift 10,000 coins', icon: '💝', category: 'coin', targetValue: 10000, rewardCredits: 500 },
  { code: 'big_spender', nameTr: 'Büyük Harcamacı', nameEn: 'Big Spender', descriptionTr: '50,000 jeton harca', descriptionEn: 'Spend 50,000 coins', icon: '💰', category: 'coin', targetValue: 50000, rewardCredits: 300 },
  { code: 'coin_collector', nameTr: 'Jeton Koleksiyoncusu', nameEn: 'Coin Collector', descriptionTr: '10,000 jeton kazan', descriptionEn: 'Earn 10,000 coins', icon: '🪙', category: 'coin', targetValue: 10000, rewardCredits: 200 },
  
  // Activity achievements
  { code: 'early_bird', nameTr: 'Erken Kuş', nameEn: 'Early Bird', descriptionTr: '30 gün üst üste giriş yap', descriptionEn: 'Login 30 days in a row', icon: '🐤', category: 'activity', targetValue: 30, rewardCredits: 300 },
  { code: 'dedicated_user', nameTr: 'Sadık Kullanıcı', nameEn: 'Dedicated User', descriptionTr: '100 saat platformda geçir', descriptionEn: 'Spend 100 hours on platform', icon: '⏰', category: 'activity', targetValue: 6000, rewardCredits: 500 },
  { code: 'newcomer', nameTr: 'Yeni Üye', nameEn: 'Newcomer', descriptionTr: 'İlk falını baktır', descriptionEn: 'Get your first fortune', icon: '🎉', category: 'activity', targetValue: 1, rewardCredits: 50 },
]

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get or create achievements in database
    for (const achievement of ACHIEVEMENTS) {
      await prisma.achievement.upsert({
        where: { code: achievement.code },
        update: {},
        create: achievement
      })
    }

    // Fetch all achievements
    const allAchievements = await prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    })

    // Fetch user's achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId }
    })

    // Calculate progress for each achievement
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            fortunes: true,
            socialPosts: true,
            followers: true,
            videoStreams: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get fortune counts by type
    const fortunesByType = await prisma.fortune.groupBy({
      by: ['fortuneType'],
      where: { userId },
      _count: true
    })

    // Get social stats
    const likesReceived = await prisma.socialLike.count({
      where: { post: { userId } }
    })

    // Get coin stats
    const creditTransactions = await prisma.creditTransaction.findMany({
      where: { userId }
    })
    const totalGiftsSent = creditTransactions
      .filter(t => t.type === 'gift_sent')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const totalSpent = creditTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const totalEarned = creditTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)

    // Max viewers in a stream
    const maxViewers = await prisma.videoStream.findFirst({
      where: { userId },
      orderBy: { viewerCount: 'desc' },
      select: { viewerCount: true }
    })

    // Calculate progress for each achievement
    const achievementsWithProgress = allAchievements.map(achievement => {
      const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id)
      let currentProgress = 0

      switch (achievement.code) {
        case 'fortune_explorer':
        case 'fortune_master':
          currentProgress = user._count.fortunes
          break
        case 'coffee_master':
          currentProgress = fortunesByType.find(f => f.fortuneType === 'coffee')?._count || 0
          break
        case 'tarot_addict':
          currentProgress = fortunesByType.find(f => f.fortuneType === 'tarot')?._count || 0
          break
        case 'astrology_expert':
          currentProgress = (fortunesByType.find(f => f.fortuneType === 'horoscope')?._count || 0) +
                           (fortunesByType.find(f => f.fortuneType === 'daily_horoscope')?._count || 0)
          break
        case 'dream_interpreter':
          currentProgress = fortunesByType.find(f => f.fortuneType === 'dream')?._count || 0
          break
        case 'social_butterfly':
        case 'influencer':
          currentProgress = user._count.followers
          break
        case 'liked_creator':
        case 'viral_star':
          currentProgress = likesReceived
          break
        case 'content_creator':
          currentProgress = user._count.socialPosts
          break
        case 'live_star':
        case 'streaming_pro':
          currentProgress = user._count.videoStreams
          break
        case 'crowd_pleaser':
          currentProgress = maxViewers?.viewerCount || 0
          break
        case 'generous_user':
          currentProgress = totalGiftsSent
          break
        case 'big_spender':
          currentProgress = totalSpent
          break
        case 'coin_collector':
          currentProgress = totalEarned
          break
        case 'dedicated_user':
          currentProgress = user.totalTimeSpentMinutes || 0
          break
        case 'early_bird':
          currentProgress = user.loginStreak || 0
          break
        case 'newcomer':
          currentProgress = user._count.fortunes > 0 ? 1 : 0
          break
        default:
          currentProgress = 0
      }

      const isCompleted = currentProgress >= achievement.targetValue
      const progress = Math.min(100, Math.round((currentProgress / achievement.targetValue) * 100))

      // Update user achievement if needed
      if (!userAchievement || userAchievement.progress !== currentProgress) {
        const isNewlyCompleted = isCompleted && !userAchievement?.isCompleted
        prisma.userAchievement.upsert({
          where: {
            userId_achievementId: { userId, achievementId: achievement.id }
          },
          update: {
            progress: currentProgress,
            isCompleted,
            earnedAt: isNewlyCompleted ? new Date() : undefined
          },
          create: {
            userId,
            achievementId: achievement.id,
            progress: currentProgress,
            isCompleted
          }
        }).then(() => {
          if (isNewlyCompleted) {
            createNotificationWithPush({
              userId,
              type: 'achievement',
              message: `"${achievement.nameTr}" başarımını kazandın! ${achievement.icon}`,
              title: '\ud83c\udfc6 Yeni Başarım!'
            }).catch(e => console.error('Achievement notification error:', e))
          }
        }).catch(e => console.error('Achievement update error:', e))
      }

      return {
        ...achievement,
        name: achievement.nameTr, // Will be selected by language on frontend
        description: achievement.descriptionTr,
        currentProgress,
        progress,
        isCompleted,
        earnedAt: userAchievement?.isCompleted ? userAchievement.earnedAt : null
      }
    })

    // Group by category
    const categorized = {
      fortune: achievementsWithProgress.filter(a => a.category === 'fortune'),
      social: achievementsWithProgress.filter(a => a.category === 'social'),
      stream: achievementsWithProgress.filter(a => a.category === 'stream'),
      coin: achievementsWithProgress.filter(a => a.category === 'coin'),
      activity: achievementsWithProgress.filter(a => a.category === 'activity'),
    }

    const completedCount = achievementsWithProgress.filter(a => a.isCompleted).length
    const totalCount = achievementsWithProgress.length

    return NextResponse.json({
      achievements: achievementsWithProgress,
      categorized,
      completedCount,
      totalCount,
      completionPercentage: Math.round((completedCount / totalCount) * 100)
    })
  } catch (error) {
    console.error('Achievements error:', error)
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 })
  }
}
