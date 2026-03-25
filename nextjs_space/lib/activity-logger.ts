import prisma from '@/lib/db'

export type ActivityType = 
  | 'fortune_read'
  | 'chat_join'
  | 'dream_shared'
  | 'stream_started'
  | 'gift_sent'
  | 'signup'
  | 'blog_read'
  | 'comment'
  | 'follow'
  | 'game_played'
  | 'live_session'

interface LogActivityParams {
  userId?: string | null
  userName: string
  userAvatar?: string | null
  activityType: ActivityType
  detail: string
  targetUrl?: string
}

export async function logActivity(params: LogActivityParams) {
  try {
    await prisma.liveActivity.create({
      data: {
        userId: params.userId || null,
        userName: params.userName,
        userAvatar: params.userAvatar || null,
        activityType: params.activityType,
        detail: params.detail,
        targetUrl: params.targetUrl || null,
      },
    })
  } catch (e) {
    // Don't let activity logging break main flows
    console.error('Activity log error:', e)
  }
}

// Clean up old activities (keep last 500)
export async function cleanOldActivities() {
  try {
    const count = await prisma.liveActivity.count()
    if (count > 500) {
      const oldEntries = await prisma.liveActivity.findMany({
        orderBy: { createdAt: 'desc' },
        skip: 500,
        select: { id: true },
      })
      if (oldEntries.length > 0) {
        await prisma.liveActivity.deleteMany({
          where: { id: { in: oldEntries.map(e => e.id) } },
        })
      }
    }
  } catch (e) {
    console.error('Activity cleanup error:', e)
  }
}
