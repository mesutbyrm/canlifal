import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { apiSuccess, apiError, apiUnauthorized, apiValidation } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET /api/support/tickets — list the authenticated user's own tickets
export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: user.id },
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
      select: {
        id: true, subject: true, category: true, status: true,
        priority: true, lastMessageAt: true, createdAt: true,
        _count: { select: { messages: true } },
      },
    })
    return apiSuccess(tickets)
  } catch (err) {
    console.error('[support/tickets GET]', err)
    return apiError('INTERNAL_ERROR', 'Talepler getirilemedi', 500)
  }
}

// POST /api/support/tickets — open a new ticket (with first message)
export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()

    const body = await req.json().catch(() => ({}))
    const subject = (body.subject || '').trim()
    const message = (body.message || '').trim()
    const category = (body.category || 'general').trim()

    if (!subject || subject.length < 3) return apiValidation('Konu en az 3 karakter olmalı')
    if (!message || message.length < 3) return apiValidation('Mesaj en az 3 karakter olmalı')

    const allowedCat = ['general', 'payment', 'account', 'technical', 'abuse']
    const cat = allowedCat.includes(category) ? category : 'general'

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject: subject.slice(0, 200),
        category: cat,
        status: 'open',
        priority: 'normal',
        lastMessageAt: new Date(),
        messages: {
          create: {
            senderId: user.id,
            senderRole: 'user',
            body: message.slice(0, 4000),
          },
        },
      },
      include: { messages: true },
    })
    return apiSuccess(ticket, 201)
  } catch (err) {
    console.error('[support/tickets POST]', err)
    return apiError('INTERNAL_ERROR', 'Talep oluşturulamadı', 500)
  }
}
