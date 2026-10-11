/**
 * BÖLÜM 20 §19 — Özel kullanıcı ID (vip.custom_id) ve ünvan (vip.title).
 * GET /api/me/vip-identity
 * PUT /api/me/vip-identity   { custom_user_id?: string|null, title?: string|null }
 *
 * Her alan kendi yeteneğiyle kapılıdır; yetkisiz alan 403 döner.
 * customUserId veritabanında @unique DEĞİLDİR — tekillik burada uygulama seviyesinde
 * kontrol edilir (Şema değişikliği paylaşımlı veritabanını riske atmamak için ek yapıldı).
 */
import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { apiSuccess, apiError, apiUnauthorized, apiInternalError, ErrorCodes } from '@/lib/api-response'
import { resolveUserId } from '@/lib/vip-guard'
import { getUserEntitlements, invalidateUserEntitlements } from '@/lib/vip-entitlements'
import { apiLimiter } from '@/lib/rate-limiter'
import { recordAudit } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

const ID_RE = /^[a-zA-Z0-9._-]{4,20}$/
const RESERVED = ['admin', 'administrator', 'yonetici', 'moderator', 'canlifal', 'support', 'destek', 'system', 'sistem', 'root', 'official', 'resmi']
const TITLE_MAX = 24

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return apiUnauthorized()
    const ent = await getUserEntitlements(userId)
    if (!ent) return apiUnauthorized()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { customUserId: true, vipTitle: true },
    })

    return apiSuccess({
      custom_user_id: user?.customUserId ?? null,
      title: user?.vipTitle ?? null,
      can_set_custom_id: !!ent.features['vip.custom_id']?.enabled,
      can_set_title: !!ent.features['vip.title']?.enabled,
      rules: {
        custom_user_id: '4-20 karakter; harf, rakam, nokta, alt çizgi ve tire.',
        title: `En fazla ${TITLE_MAX} karakter.`,
      },
    })
  } catch (e) {
    console.error('[me/vip-identity] GET hatası:', e)
    return apiInternalError()
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) return apiUnauthorized()

    const { success: rlOk } = apiLimiter.check(`vip-identity:${userId}`)
    if (!rlOk) return apiError(ErrorCodes.RATE_LIMITED, 'Çok fazla istek gönderildi', 429)

    const ent = await getUserEntitlements(userId)
    if (!ent) return apiUnauthorized()

    const body = await req.json().catch(() => ({}))
    const data: { customUserId?: string | null; vipTitle?: string | null } = {}

    if ('custom_user_id' in body) {
      if (!ent.features['vip.custom_id']?.enabled) {
        return apiError(ErrorCodes.FORBIDDEN, 'Özel kullanıcı ID hakkı mevcut üyelik seviyenizde yok', 403, {
          feature: 'vip.custom_id', currentTier: ent.tier,
        })
      }
      const raw = body.custom_user_id
      if (raw === null || raw === '') {
        data.customUserId = null
      } else {
        const value = String(raw).trim()
        if (!ID_RE.test(value)) {
          return apiError(ErrorCodes.VALIDATION_ERROR, 'Özel ID 4-20 karakter olmalı ve yalnızca harf, rakam, . _ - içermeli', 400)
        }
        if (RESERVED.includes(value.toLowerCase())) {
          return apiError(ErrorCodes.VALIDATION_ERROR, 'Bu özel ID rezerve edilmiştir', 400)
        }
        const taken = await prisma.user.findFirst({
          where: { customUserId: value, NOT: { id: userId } },
          select: { id: true },
        })
        if (taken) {
          return apiError(ErrorCodes.USERNAME_ALREADY_TAKEN, 'Bu özel ID başka bir kullanıcı tarafından alınmış', 409)
        }
        data.customUserId = value
      }
    }

    if ('title' in body) {
      if (!ent.features['vip.title']?.enabled) {
        return apiError(ErrorCodes.FORBIDDEN, 'Ünvan hakkı mevcut üyelik seviyenizde yok', 403, {
          feature: 'vip.title', currentTier: ent.tier,
        })
      }
      const raw = body.title
      if (raw === null || raw === '') {
        data.vipTitle = null
      } else {
        const value = String(raw).trim().replace(/\s+/g, ' ')
        if (value.length < 2 || value.length > TITLE_MAX) {
          return apiError(ErrorCodes.VALIDATION_ERROR, `Ünvan 2-${TITLE_MAX} karakter olmalı`, 400)
        }
        data.vipTitle = value
      }
    }

    if (Object.keys(data).length === 0) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Güncellenecek alan gönderilmedi', 400)
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { customUserId: true, vipTitle: true },
    })
    invalidateUserEntitlements(userId)

    await recordAudit({
      actorId: userId,
      action: 'vip.identity.update',
      targetType: 'user',
      targetId: userId,
      after: data as any,
      description: 'VIP kimlik bilgileri güncellendi',
    })

    return apiSuccess({ custom_user_id: updated.customUserId, title: updated.vipTitle })
  } catch (e) {
    console.error('[me/vip-identity] PUT hatası:', e)
    return apiInternalError()
  }
}
