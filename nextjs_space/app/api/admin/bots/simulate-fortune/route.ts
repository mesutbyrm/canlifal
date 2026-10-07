export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { DREAM_COMMENTS, FORTUNE_POST_TEMPLATES, FORTUNE_TYPES, FORTUNE_TYPE_LABELS } from '@/lib/bot-fortune-messages'
import type { Personality } from '@/lib/bot-messages'
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pick(arr: readonly any[]): any {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── Configuration ──
const MAX_DREAM_COMMENTS_PER_CYCLE = 4
const MAX_DREAM_FAVORITES_PER_CYCLE = 6
const MAX_DREAM_VIEWS_PER_CYCLE = 10
const MAX_FORTUNE_POSTS_PER_CYCLE = 2

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }

function isInActiveHours(start: number, end: number): boolean {
  const now = new Date()
  const turkeyHour = (now.getUTCHours() + 3) % 24
  if (start <= end) return turkeyHour >= start && turkeyHour < end
  return turkeyHour >= start || turkeyHour < end
}

// POST: Run a fortune/dream simulation cycle
export async function POST(req: NextRequest) {
  try {
    const cronSecret = req.headers.get('x-cron-secret')
    const isInternalCron = cronSecret === process.env.BOT_CRON_SECRET

    if (!isInternalCron) {
      const session = await getHybridSession(req)
      if (!session?.user?.role || !(await staffCan(session.user.role, (session?.user as any)?.id, 'system.config.manage', ['admin', 'yonetici']))) {
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
      }
    }

    const actions: Array<{ bot: string; action: string; target?: string; detail?: string }> = []

    // ── 1. Get available bots ──
    const allActiveBots = await prisma.user.findMany({
      where: {
        isBot: true,
        botProfile: { isActive: true }
      },
      select: {
        id: true,
        name: true,
        botProfile: {
          select: {
            personality: true,
            activityLevel: true,
            activeHoursStart: true,
            activeHoursEnd: true,
            lastActionAt: true,
          }
        }
      }
    })

    // Filter by active hours + cooldown (skip bots that acted in last 3 min)
    const cooldownMs = 3 * 60 * 1000
    const availableBots = allActiveBots.filter(b =>
      b.botProfile && isInActiveHours(b.botProfile.activeHoursStart, b.botProfile.activeHoursEnd) &&
      (!b.botProfile.lastActionAt || Date.now() - new Date(b.botProfile.lastActionAt).getTime() > cooldownMs)
    )

    if (availableBots.length === 0) {
      return NextResponse.json({ message: 'Bu saatte aktif bot yok', actions: [] })
    }

    // ── 2. Get published dream interpretations ──
    const dreams = await prisma.dreamInterpretation.findMany({
      where: { isPublished: true },
      select: { id: true, title: true },
      take: 50,
      orderBy: { views: 'desc' }
    })

    if (dreams.length > 0) {
      // ── 3. Dream Comments ──
      const commentCount = rand(1, Math.min(MAX_DREAM_COMMENTS_PER_CYCLE, availableBots.length))
      for (let i = 0; i < commentCount; i++) {
        const bot = pick(availableBots)
        const dream = pick(dreams)
        const personality = (bot.botProfile?.personality || 'shy') as Personality
        const templates = DREAM_COMMENTS[personality] || DREAM_COMMENTS.shy
        const template = pick(templates)

        try {
          await prisma.dreamComment.create({
            data: {
              dreamId: dream.id,
              userId: bot.id,
              content: template.content,
              experienceType: template.experienceType,
              didComeTrue: template.didComeTrue ?? null,
            }
          })
          actions.push({
            bot: bot.name,
            action: 'dream_comment',
            target: dream.title.substring(0, 30),
            detail: template.content.substring(0, 50)
          })
        } catch {}
      }

      // ── 4. Dream Favorites ──
      const favCount = rand(2, Math.min(MAX_DREAM_FAVORITES_PER_CYCLE, availableBots.length))
      for (let i = 0; i < favCount; i++) {
        const bot = pick(availableBots)
        const dream = pick(dreams)

        try {
          await prisma.dreamFavorite.upsert({
            where: { userId_dreamId: { userId: bot.id, dreamId: dream.id } },
            update: {},
            create: { userId: bot.id, dreamId: dream.id }
          })
          actions.push({
            bot: bot.name,
            action: 'dream_favorite',
            target: dream.title.substring(0, 30)
          })
        } catch {}
      }

      // ── 5. Dream Views (increase view counts) ──
      const viewCount = rand(3, Math.min(MAX_DREAM_VIEWS_PER_CYCLE, availableBots.length))
      for (let i = 0; i < viewCount; i++) {
        const bot = pick(availableBots)
        const dream = pick(dreams)

        try {
          await prisma.dreamView.create({
            data: { userId: bot.id, dreamId: dream.id }
          })
          // Increment view count on the dream
          await prisma.dreamInterpretation.update({
            where: { id: dream.id },
            data: { views: { increment: 1 } }
          })
          actions.push({
            bot: bot.name,
            action: 'dream_view',
            target: dream.title.substring(0, 30)
          })
        } catch {}
      }
    }

    // ── 6. Fortune Social Posts (bot shares fortune experience) ──
    const postCount = rand(0, Math.min(MAX_FORTUNE_POSTS_PER_CYCLE, availableBots.length))
    for (let i = 0; i < postCount; i++) {
      const bot = pick(availableBots)
      const personality = (bot.botProfile?.personality || 'shy') as Personality
      const templates = FORTUNE_POST_TEMPLATES[personality] || FORTUNE_POST_TEMPLATES.shy
      const content = pick(templates)
      const fortuneTypesArray: string[] = [...FORTUNE_TYPES]
      const fortuneType = pick(fortuneTypesArray)

      try {
        await prisma.socialPost.create({
          data: {
            userId: bot.id,
            content,
            postType: 'text',
            fortuneType,
            isPublic: true,
            isAuto: false,
          }
        })
        actions.push({
          bot: bot.name,
          action: 'fortune_post',
          detail: `${FORTUNE_TYPE_LABELS[fortuneType] || fortuneType}: ${content.substring(0, 40)}`
        })
      } catch {}
    }

    // ── 7. Update bot stats ──
    const activeBotIdsThisCycle = [...new Set(actions.map(a => {
      const bot = availableBots.find(b => b.name === a.bot)
      return bot?.id
    }).filter(Boolean))] as string[]

    if (activeBotIdsThisCycle.length > 0) {
      await prisma.botProfile.updateMany({
        where: { userId: { in: activeBotIdsThisCycle } },
        data: { lastActionAt: new Date(), totalActions: { increment: 1 } }
      })
    }

    return NextResponse.json({
      success: true,
      cycle: {
        availableBots: availableBots.length,
        dreamsAvailable: dreams.length,
        actionsThisCycle: actions.length,
      },
      actions
    })
  } catch (error) {
    console.error('Fortune simulation error:', error)
    return NextResponse.json({ error: 'Fal simülasyon hatası' }, { status: 500 })
  }
}

