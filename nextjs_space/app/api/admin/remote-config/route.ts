export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { invalidateCache } from '@/lib/cache'
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

const ADMIN_ROLES = ['admin', 'yonetici']

// GET /api/admin/remote-config — tüm config değerlerini listele
export async function GET(req: NextRequest) {
  const session = await getHybridSession(req)
  if (!session?.user || !(await staffCan((session?.user as any)?.role, (session?.user as any)?.id, 'system.config.manage', ADMIN_ROLES))) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const group = req.nextUrl.searchParams.get('group')
  const configs = await prisma.remoteConfig.findMany({
    where: group ? { group } : undefined,
    orderBy: [{ group: 'asc' }, { key: 'asc' }],
  })
  return NextResponse.json({ success: true, data: configs })
}

// POST /api/admin/remote-config — yeni config oluştur
export async function POST(req: NextRequest) {
  const session = await getHybridSession(req)
  if (!session?.user || !(await staffCan((session?.user as any)?.role, (session?.user as any)?.id, 'system.config.manage', ADMIN_ROLES))) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const body = await req.json()
  const { key, value, valueType, group, description, platform } = body

  if (!key || typeof key !== 'string') {
    return NextResponse.json({ error: 'key alanı zorunludur' }, { status: 400 })
  }
  if (value === undefined) {
    return NextResponse.json({ error: 'value alanı zorunludur' }, { status: 400 })
  }

  const existing = await prisma.remoteConfig.findUnique({ where: { key } })
  if (existing) {
    return NextResponse.json({ error: 'Bu key zaten mevcut' }, { status: 409 })
  }

  const config = await prisma.remoteConfig.create({
    data: {
      key,
      value,
      valueType: valueType || 'json',
      group: group || 'general',
      description: description || null,
      platform: platform || 'all',
    },
  })

  invalidateCache('config:public')
  return NextResponse.json({ success: true, data: config }, { status: 201 })
}
