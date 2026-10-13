import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { apiSuccess, apiError, apiUnauthorized, apiNotFound } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET /api/teams/[teamId] — team detail + members
export async function GET(_req: NextRequest, { params }: { params: { teamId: string } }) {
  try {
    const team = await prisma.team.findUnique({
      where: { id: params.teamId },
      include: { members: { orderBy: { points: 'desc' }, take: 200 } },
    })
    if (!team) return apiNotFound('Takım bulunamadı')
    return apiSuccess(team)
  } catch (err) {
    console.error('[teams/:id GET]', err)
    return apiError('INTERNAL_ERROR', 'Takım getirilemedi', 500)
  }
}

// PATCH /api/teams/[teamId] — join or leave { action: 'join'|'leave' }
export async function PATCH(req: NextRequest, { params }: { params: { teamId: string } }) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()

    const team = await prisma.team.findUnique({ where: { id: params.teamId } })
    if (!team) return apiNotFound('Takım bulunamadı')

    const body = await req.json().catch(() => ({}))
    const action = (body.action || '').trim()

    if (action === 'join') {
      const existing = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: team.id, userId: user.id } },
      })
      if (existing) return apiSuccess({ joined: true, already: true })
      await prisma.teamMember.create({ data: { teamId: team.id, userId: user.id, role: 'member' } })
      await prisma.team.update({ where: { id: team.id }, data: { memberCount: { increment: 1 } } })
      return apiSuccess({ joined: true })
    }

    if (action === 'leave') {
      if (team.ownerId === user.id) {
        return apiError('VALIDATION_ERROR', 'Takım sahibi takımdan ayrılamaz', 400)
      }
      const deleted = await prisma.teamMember.deleteMany({
        where: { teamId: team.id, userId: user.id },
      })
      if (deleted.count > 0) {
        await prisma.team.update({ where: { id: team.id }, data: { memberCount: { decrement: 1 } } })
      }
      return apiSuccess({ left: true })
    }

    return apiError('VALIDATION_ERROR', 'Geçersiz işlem', 400)
  } catch (err) {
    console.error('[teams/:id PATCH]', err)
    return apiError('INTERNAL_ERROR', 'İşlem başarısız', 500)
  }
}
