export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

const ADMIN_ROLES = ['admin', 'yonetici']

// GET /api/admin/audit-logs — paginated audit log listing
export async function GET(req: NextRequest) {
  const session = await getHybridSession(req)
  if (!session?.user || !(await staffCan((session?.user as any)?.role, (session?.user as any)?.id, 'system.audit.view', ADMIN_ROLES))) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action') || undefined
  const actorId = url.searchParams.get('actorId') || undefined
  const targetType = url.searchParams.get('targetType') || undefined
  const cursor = url.searchParams.get('cursor') || undefined
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)

  const where: any = {}
  if (action) where.action = action
  if (actorId) where.actorId = actorId
  if (targetType) where.targetType = targetType
  if (cursor) where.createdAt = { lt: new Date(cursor) }

  const entries = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return NextResponse.json({
    success: true,
    data: entries,
    nextCursor: entries.length === limit ? entries[entries.length - 1].createdAt.toISOString() : null,
  })
}
