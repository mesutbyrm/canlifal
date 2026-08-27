import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser, isAdminRole } from '@/lib/rbac'
import { apiPaginated, apiError, apiForbidden, apiUnauthorized } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET /api/admin/support?status=&category=&page=&pageSize= — all tickets (admin)
export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()
    if (!isAdminRole(user.role)) return apiForbidden()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const category = searchParams.get('category') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10)))

    const where: any = {}
    if (status) where.status = status
    if (category) where.category = category

    const [total, tickets] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, userId: true, subject: true, category: true, status: true,
          priority: true, assignedTo: true, lastMessageAt: true, createdAt: true,
          _count: { select: { messages: true } },
        },
      }),
    ])

    return apiPaginated(tickets, {
      page, limit: pageSize, total, hasMore: page * pageSize < total,
    })
  } catch (err) {
    console.error('[admin/support GET]', err)
    return apiError('INTERNAL_ERROR', 'Talepler getirilemedi', 500)
  }
}
