/**
 * BÖLÜM 20 — Merkezi VIP / üyelik yetenek (entitlement) motoru.
 *
 * TEK DOĞRULUK KAYNAĞI. Kodun hiçbir yerinde `if (user.membership === 'diamond')`
 * yazılmamalı; bunun yerine hasCapability()/requireCapability() kullanılır.
 *
 * - Kademe ve yetenek matrisi DB'den okunur (admin panelinden yönetilir).
 * - Kademe kalıtımı: bir yetenek için kademeye ait açık satır yoksa, en yakın ALT
 *   kademenin satırı devralınır (Gold ⊂ Premium ⊂ Diamond ⊂ SVIP).
 * - Süresi dolmuş üyelik otomatik olarak Basic gibi davranır; kullanıcının kayıtlı
 *   kozmetik seçimleri SİLİNMEZ, sadece kullanılamaz hale gelir.
 * - Önbellek: kademe/özellik matrisi 5 dk, kullanıcı yetkileri 60 sn.
 *   Üyelik değişiminde invalidateUserEntitlements() ÇAĞRILMALIDIR.
 *
 * Jeton / CFC ekonomisiyle hiçbir bağı yoktur.
 */
import prisma from '@/lib/db'
import { getCached, invalidateCache, invalidateCachePrefix } from '@/lib/cache'
import { DEFAULT_TIERS, FEATURE_CATALOG } from '@/lib/vip-features'

export const TIER_CACHE_KEY = 'vip:tiers'
export const MATRIX_CACHE_KEY = 'vip:matrix'
const TIER_TTL = 300
const USER_TTL = 60

export interface TierInfo {
  key: string
  name: string
  nameEn: string
  rank: number
  color: string
  gradient: string | null
  icon: string
  badgeUrl: string | null
  frameUrl: string | null
  description: string | null
  discoveryWeight: number
  sortOrder: number
}

export interface FeatureInfo {
  key: string
  name: string
  nameEn: string
  category: string
  description: string | null
  valueType: string
  unit: string | null
  sortOrder: number
}

export interface FeatureGrant {
  enabled: boolean
  limit: number | null
  dailyLimit: number | null
  monthlyLimit: number | null
  durationDays: number | null
  priority: number
  assetRef: string | null
  value: any
  /** Bu izin hangi kademeden devralındı */
  inheritedFrom: string
}

export interface VipPreferences {
  hideVipBadge: boolean
  hideOnlineStatus: boolean
  hideLastSeen: boolean
  hideProfileVisit: boolean
  hiddenRoomEntry: boolean
  hideVipStatus: boolean
  disableEntranceEffects: boolean
  muteOthersEntrance: boolean
}

export interface UserEntitlements {
  userId: string
  /** Ödenen/atanan kademe (süresi dolmuş olabilir) */
  storedTier: string
  /** Geçerli olan kademe — süre dolduysa 'basic' */
  tier: string
  tierInfo: TierInfo
  expiresAt: string | null
  isExpired: boolean
  daysRemaining: number | null
  features: Record<string, FeatureGrant>
  preferences: VipPreferences
  role: string
}

const EMPTY_PREFS: VipPreferences = {
  hideVipBadge: false,
  hideOnlineStatus: false,
  hideLastSeen: false,
  hideProfileVisit: false,
  hiddenRoomEntry: false,
  hideVipStatus: false,
  disableEntranceEffects: false,
  muteOthersEntrance: false,
}

/* ────────────────────────── Kademe kataloğu ────────────────────────── */

function fallbackTiers(): TierInfo[] {
  return DEFAULT_TIERS.map((t) => ({
    key: t.key, name: t.name, nameEn: t.nameEn, rank: t.rank, color: t.color,
    gradient: t.gradient ?? null, icon: t.icon, badgeUrl: null, frameUrl: null,
    description: t.description, discoveryWeight: t.discoveryWeight, sortOrder: t.sortOrder,
  }))
}

