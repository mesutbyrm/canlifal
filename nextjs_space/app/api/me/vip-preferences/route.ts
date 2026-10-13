/**
 * BÖLÜM 20 — Kullanıcının VIP gizlilik/görünürlük tercihleri (§9, §11).
 * Her anahtar ilgili yetenekle kapılıdır; yetkisi olmayan alan sessizce yok sayılır.
 */
import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { apiSuccess, apiError, apiUnauthorized, ErrorCodes } from '@/lib/api-response'
import { resolveUserId } from '@/lib/vip-guard'
import { getUserEntitlements, invalidateUserEntitlements } from '@/lib/vip-entitlements'
import { apiLimiter } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

/** Tercih alanı → gerekli yetenek. null = herkese açık (kendi rozetini gizleme §10). */
const PREF_CAPABILITY: Record<string, string | null> = {
  hideVipBadge: null,
  disableEntranceEffects: null,
  muteOthersEntrance: null,
  hideOnlineStatus: 'vip.hidden_online',
  hideLastSeen: 'vip.hide_last_seen',
  hideProfileVisit: 'vip.hide_profile_visit',
  hiddenRoomEntry: 'vip.hidden_room_entry',
  hideVipStatus: 'vip.hide_vip_status',
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return apiUnauthorized()
  const ent = await getUserEntitlements(userId)
  if (!ent) return apiUnauthorized()

  const editable: Record<string, boolean> = {}
  for (const [field, cap] of Object.entries(PREF_CAPABILITY)) {
    editable[field] = cap === null ? true : !!ent.features[cap]?.enabled
  }

  return apiSuccess({
    preferences: ent.preferences,
    editable,
    tier: ent.tier,
  })
}

export async function PUT(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return apiUnauthorized()

  const { success: rlOk } = apiLimiter.check(`vip-prefs:${userId}`)
  if (!rlOk) return apiError(ErrorCodes.RATE_LIMITED, 'Çok fazla istek gönderildi', 429)

  let body: any
  try {
    body = await req.json()
  } catch {
    return apiError(ErrorCodes.VALIDATION_ERROR, 'Geçersiz istek gövdesi', 400)
  }

  const ent = await getUserEntitlements(userId)
  if (!ent) return apiUnauthorized()

  const data: Record<string, boolean> = {}
  const rejected: string[] = []

  for (const [field, cap] of Object.entries(PREF_CAPABILITY)) {
    if (typeof body?.[field] !== 'boolean') continue
    const allowed = cap === null ? true : !!ent.features[cap]?.enabled
    if (!allowed) {
      if (body[field] === true) rejected.push(field)
      continue
    }
    data[field] = body[field]
  }

  if (Object.keys(data).length === 0) {
    return apiError(
      ErrorCodes.FORBIDDEN,
      rejected.length
        ? 'Seçtiğiniz gizlilik ayarları mevcut üyelik seviyenizde kullanılamıyor'
        : 'Güncellenecek geçerli bir alan gönderilmedi',
      rejected.length ? 403 : 400,
      { rejected, tier: ent.tier }
    )
  }

  const saved = await prisma.userVipPreference.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  })

  invalidateUserEntitlements(userId)

  return apiSuccess({
    preferences: {
      hideVipBadge: saved.hideVipBadge,
      hideOnlineStatus: saved.hideOnlineStatus,
      hideLastSeen: saved.hideLastSeen,
      hideProfileVisit: saved.hideProfileVisit,
      hiddenRoomEntry: saved.hiddenRoomEntry,
      hideVipStatus: saved.hideVipStatus,
      disableEntranceEffects: saved.disableEntranceEffects,
      muteOthersEntrance: saved.muteOthersEntrance,
    },
    rejected,
  })
}
