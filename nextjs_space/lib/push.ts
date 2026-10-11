// Unified Push Abstraction (Phase 7 - §52 consolidation)
//
// SINGLE SOURCE OF TRUTH for outbound push delivery.
//
// Background: the platform previously appeared to have two push providers:
//   1. OneSignal (lib/onesignal.ts)  → the ONLY channel that actually delivers.
//      Flutter calls OneSignal.login(userId); server targets external_id.
//   2. /api/devices/fcm            → only STORES FCM/APNs tokens in UserDevice.
//      Nothing server-side ever sends to those raw tokens.
//
// So there was never true dual delivery — OneSignal is canonical. This module
// is the unified entry point every feature should call, so the delivery
// provider can be swapped in ONE place. /api/devices/fcm is retained only for
// backward-compatible token capture (mobile clients still call it); the stored
// tokens are a fallback inventory, not a second live channel.

import {
  sendPushToUser as oneSignalSendToUser,
  sendPushToMultipleUsers as oneSignalSendToMany,
} from '@/lib/onesignal'

export interface UnifiedPushPayload {
  title: string
  body: string
  type: string
  targetPath?: string
  targetId?: string
  urgent?: boolean
}

/** Canonical push provider name (for logging / future switching). */
export const PUSH_PROVIDER = 'onesignal' as const

/**
 * Send a push to a single user through the canonical provider.
 * Fire-and-forget friendly: never throws.
 */
export async function sendPush(userId: string, payload: UnifiedPushPayload): Promise<boolean> {
  try {
    return await oneSignalSendToUser(userId, payload)
  } catch (err) {
    console.error('[push] sendPush failed (non-blocking):', err)
    return false
  }
}

/**
 * Send a push to many users through the canonical provider.
 * Fire-and-forget friendly: never throws.
 */
export async function sendPushBulk(userIds: string[], payload: UnifiedPushPayload): Promise<boolean> {
  if (!userIds.length) return false
  try {
    return await oneSignalSendToMany(userIds, payload)
  } catch (err) {
    console.error('[push] sendPushBulk failed (non-blocking):', err)
    return false
  }
}
