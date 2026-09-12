/**
 * RBAC Permission Layer — lib/permissions.ts  (Phase 6)
 *
 * DB-backed roles & permissions running IN PARALLEL with the existing
 * hardcoded string role checks (`admin`, `yonetici`, `moderator`, `finans`).
 *
 * BACKWARD COMPATIBILITY CONTRACT:
 *  - Nothing here changes existing behaviour. Existing routes keep using
 *    `requireAdmin` / `session.user.role === 'admin'` checks.
 *  - If a role has no DB row yet, `hasPermission()` falls back to the
 *    legacy hardcoded matrix below, so a missing seed never locks anyone out.
 *  - Helpers never throw; on any error they fall back to the legacy matrix.
 */

import prisma from '@/lib/db'
import { getCached } from '@/lib/cache'

// ─── Permission catalog ────────────────────────────────────

export const PERMISSION_GROUPS = ['finance', 'content', 'moderation', 'system', 'agency', 'contest', 'social', 'analytics'] as const

export interface PermissionDef {
  key: string
  name: string
  group: (typeof PERMISSION_GROUPS)[number]
}

export const PERMISSIONS: PermissionDef[] = [
  // finance
  { key: 'finance.balance.adjust', name: 'Bakiye düzenleme', group: 'finance' },
  { key: 'finance.withdrawal.view', name: 'Para çekme taleplerini görme', group: 'finance' },
  { key: 'finance.withdrawal.approve', name: 'Para çekme onaylama', group: 'finance' },
  { key: 'finance.payment.manage', name: 'Ödeme taleplerini yönetme', group: 'finance' },
  { key: 'finance.ledger.view', name: 'Finansal defteri görme', group: 'finance' },
  { key: 'finance.report.view', name: 'Finansal raporları görme', group: 'finance' },
  { key: 'finance.jeton.adjust', name: 'Jeton bakiye düzenleme', group: 'finance' },
  { key: 'finance.cfc.adjust', name: 'CFC bakiye düzenleme', group: 'finance' },
  // content
  { key: 'content.gift.manage', name: 'Hediyeleri yönetme', group: 'content' },
  { key: 'content.teller.manage', name: 'Falcıları yönetme', group: 'content' },
  { key: 'content.announcement.manage', name: 'Duyuruları yönetme', group: 'content' },
  { key: 'content.media.upload', name: 'Medya yükleme', group: 'content' },
  { key: 'content.tournament.manage', name: 'Turnuvaları yönetme', group: 'content' },
  // moderation
  { key: 'moderation.user.view', name: 'Kullanıcı görüntüleme', group: 'moderation' },
  { key: 'moderation.user.edit', name: 'Kullanıcı düzenleme', group: 'moderation' },
  { key: 'moderation.user.ban', name: 'Kullanıcı yasaklama', group: 'moderation' },
  { key: 'moderation.user.unban', name: 'Kullanıcı yasak kaldırma', group: 'moderation' },
  { key: 'moderation.user.mute', name: 'Kullanıcı susturma', group: 'moderation' },
  { key: 'moderation.user.gold', name: 'Gold üyelik yönetimi', group: 'moderation' },
  { key: 'moderation.user.broadcast', name: 'Yayın yetkisi yönetimi', group: 'moderation' },
  { key: 'moderation.user.room', name: 'Oda yetkisi yönetimi', group: 'moderation' },
  { key: 'moderation.user.role', name: 'Kullanıcı rolü değiştirme', group: 'moderation' },
  { key: 'moderation.room.manage', name: 'Odaları yönetme', group: 'moderation' },
  { key: 'moderation.report.handle', name: 'Şikayetleri işleme', group: 'moderation' },
  // payment
  { key: 'payment.view', name: 'Ödeme bildirimlerini görme', group: 'finance' },
  { key: 'payment.approve', name: 'Ödeme onaylama', group: 'finance' },
  { key: 'payment.reject', name: 'Ödeme reddetme', group: 'finance' },
  { key: 'payment.correct', name: 'Ödeme düzeltme', group: 'finance' },
  { key: 'payment.refund', name: 'İade işlemi', group: 'finance' },
  // agency
  { key: 'agency.manage', name: 'Ajans yönetimi', group: 'content' },
  { key: 'agency.member.manage', name: 'Ajans üye yönetimi', group: 'content' },
  // system
  { key: 'system.feature.toggle', name: 'Özellik bayraklarını değiştirme', group: 'system' },
  { key: 'system.config.manage', name: 'Uzak yapılandırma yönetimi', group: 'system' },
  { key: 'system.audit.view', name: 'Denetim kaydını görme', group: 'system' },
  { key: 'system.role.manage', name: 'Rol ve yetki yönetimi', group: 'system' },
  { key: 'system.admin.full', name: 'Tam yönetici erişimi', group: 'system' },
  // ─── BÖLÜM 21: kullanıcı merkezi / ajans / yarışma / sosyal / analitik ───
  // user 360 center
  { key: 'user360.view', name: 'Kullanıcı 360 panelini görme', group: 'moderation' },
  { key: 'user360.finance.view', name: 'Kullanıcı finansal detaylarını görme', group: 'finance' },
  { key: 'user360.action.execute', name: 'Kullanıcı hızlı işlemlerini uygulama', group: 'moderation' },
  { key: 'moderation.user.freeze', name: 'Hesap dondurma / çözme', group: 'moderation' },
  { key: 'moderation.user.fortuneteller', name: 'Falcı yetkisi yönetimi', group: 'moderation' },
  { key: 'moderation.user.agency', name: 'Kullanıcı ajans bağlantısı yönetimi', group: 'moderation' },
  // agency
  { key: 'agency.view', name: 'Ajansları görüntüleme', group: 'agency' },
  { key: 'agency.application.review', name: 'Ajans başvurularını değerlendirme', group: 'agency' },
  { key: 'agency.wallet.view', name: 'Ajans cüzdanını görme', group: 'agency' },
  { key: 'agency.wallet.topup', name: 'Ajans cüzdanı yükleme', group: 'agency' },
  { key: 'agency.wallet.transfer', name: 'Ajanstan üyeye jeton gönderme', group: 'agency' },
  { key: 'agency.bonus.configure', name: 'Ajans bonus oranlarını ayarlama', group: 'agency' },
  { key: 'agency.commission.configure', name: 'Ajans komisyon oranlarını ayarlama', group: 'agency' },
  { key: 'agency.staff.manage', name: 'Ajans personel yönetimi', group: 'agency' },
  { key: 'agency.report.view', name: 'Ajans performans raporları', group: 'agency' },
  // contest (CFC ARENA)
  { key: 'contest.view', name: 'Yarışmaları görüntüleme', group: 'contest' },
  { key: 'contest.manage', name: 'Yarışma oluşturma ve yönetme', group: 'contest' },
  { key: 'contest.score.adjust', name: 'Yarışma puanı düzeltme', group: 'contest' },
  { key: 'contest.reward.manage', name: 'Yarışma ödüllerini yönetme', group: 'contest' },
  { key: 'contest.commission.configure', name: 'Yarışma komisyon ayarları', group: 'contest' },
  // social discovery
  { key: 'social.discovery.manage', name: 'Keşfet ayarlarını yönetme', group: 'social' },
  { key: 'social.profile.moderate', name: 'Sosyal profil moderasyonu', group: 'social' },
  { key: 'social.post.moderate', name: 'Sosyal gönderi moderasyonu', group: 'social' },
  { key: 'discovery.promote', name: 'Kullanıcı öne çıkarma', group: 'social' },
  // analytics
  { key: 'analytics.dashboard.view', name: 'Analitik panelini görme', group: 'analytics' },
  { key: 'analytics.user.view', name: 'Kullanıcı analitiği görme', group: 'analytics' },
  { key: 'analytics.live.view', name: 'Canlı durum takibi', group: 'analytics' },
  { key: 'analytics.export', name: 'Rapor dışa aktarma', group: 'analytics' },
]

