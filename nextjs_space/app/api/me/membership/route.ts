/**
 * BÖLÜM 20 §25 — Kullanıcının üyelik + yetenek paketi.
 * Flutter ve web AYNI uçtan beslenir; hiçbir kural istemcide sabitlenmez.
 * GET /api/me/membership
 */
import { NextRequest } from 'next/server'
import { apiSuccess, apiUnauthorized, apiInternalError } from '@/lib/api-response'
import { resolveUserId } from '@/lib/vip-guard'
import { getUserEntitlements, getTiers } from '@/lib/vip-entitlements'
import prisma from '@/lib/db'
import { vipLevelFor } from '@/lib/vip-xp'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return apiUnauthorized()

    const ent = await getUserEntitlements(userId)
    if (!ent) return apiUnauthorized()

    const [tiers, cosmetics] = await Promise.all([
      getTiers(),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          profileFrameId: true, adminAssignedFrameId: true, nameEffect: true,
          entranceEffectId: true, chatBubbleId: true, micFrameId: true,
          avatarAccessoryIds: true, profileEffect: true, customUserId: true, vipXp: true, vipTitle: true,
        },
      }),
    ])

    const f = ent.features
    const on = (k: string) => !!f[k]?.enabled

    return apiSuccess({
      membership_level: ent.tier,
      stored_level: ent.storedTier,
      expires_at: ent.expiresAt,
      is_expired: ent.isExpired,
      days_remaining: ent.daysRemaining,
      tier: ent.tierInfo,
      vip_xp: cosmetics?.vipXp ?? 0,
      vip_level: vipLevelFor(cosmetics?.vipXp ?? 0).level,
      vip_next_level_at: vipLevelFor(cosmetics?.vipXp ?? 0).nextAt,
      custom_user_id: cosmetics?.customUserId ?? null,
      vip_title: on('vip.title') ? (cosmetics?.vipTitle ?? null) : null,
      features: f,
      badges: {
        show: on('vip.badge') && !ent.preferences.hideVipBadge,
        badge_url: f['vip.badge']?.assetRef || ent.tierInfo.badgeUrl,
        icon: ent.tierInfo.icon,
        color: ent.tierInfo.color,
        verified: on('vip.verification_badge'),
      },
      profile_effect: {
        frame: f['vip.profile_frame']?.assetRef || ent.tierInfo.frameUrl,
        animated_frame: on('vip.animated_frame') ? f['vip.animated_frame']?.assetRef : null,
        name_color: on('vip.name_color') ? ent.tierInfo.color : null,
        name_gradient: on('vip.name_effect') ? ent.tierInfo.gradient : null,
        name_animation: on('vip.name_animation'),
        theme: on('vip.profile_theme') ? f['vip.profile_theme']?.assetRef : null,
        background: on('vip.profile_background') ? f['vip.profile_background']?.assetRef : null,
        showcase: on('vip.profile_showcase'),
        // Kullanıcının KAYITLI seçimleri — üyelik bitse de silinmez, sadece kilitlenir
        saved: {
          profileFrameId: cosmetics?.profileFrameId ?? null,
          adminAssignedFrameId: cosmetics?.adminAssignedFrameId ?? null,
          nameEffect: cosmetics?.nameEffect ?? null,
          chatBubbleId: cosmetics?.chatBubbleId ?? null,
          micFrameId: cosmetics?.micFrameId ?? null,
          avatarAccessoryIds: cosmetics?.avatarAccessoryIds ?? null,
          profileEffect: cosmetics?.profileEffect ?? null,
        },
      },
      entrance_effect: {
        enabled: on('vip.entrance_effect') && !ent.preferences.disableEntranceEffects,
        asset: f['vip.entrance_effect']?.assetRef || null,
        animation: on('vip.entrance_animation') ? f['vip.entrance_animation']?.assetRef : null,
        sound: on('vip.entrance_sound') ? f['vip.entrance_sound']?.assetRef : null,
        exit: on('vip.exit_effect') ? f['vip.exit_effect']?.assetRef : null,
        announce_room_entry: on('vip.room_entry_announcement'),
        selected_effect_id: cosmetics?.entranceEffectId ?? null,
      },
      privacy_permissions: {
        can_hide_online: on('vip.hidden_online'),
        can_hide_last_seen: on('vip.hide_last_seen'),
        can_see_profile_visitors: on('vip.profile_visitors'),
        can_hide_profile_visit: on('vip.hide_profile_visit'),
        can_hidden_room_entry: on('vip.hidden_room_entry'),
        can_hide_vip_status: on('vip.hide_vip_status'),
        current: ent.preferences,
      },
      room_permissions: {
        vip_rooms: on('vip.vip_rooms'),
        diamond_rooms: on('vip.diamond_rooms'),
        svip_rooms: on('vip.svip_rooms'),
        vip_lounge: on('vip.vip_lounge'),
        create_vip_room: on('vip.create_vip_room'),
        room_theme: on('vip.room_theme'),
        seat_effect: on('vip.seat_effect') ? f['vip.seat_effect']?.assetRef : null,
        list_priority: f['vip.room_list_priority']?.priority ?? 0,
      },
      message_permissions: {
        bubble: on('vip.message_bubble') ? f['vip.message_bubble']?.assetRef : null,
        text_effect: on('vip.message_text_effect'),
        emoji_pack: on('vip.emoji_pack'),
        sticker_pack: on('vip.sticker_pack'),
        reaction_effect: on('vip.reaction_effect'),
        can_pin: on('vip.message_pin'),
        pin_daily_limit: f['vip.message_pin']?.dailyLimit ?? null,
        pin_concurrent_limit: f['vip.message_pin']?.limit ?? null,
      },
      discovery: {
        weight: ent.tierInfo.discoveryWeight,
        priority: f['vip.discovery_priority']?.priority ?? 0,
        priority_matching: on('vip.priority_matching'),
      },
      support: {
        priority: on('vip.priority_support'),
        dedicated_channel: on('vip.support_channel'),
      },
      all_tiers: tiers,
    })
  } catch (e) {
    console.error('[me/membership]', e)
    return apiInternalError()
  }
}
