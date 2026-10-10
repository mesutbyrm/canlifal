import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { AGENCY_STAFF_PERMISSIONS, requireAgencyPanel, sanitizeStaffPermissions } from '@/lib/agency-access'
import { createNotificationWithPush } from '@/lib/notify'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'
const err = (status: number, error: string) => NextResponse.json({ success: false, error }, { status })

/** GET /api/agency/staff — çalışan yetkileri (yalnız sahip). */
export async function GET(req: NextRequest) {
  const gate = await requireAgencyPanel(req, 'owner')
  if (gate instanceof NextResponse) return gate
  const rows = await prisma.agencyStaffPermission.findMany({ where: { agencyId: gate.access.agency.id } })
  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.userId) } },
    select: { id: true, name: true, username: true, image: true },
  })
  const byId = new Map(users.map((u) => [u.id, u]))
  return NextResponse.json({
    success: true,
    data: { available: AGENCY_STAFF_PERMISSIONS, staff: rows.map((r) => ({ ...r, user: byId.get(r.userId) ?? null })) },
  })
}

/** PUT /api/agency/staff {userId, permissions[]} — yalnız ajansın aktif üyesine, yalnız sahip verir. */
export async function PUT(req: NextRequest) {
  const gate = await requireAgencyPanel(req, 'owner')
  if (gate instanceof NextResponse) return gate
  const { user, access } = gate
  const body = await req.json().catch(() => ({}))
  const userId = String(body.userId || '')
  const permissions = sanitizeStaffPermissions(body.permissions)
  if (!userId) return err(400, 'userId gerekli')
  if (userId === user.id) return err(400, 'Sahip zaten tüm yetkilere sahip')
  const member = await prisma.agencyUser.findUnique({ where: { userId }, select: { agencyId: true, isActive: true } })
  if (!member || member.agencyId !== access.agency.id || !member.isActive) return err(404, 'Kullanıcı ajansınızın aktif üyesi değil')
  const row = await prisma.agencyStaffPermission.upsert({
    where: { agencyId_userId: { agencyId: access.agency.id, userId } },
    update: { permissions, grantedById: user.id },
    create: { agencyId: access.agency.id, userId, permissions, grantedById: user.id },
  })
  createNotificationWithPush({
    userId,
    type: 'agency_staff',
    title: 'Ajans yetkiniz güncellendi',
    message: permissions.length ? `${access.agency.name} size yeni yetkiler verdi.` : `${access.agency.name} yetkilerinizi kaldırdı.`,
    targetPath: '/ajans/dashboard',
  }).catch(() => {})
  recordAudit({ actorId: user.id, action: 'agency_staff_update', targetType: 'agency', targetId: access.agency.id, metadata: { userId, permissions }, ip: getAuditIp(req) }).catch(() => {})
  return NextResponse.json({ success: true, data: row, message: 'Yetkiler kaydedildi' })
}

/** DELETE /api/agency/staff?userId= — çalışan yetkisini kaldırır (yönetici rolü varsayılanına döner). */
export async function DELETE(req: NextRequest) {
  const gate = await requireAgencyPanel(req, 'owner')
  if (gate instanceof NextResponse) return gate
  const userId = new URL(req.url).searchParams.get('userId') || ''
  const r = await prisma.agencyStaffPermission.deleteMany({ where: { agencyId: gate.access.agency.id, userId } })
  if (r.count === 0) return err(404, 'Kayıt bulunamadı')
  recordAudit({ actorId: gate.user.id, action: 'agency_staff_remove', targetType: 'agency', targetId: gate.access.agency.id, metadata: { userId }, ip: getAuditIp(req) }).catch(() => {})
  return NextResponse.json({ success: true, message: 'Yetkiler kaldırıldı' })
}
