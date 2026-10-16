import prisma from '@/lib/db'
import { getCachedPlatformSetting } from '@/lib/cache'

/** Room type constants */
export const ROOM_TYPES = ['FREE', 'NORMAL', 'VIP'] as const
export type RoomType = typeof ROOM_TYPES[number]

const MUSIC_REQUEST_COST = 10

/** Get max users for a room type from platform settings */
export async function getMaxUsersForRoomType(roomType: string): Promise<number> {
  switch (roomType) {
    case 'VIP': return parseInt(await getCachedPlatformSetting('vr_vip_room_max_users', '500'))
    case 'NORMAL': return parseInt(await getCachedPlatformSetting('vr_normal_room_max_users', '100'))
    default: return parseInt(await getCachedPlatformSetting('vr_free_room_max_users', '15'))
  }
}

/** Check if room type supports a feature */
export function roomTypeSupports(roomType: string, feature: string): boolean {
  const FREE_FEATURES = [
    'open_room', 'microphone', 'chat', 'emoji', 'music_request',
    'room_image', 'room_name', 'basic_moderation', 'share_room'
  ]
  const NORMAL_FEATURES = [
    ...FREE_FEATURES,
    'gift_income', 'music_income', 'moderator', 'room_description',
    'room_tags', 'room_banner', 'room_password', 'room_stats',
    'daily_report', 'weekly_report', 'welcome_message',
    'pinned_announcement', 'mute_user', 'ban_user', 'room_ranking'
  ]
  const VIP_FEATURES = [
    ...NORMAL_FEATURES,
    'vip_badge', 'gold_name', 'animated_background', '3d_background',
    'premium_entrance', 'crystal_ball', 'custom_themes', 'vip_frame',
    'homepage_showcase', 'sponsor_support', 'banner_upload',
    'multi_moderator', 'vip_sounds', 'custom_gift_animations',
    'ai_assistant', 'auto_dj', 'room_raffle', 'gift_leaderboard',
    'bulk_notification', 'push_on_open', 'vip_stats',
    'monthly_report', 'mini_games', 'room_poll'
  ]

  switch (roomType) {
    case 'VIP': return VIP_FEATURES.includes(feature)
    case 'NORMAL': return NORMAL_FEATURES.includes(feature)
    default: return FREE_FEATURES.includes(feature)
  }
}

/**
 * Calculate gift revenue distribution for a chat room / live stream.
 *
 * Model (2026-10 rev.):
 * ─ Platform commission (vr_platform_percent, default 50%) is taken first.
 * ─ Remainder goes to beneficiaries depending on who receives the gift:
 *
 *   A) Gift TO room/stream owner (isRecipientOwner = true):
 *      owner  = totalAmount − platformAmount
 *      guest  = 0
 *
 *   B) Gift TO a guest in a seat (isRecipientOwner = false):
 *      ownerShareOfRemainder (vr_owner_share_guest_gift, default 30%)
 *      owner  = remainder × ownerShareOfRemainder / 100   (default 15% of total)
 *      guest  = remainder − owner                         (default 35% of total)
 *
 * For FREE rooms: owner always gets 0 — their share goes to platform.
 */
export async function calculateGiftDistribution(
  totalAmount: number,
  roomType: string,
  isRecipientOwner: boolean = true
): Promise<{
  receiverGross: number
  ownerGross: number
  receiverNet: number
  ownerNet: number
  siteAmount: number
  receiverCommission: number
  ownerCommission: number
}> {
  const platformPct = parseInt(await getCachedPlatformSetting('vr_platform_percent', '50'))
  const ownerShareOfRemainderPct = parseInt(await getCachedPlatformSetting('vr_owner_share_guest_gift', '30'))

  const platformAmount = Math.floor(totalAmount * platformPct / 100)
  const remainder = totalAmount - platformAmount

  let ownerNet = 0
  let receiverNet = 0

  if (roomType === 'FREE') {
    // FREE rooms: owner gets nothing, receiver gets remainder
    ownerNet = 0
    receiverNet = isRecipientOwner ? 0 : remainder
    // If gift to owner in FREE room, everything goes to platform
  } else if (isRecipientOwner) {
    // Gift to room/stream owner: owner gets all remainder
    ownerNet = remainder
    receiverNet = 0
  } else {
    // Gift to guest: split remainder between owner and guest
    ownerNet = Math.floor(remainder * ownerShareOfRemainderPct / 100)
    receiverNet = remainder - ownerNet
  }

  const siteAmount = totalAmount - ownerNet - receiverNet

  return {
    receiverGross: receiverNet,   // legacy compat — gross = net in new model
    ownerGross: ownerNet,
    receiverNet,
    ownerNet,
    siteAmount,
    receiverCommission: 0,        // legacy compat — no separate commission step
    ownerCommission: 0,
  }
}

/**
 * Calculate music request revenue distribution.
 * 
 * FREE: 100% to site
 * NORMAL: musicOwnerPercent to owner, rest to site
 * VIP: vipMusicOwnerPercent to owner, rest to site
 */
export async function calculateMusicDistribution(
  roomType: string,
  /** Odanın gerçek istek ücreti (oda müzik ayarları); verilmezse varsayılan. */
  requestCost: number = MUSIC_REQUEST_COST
): Promise<{
  totalAmount: number
  ownerAmount: number
  siteAmount: number
}> {
  const totalAmount = Math.max(0, Math.floor(requestCost))

  if (roomType === 'FREE') {
    return { totalAmount, ownerAmount: 0, siteAmount: totalAmount }
  }

  let ownerPct: number
  if (roomType === 'VIP') {
    ownerPct = parseInt(await getCachedPlatformSetting('vr_vip_music_owner_percent', '70'))
  } else {
    ownerPct = parseInt(await getCachedPlatformSetting('vr_music_owner_percent', '50'))
  }

  const ownerAmount = Math.floor(totalAmount * ownerPct / 100)
  const siteAmount = totalAmount - ownerAmount

  return { totalAmount, ownerAmount, siteAmount }
}

/**
 * Log a revenue event to RoomRevenueLog
 */
export async function logRoomRevenue(params: {
  roomId: string
  eventType: string
  totalAmount: number
  receiverAmount: number
  ownerAmount: number
  siteAmount: number
  senderId?: string
  receiverId?: string
  ownerId?: string
  metadata?: Record<string, any>
}) {
  try {
    await prisma.roomRevenueLog.create({
      data: {
        roomId: params.roomId,
        eventType: params.eventType,
        totalAmount: params.totalAmount,
        receiverAmount: params.receiverAmount,
        ownerAmount: params.ownerAmount,
        siteAmount: params.siteAmount,
        senderId: params.senderId || null,
        receiverId: params.receiverId || null,
        ownerId: params.ownerId || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      }
    })
  } catch (err) {
    console.error('[RoomRevenue] Log error:', err)
  }
}