// ─── Legacy fallback matrix (mirrors current hardcoded behaviour) ──

export const SYSTEM_ROLES: Array<{
  key: string
  name: string
  description: string
  level: number
  permissions: string[] | '*'
}> = [
  {
    key: 'kurucu',
    name: 'Kurucu',
    description: 'Platform kurucusu — tüm yetkiler',
    level: 1000,
    permissions: '*',
  },
  {
    key: 'admin',
    name: 'Yönetici (Admin)',
    description: 'Tam yetkili sistem yöneticisi',
    level: 100,
    permissions: '*',
  },
  {
    key: 'yonetici',
    name: 'Süper Yönetici',
    description: 'Tam yetkili, finansal işlemlerden muaf personel',
    level: 100,
    permissions: '*',
  },
  {
    key: 'finans',
    name: 'Finans Sorumlusu',
    description: 'Finansal işlemler ve raporlama',
    level: 60,
    permissions: [
      'finance.balance.adjust',
      'finance.withdrawal.view',
      'finance.withdrawal.approve',
      'finance.payment.manage',
      'finance.ledger.view',
      'finance.report.view',
      'finance.jeton.adjust',
      'finance.cfc.adjust',
      'payment.view',
      'payment.approve',
      'payment.reject',
      'payment.correct',
      'moderation.user.view',
      'system.audit.view',
    ],
  },
  {
    key: 'moderator',
    name: 'Moderatör',
    description: 'İçerik ve kullanıcı moderasyonu',
    level: 40,
    permissions: [
      'moderation.user.view',
      'moderation.user.edit',
      'moderation.user.ban',
      'moderation.user.unban',
      'moderation.user.mute',
      'moderation.user.broadcast',
      'moderation.user.room',
      'moderation.room.manage',
      'moderation.report.handle',
      'content.announcement.manage',
      'payment.view',
    ],
  },
  {
    key: 'ajans_admin',
    name: 'Ajans Yöneticisi',
    description: 'Ajans başvuruları, cüzdan ve performans yönetimi',
    level: 50,
    permissions: [
      'agency.view',
      'agency.manage',
      'agency.member.manage',
      'agency.application.review',
      'agency.wallet.view',
      'agency.wallet.topup',
      'agency.wallet.transfer',
      'agency.bonus.configure',
      'agency.commission.configure',
      'agency.staff.manage',
      'agency.report.view',
      'user360.view',
      'moderation.user.view',
      'analytics.dashboard.view',
    ],
  },
  {
    key: 'destek',
    name: 'Destek Ekibi',
    description: 'Kullanıcı destek ve inceleme (işlem yetkisi sınırlı)',
    level: 30,
    permissions: [
      'user360.view',
      'moderation.user.view',
      'moderation.report.handle',
      'moderation.user.mute',
      'analytics.dashboard.view',
      'agency.view',
      'contest.view',
    ],
  },
  {
    key: 'icerik_moderator',
    name: 'İçerik Moderatörü',
    description: 'Sosyal içerik ve profil moderasyonu',
    level: 30,
    permissions: [
      'user360.view',
      'moderation.user.view',
      'moderation.user.mute',
      'moderation.report.handle',
      'social.profile.moderate',
      'social.post.moderate',
      'social.discovery.manage',
      'content.media.upload',
      'contest.view',
    ],
  },
]

