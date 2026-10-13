export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { PERMISSIONS, getEffectivePermissions, setRolePermissions, staffCan } from '@/lib/permissions'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { invalidateCache } from '@/lib/cache'

const ADMIN_ROLES = ['admin', 'yonetici']
// Bu rollerin yetkilerini yalnızca tam yetkili (system.admin.full) kullanıcılar değiştirebilir.
const PROTECTED_ROLE_KEYS = ['admin', 'yonetici', 'kurucu']
const SUPER_PERMISSION = 'system.admin.full'
const KNOWN_PERMISSION_KEYS = new Set(PERMISSIONS.map((p) => p.key))

// PATCH /api/admin/roles/[roleId] — rol bilgisi ve/veya yetkilerini güncelle
export async function PATCH(req: NextRequest, { params }: { params: { roleId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !(await staffCan((session?.user as any)?.role, (session?.user as any)?.id, 'system.role.manage', ADMIN_ROLES))) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  try {
    const before = await prisma.role.findUnique({
      where: { id: params.roleId },
      include: { permissions: { include: { permission: true } } },
    })
    if (!before) return NextResponse.json({ error: 'Rol bulunamadı' }, { status: 404 })

    // Yetki yükseltme koruması: aktörün gerçek etkin yetkileri.
    const actorId = (session.user as any).id as string
    const actorRole = (session.user as any).role as string | undefined
    const actor = await getEffectivePermissions(actorRole, actorId)
    const actorIsSuper = actor.isSuper
    const actorPerms = new Set(actor.permissions)
    const beforeKeys = before.permissions.map((rp: any) => rp.permission.key as string)

    if (!actorIsSuper && (PROTECTED_ROLE_KEYS.includes(before.key) || beforeKeys.includes(SUPER_PERMISSION))) {
      return NextResponse.json({ error: 'Bu rolü yalnızca tam yetkili kullanıcılar değiştirebilir' }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, level, permissions } = body

    if (Array.isArray(permissions)) {
      const requested: string[] = permissions.map((k: unknown) => String(k))
      const unknown = requested.filter((k) => !KNOWN_PERMISSION_KEYS.has(k))
      if (unknown.length > 0) {
        return NextResponse.json({ error: `Bilinmeyen yetki anahtarı: ${unknown.join(', ')}` }, { status: 400 })
      }
      if (!actorIsSuper) {
        if (requested.includes(SUPER_PERMISSION)) {
          return NextResponse.json({ error: 'Tam yetki (system.admin.full) yalnızca tam yetkili kullanıcılar tarafından verilebilir' }, { status: 403 })
        }
        // Kendi sahip olmadığınız yetkiyi başkasına veremezsiniz.
        const notOwned = requested.filter((k) => !actorPerms.has(k))
        if (notOwned.length > 0) {
          return NextResponse.json({ error: `Sahip olmadığınız yetkiler verilemez: ${notOwned.join(', ')}` }, { status: 403 })
        }
      }
    }

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
  const session = await getServerSession(authOptions)
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
