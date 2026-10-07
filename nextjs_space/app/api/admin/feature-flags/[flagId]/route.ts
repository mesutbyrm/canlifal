export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { invalidateCache } from '@/lib/cache'
import { recordAudit } from '@/lib/audit-log'
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

const ADMIN_ROLES = ['admin', 'yonetici']

// PATCH /api/admin/feature-flags/[flagId] — bayrak güncelle
export async function PATCH(
  req: NextRequest,
  { params }: { params: { flagId: string } }
) {
  const session = await getHybridSession(req)
  if (!session?.user || !(await staffCan((session?.user as any)?.role, (session?.user as any)?.id, 'system.feature.toggle', ADMIN_ROLES))) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const body = await req.json()
  const { enabled, description, platform, percentage, metadata } = body

  const flag = await prisma.featureFlag.update({
    where: { id: params.flagId },
    data: {
      ...(typeof enabled === 'boolean' && { enabled }),
      ...(description !== undefined && { description }),
      ...(platform && { platform }),
      ...(typeof percentage === 'number' && { percentage }),
      ...(metadata !== undefined && { metadata }),
    },
  })

  invalidateCache('config:public')

  recordAudit({
    actorId: session.user.id,
    actorRole: (session.user as any).role,
    action: 'feature_toggle',
    targetType: 'FeatureFlag',
    targetId: params.flagId,
    after: { key: flag.key, enabled: flag.enabled, platform: flag.platform, percentage: flag.percentage },
    description: `Feature flag "${flag.key}" güncellendi`,
  }).catch(e => console.error('[Audit] feature flag error:', e))

  return NextResponse.json({ success: true, data: flag })
}

// DELETE /api/admin/feature-flags/[flagId] — bayrak sil
export async function DELETE(
  req: NextRequest,
  { params }: { params: { flagId: string } }
) {
  const session = await getHybridSession(req)
  if (!session?.user || !(await staffCan((session?.user as any)?.role, (session?.user as any)?.id, 'system.feature.toggle', ADMIN_ROLES))) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }

  const flag = await prisma.featureFlag.findUnique({ where: { id: params.flagId } })
  await prisma.featureFlag.delete({ where: { id: params.flagId } })
  invalidateCache('config:public')

  recordAudit({
    actorId: session.user.id,
    actorRole: (session.user as any).role,
    action: 'feature_delete',
    targetType: 'FeatureFlag',
    targetId: params.flagId,
    before: flag ? { key: flag.key, enabled: flag.enabled } : undefined,
    description: `Feature flag silindi${flag ? `: ${flag.key}` : ''}`,
  }).catch(e => console.error('[Audit] feature flag delete error:', e))

  return NextResponse.json({ success: true })
}
