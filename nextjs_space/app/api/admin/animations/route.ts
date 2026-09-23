export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAnimationAdmin, coerceAnimationPayload, slugifyAnimation } from '@/lib/animation-admin'

function db(): any {
  return prisma as any
}

// GET /api/admin/animations?category=&status=&membership=&q=&limit=&offset=
export async function GET(request: NextRequest) {
  const auth = await requireAnimationAdmin()
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const membership = searchParams.get('membership')
    const q = (searchParams.get('q') || '').trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    const where: any = {}
    if (category && category !== 'all') where.category = category
    if (status && status !== 'all') where.status = status
    if (membership && membership !== 'all') where.membershipLevel = membership
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      db().animation.findMany({
        where,
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { priority: 'desc' }],
        skip: offset,
        take: limit,
      }),
      db().animation.count({ where }),
    ])

    return NextResponse.json({ items, total })
  } catch (e) {
    console.error('[admin animations GET]', e)
    return NextResponse.json({ error: 'Animasyonlar yüklenemedi' }, { status: 500 })
  }
}

// POST /api/admin/animations  -> yeni animasyon
export async function POST(request: NextRequest) {
  const auth = await requireAnimationAdmin()
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    if (!body?.name || !body?.category || !body?.type || !body?.assetUrl) {
      return NextResponse.json({ error: 'Ad, kategori, tür ve animasyon dosyası zorunludur' }, { status: 400 })
    }
    const { data, error } = coerceAnimationPayload(body)
    if (error) return NextResponse.json({ error }, { status: 400 })

    let slug = body.slug ? slugifyAnimation(String(body.slug)) : slugifyAnimation(String(body.name))
    const existing = await db().animation.findUnique({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now().toString(36).slice(-4)}`

    const item = await db().animation.create({ data: { ...data, slug } })
    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    console.error('[admin animations POST]', e)
    return NextResponse.json({ error: 'Animasyon oluşturulamadı' }, { status: 500 })
  }
}
