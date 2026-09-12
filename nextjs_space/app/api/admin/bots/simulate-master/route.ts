export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'

// Master simulation controller - runs all 3 simulation engines in sequence
// with anti-spam safeguards and gradual activity scaling

const INTERNAL_BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

async function callSimEndpoint(path: string, cronSecret: string): Promise<any> {
  try {
    const res = await fetch(`${INTERNAL_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret
      },
      body: JSON.stringify({})
    })
    if (res.ok) return await res.json()
    return { error: `HTTP ${res.status}` }
  } catch (err: any) {
    return { error: err.message }
  }
}

// POST: Run a master simulation cycle (all engines)
export async function POST(req: NextRequest) {
  try {
    const cronSecret = req.headers.get('x-cron-secret')
    const isInternalCron = cronSecret === process.env.BOT_CRON_SECRET

    if (!isInternalCron) {
      const session = await getServerSession(authOptions)
      if (!session?.user?.role || !(await staffCan(session.user.role, (session?.user as any)?.id, 'system.config.manage', ['admin', 'yonetici']))) {
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
      }
    }

    const secret = process.env.BOT_CRON_SECRET || ''
    const startTime = Date.now()

    // ── Anti-spam: Check global cooldown (min 20s between master cycles) ──
    const lastMasterRun = await prisma.platformSettings.findUnique({
      where: { key: 'bot_master_last_run' }
    })
    if (lastMasterRun?.value) {
      const elapsed = Date.now() - new Date(lastMasterRun.value).getTime()
      if (elapsed < 20000) {
        return NextResponse.json({
          message: 'Cooldown aktif',
          cooldownRemaining: Math.ceil((20000 - elapsed) / 1000)
        })
      }
    }

    // Update last run timestamp
    await prisma.platformSettings.upsert({
      where: { key: 'bot_master_last_run' },
      update: { value: new Date().toISOString() },
      create: { key: 'bot_master_last_run', value: new Date().toISOString(), description: 'Son master simülasyon çalışma zamanı' }
    })

    // ── Run all engines sequentially with small delays ──
    const results: Record<string, any> = {}

    // 1. Chat simulation
    results.chat = await callSimEndpoint('/api/admin/bots/simulate', secret)

    // 2. Social simulation  
    results.social = await callSimEndpoint('/api/admin/bots/simulate-social', secret)

    // 3. Fortune/Dream simulation
    results.fortune = await callSimEndpoint('/api/admin/bots/simulate-fortune', secret)

    const totalActions = 
      (results.chat?.actions?.length || 0) +
      (results.social?.actions?.length || 0) +
      (results.fortune?.actions?.length || 0)

    // ── Track daily action count for gradual scaling ──
    const today = new Date().toISOString().split('T')[0]
    const dailyKey = `bot_daily_actions_${today}`
    const dailyRecord = await prisma.platformSettings.findUnique({
      where: { key: dailyKey }
    })
    const currentDailyCount = parseInt(dailyRecord?.value || '0')
    await prisma.platformSettings.upsert({
      where: { key: dailyKey },
      update: { value: String(currentDailyCount + totalActions) },
      create: { key: dailyKey, value: String(totalActions), description: `Günlük bot aksiyon sayısı: ${today}` }
    })

    return NextResponse.json({
      success: true,
      duration: Date.now() - startTime,
      totalActions,
      dailyTotal: currentDailyCount + totalActions,
      results: {
        chat: {
          actions: results.chat?.actions?.length || 0,
          error: results.chat?.error
        },
        social: {
          actions: results.social?.actions?.length || 0,
          error: results.social?.error
        },
        fortune: {
          actions: results.fortune?.actions?.length || 0,
          error: results.fortune?.error
        }
      }
    })
  } catch (error) {
    console.error('Master simulation error:', error)
    return NextResponse.json({ error: 'Master simülasyon hatası' }, { status: 500 })
  }
}

// GET: Get comprehensive simulation status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !(await staffCan(session.user.role, (session?.user as any)?.id, 'system.config.manage', ['admin', 'yonetici']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const botIds = (await prisma.user.findMany({
      where: { isBot: true },
      select: { id: true }
    })).map(b => b.id)

    const now = new Date()
    const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const h1 = new Date(now.getTime() - 60 * 60 * 1000)

    // ── Chat stats ──
    const chatMessagesH1 = await prisma.chatMessage.count({
      where: { userId: { in: botIds }, createdAt: { gte: h1 } }
    })
    const activePresences = await prisma.chatPresence.count({
      where: {
        userId: { in: botIds },
        lastSeen: { gte: new Date(now.getTime() - 5 * 60 * 1000) }
      }
    })

    // ── Social stats ──
    const follows = await prisma.follow.count({ where: { followerId: { in: botIds } } })
    const postLikesH24 = await prisma.socialLike.count({
      where: { userId: { in: botIds }, createdAt: { gte: h24 } }
    })
    const postCommentsH24 = await prisma.socialComment.count({
      where: { userId: { in: botIds }, createdAt: { gte: h24 } }
    })
    const streamCommentsH24 = await prisma.videoStreamComment.count({
      where: { userId: { in: botIds }, createdAt: { gte: h24 } }
    })

    // ── Fortune stats ──
    const dreamCommentsH24 = await prisma.dreamComment.count({
      where: { userId: { in: botIds }, createdAt: { gte: h24 } }
    })
    const dreamFavorites = await prisma.dreamFavorite.count({
      where: { userId: { in: botIds } }
    })
    const fortunePostsH24 = await prisma.socialPost.count({
      where: { userId: { in: botIds }, fortuneType: { not: null }, createdAt: { gte: h24 } }
    })

    // ── Bot overview ──
    const totalBots = botIds.length
    const activeBots = await prisma.botProfile.count({ where: { isActive: true } })

    // ── Daily action tracking ──
    const today = new Date().toISOString().split('T')[0]
    const dailyRecord = await prisma.platformSettings.findUnique({
      where: { key: `bot_daily_actions_${today}` }
    })

    // ── Last master run ──
    const lastRun = await prisma.platformSettings.findUnique({
      where: { key: 'bot_master_last_run' }
    })

    return NextResponse.json({
      overview: { totalBots, activeBots },
      chat: { messagesLastHour: chatMessagesH1, activeInRooms: activePresences },
      social: { follows, postLikesH24, postCommentsH24, streamCommentsH24 },
      fortune: { dreamCommentsH24, dreamFavorites, fortunePostsH24 },
      daily: {
        date: today,
        totalActions: parseInt(dailyRecord?.value || '0')
      },
      lastMasterRun: lastRun?.value || null
    })
  } catch (error) {
    console.error('Master status error:', error)
    return NextResponse.json({ error: 'Durum alınamadı' }, { status: 500 })
  }
}