export async function getTiers(): Promise<TierInfo[]> {
  return getCached<TierInfo[]>(TIER_CACHE_KEY, TIER_TTL, async () => {
    try {
      const rows = await prisma.membershipTierDef.findMany({
        where: { isActive: true },
        orderBy: { rank: 'asc' },
        take: 50,
      })
      if (!rows.length) return fallbackTiers()
      return rows.map((r) => ({
        key: r.key, name: r.name, nameEn: r.nameEn, rank: r.rank, color: r.color,
        gradient: r.gradient, icon: r.icon, badgeUrl: r.badgeUrl, frameUrl: r.frameUrl,
        description: r.description, discoveryWeight: r.discoveryWeight, sortOrder: r.sortOrder,
      }))
    } catch {
      return fallbackTiers()
    }
  })
}

/** Bilinmeyen/eski kademe adlarını 5'li sisteme eşler (geriye dönük uyumluluk). */
const LEGACY_TIER_ALIASES: Record<string, string> = {
  '': 'basic', free: 'basic', normal: 'basic', standard: 'basic',
  silver: 'gold', platinum: 'diamond', vip: 'diamond',
}

export function normalizeTierKey(raw: string | null | undefined, known: string[]): string {
  const k = (raw || 'basic').toLowerCase().trim()
  if (known.includes(k)) return k
  const alias = LEGACY_TIER_ALIASES[k]
  if (alias && known.includes(alias)) return alias
  return 'basic'
}

export async function getTierInfo(key: string): Promise<TierInfo> {
  const tiers = await getTiers()
  const norm = normalizeTierKey(key, tiers.map((t) => t.key))
  return tiers.find((t) => t.key === norm) || tiers[0] || fallbackTiers()[0]
}

/* ────────────────────────── Yetenek matrisi ────────────────────────── */

interface MatrixRow {
  tierKey: string
  featureKey: string
  enabled: boolean
  limitValue: number | null
  dailyLimit: number | null
  monthlyLimit: number | null
  durationDays: number | null
  priority: number
  assetRef: string | null
  defaultValue: any
}

interface Matrix {
  features: FeatureInfo[]
  rows: MatrixRow[]
}

function fallbackMatrix(): Matrix {
  const tiers = DEFAULT_TIERS
  const rows: MatrixRow[] = []
  for (const f of FEATURE_CATALOG) {
    const minRank = tiers.find((t) => t.key === f.minTier)?.rank ?? 0
    for (const t of tiers) {
      const per = f.perTier?.[t.key]
      const enabled = t.rank >= minRank
      if (!enabled && !per) continue
      rows.push({
        tierKey: t.key, featureKey: f.key, enabled,
        limitValue: per?.limitValue ?? null,
        dailyLimit: per?.dailyLimit ?? null,
        monthlyLimit: null,
        durationDays: null,
        priority: per?.priority ?? 0,
        assetRef: null,
        defaultValue: per?.defaultValue ?? null,
      })
    }
  }
  return {
    features: FEATURE_CATALOG.map((f) => ({
      key: f.key, name: f.name, nameEn: f.nameEn, category: f.category,
      description: f.description, valueType: f.valueType, unit: f.unit ?? null, sortOrder: f.sortOrder,
    })),
    rows,
  }
}

export async function getMatrix(): Promise<Matrix> {
  return getCached<Matrix>(MATRIX_CACHE_KEY, TIER_TTL, async () => {
    try {
      const [features, rows] = await Promise.all([
        prisma.membershipFeature.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, take: 500 }),
        prisma.membershipTierFeature.findMany({ take: 5000 }),
      ])
      if (!features.length) return fallbackMatrix()
      return {
        features: features.map((f) => ({
          key: f.key, name: f.name, nameEn: f.nameEn, category: f.category,
          description: f.description, valueType: f.valueType, unit: f.unit, sortOrder: f.sortOrder,
        })),
        rows: rows.map((r) => ({
          tierKey: r.tierKey, featureKey: r.featureKey, enabled: r.enabled,
          limitValue: r.limitValue, dailyLimit: r.dailyLimit, monthlyLimit: r.monthlyLimit,
          durationDays: r.durationDays, priority: r.priority, assetRef: r.assetRef,
          defaultValue: r.defaultValue,
        })),
      }
    } catch {
      return fallbackMatrix()
    }
  })
}

/**
 * Bir kademe için etkin yetenek haritasını hesaplar (kalıtımlı).
 * Bu fonksiyon saftır ve önbelleklenmiş matris üzerinde çalışır.
 */
