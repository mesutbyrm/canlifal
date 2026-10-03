/**
 * Merkezi Animasyon Sistemi - admin yardimcilari (BOLUM 3)
 * Additive: mevcut kozmetik admin akislarina dokunmaz.
 */
import { NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import {
  ANIMATION_CATEGORIES,
  ANIMATION_TYPES,
  ANIMATION_POSITIONS,
  ANIMATION_SCALES,
  ANIMATION_ANCHORS,
  ANIMATION_RARITIES,
  ANIMATION_STATUSES,
  ANIMATION_CONTEXTS,
  MEMBERSHIP_TIERS,
} from '@/lib/animation-constants'

/** Bu bolum sadece yetkili admin rollerine acik (spec: GUVENLIK) */
export const ANIMATION_ADMIN_ROLES = ['admin', 'yonetici', 'moderator'] as const
/** Silme / uyelik varsayilani degistirme gibi yikici islemler */
export const ANIMATION_FULL_ADMIN_ROLES = ['admin', 'yonetici'] as const

export type AnimationAdminAuth =
  | { ok: true; userId: string; role: string; response: null }
  | { ok: false; userId: null; role: null; response: NextResponse }

export async function requireAnimationAdmin(full = false): Promise<AnimationAdminAuth> {
  // Çift kimlik: web çerezi VEYA mobil Bearer JWT
  const session = await getStaffSession()
  const user: any = session?.user
  const role = user?.role as string | undefined
  const allowed = full ? (ANIMATION_FULL_ADMIN_ROLES as readonly string[]) : (ANIMATION_ADMIN_ROLES as readonly string[])
  if (!user || !role || !allowed.includes(role)) {
    return {
      ok: false,
      userId: null,
      role: null,
      response: NextResponse.json({ error: 'Bu bolum icin yetkiniz yok' }, { status: 403 }),
    }
  }
  return { ok: true, userId: user.id as string, role, response: null }
}

export function slugifyAnimation(input: string): string {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', İ: 'i' }
  return (input || '')
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'animasyon'
}

const ENUMS: Record<string, readonly string[]> = {
  category: ANIMATION_CATEGORIES,
  type: ANIMATION_TYPES,
  position: ANIMATION_POSITIONS,
  scale: ANIMATION_SCALES,
  anchor: ANIMATION_ANCHORS,
  rarity: ANIMATION_RARITIES,
  status: ANIMATION_STATUSES,
}

const STRING_FIELDS = ['name', 'assetUrl', 'thumbnailUrl', 'previewUrl', 'soundUrl', 'membershipLevel', 'legacyType', 'legacyRefId']
const INT_FIELDS = ['durationMs', 'priority', 'cooldownMs', 'sortOrder']
const BOOL_FIELDS = ['canSkip']
const DATE_FIELDS = ['activeFrom', 'activeTo']

/** Gelen govdeden yalnizca izinli alanlari, dogru tiplerle cikarir. */
export function coerceAnimationPayload(body: any): { data: Record<string, any>; error?: string } {
  const data: Record<string, any> = {}

  for (const f of STRING_FIELDS) {
    if (body[f] !== undefined) {
      const v = body[f]
      data[f] = v === '' || v === null ? null : String(v)
    }
  }
  if (data.name === null) return { data, error: 'Animasyon adi bos olamaz' }

  for (const f of Object.keys(ENUMS)) {
    if (body[f] !== undefined && body[f] !== null && body[f] !== '') {
      const v = String(body[f])
      if (!ENUMS[f].includes(v)) return { data, error: `Gecersiz deger: ${f}=${v}` }
      data[f] = v
    }
  }
  if (body.membershipLevel !== undefined && body.membershipLevel) {
    const v = String(body.membershipLevel)
    if (![...MEMBERSHIP_TIERS, 'admin'].includes(v as any)) return { data, error: `Gecersiz uyelik: ${v}` }
    data.membershipLevel = v
  }

  for (const f of INT_FIELDS) {
    if (body[f] !== undefined && body[f] !== null && body[f] !== '') {
      const n = Number(body[f])
      if (!Number.isFinite(n)) return { data, error: `Sayisal alan hatali: ${f}` }
      data[f] = Math.max(0, Math.round(n))
    }
  }
  for (const f of BOOL_FIELDS) {
    if (body[f] !== undefined) data[f] = !!body[f]
  }
  for (const f of DATE_FIELDS) {
    if (body[f] !== undefined) {
      if (!body[f]) data[f] = null
      else {
        const d = new Date(body[f])
        if (isNaN(d.getTime())) return { data, error: `Tarih hatali: ${f}` }
        data[f] = d
      }
    }
  }
  if (body.contexts !== undefined) {
    const arr = Array.isArray(body.contexts) ? body.contexts.map((c: any) => String(c)) : []
    const bad = arr.find((c: string) => !(ANIMATION_CONTEXTS as readonly string[]).includes(c))
    if (bad) return { data, error: `Gecersiz baglam: ${bad}` }
    data.contexts = arr.length ? arr : null
  }
  if (body.metadata !== undefined) {
    data.metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : null
  }
  return { data }
}

/** Sure onayarlari -> bitis tarihi */
export const DURATION_PRESETS = ['permanent', '1', '7', '30', '90', 'custom'] as const
export type DurationPreset = (typeof DURATION_PRESETS)[number]

export function resolveEndDate(preset: string | undefined, customEnd?: string | null): Date | null {
  if (!preset || preset === 'permanent') return null
  if (preset === 'custom') {
    if (!customEnd) return null
    const d = new Date(customEnd)
    return isNaN(d.getTime()) ? null : d
  }
  const days = Number(preset)
  if (!Number.isFinite(days) || days <= 0) return null
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}
