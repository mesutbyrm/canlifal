export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'
import { POST_COMMENTS, STREAM_COMMENTS, STREAM_EMOJIS } from '@/lib/bot-social-messages'
import type { Personality } from '@/lib/bot-messages'
import { staffCan } from '@/lib/permissions'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickRandom(arr: readonly any[]): any {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── Configuration ──
const MAX_FOLLOWS_PER_CYCLE = 5
const MAX_LIKES_PER_CYCLE = 8
const MAX_COMMENTS_PER_CYCLE = 4
const MAX_STREAM_COMMENTS_PER_CYCLE = 6
const MAX_STREAM_LIKES_PER_CYCLE = 5

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }

function isInActiveHours(start: number, end: number): boolean {
  const now = new Date()
  const turkeyHour = (now.getUTCHours() + 3) % 24
  if (start <= end) return turkeyHour >= start && turkeyHour < end
  return turkeyHour >= start || turkeyHour < end
}

// POST: Run a social simulation cycle
export async function POST(req: NextRequest) {
  try {
    const cronSecret = req.headers.get('x-cron-secret')
    const isInternalCron = cronSecret === process.env.BOT_CRON_SECRET

    if (!isInternalCron) {
      const session = await getStaffSession()
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

    const botIds = allActiveBots.map(b => b.id)

    // ── 2. Follow Actions ──
    // Bots follow real users and occasionally each other
    const realUsers = await prisma.user.findMany({
      where: { isBot: false },
      select: { id: true, name: true },
      take: 50,
      orderBy: { lastActiveAt: 'desc' }
    })

    const followCandidates = [...realUsers, ...availableBots.slice(0, 10).map(b => ({ id: b.id, name: b.name }))]
    const followCount = rand(1, Math.min(MAX_FOLLOWS_PER_CYCLE, availableBots.length))

    for (let i = 0; i < followCount; i++) {
      const bot = pickRandom(availableBots)
      const target = pickRandom(followCandidates)
      if (bot.id === target.id) continue

      const actLevel = bot.botProfile?.activityLevel || 'medium'
      const prob = actLevel === 'high' ? 0.7 : actLevel === 'low' ? 0.2 : 0.4
      if (Math.random() > prob) continue

      try {
        await prisma.follow.upsert({
          where: { followerId_followingId: { followerId: bot.id, followingId: target.id } },
          update: {},
          create: { followerId: bot.id, followingId: target.id }
        })
        actions.push({ bot: bot.name, action: 'follow', target: target.name })
      } catch {}
    }

    // ── 3. Like Social Posts ──
    const recentPosts = await prisma.socialPost.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        isPublic: true
      },
      select: { id: true, content: true, userId: true, user: { select: { name: true } } },
      take: 30,
      orderBy: { createdAt: 'desc' }
    })

    if (recentPosts.length > 0) {
      const likeCount = rand(2, Math.min(MAX_LIKES_PER_CYCLE, availableBots.length))
      for (let i = 0; i < likeCount; i++) {
        const bot = pickRandom(availableBots)
        const post = pickRandom(recentPosts)
        if (bot.id === post.userId) continue

        try {
          await prisma.socialLike.upsert({
            where: { postId_userId: { postId: post.id, userId: bot.id } },
            update: {},
            create: { postId: post.id, userId: bot.id }
          })
          actions.push({ bot: bot.name, action: 'like_post', target: post.user.name, detail: post.content.substring(0, 40) })
        } catch {}
      }

      // ── 4. Comment on Social Posts ──
      const commentCount = rand(1, Math.min(MAX_COMMENTS_PER_CYCLE, availableBots.length))
      for (let i = 0; i < commentCount; i++) {
        const bot = pickRandom(availableBots)
        const post = pickRandom(recentPosts)
        if (bot.id === post.userId) continue

        const personality = (bot.botProfile?.personality || 'shy') as Personality
        const templates = POST_COMMENTS[personality] || POST_COMMENTS.shy
        const comment = pickRandom(templates)

        try {
          await prisma.socialComment.create({
            data: { postId: post.id, userId: bot.id, content: comment }
          })
          actions.push({ bot: bot.name, action: 'comment_post', target: post.user.name, detail: comment })
        } catch {}
      }
    }

    // ── 5. Interact with Live Streams ──
    const liveStreams = await prisma.videoStream.findMany({
      where: { status: 'live' },
      select: { id: true, title: true, userId: true, user: { select: { name: true } } }
    })

    if (liveStreams.length > 0) {
      // Stream comments
      const streamCommentCount = rand(2, Math.min(MAX_STREAM_COMMENTS_PER_CYCLE, availableBots.length))
      for (let i = 0; i < streamCommentCount; i++) {
        const bot = pickRandom(availableBots)
        const stream = pickRandom(liveStreams)

        const personality = (bot.botProfile?.personality || 'shy') as Personality
        // Mix between text comments and emoji reactions
        const useEmoji = Math.random() < 0.3
        const content = useEmoji
          ? pickRandom(STREAM_EMOJIS)
          : pickRandom(STREAM_COMMENTS[personality] || STREAM_COMMENTS.shy)

        try {
          await prisma.videoStreamComment.create({
            data: {
              streamId: stream.id,
              userId: bot.id,
              content,
              nickname: bot.name
            }
          })
          actions.push({ bot: bot.name, action: 'stream_comment', target: stream.user.name, detail: content })
        } catch {}
      }

      // Stream likes
      const streamLikeCount = rand(1, Math.min(MAX_STREAM_LIKES_PER_CYCLE, availableBots.length))
      for (let i = 0; i < streamLikeCount; i++) {
        const bot = pickRandom(availableBots)
        const stream = pickRandom(liveStreams)

        try {
          await prisma.videoStreamLike.upsert({
            where: { streamId_userId: { streamId: stream.id, userId: bot.id } },
            update: {},
            create: { streamId: stream.id, userId: bot.id }
          })
          // Also increment the likeCount on the stream
          await prisma.videoStream.update({
            where: { id: stream.id },
            data: { likeCount: { increment: 1 } }
          })
          actions.push({ bot: bot.name, action: 'stream_like', target: stream.user.name })
        } catch {}
      }

      // Stream viewer join (add bots as viewers)
      const viewerCount = rand(1, Math.min(4, availableBots.length))
      for (let i = 0; i < viewerCount; i++) {
        const bot = pickRandom(availableBots)
        const stream = pickRandom(liveStreams)

        try {
          await prisma.videoStreamViewer.upsert({
            where: { streamId_viewerId: { streamId: stream.id, viewerId: bot.id } },
            update: { leftAt: null },
            create: {
              streamId: stream.id,
              viewerId: bot.id,
              viewerName: bot.name,
              nickname: bot.name
            }
          })
          // Increment viewer count
          await prisma.videoStream.update({
            where: { id: stream.id },
            data: { viewerCount: { increment: 1 } }
          })
          actions.push({ bot: bot.name, action: 'stream_view', target: stream.user.name })
        } catch {}
      }
    }

    // ── 6. Update bot stats ──
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
        recentPosts: recentPosts.length,
        liveStreams: liveStreams.length,
        actionsThisCycle: actions.length,
      },
      actions
    })
  } catch (error) {
    console.error('Social simulation error:', error)
    return NextResponse.json({ error: 'Sosyal simülasyon hatası' }, { status: 500 })
  }
}

