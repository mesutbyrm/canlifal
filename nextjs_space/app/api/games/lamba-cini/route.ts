import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// Weighted reward system for Lamba Cini
interface LambaCiniReward {
  type: 'cfc' | 'free_fortune' | 'empty'
  amount: number
  label: string
  emoji: string
  weight: number
}

const DEFAULT_REWARDS: LambaCiniReward[] = [
  { type: 'cfc', amount: 0, label: 'Boş Sandık', emoji: '💨', weight: 20 },
  { type: 'cfc', amount: 1, label: '1 CFC', emoji: '🪙', weight: 25 },
  { type: 'cfc', amount: 2, label: '2 CFC', emoji: '💰', weight: 20 },
  { type: 'cfc', amount: 3, label: '3 CFC', emoji: '💎', weight: 15 },
  { type: 'free_fortune', amount: 0, label: 'Ücretsiz Fal', emoji: '🔮', weight: 10 },
  { type: 'empty', amount: 0, label: 'Boş Kart', emoji: '🃏', weight: 10 },
]

function pickWeightedReward(rewards: LambaCiniReward[]): LambaCiniReward {
  const totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0)
  let random = Math.random() * totalWeight
  for (const reward of rewards) {
    random -= reward.weight
    if (random <= 0) return reward
  }
  return rewards[rewards.length - 1]
}

// POST: Play Lamba Cini game
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const { chestIndex } = await req.json()
    if (chestIndex === undefined || chestIndex < 0 || chestIndex > 2) {
      return NextResponse.json({ error: 'Geçersiz sandık seçimi' }, { status: 400 })
    }

    // Find the game
    const game = await prisma.miniGame.findUnique({ where: { slug: 'lamba-cini' } })
    if (!game || !game.isActive) {
      return NextResponse.json({ error: 'Oyun aktif değil' }, { status: 404 })
    }

    // Parse config for daily limit and custom rewards
    let config: any = {}
    try { config = game.config ? JSON.parse(game.config) : {} } catch {}
    const dailyLimit = config.dailyLimit || 3
    const rewards: LambaCiniReward[] = config.rewards || DEFAULT_REWARDS

    // Check daily limit
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayPlays = await prisma.gamePlay.count({
      where: {
        userId: authUser.id,
        gameId: game.id,
        playedAt: { gte: today, lt: tomorrow },
      },
    })

    if (todayPlays >= dailyLimit) {
      return NextResponse.json({
        error: 'Günlük hakkınız doldu',
        dailyLimit,
        playsUsed: todayPlays,
        playsRemaining: 0,
      }, { status: 429 })
    }

    // Pick a weighted reward
    const reward = pickWeightedReward(rewards)

    // Calculate CFC reward
    const cfcReward = reward.type === 'cfc' ? reward.amount : 0

    // Handle free fortune: increment user's freeFortuneCount or credits
    let freeFortune = false
    if (reward.type === 'free_fortune') {
      freeFortune = true
      // Add 1 credit as free fortune equivalent
      await prisma.user.update({
        where: { id: authUser.id },
        data: { credits: { increment: 5 } },
      })
    }

    // Record game play
    const play = await prisma.gamePlay.create({
      data: {
        userId: authUser.id,
        gameId: game.id,
        reward: cfcReward,
        score: chestIndex,
        result: JSON.stringify({
          rewardType: reward.type,
          rewardLabel: reward.label,
          rewardEmoji: reward.emoji,
          rewardAmount: reward.amount,
          chestIndex,
        }),
      },
    })

    // Update CFC balance if CFC reward
    if (cfcReward > 0) {
      await prisma.user.update({
        where: { id: authUser.id },
        data: { credits: { increment: cfcReward } },
      })
    }

    // Update game profile
    await prisma.userGameProfile.upsert({
      where: { userId: authUser.id },
      create: {
        userId: authUser.id,
        totalJetons: cfcReward + (freeFortune ? 5 : 0),
        totalGames: 1,
      },
      update: {
        totalJetons: { increment: cfcReward + (freeFortune ? 5 : 0) },
        totalGames: { increment: 1 },
      },
    })

    // Update daily quest: play_3_games
    const todayQuest = new Date()
    todayQuest.setHours(0, 0, 0, 0)
    await prisma.dailyQuest.upsert({
      where: {
        userId_questDate_questType: {
          userId: authUser.id,
          questDate: todayQuest,
          questType: 'play_3_games',
        },
      },
      create: {
        userId: authUser.id,
        questDate: todayQuest,
        questType: 'play_3_games',
        progress: 1,
        target: 3,
        reward: 15,
      },
      update: {
        progress: { increment: 1 },
      },
    })

    // Get updated balance
    const updatedUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { credits: true },
    })

    return NextResponse.json({
      success: true,
      reward: {
        type: reward.type,
        amount: reward.type === 'free_fortune' ? 5 : reward.amount,
        label: reward.label,
        emoji: reward.emoji,
      },
      newBalance: updatedUser?.credits || 0,
      playsUsed: todayPlays + 1,
      playsRemaining: dailyLimit - (todayPlays + 1),
      dailyLimit,
    })
  } catch (error: any) {
    console.error('Lamba Cini play error:', error)
    return NextResponse.json({ error: 'Oyun oynanamadı' }, { status: 500 })
  }
}

// GET: Check remaining plays for today
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const game = await prisma.miniGame.findUnique({ where: { slug: 'lamba-cini' } })
    if (!game) {
      return NextResponse.json({ error: 'Oyun bulunamadı' }, { status: 404 })
    }

    let config: any = {}
    try { config = game.config ? JSON.parse(game.config) : {} } catch {}
    const dailyLimit = config.dailyLimit || 3

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayPlays = await prisma.gamePlay.count({
      where: {
        userId: authUser.id,
        gameId: game.id,
        playedAt: { gte: today, lt: tomorrow },
      },
    })

    return NextResponse.json({
      dailyLimit,
      playsUsed: todayPlays,
      playsRemaining: Math.max(0, dailyLimit - todayPlays),
    })
  } catch (error: any) {
    console.error('Lamba Cini status error:', error)
    return NextResponse.json({ error: 'Durum alınamadı' }, { status: 500 })
  }
}
