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
 * Calculate gift revenue distribution for a chat room.
 * 
 * Flow:
 * 1. Split total gift between receiver and room owner using giftReceiverPercent / roomOwnerPercent
 * 2. Apply site commission on EACH share individually (not on total)
 * 
 * For FREE rooms: room owner gets nothing (owner share = 0)
 */
export async function calculateGiftDistribution(
  totalAmount: number,
  roomType: string
): Promise<{
  receiverGross: number
  ownerGross: number
  receiverNet: number
  ownerNet: number
  siteAmount: number
  receiverCommission: number
  ownerCommission: number
}> {
  const receiverPct = parseInt(await getCachedPlatformSetting('vr_gift_receiver_percent', '70'))
  const ownerPct = parseInt(await getCachedPlatformSetting('vr_room_owner_percent', '30'))
  const commissionPct = parseInt(await getCachedPlatformSetting('vr_site_commission_percent', '50'))

  // Step 1: Split between receiver and owner
  const receiverGross = Math.floor(totalAmount * receiverPct / 100)
  // For FREE rooms, owner gets nothing
  const ownerGross = roomType === 'FREE' ? 0 : Math.floor(totalAmount * ownerPct / 100)

  // Step 2: Apply commission on each share individually
  const receiverCommission = Math.floor(receiverGross * commissionPct / 100)
  const ownerCommission = Math.floor(ownerGross * commissionPct / 100)

  const receiverNet = receiverGross - receiverCommission
  const ownerNet = ownerGross - ownerCommission

  // Site gets: commissions + any remainder from FREE room owner share
  const siteAmount = totalAmount - receiverNet - ownerNet

  return {
    receiverGross,
    ownerGross,
    receiverNet,
    ownerNet,
    siteAmount,
    receiverCommission,
    ownerCommission
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
  roomType: string
): Promise<{
  totalAmount: number
  ownerAmount: number
  siteAmount: number
}> {
  const totalAmount = MUSIC_REQUEST_COST

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
