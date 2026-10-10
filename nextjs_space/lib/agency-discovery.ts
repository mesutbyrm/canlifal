/**
 * Ajanslar keşif sayfası — yalnız gerçek verilerden istatistik.
 * - Aktif yayıncı: AgencyUser.isActive
 * - Doğrulanmış yayın saati: son 30 gün, mevcut üyeler, video yayını (agency-performance)
 * - Hedef başarı oranı: son 90 gün kapanmış hak edişlerde met / toplam (kayıt yoksa null)
 * Hesap 10 dk önbelleklenir; admin ayarı değişince önbellek temizlenir.
 */
import prisma from '@/lib/db'
import { getCached } from '@/lib/cache'
import { computeMembersPerformance } from '@/lib/agency-performance'
import { AGENCY_MGMT_KEYS, DISCOVERY_SORTS, type DiscoverySort, getAgencyMgmtSetting, idList } from '@/lib/agency-settings'

const LEVEL_RANK: Record<string, number> = { bronze: 1, silver: 2, gold: 3, diamond: 4 }
const DAY = 24 * 60 * 60 * 1000

export type AgencyCard = {
  id: string
  name: string
  description: string | null
  logoUrl: string | null
  level: string
  verified: boolean
  featured: boolean
  activeMembers: number
  verifiedHours30d: number
  targetSuccessRate: number | null
  closedTargets90d: number
  activePromises: number
  createdAt: Date
}

async function buildCards(): Promise<AgencyCard[]> {
  const hidden = new Set(idList(await getAgencyMgmtSetting(AGENCY_MGMT_KEYS.discoveryHidden)))
  const featured = new Set(idList(await getAgencyMgmtSetting(AGENCY_MGMT_KEYS.discoveryFeatured)))
  const agencies = await prisma.agency.findMany({
    where: { status: 'approved' },
    select: { id: true, name: true, description: true, logoUrl: true, level: true, createdAt: true },
    take: 300,
  })
  const visible = agencies.filter((a) => !hidden.has(a.id))
  const now = new Date()
  const from30 = new Date(now.getTime() - 30 * DAY)
  const from90 = new Date(now.getTime() - 90 * DAY)
  const cards: AgencyCard[] = []
  for (const a of visible) {
    const members = await prisma.agencyUser.findMany({
      where: { agencyId: a.id, isActive: true },
      select: { userId: true },
    })
    const ids = members.map((m) => m.userId)
    const perf = await computeMembersPerformance(a.id, ids, from30, now)
    const minutes = Array.from(perf.values()).reduce((s, p) => s + p.verifiedMinutes, 0)
    let closed = 0
    let met = 0
    let promises = 0
    try {
      const acc = await prisma.broadcasterAccrual.groupBy({
        by: ['met'],
        where: { agencyId: a.id, periodStart: { gte: from90 }, status: { not: 'void' } },
        _count: { _all: true },
      })
      for (const r of acc as any[]) {
        closed += r._count._all
        if (r.met) met += r._count._all
      }
      promises = await prisma.agencyPromise.count({ where: { agencyId: a.id, status: 'active' } })
    } catch {
      // Tablolar henüz yoksa istatistik "veri yok" kalır (sahte değer üretilmez).
    }
    cards.push({
      id: a.id,
      name: a.name,
      description: a.description,
      logoUrl: a.logoUrl,
      level: a.level,
      verified: true,
      featured: featured.has(a.id),
      activeMembers: ids.length,
      verifiedHours30d: Math.round((minutes / 60) * 10) / 10,
      targetSuccessRate: closed > 0 ? Math.round((met / closed) * 1000) / 10 : null,
      closedTargets90d: closed,
      activePromises: promises,
      createdAt: a.createdAt,
    })
  }
  return cards
}

export async function discoveryCards(): Promise<AgencyCard[]> {
  return getCached('agencies:discovery', 600, buildCards)
}

export function sortCards(cards: AgencyCard[], sort: DiscoverySort): AgencyCard[] {
  const by: Record<DiscoverySort, (a: AgencyCard, b: AgencyCard) => number> = {
    hours: (a, b) => b.verifiedHours30d - a.verifiedHours30d,
    members: (a, b) => b.activeMembers - a.activeMembers,
    success: (a, b) => (b.targetSuccessRate ?? -1) - (a.targetSuccessRate ?? -1),
    level: (a, b) => (LEVEL_RANK[b.level] ?? 0) - (LEVEL_RANK[a.level] ?? 0),
    newest: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    // Önerilen: öne çıkarılan > seviye > doğrulanmış saat > aktif yayıncı
    recommended: (a, b) =>
      Number(b.featured) - Number(a.featured) ||
      (LEVEL_RANK[b.level] ?? 0) - (LEVEL_RANK[a.level] ?? 0) ||
      b.verifiedHours30d - a.verifiedHours30d ||
      b.activeMembers - a.activeMembers,
  }
  const sorted = [...cards].sort(by[sort])
  if (sort === 'recommended') return sorted
  // Diğer sıralamalarda da öne çıkarılanlar başta kalır.
  return [...sorted.filter((c) => c.featured), ...sorted.filter((c) => !c.featured)]
}

export async function resolveSort(raw: string | null): Promise<DiscoverySort> {
  if (raw && (DISCOVERY_SORTS as readonly string[]).includes(raw)) return raw as DiscoverySort
  const def = await getAgencyMgmtSetting(AGENCY_MGMT_KEYS.discoveryDefaultSort)
  return (DISCOVERY_SORTS as readonly string[]).includes(def) ? (def as DiscoverySort) : 'recommended'
}
