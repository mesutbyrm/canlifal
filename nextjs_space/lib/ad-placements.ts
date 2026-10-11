/**
 * BOLUM 5 - Reklam Yerlesimleri (Ad Placements)
 * Additive modul: mevcut AdNetwork akisi ve /api/ads/active bozulmadi.
 */
import { NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'

/** Reklam yerlesim yonetimine erisebilecek roller */
export const AD_ADMIN_ROLES = ['admin', 'yonetici', 'moderator', 'finans'] as const
/** Silme gibi yikici islemler icin roller */
export const AD_FULL_ADMIN_ROLES = ['admin', 'yonetici'] as const

export const AD_TYPES = ['banner', 'interstitial', 'rewarded', 'native', 'pre_roll'] as const
export type AdType = (typeof AD_TYPES)[number]

export const AD_POSITIONS = ['top', 'bottom', 'inline', 'overlay', 'sidebar'] as const
export type AdPosition = (typeof AD_POSITIONS)[number]

export const AD_PLATFORMS = ['all', 'web', 'mobile'] as const
export type AdPlatform = (typeof AD_PLATFORMS)[number]

export const AD_TYPE_LABELS: Record<string, string> = {
  banner: 'Banner',
  interstitial: 'Geçiş Reklamı',
  rewarded: 'Ödüllü Video',
  native: 'Doğal Reklam',
  pre_roll: 'Yayın Öncesi Video',
}

export const AD_POSITION_LABELS: Record<string, string> = {
  top: 'Üst',
  bottom: 'Alt',
  inline: 'İçerik Arası',
  overlay: 'Üst Katman',
  sidebar: 'Yan Panel',
}

export const AD_PLATFORM_LABELS: Record<string, string> = {
  all: 'Tümü',
  web: 'Sadece Web',
  mobile: 'Sadece Mobil',
}

/** Varsayilan 8 yerlesim tipi (seed + ilk kurulum icin) */
export const DEFAULT_AD_PLACEMENTS: Array<{
  placementKey: string
  name: string
  description: string
  adType: AdType
  position: AdPosition
  sortOrder: number
}> = [
  { placementKey: 'home_banner', name: 'Ana Sayfa Banner', description: 'Ana sayfanın üst veya alt bölümünde gösterilen banner reklam.', adType: 'banner', position: 'top', sortOrder: 1 },
  { placementKey: 'fortune_interstitial', name: 'Fal Arası Reklam', description: 'Fal sonucu gösterilmeden önce çıkan tam ekran geçiş reklamı.', adType: 'interstitial', position: 'overlay', sortOrder: 2 },
  { placementKey: 'chat_room_banner', name: 'Sesli Oda Banner', description: 'Sesli oda ekranının alt kısmında gösterilen banner.', adType: 'banner', position: 'bottom', sortOrder: 3 },
  { placementKey: 'stream_pre_roll', name: 'Yayın Öncesi Reklam', description: 'Canlı yayına girmeden önce oynatılan kısa video reklam.', adType: 'pre_roll', position: 'overlay', sortOrder: 4 },
  { placementKey: 'profile_native', name: 'Profil Sayfası Reklam', description: 'Profil sayfası içeriği arasına yerleştirilen doğal reklam.', adType: 'native', position: 'inline', sortOrder: 5 },
  { placementKey: 'blog_inline', name: 'Blog İçi Reklam', description: 'Blog yazısı paragrafları arasında gösterilen reklam.', adType: 'native', position: 'inline', sortOrder: 6 },
  { placementKey: 'game_rewarded', name: 'Oyun Ödüllü Reklam', description: 'Oyun sonunda ödül karşılığı izlenen video reklam.', adType: 'rewarded', position: 'overlay', sortOrder: 7 },
  { placementKey: 'fortune_list_native', name: 'Fal Listesi Reklam', description: 'Fal kartları listesinin arasına yerleştirilen doğal reklam.', adType: 'native', position: 'inline', sortOrder: 8 },
]

export type AdAdminAuth =
  | { ok: true; userId: string; role: string; response: null }
  | { ok: false; userId: null; role: null; response: NextResponse }

export async function requireAdAdmin(full = false): Promise<AdAdminAuth> {
  // Çift kimlik: web çerezi VEYA mobil Bearer JWT
  const session = await getStaffSession()
  const user: any = session?.user
  const role = user?.role as string | undefined
  const allowed = full ? (AD_FULL_ADMIN_ROLES as readonly string[]) : (AD_ADMIN_ROLES as readonly string[])
  if (!user || !role || !allowed.includes(role)) {
    return {
      ok: false,
      userId: null,
      role: null,
      response: NextResponse.json({ error: 'Bu bölüm için yetkiniz yok' }, { status: 403 }),
    }
  }
  return { ok: true, userId: user.id as string, role, response: null }
}

/** Gelen degeri beyaz listeye gore normalize eder */
export function coerceEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const v = typeof value === 'string' ? value.trim() : ''
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback
}

/** placementKey normalizasyonu: kucuk harf + alt cizgi */
export function normalizePlacementKey(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64)
}

type TargetingRules = {
  membershipTiers?: string[]
  hideForMembership?: string[]
} | null

/** Hedefleme kurallarina gore kullaniciya gosterilir mi? */
export function passesTargeting(targeting: unknown, membership: string | null | undefined): boolean {
  const rules = (targeting || null) as TargetingRules
  if (!rules || typeof rules !== 'object') return true
  const tier = (membership || 'basic').toLowerCase()
  if (Array.isArray(rules.hideForMembership) && rules.hideForMembership.map(String).includes(tier)) return false
  if (Array.isArray(rules.membershipTiers) && rules.membershipTiers.length > 0) {
    return rules.membershipTiers.map(String).includes(tier)
  }
  return true
}

export interface ResolvedPlacement {
  placementKey: string
  name: string
  adType: string
  position: string | null
  platform: string
  frequencyCap: number
  adCode: string | null
  adUnitId: string | null
  appId: string | null
  provider: string | null
  networkName: string | null
}

/**
 * Bir yerlesim anahtarina karsilik gelen aktif reklam verisini cozer.
 * Yerlesime ozel kod > bagli ag > null.
 */
export async function resolveAdPlacement(
  placementKey: string,
  opts: { membership?: string | null; platform?: string | null } = {}
): Promise<ResolvedPlacement | null> {
  const key = normalizePlacementKey(placementKey)
  if (!key) return null

  const placement = await prisma.adPlacement.findUnique({
    where: { placementKey: key },
    include: {
      adNetwork: {
        select: { id: true, name: true, provider: true, adCode: true, adUnitId: true, appId: true, isActive: true },
      },
    },
  })

  if (!placement || !placement.isActive) return null

  const wantedPlatform = (opts.platform || 'all').toLowerCase()
  if (placement.platform !== 'all' && wantedPlatform !== 'all' && placement.platform !== wantedPlatform) return null

  if (!passesTargeting(placement.targeting, opts.membership)) return null

  const net = placement.adNetwork && placement.adNetwork.isActive ? placement.adNetwork : null
  const adCode = placement.customCode || net?.adCode || null

  // Ne yerlesime ozel kod ne de aktif bir ag varsa gosterilecek bir sey yok
  if (!adCode && !net?.adUnitId && !net?.appId) return null

  return {
    placementKey: placement.placementKey,
    name: placement.name,
    adType: placement.adType,
    position: placement.position,
    platform: placement.platform,
    frequencyCap: placement.frequencyCap,
    adCode,
    adUnitId: net?.adUnitId ?? null,
    appId: net?.appId ?? null,
    provider: net?.provider ?? null,
    networkName: net?.name ?? null,
  }
}
