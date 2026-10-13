import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

const QUEST_DEFINITIONS = [
  { type: 'daily_login', title: 'Günlük Giriş', target: 1, reward: 10, icon: '🔑' },
  { type: 'play_3_games', title: '3 Oyun Oyna', target: 3, reward: 15, icon: '🎮' },
  { type: 'buy_fortune', title: 'Fal Satın Al', target: 1, reward: 20, icon: '🔮' },
]

// GET: Fetch daily quests for user
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Ensure all quests exist for today
    for (const quest of QUEST_DEFINITIONS) {
      await prisma.dailyQuest.upsert({
        where: {
          userId_questDate_questType: {
            userId: authUser.id,
            questDate: today,
            questType: quest.type,
          },
        },
        create: {
          userId: authUser.id,
          questDate: today,
          questType: quest.type,
          target: quest.target,
          reward: quest.reward,
          progress: 0,
        },
        update: {},
      })
    }

    const quests = await prisma.dailyQuest.findMany({
      where: { userId: authUser.id, questDate: today },
    })

    // Map with definitions
    const result = QUEST_DEFINITIONS.map(def => {
      const quest = quests.find((q: any) => q.questType === def.type)
      return {
        ...def,
        progress: quest?.progress || 0,
        claimed: quest?.claimed || false,
        completed: (quest?.progress || 0) >= def.target,
      }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Quests fetch error:', error)
    return NextResponse.json({ error: 'Görevler yüklenemedi' }, { status: 500 })
  }
}

// POST: Claim quest reward
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const { questType } = await req.json()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const quest = await prisma.dailyQuest.findUnique({
      where: {
        userId_questDate_questType: {
          userId: authUser.id,
          questDate: today,
          questType,
        },
      },
    })

    if (!quest) {
      return NextResponse.json({ error: 'Görev bulunamadı' }, { status: 404 })
    }
    if (quest.claimed) {
      return NextResponse.json({ error: 'Ödül zaten alındı' }, { status: 400 })
    }
    if (quest.progress < quest.target) {
      return NextResponse.json({ error: 'Görev henüz tamamlanmadı' }, { status: 400 })
    }

    // Claim reward
    await prisma.dailyQuest.update({
      where: { id: quest.id },
      data: { claimed: true, claimedAt: new Date() },
    })

    await prisma.user.update({
      where: { id: authUser.id },
      data: { credits: { increment: quest.reward } },
    })

    const updatedUser = await prisma.user.findUnique({ where: { id: authUser.id }, select: { credits: true } })

    return NextResponse.json({
      success: true,
      reward: quest.reward,
      newBalance: updatedUser?.credits || 0,
    })
  } catch (error: any) {
    console.error('Quest claim error:', error)
    return NextResponse.json({ error: 'Ödül alınamadı' }, { status: 500 })
  }
}
