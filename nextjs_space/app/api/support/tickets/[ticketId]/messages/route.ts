import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser, isAdminRole } from '@/lib/rbac'
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiNotFound, apiValidation } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// POST /api/support/tickets/[ticketId]/messages — reply to a ticket
export async function POST(req: NextRequest, { params }: { params: { ticketId: string } }) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()

    const ticket = await prisma.supportTicket.findUnique({ where: { id: params.ticketId } })
    if (!ticket) return apiNotFound('Talep bulunamadı')

    const admin = isAdminRole(user.role)
    if (ticket.userId !== user.id && !admin) return apiForbidden()

    const body = await req.json().catch(() => ({}))
    const text = (body.body || body.message || '').trim()
    if (!text || text.length < 1) return apiValidation('Mesaj boş olamaz')

    const isInternal = admin && body.isInternal === true

    const message = await prisma.supportMessage.create({
      data: {
        ticketId: params.ticketId,
        senderId: user.id,
        senderRole: admin ? 'admin' : 'user',
        body: text.slice(0, 4000),
        isInternal,
      },
    })

    // Update ticket activity; a user reply re-opens a resolved ticket
    const statusUpdate: any = { lastMessageAt: new Date() }
    if (!admin && ticket.status === 'resolved') statusUpdate.status = 'open'
    if (admin && ticket.status === 'open') statusUpdate.status = 'pending'
    await prisma.supportTicket.update({ where: { id: params.ticketId }, data: statusUpdate })

    return apiSuccess(message, 201)
  } catch (err) {
    console.error('[support/tickets/:id/messages POST]', err)
    return apiError('INTERNAL_ERROR', 'Mesaj gönderilemedi', 500)
  }
}
