export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAnimationAdmin } from '@/lib/animation-admin'
import { ANIMATION_CATEGORIES, MEMBERSHIP_TIERS } from '@/lib/animation-constants'

function db(): any {
  return prisma as any
}

const ALLOWED_TIERS = [...MEMBERSHIP_TIERS, 'admin'] as readonly string[]

// GET -> tum uyelik varsayilanlari
export async function GET() {
  const auth = await requireAnimationAdmin()
  if (!auth.ok) return auth.response
  try {
    const items = await db().animationMembershipDefault.findMany({
      include: { animation: { select: { id: true, name: true, category: true, previewUrl: true, thumbnailUrl: true, assetUrl: true, status: true } } },
      orderBy: [{ membershipTier: 'asc' }, { category: 'asc' }],
    })
    return NextResponse.json({ items })
  } catch (e) {
    console.error('[animation membership-defaults GET]', e)
    return NextResponse.json({ error: 'Kayıtlar yüklenemedi' }, { status: 500 })
  }
}

// POST -> upsert (membershipTier + category benzersiz)
export async function POST(request: NextRequest) {
  const auth = await requireAnimationAdmin()
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const membershipTier = String(body?.membershipTier || '')
    const category = String(body?.category || '')
    const animationId = String(body?.animationId || '')
    const isActive = body?.isActive === undefined ? true : !!body.isActive

    if (!ALLOWED_TIERS.includes(membershipTier)) {
      return NextResponse.json({ error: 'Geçersiz üyelik seviyesi' }, { status: 400 })
    }
    if (!(ANIMATION_CATEGORIES as readonly string[]).includes(category)) {
      return NextResponse.json({ error: 'Geçersiz kategori' }, { status: 400 })
    }
    if (!animationId) return NextResponse.json({ error: 'Animasyon seçiniz' }, { status: 400 })

    const anim = await db().animation.findUnique({ where: { id: animationId }, select: { id: true, category: true } })
    if (!anim) return NextResponse.json({ error: 'Animasyon bulunamadı' }, { status: 404 })
    if (anim.category !== category) {
      return NextResponse.json({ error: 'Animasyonun kategorisi seçilen kategoriyle aynı olmalı' }, { status: 400 })
    }

    const item = await db().animationMembershipDefault.upsert({
      where: { membershipTier_category: { membershipTier, category } },
      update: { animationId, isActive },
      create: { membershipTier, category, animationId, isActive },
      include: { animation: { select: { id: true, name: true, category: true, previewUrl: true, thumbnailUrl: true, assetUrl: true, status: true } } },
    })
    return NextResponse.json(item)
  } catch (e) {
    console.error('[animation membership-defaults POST]', e)
    return NextResponse.json({ error: 'Kayıt yapılamadı' }, { status: 500 })
  }
}

// DELETE ?id=
export async function DELETE(request: NextRequest) {
  const auth = await requireAnimationAdmin()
  if (!auth.ok) return auth.response
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    await db().animationMembershipDefault.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })
    console.error('[animation membership-defaults DELETE]', e)
    return NextResponse.json({ error: 'Kayıt silinemedi' }, { status: 500 })
  }
}