// GET: Get fortune simulation status
export async function GET(req: NextRequest) {
  try {
    const session = await getHybridSession(req)
    if (!session?.user?.role || !(await staffCan(session.user.role, (session?.user as any)?.id, 'system.config.manage', ['admin', 'yonetici']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const botIds = (await prisma.user.findMany({
      where: { isBot: true },
      select: { id: true }
    })).map(b => b.id)

    // Bot dream comments (total + last 24h)
    const botDreamCommentsTotal = await prisma.dreamComment.count({
      where: { userId: { in: botIds } }
    })
    const botDreamComments24h = await prisma.dreamComment.count({
      where: {
        userId: { in: botIds },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })

    // Bot dream favorites
    const botDreamFavorites = await prisma.dreamFavorite.count({
      where: { userId: { in: botIds } }
    })

    // Bot dream views (last 24h)
    const botDreamViews24h = await prisma.dreamView.count({
      where: {
        userId: { in: botIds },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })

    // Bot fortune posts (last 24h)
    const botFortunePosts24h = await prisma.socialPost.count({
      where: {
        userId: { in: botIds },
        fortuneType: { not: null },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })

    // Total published dreams
    const totalDreams = await prisma.dreamInterpretation.count({
      where: { isPublished: true }
    })

    return NextResponse.json({
      botDreamCommentsTotal,
      botDreamComments24h,
      botDreamFavorites,
      botDreamViews24h,
      botFortunePosts24h,
      totalDreams
    })
  } catch (error) {
    console.error('Fortune status error:', error)
    return NextResponse.json({ error: 'Durum alınamadı' }, { status: 500 })
  }
}
