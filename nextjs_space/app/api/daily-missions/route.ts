export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

const MISSIONS = [
  { type: 'login', title: 'Günlük Giriş', description: 'Uygulamaya giriş yap', reward: 5, icon: '👋', autoComplete: true },
  { type: 'open_fortune', title: 'Fal Baktır', description: 'Herhangi bir fal türünü aç', reward: 10, icon: '🔮', autoComplete: false },
  { type: 'watch_stream', title: 'Canlı Yayın İzle', description: 'Bir canlı yayına katıl', reward: 5, icon: '📹', autoComplete: false },
  { type: 'send_gift', title: 'Hediye Gönder', description: 'Bir falcıya hediye gönder', reward: 10, icon: '🎁', autoComplete: false },
  { type: 'profile_complete', title: 'Profilini Tamamla', description: 'Profil bilgilerini güncelle', reward: 15, icon: '👤', autoComplete: false },
  { type: 'share', title: 'Paylaş', description: 'Bir falı veya yayını paylaş', reward: 5, icon: '📤', autoComplete: false },
]

export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const completedTasks = await prisma.dailyTask.findMany({
      where: { userId: authUser.id, date: today },
    })
    const completedTypes = new Set(completedTasks.map((t: any) => t.taskType))

    // Get user streak
    const streak = await prisma.userFortuneStreak.findUnique({
      where: { userId: authUser.id },
    })

    const missions = MISSIONS.map(m => ({
      ...m,
      completed: completedTypes.has(m.type),
      earnedJeton: completedTasks.find((t: any) => t.taskType === m.type)?.jetonEarned || 0,
    }))

    const totalReward = missions.filter(m => m.completed).reduce((s, m) => s + m.reward, 0)
    const allCompleted = missions.every(m => m.completed)

    // Check if all-complete bonus was claimed
    const allBonusClaimed = completedTypes.has('all_complete_bonus')

    return NextResponse.json({
      missions,
      totalReward,
      allCompleted,
      allBonusClaimed,
      streak: streak ? {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
      } : { currentStreak: 0, longestStreak: 0 },
    })
  } catch (error: any) {
    console.error('[DailyMissions GET] Error:', error)
    return NextResponse.json({ error: 'Görevler alınamadı' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { taskType } = await req.json()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const mission = MISSIONS.find(m => m.type === taskType)
    if (!mission && taskType !== 'all_complete_bonus') {
      return NextResponse.json({ error: 'Geçersiz görev' }, { status: 400 })
    }

    // Check already completed
    const existing = await prisma.dailyTask.findUnique({
      where: { userId_taskType_date: { userId: authUser.id, taskType, date: today } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Bu görev zaten tamamlandı', alreadyClaimed: true }, { status: 400 })
    }

    // All complete bonus
    if (taskType === 'all_complete_bonus') {
      const completedTasks = await prisma.dailyTask.findMany({
        where: { userId: authUser.id, date: today },
      })
      const completedTypes = new Set(completedTasks.map((t: any) => t.taskType))
      const allDone = MISSIONS.every(m => completedTypes.has(m.type))
      if (!allDone) {
        return NextResponse.json({ error: 'Tüm görevleri tamamlamadan bonus alamazsınız' }, { status: 400 })
      }

      const bonusAmount = 25
      const user = await prisma.user.findUnique({ where: { id: authUser.id }, select: { credits: true } })
      const newBalance = (user?.credits || 0) + bonusAmount
      await prisma.$transaction([
        prisma.user.update({ where: { id: authUser.id }, data: { credits: { increment: bonusAmount } } }),
        prisma.creditTransaction.create({
          data: { userId: authUser.id, amount: bonusAmount, type: 'daily_bonus', description: 'Tüm günlük görevler tamamlandı bonusu', balance: newBalance },
        }),
        prisma.dailyTask.create({ data: { userId: authUser.id, taskType: 'all_complete_bonus', jetonEarned: bonusAmount, date: today } }),
      ])
      return NextResponse.json({ success: true, creditsEarned: bonusAmount })
    }

    // Complete a regular mission
    const reward = mission!.reward
    const user = await prisma.user.findUnique({ where: { id: authUser.id }, select: { credits: true } })
    const newBalance = (user?.credits || 0) + reward
    await prisma.$transaction([
      prisma.user.update({ where: { id: authUser.id }, data: { credits: { increment: reward } } }),
      prisma.creditTransaction.create({
        data: { userId: authUser.id, amount: reward, type: 'daily_bonus', description: `Günlük görev: ${mission!.title}`, balance: newBalance },
      }),
      prisma.dailyTask.create({ data: { userId: authUser.id, taskType, jetonEarned: reward, date: today } }),
    ])

    return NextResponse.json({ success: true, creditsEarned: reward })
  } catch (error: any) {
    console.error('[DailyMissions POST] Error:', error)
    return NextResponse.json({ error: 'Görev tamamlanamadı' }, { status: 500 })
  }
}
