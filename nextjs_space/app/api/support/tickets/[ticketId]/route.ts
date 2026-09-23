import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser, isAdminRole } from '@/lib/rbac'
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET /api/support/tickets/[ticketId] — ticket + messages (owner or admin)
export async function GET(req: NextRequest, { params }: { params: { ticketId: string } }) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.ticketId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    if (!ticket) return apiNotFound('Talep bulunamadı')

    const admin = isAdminRole(user.role)
    if (ticket.userId !== user.id && !admin) return apiForbidden()

    // Hide internal notes from the ticket owner
    const messages = admin
      ? ticket.messages
      : ticket.messages.filter((m) => !m.isInternal)

    return apiSuccess({ ...ticket, messages })
  } catch (err) {
    console.error('[support/tickets/:id GET]', err)
    return apiError('INTERNAL_ERROR', 'Talep getirilemedi', 500)
  }
}

// PATCH /api/support/tickets/[ticketId] — owner can close; admin can set any status
export async function PATCH(req: NextRequest, { params }: { params: { ticketId: string } }) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()

    const ticket = await prisma.supportTicket.findUnique({ where: { id: params.ticketId } })
    if (!ticket) return apiNotFound('Talep bulunamadı')

    const admin = isAdminRole(user.role)
    if (ticket.userId !== user.id && !admin) return apiForbidden()

    const body = await req.json().catch(() => ({}))
    const status = (body.status || '').trim()
    const allowed = admin
      ? ['open', 'pending', 'resolved', 'closed']
      : ['closed'] // owner may only close their own ticket

    if (!allowed.includes(status)) return apiError('VALIDATION_ERROR', 'Geçersiz durum', 400)

    const data: any = { status }
    if (admin && typeof body.priority === 'string') data.priority = body.priority
    if (admin && typeof body.assignedTo === 'string') data.assignedTo = body.assignedTo

    const updated = await prisma.supportTicket.update({
      where: { id: params.ticketId },
      data,
    })
    return apiSuccess(updated)
  } catch (err) {
    console.error('[support/tickets/:id PATCH]', err)
    return apiError('INTERNAL_ERROR', 'Talep güncellenemedi', 500)
  }
}
