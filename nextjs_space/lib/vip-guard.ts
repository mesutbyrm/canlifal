/**
 * BÖLÜM 20 — VIP yetki kapıları (route guard'ları).
 * Flutter/web istemcisinde YAPILAN hiçbir kontrol güvenilir değildir; her istek
 * burada gerçek üyelik ile doğrulanır (§21).
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { apiError, apiUnauthorized, ErrorCodes } from '@/lib/api-response'
import { getUserEntitlements, hasCapability, meetsMinTier, UserEntitlements } from '@/lib/vip-entitlements'

/** Hem NextAuth oturumu hem mobil JWT kabul eder. */
export async function resolveUserId(req: NextRequest): Promise<string | null> {
  const mobile = await authenticateRequest(req)
  if (mobile?.id) return mobile.id
  try {
    const session = await getServerSession(authOptions)
    const id = (session?.user as any)?.id
    return id || null
  } catch {
    return null
  }
}

export type VipGuardResult =
  | { ok: true; userId: string; entitlements: UserEntitlements }
  | { ok: false; response: NextResponse }

/** Belirli bir yetenek gerektirir. */
export async function requireCapability(req: NextRequest, featureKey: string): Promise<VipGuardResult> {
  const userId = await resolveUserId(req)
  if (!userId) return { ok: false, response: apiUnauthorized() }
  const ent = await getUserEntitlements(userId)
  if (!ent) return { ok: false, response: apiUnauthorized() }
  const allowed = await hasCapability(userId, featureKey)
  if (!allowed) {
    return {
      ok: false,
      response: apiError(
        ErrorCodes.FORBIDDEN,
        'Bu özellik mevcut üyelik seviyenizde kullanılamıyor',
        403,
        { feature: featureKey, currentTier: ent.tier, expired: ent.isExpired }
      ),
    }
  }
  return { ok: true, userId, entitlements: ent }
}

/** Minimum üyelik kademesi gerektirir. */
export async function requireMinTier(req: NextRequest, minTier: string): Promise<VipGuardResult> {
  const userId = await resolveUserId(req)
  if (!userId) return { ok: false, response: apiUnauthorized() }
  const ent = await getUserEntitlements(userId)
  if (!ent) return { ok: false, response: apiUnauthorized() }
  const allowed = await meetsMinTier(userId, minTier)
  if (!allowed) {
    return {
      ok: false,
      response: apiError(
        ErrorCodes.FORBIDDEN,
        `Bu alan için en az ${minTier.toUpperCase()} üyelik gerekiyor`,
        403,
        { requiredTier: minTier, currentTier: ent.tier, expired: ent.isExpired }
      ),
    }
  }
  return { ok: true, userId, entitlements: ent }
}
