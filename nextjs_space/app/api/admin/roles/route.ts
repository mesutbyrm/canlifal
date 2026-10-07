export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { listRoles, PERMISSIONS, staffCan } from '@/lib/permissions'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { getHybridSession } from '@/lib/hybrid-session'

const ADMIN_ROLES = ['admin', 'yonetici']

// GET /api/admin/roles — roller + yetki kataloğu
export async function GET(req: NextRequest) {
  const session = await getHybridSession(req)
  if (!session?.user || !(await staffCan((session?.user as any)?.role, (session?.user as any)?.id, 'system.role.manage', ADMIN_ROLES))) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const roles = await listRoles()
  const permissions = await prisma.permission.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] })

  return NextResponse.json({
    success: true,
    data: {
      roles,
      permissions: permissions.length ? permissions : PERMISSIONS,
    },
  })
}

// POST /api/admin/roles — yeni rol oluştur
export async function POST(req: NextRequest) {
  const session = await getHybridSession(req)
  if (!session?.user || !(await staffCan((session?.user as any)?.role, (session?.user as any)?.id, 'system.role.manage', ADMIN_ROLES))) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { key, name, description, level } = body
    if (!key || !name) {
      return NextResponse.json({ error: 'key ve name zorunlu' }, { status: 400 })
    }

    const role = await prisma.role.create({
      data: {
        key: String(key).trim(),
        name: String(name).trim(),
        description: description || null,
        level: Number(level) || 0,
        isSystem: false,
      },
    })

    recordAudit({
      actorId: (session.user as any).id,
      actorRole: (session.user as any).role,
      ip: getAuditIp(req),
      action: 'role_create',
      targetType: 'Role',
      targetId: role.id,
      after: role as any,
      description: `Rol oluşturuldu: ${role.key}`,
    }).catch((e) => console.error('[Audit][role_create]', e))

    return NextResponse.json({ success: true, data: role })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Bu rol anahtarı zaten mevcut' }, { status: 409 })
    }
    console.error('[admin/roles] POST', e)
    return NextResponse.json({ error: 'Rol oluşturulamadı' }, { status: 500 })
  }
}
