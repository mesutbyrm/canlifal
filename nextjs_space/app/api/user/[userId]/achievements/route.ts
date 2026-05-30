import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    // Get all achievements
    const achievements = await prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }]
    })

    // Get user's achievement progress
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId }
    })

    const userAchievementMap = new Map(
      userAchievements.map((ua: { achievementId: string; progress: number; isCompleted: boolean; earnedAt: Date }) => [ua.achievementId, ua])
    )

    // Get user stats for calculating progress
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        _count: {
          select: {
            fortunes: true,
            socialPosts: true,
            followers: true,
            following: true
          }
        },
        jetonBalance: true,
        credits: true,
        createdAt: true
      }
    })

    // Get additional stats
    const [totalLikes, totalGiftsSent, totalStreams] = await Promise.all([
      prisma.socialLike.count({
        where: { post: { userId } }
      }),
      prisma.jetonTransaction.aggregate({
        where: { userId, type: 'spend', description: { contains: 'hediye' } },
        _sum: { amount: true }
      }),
      prisma.videoStream.count({
        where: { userId }
      })
    ])

    // Calculate current progress for each achievement
    const achievementsWithProgress = achievements.map((achievement: {
      id: string;
      code: string;
      nameTr: string;
      nameEn: string;
      descriptionTr: string;
      descriptionEn: string;
      icon: string;
      category: string;
      targetValue: number;
      rewardCredits: number;
      sortOrder: number;
    }) => {
      const userAch = userAchievementMap.get(achievement.id) as { achievementId: string; progress: number; isCompleted: boolean; earnedAt: Date } | undefined
      let currentProgress = userAch?.progress || 0

      // Calculate real-time progress based on category
      if (!userAch?.isCompleted) {
        switch (achievement.code) {
          case 'fortune_explorer':
          case 'fortune_master':
            currentProgress = user?._count.fortunes || 0
            break
          case 'social_butterfly':
          case 'influencer':
            currentProgress = user?._count.followers || 0
            break
          case 'liked_creator':
          case 'viral_star':
            currentProgress = totalLikes
            break
          case 'content_creator':
            currentProgress = user?._count.socialPosts || 0
            break
          case 'live_star':
          case 'streaming_pro':
            currentProgress = totalStreams
            break
          case 'generous_user':
            currentProgress = Math.abs(totalGiftsSent._sum.amount || 0)
            break
          case 'newcomer':
            currentProgress = user?._count.fortunes ? 1 : 0
            break
        }
      }

      const progressPercent = Math.min((currentProgress / achievement.targetValue) * 100, 100)
      const isCompleted = userAch?.isCompleted || currentProgress >= achievement.targetValue

      return {
        ...achievement,
        currentProgress,
        progressPercent,
        isCompleted,
        earnedAt: userAch?.earnedAt || null
      }
    })

    // Group by category
    const groupedAchievements = {
      fortune: achievementsWithProgress.filter((a: { category: string }) => a.category === 'fortune'),
      social: achievementsWithProgress.filter((a: { category: string }) => a.category === 'social'),
      stream: achievementsWithProgress.filter((a: { category: string }) => a.category === 'stream'),
      coin: achievementsWithProgress.filter((a: { category: string }) => a.category === 'coin'),
      activity: achievementsWithProgress.filter((a: { category: string }) => a.category === 'activity')
    }

    const completedCount = achievementsWithProgress.filter((a: { isCompleted: boolean }) => a.isCompleted).length
    const totalCount = achievementsWithProgress.length

    return NextResponse.json({
      achievements: achievementsWithProgress,
      grouped: groupedAchievements,
      stats: {
        completed: completedCount,
        total: totalCount,
        percentage: Math.round((completedCount / totalCount) * 100)
      }
    })
  } catch (error) {
    console.error('Error fetching achievements:', error)
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 })
  }
}