export async function resolveTierFeatures(tierKey: string): Promise<Record<string, FeatureGrant>> {
  const [tiers, matrix] = await Promise.all([getTiers(), getMatrix()])
  const norm = normalizeTierKey(tierKey, tiers.map((t) => t.key))
  const myRank = tiers.find((t) => t.key === norm)?.rank ?? 0
  const rankOf = new Map(tiers.map((t) => [t.key, t.rank]))

  const out: Record<string, FeatureGrant> = {}
  for (const feature of matrix.features) {
    // Bu kademe ve altındaki satırlar arasında en yüksek rütbeli olanı seç
    let best: MatrixRow | null = null
    let bestRank = -1
    for (const row of matrix.rows) {
      if (row.featureKey !== feature.key) continue
      const r = rankOf.get(row.tierKey)
      if (r === undefined || r > myRank) continue
      if (r > bestRank) { best = row; bestRank = r }
    }
    if (!best) {
      out[feature.key] = { enabled: false, limit: null, dailyLimit: null, monthlyLimit: null, durationDays: null, priority: 0, assetRef: null, value: null, inheritedFrom: norm }
      continue
    }
    out[feature.key] = {
      enabled: best.enabled,
      limit: best.limitValue,
      dailyLimit: best.dailyLimit,
      monthlyLimit: best.monthlyLimit,
      durationDays: best.durationDays,
      priority: best.priority,
      assetRef: best.assetRef,
      value: best.defaultValue ?? null,
      inheritedFrom: best.tierKey,
    }
  }
  return out
}

/* ────────────────────────── Kullanıcı yetkileri ────────────────────────── */

export function userEntitlementCacheKey(userId: string) {
  return `vip:user:${userId}`
}

export async function getUserEntitlements(userId: string): Promise<UserEntitlements | null> {
  if (!userId) return null
  return getCached<UserEntitlements | null>(userEntitlementCacheKey(userId), USER_TTL, async () => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, membership: true, membershipExpiresAt: true, role: true,
        vipPreference: true,
      },
    })
    if (!user) return null

    const tiers = await getTiers()
    const known = tiers.map((t) => t.key)
    const storedTier = normalizeTierKey(user.membership, known)
    const expiresAt = user.membershipExpiresAt ? new Date(user.membershipExpiresAt) : null
    const now = Date.now()
    const isExpired = storedTier !== 'basic' && !!expiresAt && expiresAt.getTime() <= now
    const effectiveTier = isExpired ? 'basic' : storedTier
    const daysRemaining = expiresAt && !isExpired
      ? Math.max(0, Math.ceil((expiresAt.getTime() - now) / 86400000))
      : null

    const features = await resolveTierFeatures(effectiveTier)
    const p: any = user.vipPreference
    const preferences: VipPreferences = p
      ? {
          hideVipBadge: !!p.hideVipBadge,
          hideOnlineStatus: !!p.hideOnlineStatus,
          hideLastSeen: !!p.hideLastSeen,
          hideProfileVisit: !!p.hideProfileVisit,
          hiddenRoomEntry: !!p.hiddenRoomEntry,
          hideVipStatus: !!p.hideVipStatus,
          disableEntranceEffects: !!p.disableEntranceEffects,
          muteOthersEntrance: !!p.muteOthersEntrance,
        }
      : { ...EMPTY_PREFS }

    return {
      userId: user.id,
      storedTier,
      tier: effectiveTier,
      tierInfo: tiers.find((t) => t.key === effectiveTier) || tiers[0],
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      isExpired,
      daysRemaining,
      features,
      preferences,
      role: user.role || 'user',
    }
  })
}

/** Tek bir yeteneğin açık olup olmadığını döner. Admin rolleri her zaman geçer. */
export async function hasCapability(userId: string, featureKey: string): Promise<boolean> {
  const ent = await getUserEntitlements(userId)
  if (!ent) return false
  if (['admin', 'yonetici'].includes((ent.role || '').toLowerCase())) return true
  return !!ent.features[featureKey]?.enabled
}

/** Yeteneğin sayısal limitini döner (null = sınırsız / tanımsız). */
export async function capabilityLimit(userId: string, featureKey: string): Promise<number | null> {
  const ent = await getUserEntitlements(userId)
  return ent?.features[featureKey]?.limit ?? null
}

