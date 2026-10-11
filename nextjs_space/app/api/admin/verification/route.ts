import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser, isAdminRole } from '@/lib/rbac'
import { apiPaginated, apiSuccess, apiError, apiForbidden, apiUnauthorized, apiNotFound } from '@/lib/api-response'
import { recordAudit, getAuditIp } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

// GET /api/admin/verification?status=pending&type=&page=&pageSize= — review queue
export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()
    if (!isAdminRole(user.role)) return apiForbidden()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'pending'
    const type = searchParams.get('type') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10)))

    const where: any = {}
    if (status && status !== 'all') where.status = status
    if (type) where.type = type

    const [total, records] = await Promise.all([
      prisma.verification.count({ where }),
      prisma.verification.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return apiPaginated(records, {
      page, limit: pageSize, total, hasMore: page * pageSize < total,
    })
  } catch (err) {
    console.error('[admin/verification GET]', err)
    return apiError('INTERNAL_ERROR', 'Doğrulama kuyruğu getirilemedi', 500)
  }
}

// PATCH /api/admin/verification — approve/reject a request
// Body: { id, action: 'approve'|'reject', reviewNote? }
export async function PATCH(req: NextRequest) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()
    if (!isAdminRole(user.role)) return apiForbidden()

    const body = await req.json().catch(() => ({}))
    const id = (body.id || '').trim()
    const action = (body.action || '').trim()
    if (!id) return apiError('VALIDATION_ERROR', 'Kayıt id gerekli', 400)
    if (!['approve', 'reject'].includes(action)) return apiError('VALIDATION_ERROR', 'Geçersiz işlem', 400)

    const record = await prisma.verification.findUnique({ where: { id } })
    if (!record) return apiNotFound('Doğrulama kaydı bulunamadı')

    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const updated = await prisma.verification.update({
      where: { id },
      data: {
        status: newStatus,
        reviewNote: (body.reviewNote || '').slice(0, 2000) || null,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    })

    recordAudit({
      actorId: user.id,
      actorRole: user.role,
      action: action === 'approve' ? 'verification_approve' : 'verification_reject',
      targetType: 'Verification',
      targetId: id,
      before: { status: record.status },
      after: { status: newStatus },
      ip: getAuditIp(req),
    }).catch(() => {})

    return apiSuccess(updated)
  } catch (err) {
    console.error('[admin/verification PATCH]', err)
    return apiError('INTERNAL_ERROR', 'Doğrulama güncellenemedi', 500)
  }
}
