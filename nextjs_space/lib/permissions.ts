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

export const PERMISSION_GROUPS = ['finance', 'content', 'moderation', 'system'] as const

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
  // 'admin' and 'yonetici' always keep full access, regardless of DB state.
  if (roleKey === 'admin' || roleKey === 'yonetici') return true

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
