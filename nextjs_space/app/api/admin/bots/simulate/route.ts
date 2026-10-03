export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'
import { generateBotMessage, type Personality } from '@/lib/bot-messages'
import { staffCan } from '@/lib/permissions'

// ── Configuration ──
const MAX_CONCURRENT_BOTS_PER_ROOM = 8  // Max bots active in one room at a time
const MAX_TOTAL_ACTIVE_BOTS = 25        // Max bots active across all rooms
const MESSAGE_TYPES = ['greeting', 'chat', 'farewell', 'reaction', 'fortune', 'general'] as const

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pick(arr: readonly any[]): any { return arr[Math.floor(Math.random() * arr.length)] }

// Check if current hour falls within bot's active hours
function isInActiveHours(start: number, end: number): boolean {
  const now = new Date()
  // Use Turkey time (UTC+3)
  const turkeyHour = (now.getUTCHours() + 3) % 24
  if (start <= end) return turkeyHour >= start && turkeyHour < end
  // Wraps midnight (e.g., 22-02)
  return turkeyHour >= start || turkeyHour < end
}

// POST: Run a simulation cycle
// Can be called via cron job or manually from admin panel
export async function POST(req: NextRequest) {
  try {
    // Auth check: admin only OR internal cron secret
    const cronSecret = req.headers.get('x-cron-secret')
    const isInternalCron = cronSecret === process.env.BOT_CRON_SECRET

    if (!isInternalCron) {
      const session = await getStaffSession()
      if (!session?.user?.role || !(await staffCan(session.user.role, (session?.user as any)?.id, 'system.config.manage', ['admin', 'yonetici']))) {
        return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
      }
    }

    const body = await req.json().catch(() => ({}))
    const roomId = body.roomId // Optional: target specific room
    const actionType = body.action // Optional: force specific action type

    // ── 1. Get active rooms ──
    const rooms = await prisma.chatRoom.findMany({
      where: {
        isActive: true,
        ...(roomId ? { id: roomId } : {})
      },
      select: { id: true, slug: true, nameTr: true }
    })

    if (rooms.length === 0) {
      return NextResponse.json({ message: 'Aktif oda yok', actions: [] })
    }

    // ── 2. Get available bots (active, within active hours) ──
    const allActiveBots = await prisma.user.findMany({
      where: {
        isBot: true,
        botProfile: { isActive: true }
      },
      select: {
        id: true,
        name: true,
        username: true,
        botProfile: {
          select: {
            personality: true,
            activityLevel: true,
            activeHoursStart: true,
            activeHoursEnd: true,
            totalActions: true,
            lastActionAt: true
          }
        }
      }
    })

    // Filter by active hours + cooldown (skip bots that acted in last 2 min)
    const cooldownMs = 2 * 60 * 1000
    const availableBots = allActiveBots.filter(b =>
      b.botProfile && isInActiveHours(b.botProfile.activeHoursStart, b.botProfile.activeHoursEnd) &&
      (!b.botProfile.lastActionAt || Date.now() - new Date(b.botProfile.lastActionAt).getTime() > cooldownMs)
    )

    if (availableBots.length === 0) {
      return NextResponse.json({ message: 'Bu saatte aktif bot yok', actions: [] })
    }

    // ── 3. Check current bot presences across all rooms ──
    const botIds = allActiveBots.map(b => b.id)
    const currentPresences = await prisma.chatPresence.findMany({
      where: {
        userId: { in: botIds },
        lastSeen: { gte: new Date(Date.now() - 5 * 60 * 1000) } // active in last 5 min
      },
      select: { userId: true, roomId: true }
    })

    const botsInRooms = new Map<string, string[]>() // roomId -> botUserIds[]
    const botCurrentRoom = new Map<string, string>() // botUserId -> roomId
    for (const p of currentPresences) {
      if (!botsInRooms.has(p.roomId)) botsInRooms.set(p.roomId, [])
      botsInRooms.get(p.roomId)!.push(p.userId)
      botCurrentRoom.set(p.userId, p.roomId)
    }

    const totalActiveBots = botCurrentRoom.size
    const actions: Array<{ bot: string; room: string; action: string; message?: string }> = []

    // ── 4. Decide actions for this cycle ──
    // Number of bots to activate this cycle (gradual, not all at once)
    const botsToActivate = rand(2, Math.min(6, availableBots.length))

    for (let i = 0; i < botsToActivate; i++) {
      const bot = pick(availableBots)
      const personality = (bot.botProfile?.personality || 'shy') as Personality
      const actLevel = bot.botProfile?.activityLevel || 'medium'
      const isCurrentlyInRoom = botCurrentRoom.has(bot.id)

      // Activity probability based on level
      const actProb = actLevel === 'high' ? 0.8 : actLevel === 'low' ? 0.3 : 0.5
      if (Math.random() > actProb) continue

      // Anti-spam: respect max limits
      if (!isCurrentlyInRoom && totalActiveBots + actions.filter(a => a.action === 'join').length >= MAX_TOTAL_ACTIVE_BOTS) continue

      const targetRoom = pick(rooms)
      const botsInTargetRoom = botsInRooms.get(targetRoom.id)?.length || 0

      if (isCurrentlyInRoom) {
        const currentRoomId = botCurrentRoom.get(bot.id)!

        // 30% chance to leave, 70% chance to chat
        if (Math.random() < 0.3 || actionType === 'leave') {
          // Leave room
          const farewell = generateBotMessage(personality, 'farewell')
          try {
            await prisma.chatMessage.create({
              data: { roomId: currentRoomId, userId: bot.id, content: farewell }
            })
            await prisma.chatPresence.deleteMany({
              where: { roomId: currentRoomId, userId: bot.id }
            })
            await prisma.botProfile.update({
              where: { userId: bot.id },
              data: { lastActionAt: new Date(), totalActions: { increment: 1 } }
            })
            actions.push({ bot: bot.name, room: targetRoom.nameTr, action: 'leave', message: farewell })
          } catch {}
        } else {
          // Send message in current room
          const msgTypes: Array<'chat' | 'fortune' | 'general' | 'reaction'> = ['chat', 'chat', 'chat', 'fortune', 'general', 'reaction']
          const msgType = pick(msgTypes)
          const finalType: 'greeting' | 'chat' | 'farewell' | 'reaction' | 'fortune' | 'general' = actionType === 'chat' ? 'chat' : msgType
          const message = generateBotMessage(personality, finalType)
          try {
            await prisma.chatMessage.create({
              data: { roomId: currentRoomId, userId: bot.id, content: message }
            })
            // Update presence
            await prisma.chatPresence.updateMany({
              where: { roomId: currentRoomId, userId: bot.id },
              data: { lastSeen: new Date() }
            })
            await prisma.botProfile.update({
              where: { userId: bot.id },
              data: { lastActionAt: new Date(), totalActions: { increment: 1 } }
            })
            actions.push({ bot: bot.name, room: targetRoom.nameTr, action: 'message', message })
          } catch {}
        }
      } else {
        // Not in a room - try to join
        if (botsInTargetRoom >= MAX_CONCURRENT_BOTS_PER_ROOM) continue

        const greeting = generateBotMessage(personality, 'greeting')
        try {
          // Create presence (upsert to avoid duplicates)
          await prisma.chatPresence.upsert({
            where: { roomId_userId: { roomId: targetRoom.id, userId: bot.id } },
            update: { lastSeen: new Date(), seatIndex: -1 },
            create: {
              roomId: targetRoom.id,
              userId: bot.id,
              nickname: bot.name,
              lastSeen: new Date(),
              seatIndex: -1
            }
          })
          // Send greeting message
          await prisma.chatMessage.create({
            data: { roomId: targetRoom.id, userId: bot.id, content: greeting }
          })
          await prisma.botProfile.update({
            where: { userId: bot.id },
            data: { lastActionAt: new Date(), totalActions: { increment: 1 } }
          })
          // Update lastActiveAt on user
          await prisma.user.update({
            where: { id: bot.id },
            data: { lastActiveAt: new Date() }
          })
          actions.push({ bot: bot.name, room: targetRoom.nameTr, action: 'join', message: greeting })
        } catch {}
      }
    }

    // ── 5. Cleanup stale presences (bots that haven't been seen in 10 min) ──
    await prisma.chatPresence.deleteMany({
      where: {
        userId: { in: botIds },
        lastSeen: { lt: new Date(Date.now() - 10 * 60 * 1000) }
      }
    })

    return NextResponse.json({
      success: true,
      cycle: {
        availableBots: availableBots.length,
        currentlyActive: totalActiveBots,
        actionsThisCycle: actions.length,
        rooms: rooms.length
      },
      actions
    })
  } catch (error) {
    console.error('Bot simulation error:', error)
    return NextResponse.json({ error: 'Simülasyon hatası' }, { status: 500 })
  }
}

// GET: Get simulation status
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

    // Current active bots (present in rooms in last 5 min)
    const activePresences = await prisma.chatPresence.findMany({
      where: {
        userId: { in: botIds },
        lastSeen: { gte: new Date(Date.now() - 5 * 60 * 1000) }
      },
      include: {
        user: { select: { name: true, username: true, botProfile: { select: { personality: true } } } },
        room: { select: { nameTr: true, slug: true } }
      }
    })

    // Recent bot messages (last 1 hour)
    const recentMessages = await prisma.chatMessage.count({
      where: {
        userId: { in: botIds },
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
      }
    })

    // Total bot stats
    const totalBots = botIds.length
    const activeBots = await prisma.botProfile.count({ where: { isActive: true } })

    return NextResponse.json({
      totalBots,
      activeBots,
      currentlyInRooms: activePresences.length,
      messagesLastHour: recentMessages,
      presences: activePresences.map(p => ({
        bot: p.user.name,
        username: p.user.username,
        personality: p.user.botProfile?.personality,
        room: p.room.nameTr,
        lastSeen: p.lastSeen
      }))
    })
  } catch (error) {
    console.error('Bot status error:', error)
    return NextResponse.json({ error: 'Durum alınamadı' }, { status: 500 })
  }
}
