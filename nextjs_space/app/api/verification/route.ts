import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { apiSuccess, apiError, apiUnauthorized, apiValidation } from '@/lib/api-response'
import { guardRateLimit } from '@/lib/rate-limit-guard'

export const dynamic = 'force-dynamic'

// GET /api/verification — the authenticated user's own verification records
export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()

    const records = await prisma.verification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, type: true, status: true, fullName: true,
        documentType: true, reviewNote: true, reviewedAt: true, createdAt: true,
      },
    })
    return apiSuccess(records)
  } catch (err) {
    console.error('[verification GET]', err)
    return apiError('INTERNAL_ERROR', 'Doğrulama kayıtları getirilemedi', 500)
  }
}

// POST /api/verification — submit a verification request
export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()

    // Rate limit: doğrulama talebi
    const rateLimited = await guardRateLimit(req, 'report', { userId: user.id })
    if (rateLimited) return rateLimited

    const body = await req.json().catch(() => ({}))
    const type = (body.type || 'identity').trim()
    const allowedType = ['identity', 'broadcaster', 'agency']
    if (!allowedType.includes(type)) return apiValidation('Geçersiz doğrulama türü')

    const documentUrls = Array.isArray(body.documentUrls) ? body.documentUrls : []
    if (documentUrls.length === 0) return apiValidation('En az bir belge yüklemeniz gerekiyor')

    // Prevent duplicate pending requests of the same type
    const existingPending = await prisma.verification.findFirst({
      where: { userId: user.id, type, status: 'pending' },
    })
    if (existingPending) {
      return apiError('CONFLICT', 'Bu tür için zaten bekleyen bir doğrulama talebiniz var', 409)
    }

    const record = await prisma.verification.create({
      data: {
        userId: user.id,
        type,
        status: 'pending',
        fullName: (body.fullName || '').slice(0, 200) || null,
        documentType: (body.documentType || '').slice(0, 50) || null,
        documentUrls,
        note: (body.note || '').slice(0, 2000) || null,
      },
    })
    return apiSuccess(record, 201)
  } catch (err) {
    console.error('[verification POST]', err)
    return apiError('INTERNAL_ERROR', 'Doğrulama talebi oluşturulamadı', 500)
  }
}
