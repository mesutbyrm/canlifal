import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { getCached } from '@/lib/cache'
import { apiSuccess, apiError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/bootstrap
 *
 * Single endpoint that returns everything a client needs at startup:
 *  - feature flags
 *  - remote config
 *  - user summary (if authenticated)
 *  - platform settings (jeton rate, credits per minute, etc.)
 *
 * Replaces 5-8 separate requests the client currently makes on launch.
 *
 * Query params:
 *   ?platform=ios|android|web|mobile  (optional, filters flags/config)
 */
export async function GET(req: NextRequest) {
  try {
    const platform = req.nextUrl.searchParams.get('platform') || 'all'

    // Flags + config (cached 60s)
    const configData = await getCached('bootstrap:config:' + platform, 60, async () => {
      const [flags, configs] = await Promise.all([
        prisma.featureFlag.findMany({
          where: { OR: [{ platform: 'all' }, { platform }] },
          select: { key: true, enabled: true, percentage: true, metadata: true },
          orderBy: { key: 'asc' },
        }),
        prisma.remoteConfig.findMany({
          where: { OR: [{ platform: 'all' }, { platform }] },
          select: { key: true, value: true, valueType: true, group: true },
          orderBy: { key: 'asc' },
        }),
      ])
      return { flags, configs }
    })

    // Platform settings (cached 120s)
    const platformSettings = await getCached('bootstrap:platform_settings', 120, async () => {
      const keys = [
        'credits_per_minute', 'jeton_tl_rate', 'min_withdrawal_amount',
        'max_withdrawal_amount', 'site_commission_percent',
        'vr_gift_receiver_percent', 'vr_room_owner_percent', 'vr_site_commission_percent',
      ]
      const records = await prisma.platformSettings.findMany({
        where: { key: { in: keys } },
        select: { key: true, value: true },
      })
      const map: Record<string, string> = {}
      for (const r of records) map[r.key] = r.value
      return map
    })

    // User summary (if authenticated)
    let userSummary = null
    const user = await resolveUser(req)
    if (user) {
      const profile = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true, name: true, username: true, image: true,
          role: true, level: true, xp: true, credits: true,
          membership: true, membershipExpiresAt: true,
          nameEffect: true, entranceEffectId: true, chatBubbleId: true,
          micFrameId: true, avatarAccessoryIds: true,
        },
      })

      // Unread notification count
      const unreadCount = await prisma.notification.count({
        where: { userId: user.id, isRead: false },
      })

      userSummary = {
        ...profile,
        unreadNotifications: unreadCount,
      }
    }

    return apiSuccess({
      featureFlags: configData.flags,
      remoteConfigs: configData.configs,
      platformSettings,
      user: userSummary,
    })
  } catch (err) {
    console.error('[v1/bootstrap GET]', err)
    return apiError('INTERNAL_ERROR', 'Bootstrap verileri yüklenemedi', 500)
  }
}