function legacyHasPermission(roleKey: string, permissionKey: string): boolean {
  const role = SYSTEM_ROLES.find((r) => r.key === roleKey)
  if (!role) return false
  if (role.permissions === '*') return true
  return role.permissions.includes(permissionKey)
}

// ─── Runtime lookups ───────────────────────────────────────

/**
 * All permission keys granted to a role, read from DB (60s cache).
 * Returns null when the role has no DB row — caller should fall back.
 */
async function getDbRolePermissions(roleKey: string): Promise<string[] | null> {
  try {
    return await getCached(`rbac:role:${roleKey}`, 60, async () => {
      const role = await prisma.role.findUnique({
        where: { key: roleKey },
        include: { permissions: { include: { permission: true } } },
      })
      if (!role) return null
      return role.permissions.map((rp: any) => rp.permission.key)
    })
  } catch (e) {
    console.error('[RBAC] getDbRolePermissions failed:', e)
    return null
  }
}

/**
 * Does the given role key grant the given permission?
 * DB first, legacy hardcoded matrix as fallback.
 */
export async function hasPermission(roleKey: string | null | undefined, permissionKey: string, userId?: string): Promise<boolean> {
  if (!roleKey) return false
  // 'admin', 'yonetici' and 'kurucu' always keep full access, regardless of DB state.
  if (roleKey === 'admin' || roleKey === 'yonetici' || roleKey === 'kurucu') return true

  // Check per-user permission overrides first (if userId provided)
  if (userId) {
    const override = await getUserPermissionOverride(userId, permissionKey)
    if (override !== null) return override // explicit grant or deny
  }

  const dbPerms = await getDbRolePermissions(roleKey)
  if (dbPerms === null) return legacyHasPermission(roleKey, permissionKey)
  if (dbPerms.includes('system.admin.full')) return true
  return dbPerms.includes(permissionKey)
}

