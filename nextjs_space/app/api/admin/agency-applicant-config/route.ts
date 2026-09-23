import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requirePermission } from '@/lib/rbac'
import { getCachedPlatformSetting, invalidateCachePrefix } from '@/lib/cache'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

const DEFAULT_WEIGHTS = {
  stream_experience: 20, activity: 20, stream_duration: 15,
  engagement: 15, profile_completion: 10, verification: 10, moderation: 10,
}

/**
 * §12 — Admin yapılandırılabilir "Ajansa Uygunluk Skoru" ağırlıkları
 */
export async function GET(req: NextRequest) {
  const perm = await requirePermission(req, 'agency.application.review')
  if (perm instanceof NextResponse) return perm

  const raw = await getCachedPlatformSetting('agency_applicant_score_weights', '')
  let weights = { ...DEFAULT_WEIGHTS }
  if (raw) { try { weights = { ...DEFAULT_WEIGHTS, ...JSON.parse(raw) } } catch {} }

  return NextResponse.json({ success: true, data: { weights, defaults: DEFAULT_WEIGHTS } })
}

export async function PUT(req: NextRequest) {
  const perm = await requirePermission(req, 'agency.application.review')
  if (perm instanceof NextResponse) return perm
  const admin = (perm as any).user
  const ip = getAuditIp(req)

  const body = await req.json().catch(() => ({}))
  const { weights } = body
  if (!weights || typeof weights !== 'object') {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'weights nesnesi gerekli' } }, { status: 400 })
  }

  // Validate all keys are numbers >= 0
  const valid: Record<string, number> = {}
  for (const key of Object.keys(DEFAULT_WEIGHTS)) {
    const v = Number(weights[key])
    valid[key] = isNaN(v) || v < 0 ? (DEFAULT_WEIGHTS as any)[key] : v
  }

  await prisma.platformSettings.upsert({
    where: { key: 'agency_applicant_score_weights' },
    update: { value: JSON.stringify(valid) },
    create: { key: 'agency_applicant_score_weights', value: JSON.stringify(valid) },
  })
  invalidateCachePrefix('platform:')

  recordAudit({ actorId: admin.id, action: 'agency_applicant_config_update', metadata: { weights: valid }, ip }).catch(() => {})

  return NextResponse.json({ success: true, data: { weights: valid } })
}
