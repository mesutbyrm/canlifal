export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAnimationAdmin } from '@/lib/animation-admin'

function db(): any { return prisma as any }

/**
 * GET  → çıkış animasyonu varsayılanları (category='exit')
 * POST → upsert (membershipTier + category='exit')
 */
export async function GET() {
  const auth = await requireAnimationAdmin()
  if (!auth.ok) return auth.response
  try {
    const items = await db().animationMembershipDefault.findMany({
      where: { category: 'exit' },
      include: { animation: { select: { id: true, name: true, category: true, previewUrl: true, thumbnailUrl: true, assetUrl: true, status: true } } },
      orderBy: [{ membershipTier: 'asc' }],
    })
    return NextResponse.json({ items })
  } catch (e) {
    console.error('[exit-defaults GET]', e)
    return NextResponse.json({ error: 'Kayıtlar yüklenemedi' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAnimationAdmin()
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const membershipTier = String(body?.membershipTier || '')
    const animationId = String(body?.animationId || '')
    const isActive = body?.isActive === undefined ? true : !!body.isActive
    if (!membershipTier || !animationId) {
      return NextResponse.json({ error: 'membershipTier ve animationId zorunlu' }, { status: 400 })
    }
    const item = await db().animationMembershipDefault.upsert({
      where: { membershipTier_category: { membershipTier, category: 'exit' } },
      update: { animationId, isActive },
      create: { membershipTier, category: 'exit', animationId, isActive },
      include: { animation: { select: { id: true, name: true, category: true, previewUrl: true, thumbnailUrl: true, assetUrl: true, status: true } } },
    })
    return NextResponse.json(item)
  } catch (e) {
    console.error('[exit-defaults POST]', e)
    return NextResponse.json({ error: 'Kayıt yapılamadı' }, { status: 500 })
  }
}
