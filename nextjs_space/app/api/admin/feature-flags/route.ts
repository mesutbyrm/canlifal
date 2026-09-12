export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { invalidateCache } from '@/lib/cache'
import { staffCan } from '@/lib/permissions'

const ADMIN_ROLES = ['admin', 'yonetici']

// GET /api/admin/feature-flags — tüm bayrakları listele
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !(await staffCan((session?.user as any)?.role, (session?.user as any)?.id, 'system.feature.toggle', ADMIN_ROLES))) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const flags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } })
  return NextResponse.json({ success: true, data: flags })
}

// POST /api/admin/feature-flags — yeni bayrak oluştur
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !(await staffCan((session?.user as any)?.role, (session?.user as any)?.id, 'system.feature.toggle', ADMIN_ROLES))) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const body = await req.json()
  const { key, enabled, description, platform, percentage, metadata } = body

  if (!key || typeof key !== 'string') {
    return NextResponse.json({ error: 'key alanı zorunludur' }, { status: 400 })
  }

  // Aynı key var mı kontrol
  const existing = await prisma.featureFlag.findUnique({ where: { key } })
  if (existing) {
    return NextResponse.json({ error: 'Bu key zaten mevcut' }, { status: 409 })
  }

  const flag = await prisma.featureFlag.create({
    data: {
      key: key.toUpperCase(),
      enabled: enabled ?? false,
      description: description || null,
      platform: platform || 'all',
      percentage: percentage ?? 100,
      metadata: metadata || null,
    },
  })

  invalidateCache('config:public')
  return NextResponse.json({ success: true, data: flag }, { status: 201 })
}
