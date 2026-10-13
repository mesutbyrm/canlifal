import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { apiSuccess, apiError, apiUnauthorized, apiValidation } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\u0131/g, 'i').replace(/\u011f/g, 'g').replace(/\u00fc/g, 'u')
    .replace(/\u015f/g, 's').replace(/\u00f6/g, 'o').replace(/\u00e7/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

// GET /api/teams — list active teams (leaderboard by points)
export async function GET(_req: NextRequest) {
  try {
    const teams = await prisma.team.findMany({
      where: { isActive: true },
      orderBy: { totalPoints: 'desc' },
      take: 100,
      select: {
        id: true, name: true, slug: true, ownerId: true, description: true,
        logoUrl: true, memberCount: true, totalPoints: true, createdAt: true,
      },
    })
    return apiSuccess(teams)
  } catch (err) {
    console.error('[teams GET]', err)
    return apiError('INTERNAL_ERROR', 'Takımlar getirilemedi', 500)
  }
}

// POST /api/teams — create a team (creator becomes owner)
export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req)
    if (!user) return apiUnauthorized()

    const body = await req.json().catch(() => ({}))
    const name = (body.name || '').trim()
    if (!name || name.length < 2) return apiValidation('Takım adı en az 2 karakter olmalı')

    let slug = slugify(name) || `team-${Date.now()}`
    // ensure unique slug
    const clash = await prisma.team.findUnique({ where: { slug } })
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`

    const team = await prisma.team.create({
      data: {
        name: name.slice(0, 100),
        slug,
        ownerId: user.id,
        description: (body.description || '').slice(0, 1000) || null,
        logoUrl: (body.logoUrl || '').trim() || null,
        memberCount: 1,
        members: {
          create: { userId: user.id, role: 'owner' },
        },
      },
      include: { members: true },
    })
    return apiSuccess(team, 201)
  } catch (err) {
    console.error('[teams POST]', err)
    return apiError('INTERNAL_ERROR', 'Takım oluşturulamadı', 500)
  }
}