/** Kullanıcının etkin kademesinin rütbesi. */
export async function userTierRank(userId: string): Promise<number> {
  const ent = await getUserEntitlements(userId)
  return ent?.tierInfo?.rank ?? 0
}

/** Kullanıcı verilen minimum kademeyi karşılıyor mu? */
export async function meetsMinTier(userId: string, minTierKey: string | null | undefined): Promise<boolean> {
  if (!minTierKey) return true
  const [ent, tiers] = await Promise.all([getUserEntitlements(userId), getTiers()])
  if (!ent) return false
  if (['admin', 'yonetici', 'moderator'].includes((ent.role || '').toLowerCase())) return true
  const need = tiers.find((t) => t.key === normalizeTierKey(minTierKey, tiers.map((x) => x.key)))?.rank ?? 0
  return ent.tierInfo.rank >= need
}

/** Keşfet/sıralama ağırlığı (§14). Admin panelinden değiştirilebilir, hardcoded DEĞİL. */
export async function discoveryWeight(tierKey: string | null | undefined): Promise<number> {
  const info = await getTierInfo(tierKey || 'basic')
  const w = Number(info.discoveryWeight)
  if (!isFinite(w) || w <= 0) return 1
  return Math.min(3, Math.max(0.5, w))
}

/* ────────────────────────── Önbellek geçersizleştirme ────────────────────────── */

/** Üyelik/tercih değişiminde MUTLAKA çağrılmalı (§22). */
export function invalidateUserEntitlements(userId: string): void {
  invalidateCache(userEntitlementCacheKey(userId))
}

/** Admin matris/kademe değişiminde çağrılır — tüm kullanıcı önbellekleri düşer. */
export function invalidateVipCatalog(): void {
  invalidateCache(TIER_CACHE_KEY)
  invalidateCache(MATRIX_CACHE_KEY)
  invalidateCachePrefix('vip:user:')
}

/* ────────────────────── §14 Keşfet ağırlıklandırma ────────────────────── */

export interface DiscoveryCandidate {
  membership?: string | null
  membershipExpiresAt?: Date | string | null
  createdAt?: Date | string | null
}

/**
 * §14 — Üyelik kademesine göre keşfet sıralaması ağırlığı uygular.
 * Ağırlıklar ADMIN PANELİNDEN yönetilir (membership_tier_defs.discoveryWeight),
 * kodda sabit DEĞİLDİR.
 *
 * Adalet koruması (§14): son NEW_USER_GRACE_DAYS içinde katılan kullanıcılar
 * en yüksek ağırlığı alır — ücretli kademeler yeni kullanıcıları gömemez.
 * Sıralama YALNIZCA yeniden ağırlıklandırır; hiçbir kaydı listeden ÇIKARMAZ.
 */
export const NEW_USER_GRACE_DAYS = 7

export async function applyDiscoveryWeighting<T extends DiscoveryCandidate>(
  items: T[],
  opts?: { groupBy?: (item: T) => string | number }
): Promise<T[]> {
  if (!items.length) return items
  const tiers = await getTiers()
  const keys = tiers.map((t) => t.key)
  const weightOf = new Map(tiers.map((t) => [t.key, Math.min(3, Math.max(0.5, Number(t.discoveryWeight) || 1))]))
  const maxWeight = Math.max(1, ...Array.from(weightOf.values()))
  const now = Date.now()
  const graceMs = NEW_USER_GRACE_DAYS * 86400000

  const scored = items.map((item, index) => {
    const expired = item.membershipExpiresAt
      ? new Date(item.membershipExpiresAt).getTime() <= now
      : false
    const tier = expired ? 'basic' : normalizeTierKey(item.membership, keys)
    let weight = weightOf.get(tier) ?? 1
    const isNew = item.createdAt ? now - new Date(item.createdAt).getTime() < graceMs : false
    if (isNew) weight = Math.max(weight, maxWeight)
    const base = items.length - index // mevcut sıralamayı taban puan olarak korur
    return { item, index, group: opts?.groupBy ? opts.groupBy(item) : 0, score: base * weight }
  })

  scored.sort((a, b) => {
    if (a.group !== b.group) return a.group < b.group ? -1 : 1
    if (b.score !== a.score) return b.score - a.score
    return a.index - b.index
  })
  return scored.map((s) => s.item)
}