// GET: Get social simulation status
export async function GET(req: NextRequest) {
  try {
    const session = await getStaffSession()
    if (!session?.user?.role || !(await staffCan(session.user.role, (session?.user as any)?.id, 'system.config.manage', ['admin', 'yonetici']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const botIds = (await prisma.user.findMany({
      where: { isBot: true },
      select: { id: true }
    })).map(b => b.id)

    // Bot follows count
    const botFollows = await prisma.follow.count({
      where: { followerId: { in: botIds } }
    })

    // Bot likes on posts (last 24h)
    const botPostLikes24h = await prisma.socialLike.count({
      where: {
        userId: { in: botIds },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })

    // Bot comments on posts (last 24h)
    const botPostComments24h = await prisma.socialComment.count({
      where: {
        userId: { in: botIds },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })

    // Bot stream comments (last 24h)
    const botStreamComments24h = await prisma.videoStreamComment.count({
      where: {
        userId: { in: botIds },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })

    // Bot stream likes
    const botStreamLikes = await prisma.videoStreamLike.count({
      where: { userId: { in: botIds } }
    })

    // Current live streams
    const liveStreams = await prisma.videoStream.count({
      where: { status: 'live' }
    })

    // Recent social posts count
    const recentPosts = await prisma.socialPost.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        isPublic: true
      }
    })

    return NextResponse.json({
      botFollows,
      botPostLikes24h,
      botPostComments24h,
      botStreamComments24h,
      botStreamLikes,
      liveStreams,
      recentPosts
    })
  } catch (error) {
    console.error('Social status error:', error)
    return NextResponse.json({ error: 'Durum alınamadı' }, { status: 500 })
  }
}
