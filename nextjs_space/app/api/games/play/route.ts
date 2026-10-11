import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'
import { logActivity } from '@/lib/activity-logger'

export const dynamic = 'force-dynamic'

// POST: Record a game play and reward CFC (credits)
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    const { gameSlug, score, result } = await req.json()
    if (!gameSlug) {
      return NextResponse.json({ error: 'Oyun belirtilmedi' }, { status: 400 })
    }

    const game = await prisma.miniGame.findUnique({ where: { slug: gameSlug } })
    if (!game || !game.isActive) {
      return NextResponse.json({ error: 'Oyun bulunamadı veya aktif değil' }, { status: 404 })
    }

    // Check entry fee (CFC)
    if (game.entryFee > 0) {
      const user = await prisma.user.findUnique({ where: { id: authUser.id }, select: { credits: true } })
      if (!user || user.credits < game.entryFee) {
        return NextResponse.json({ error: 'Yetersiz CFC' }, { status: 400 })
      }
    }

    // Calculate reward
    const reward = Math.floor(Math.random() * (game.maxReward - game.minReward + 1)) + game.minReward

    // Create game play record
    const play = await prisma.gamePlay.create({
      data: {
        userId: authUser.id,
        gameId: game.id,
        reward,
        score: score || null,
        result: result ? JSON.stringify(result) : null,
      },
    })

    // Update user CFC balance (reward - entry fee)
    const netCfc = reward - game.entryFee
    await prisma.user.update({
      where: { id: authUser.id },
      data: { credits: { increment: netCfc } },
    })

    // Log game activity
    logActivity({
      userId: authUser.id,
      userName: (authUser as any)?.name || 'Kullanıcı',
      userAvatar: (authUser as any)?.image || null,
      activityType: 'game_played',
      detail: `${game.title} oynadı 🎮`,
      targetUrl: `/oyunlar`,
    })

    // Update or create game profile
    await prisma.userGameProfile.upsert({
      where: { userId: authUser.id },
      create: {
        userId: authUser.id,
        totalJetons: reward,
        totalGames: 1,
      },
      update: {
        totalJetons: { increment: reward },
        totalGames: { increment: 1 },
      },
    })

    // Update daily quest: play_3_games
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    await prisma.dailyQuest.upsert({
      where: {
        userId_questDate_questType: {
          userId: authUser.id,
          questDate: today,
          questType: 'play_3_games',
        },
      },
      create: {
        userId: authUser.id,
        questDate: today,
        questType: 'play_3_games',
        progress: 1,
        target: 3,
        reward: 15,
      },
      update: {
        progress: { increment: 1 },
      },
    })

    // Calculate level
    const profile = await prisma.userGameProfile.findUnique({ where: { userId: authUser.id } })
    if (profile) {
      let level = 1
      let title = 'Yeni Üye'
      if (profile.totalJetons >= 2000) { level = 5; title = 'VIP' }
      else if (profile.totalJetons >= 500) { level = 4; title = 'Usta' }
      else if (profile.totalJetons >= 200) { level = 3; title = 'Deneyimli' }
      else if (profile.totalJetons >= 100) { level = 2; title = 'Çırak' }

      if (profile.level !== level) {
        await prisma.userGameProfile.update({
          where: { userId: authUser.id },
          data: { level, levelTitle: title },
        })
      }
    }

    // Get updated CFC balance
    const updatedUser = await prisma.user.findUnique({ where: { id: authUser.id }, select: { credits: true } })

    return NextResponse.json({
      success: true,
      reward,
      entryFee: game.entryFee,
      netCfc,
      newBalance: updatedUser?.credits || 0,
      playId: play.id,
    })
  } catch (error: any) {
    console.error('Game play error:', error)
    return NextResponse.json({ error: 'Oyun kaydedilemedi' }, { status: 500 })
  }
}
