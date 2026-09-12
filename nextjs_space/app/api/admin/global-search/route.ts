import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requirePermission } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

/** §39 — Admin Global Arama */
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'user360.view')
  if (auth instanceof NextResponse) return auth

  const sp = req.nextUrl.searchParams
  const q = (sp.get('q') || '').trim()
  const type = sp.get('type') || 'all' // all, user, agency, teller, broadcaster, vip
  const limit = Math.min(50, parseInt(sp.get('limit') || '20'))

  if (!q || q.length < 2) return NextResponse.json({ success: true, data: { results: [], total: 0 } })

  const results: any[] = []

  // User search
  if (['all', 'user', 'broadcaster', 'vip'].includes(type)) {
    const userWhere: any = {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { id: q.startsWith('cm') ? q : undefined },
      ].filter(x => Object.values(x)[0] !== undefined),
    }
    if (type === 'broadcaster') userWhere.canBroadcast = true
    if (type === 'vip') userWhere.membership = { not: 'basic' }

    const users = await prisma.user.findMany({
      where: userWhere,
      select: { id: true, name: true, username: true, email: true, image: true, role: true, membership: true, canBroadcast: true, isBanned: true, isFrozen: true, lastActiveAt: true },
      take: limit,
      orderBy: { lastActiveAt: 'desc' },
    })
    results.push(...users.map(u => ({ ...u, resultType: 'user' })))
  }

  // Agency search
  if (['all', 'agency'].includes(type)) {
    const agencies = await prisma.agency.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      select: { id: true, name: true, status: true, totalMembers: true, commissionRate: true, level: true },
      take: 10,
    })
    results.push(...agencies.map(a => ({ ...a, resultType: 'agency' })))
  }

  // Fortune teller search
  if (['all', 'teller'].includes(type)) {
    const tellers = await prisma.liveFortuneTeller.findMany({
      where: {
        OR: [
          { displayName: { contains: q, mode: 'insensitive' } },
          { user: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
      select: { id: true, displayName: true, isActive: true, isVerified: true, rating: true, userId: true, user: { select: { name: true, image: true } } },
      take: 10,
    })
    results.push(...tellers.map(t => ({ ...t, resultType: 'teller' })))
  }

  return NextResponse.json({ success: true, data: { results, total: results.length, query: q, type } })
}
