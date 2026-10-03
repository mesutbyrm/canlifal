export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'
import { setRolePermissions, staffCan } from '@/lib/permissions'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { invalidateCache } from '@/lib/cache'

const ADMIN_ROLES = ['admin', 'yonetici']

// PATCH /api/admin/roles/[roleId] — rol bilgisi ve/veya yetkilerini güncelle
export async function PATCH(req: NextRequest, { params }: { params: { roleId: string } }) {
  const session = await getStaffSession()
  if (!session?.user || !(await staffCan((session?.user as any)?.role, (session?.user as any)?.id, 'system.role.manage', ADMIN_ROLES))) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  try {
    const before = await prisma.role.findUnique({
      where: { id: params.roleId },
      include: { permissions: { include: { permission: true } } },
    })
    if (!before) return NextResponse.json({ error: 'Rol bulunamadı' }, { status: 404 })

    const body = await req.json()
    const { name, description, level, permissions } = body

    const data: any = {}
    if (name !== undefined) data.name = String(name)
    if (description !== undefined) data.description = description
    if (level !== undefined) data.level = Number(level) || 0

    if (Object.keys(data).length > 0) {
      await prisma.role.update({ where: { id: params.roleId }, data })
    }

    if (Array.isArray(permissions)) {
      await setRolePermissions(params.roleId, permissions)
    }

    try {
      invalidateCache(`rbac:role:${before.key}`)
    } catch {}

    const after = await prisma.role.findUnique({
      where: { id: params.roleId },
      include: { permissions: { include: { permission: true } } },
    })

    recordAudit({
      actorId: (session.user as any).id,
      actorRole: (session.user as any).role,
      ip: getAuditIp(req),
      action: 'role_update',
      targetType: 'Role',
      targetId: params.roleId,
      before: {
        name: before.name,
        level: before.level,
        permissions: before.permissions.map((rp: any) => rp.permission.key),
      } as any,
      after: {
        name: after?.name,
        level: after?.level,
        permissions: after?.permissions.map((rp: any) => rp.permission.key),
      } as any,
      description: `Rol güncellendi: ${before.key}`,
    }).catch((e) => console.error('[Audit][role_update]', e))

    return NextResponse.json({
      success: true,
      data: {
        id: after!.id,
        key: after!.key,
        name: after!.name,
        description: after!.description,
        level: after!.level,
        isSystem: after!.isSystem,
        permissions: after!.permissions.map((rp: any) => rp.permission.key),
      },
    })
  } catch (e) {
    console.error('[admin/roles] PATCH', e)
    return NextResponse.json({ error: 'Rol güncellenemedi' }, { status: 500 })
  }
}

// DELETE /api/admin/roles/[roleId] — sistem dışı rolleri sil
export async function DELETE(req: NextRequest, { params }: { params: { roleId: string } }) {
  const session = await getStaffSession()
  if (!session?.user || !(await staffCan((session?.user as any)?.role, (session?.user as any)?.id, 'system.role.manage', ADMIN_ROLES))) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  try {
    const role = await prisma.role.findUnique({ where: { id: params.roleId } })
    if (!role) return NextResponse.json({ error: 'Rol bulunamadı' }, { status: 404 })
    if (role.isSystem) {
      return NextResponse.json({ error: 'Sistem rolleri silinemez' }, { status: 400 })
    }

    await prisma.role.delete({ where: { id: params.roleId } })
    try {
      invalidateCache(`rbac:role:${role.key}`)
    } catch {}

    recordAudit({
      actorId: (session.user as any).id,
      actorRole: (session.user as any).role,
      ip: getAuditIp(req),
      action: 'role_delete',
      targetType: 'Role',
      targetId: params.roleId,
      before: role as any,
      description: `Rol silindi: ${role.key}`,
    }).catch((e) => console.error('[Audit][role_delete]', e))

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[admin/roles] DELETE', e)
    return NextResponse.json({ error: 'Rol silinemedi' }, { status: 500 })
  }
}