/**
 * Check per-user permission override (60s cache).
 * Returns true/false for explicit grant/deny, null for no override.
 */
async function getUserPermissionOverride(userId: string, permissionKey: string): Promise<boolean | null> {
  try {
    const overrides = await getCached(`rbac:user:${userId}`, 60, async () => {
      const rows = await prisma.userPermissionOverride.findMany({
        where: { userId },
        select: { permissionKey: true, granted: true },
      })
      return rows.reduce((acc: Record<string, boolean>, r: any) => {
        acc[r.permissionKey] = r.granted
        return acc
      }, {})
    })
    if (overrides && permissionKey in overrides) return overrides[permissionKey]
    return null
  } catch (e) {
    console.error('[RBAC] getUserPermissionOverride failed:', e)
    return null
  }
}

/** Full permission key list for a role (DB, else legacy). */
export async function getRolePermissions(roleKey: string): Promise<string[]> {
  const dbPerms = await getDbRolePermissions(roleKey)
  if (dbPerms !== null) return dbPerms
  const role = SYSTEM_ROLES.find((r) => r.key === roleKey)
  if (!role) return []
  return role.permissions === '*' ? PERMISSIONS.map((p) => p.key) : role.permissions
}

/** All roles with their permission keys, for the admin UI. */
export async function listRoles() {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { level: 'desc' },
      include: { permissions: { include: { permission: true } } },
    })
    return roles.map((r: any) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      description: r.description,
      level: r.level,
      isSystem: r.isSystem,
      permissions: r.permissions.map((rp: any) => rp.permission.key),
    }))
  } catch (e) {
    console.error('[RBAC] listRoles failed:', e)
    return []
  }
}

/** Replace a role's permission set (admin only). */
export async function setRolePermissions(roleId: string, permissionKeys: string[]) {
  const perms = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } })
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: perms.map((p: any) => ({ roleId, permissionId: p.id })),
      skipDuplicates: true,
    }),
  ])
}

// ─── BÖLÜM 21: efektif yetki listesi ───────────────────────
/**
 * Kullanıcının gerçekte sahip olduğu tüm yetki anahtarları.
 * Sadece UI'da buton gizlemek için kullanılır — yetki kontrolü her uçta ayrıca yapılır.
 */
export async function getEffectivePermissions(
  roleKey: string | null | undefined,
  userId?: string
): Promise<{ isSuper: boolean; permissions: string[] }> {
  if (!roleKey) return { isSuper: false, permissions: [] }
  if (roleKey === 'admin' || roleKey === 'yonetici' || roleKey === 'kurucu') {
    return { isSuper: true, permissions: PERMISSIONS.map((p) => p.key) }
  }

  let base: string[] = []
  try {
    const dbPerms = await getDbRolePermissions(roleKey)
    if (dbPerms === null) {
      const role = SYSTEM_ROLES.find((r) => r.key === roleKey)
      base = role ? (role.permissions === '*' ? PERMISSIONS.map((p) => p.key) : role.permissions) : []
    } else if (dbPerms.includes('system.admin.full')) {
      return { isSuper: true, permissions: PERMISSIONS.map((p) => p.key) }
    } else {
      base = dbPerms
    }
  } catch (e) {
    console.error('[RBAC] getEffectivePermissions failed:', e)
  }

  const set = new Set(base)
  if (userId) {
    try {
      const rows = await prisma.userPermissionOverride.findMany({
        where: { userId },
        select: { permissionKey: true, granted: true },
      })
      for (const r of rows as any[]) {
        if (r.granted) set.add(r.permissionKey)
        else set.delete(r.permissionKey)
      }
    } catch (e) {
      console.error('[RBAC] override merge failed:', e)
    }
  }
  return { isSuper: false, permissions: Array.from(set) }
}
