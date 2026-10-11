/**
 * Ajans paneli yetkisi — ajans kimliği HER ZAMAN oturumdan çözülür;
 * istemciden gelen agencyId ajans uçlarında kabul edilmez.
 *
 * - Sahip: tüm ajans izinleri.
 * - Yönetici (AgencyUser.role = manager): varsayılan members, invites, reports, announce.
 * - Çalışan izni (AgencyStaffPermission) varsa varsayılanın yerine geçer.
 */
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAuth } from '@/lib/rbac'

export const AGENCY_STAFF_PERMISSIONS = ['members', 'invites', 'reports', 'announce', 'targets'] as const
export type AgencyStaffPermissionKey = (typeof AGENCY_STAFF_PERMISSIONS)[number]

const MANAGER_DEFAULT: AgencyStaffPermissionKey[] = ['members', 'invites', 'reports', 'announce']

export type AgencyAccess = {
  agency: { id: string; name: string; ownerId: string; status: string; logoUrl: string | null }
  role: string
  isOwner: boolean
  permissions: Set<AgencyStaffPermissionKey>
}

export function sanitizeStaffPermissions(raw: unknown): AgencyStaffPermissionKey[] {
  if (!Array.isArray(raw)) return []
  const allowed = new Set<string>(AGENCY_STAFF_PERMISSIONS)
  return Array.from(new Set(raw.map(String).filter((p) => allowed.has(p)))) as AgencyStaffPermissionKey[]
}

export async function getAgencyAccess(userId: string): Promise<AgencyAccess | null> {
  const membership = await prisma.agencyUser.findUnique({
    where: { userId },
    select: {
      role: true,
      isActive: true,
      agency: { select: { id: true, name: true, ownerId: true, status: true, logoUrl: true } },
    },
  })
  let agency = membership?.agency ?? null
  let role = membership?.role ?? 'member'
  if (!agency) {
    // Sahip, üyelik satırı olmadan da kendi ajansını yönetir.
    agency = await prisma.agency.findFirst({
      where: { ownerId: userId, status: { in: ['approved', 'suspended'] } },
      select: { id: true, name: true, ownerId: true, status: true, logoUrl: true },
    })
    role = 'owner'
  }
  if (!agency) return null
  const isOwner = agency.ownerId === userId || role === 'owner'
  let permissions = new Set<AgencyStaffPermissionKey>()
  if (isOwner) {
    permissions = new Set(AGENCY_STAFF_PERMISSIONS)
  } else {
    let staff: { permissions: string[] } | null = null
    try {
      staff = await prisma.agencyStaffPermission.findUnique({
        where: { agencyId_userId: { agencyId: agency.id, userId } },
        select: { permissions: true },
      })
    } catch {
      staff = null
    }
    if (staff) permissions = new Set(sanitizeStaffPermissions(staff.permissions))
    else if (role === 'manager') permissions = new Set(MANAGER_DEFAULT)
  }
  return { agency, role: isOwner ? 'owner' : role, isOwner, permissions }
}

export function can(access: AgencyAccess | null, perm: AgencyStaffPermissionKey): boolean {
  return !!access && access.agency.status === 'approved' && access.permissions.has(perm)
}

/**
 * Ajans paneli uçları için ortak kapı: oturum + ajans + (varsa) izin.
 * `perm` verilmezse ajansın herhangi bir üyesi/sahibi geçer.
 */
export async function requireAgencyPanel(
  req: NextRequest,
  perm?: AgencyStaffPermissionKey | 'owner',
): Promise<{ user: { id: string; name?: string | null; username?: string | null; role?: string | null }; access: AgencyAccess } | NextResponse> {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const user = auth.user as any
  const access = await getAgencyAccess(user.id)
  if (!access) return NextResponse.json({ success: false, error: 'Bir ajansa bağlı değilsiniz' }, { status: 403 })
  if (perm === 'owner') {
    if (!access.isOwner) return NextResponse.json({ success: false, error: 'Bu işlemi yalnız ajans sahibi yapabilir' }, { status: 403 })
  } else if (perm && !can(access, perm)) {
    return NextResponse.json({ success: false, error: 'Bu işlem için ajans yetkiniz yok' }, { status: 403 })
  }
  return { user, access }
}

/** Kullanıcı bu ajans tarafından engellenmiş mi? (Tablo yoksa engel yok sayılır.) */
export async function isBlockedByAgency(agencyId: string, userId: string): Promise<boolean> {
  try {
    const row = await prisma.agencyMemberBlock.findUnique({
      where: { agencyId_userId: { agencyId, userId } },
      select: { id: true },
    })
    return !!row
  } catch {
    return false
  }
}

export const BLOCKED_MESSAGE = 'Bu ajans tarafından engellendiğiniz için katılamazsınız'
