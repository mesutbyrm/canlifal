/**
 * Merkezi Animasyon Sistemi - sabitler
 * Additive: eski kozmetik modelleri (EntranceEffect, NameEffect, ProfileFrame,
 * ChatBubbleSkin, MicFrame, AvatarAccessory, MembershipBadge) bozulmadan kalir.
 */

export const ANIMATION_CATEGORIES = [
  'entrance',
  'exit',
  'seat',
  'profile',
  'profile_frame',
  'avatar',
  'microphone',
  'chat_bubble',
  'host',
  'gift',
  'level_up',
  'vip',
  'system',
  'page_transition',
] as const
export type AnimationCategory = (typeof ANIMATION_CATEGORIES)[number]

export const ANIMATION_CONTEXTS = [
  'voice_room',
  'live_stream',
  'social',
  'profile',
  'game_room',
  'chat',
  'gift',
  'login',
  'logout',
  'mic',
  'seat',
  'host',
] as const
export type AnimationContext = (typeof ANIMATION_CONTEXTS)[number]

export const ANIMATION_TYPES = ['lottie', 'svga', 'gif', 'video', 'image', 'apng'] as const
export const ANIMATION_POSITIONS = [
  'top_left',
  'top_center',
  'top_right',
  'center',
  'bottom_left',
  'bottom_right',
  'seat',
] as const
export const ANIMATION_SCALES = ['small', 'medium', 'large'] as const
export const ANIMATION_ANCHORS = ['room', 'user', 'seat', 'host'] as const
export const ANIMATION_RARITIES = ['normal', 'rare', 'epic', 'legendary'] as const
export const ANIMATION_STATUSES = ['active', 'inactive', 'scheduled', 'archived'] as const

/** Uyelik kademeleri (dusukten yuksege) */
export const MEMBERSHIP_TIERS = [
  'basic',
  'silver',
  'gold',
  'premium',
  'platinum',
  'diamond',
  'vip',
  'svip',
] as const
export type MembershipTier = (typeof MEMBERSHIP_TIERS)[number]

/** Oncelik skalasi - buyuk sayi daha ustun */
export const ANIMATION_PRIORITY: Record<string, number> = {
  normal: 10,
  basic: 10,
  silver: 20,
  gold: 30,
  premium: 40,
  platinum: 50,
  diamond: 60,
  vip: 80,
  svip: 90,
  admin: 100,
  admin_custom: 110,
}

/** Atama tipi -> cozumleme onceligi (buyuk kazanir) */
export const ASSIGNMENT_PRIORITY: Record<string, number> = {
  admin_custom: 100,
  purchase: 70,
  user_custom: 60,
  event_reward: 50,
  membership_default: 30,
  legacy: 20,
  normal_default: 10,
}

/** Eski kozmetik model turleri */
export const LEGACY_TYPES = [
  'entrance_effect',
  'name_effect',
  'profile_frame',
  'chat_bubble',
  'mic_frame',
  'avatar_accessory',
  'membership_badge',
] as const
export type LegacyType = (typeof LEGACY_TYPES)[number]

/** Eski model turu -> yeni kategori esleme */
export const LEGACY_TYPE_TO_CATEGORY: Record<string, AnimationCategory> = {
  entrance_effect: 'entrance',
  name_effect: 'profile',
  profile_frame: 'profile_frame',
  chat_bubble: 'chat_bubble',
  mic_frame: 'microphone',
  avatar_accessory: 'avatar',
  membership_badge: 'profile',
} as any

export function membershipRank(tier?: string | null): number {
  if (!tier) return 0
  const idx = (MEMBERSHIP_TIERS as readonly string[]).indexOf(tier.toLowerCase())
  return idx < 0 ? 0 : idx
}

export function isPrivilegedRole(role?: string | null): boolean {
  if (!role) return false
  return ['admin', 'yonetici', 'moderator'].includes(role.toLowerCase())
}
