export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAnimationAdmin, resolveEndDate } from '@/lib/animation-admin'

function db(): any { return prisma as any }

/**
 * POST /api/admin/site-animations/bulk-assign
 * body: { animationId, userIds: string[], duration?, endDate?, priority?, context?, note? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAnimationAdmin()
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const { animationId, userIds, duration, endDate, priority, context: ctx, note } = body || {}
    if (!animationId || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'animationId ve userIds zorunlu' }, { status: 400 })
    }
    const anim = await db().animation.findUnique({ where: { id: animationId }, select: { id: true, category: true } })
    if (!anim) return NextResponse.json({ error: 'Animasyon bulunamadı' }, { status: 404 })

    const end = resolveEndDate(duration, endDate)
    const created: any[] = []
    for (const userId of userIds.slice(0, 500)) {
      try {
        const item = await db().animationAssignment.create({
          data: {
            animationId,
            userId,
            category: anim.category,
            assignmentType: 'admin_custom',
            context: ctx || null,
            priority: priority ?? 10,
            note: note || null,
            startDate: new Date(),
            endDate: end,
            isActive: true,
          },
        })
        created.push(item)
      } catch (_) { /* skip duplicates */ }
    }
    return NextResponse.json({ created: created.length, total: userIds.length })
  } catch (e) {
    console.error('[bulk-assign POST]', e)
    return NextResponse.json({ error: 'Toplu atama yapılamadı' }, { status: 500 })
  }
}
