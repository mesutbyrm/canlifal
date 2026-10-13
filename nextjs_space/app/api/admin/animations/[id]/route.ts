export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAnimationAdmin, coerceAnimationPayload } from '@/lib/animation-admin'

function db(): any {
  return prisma as any
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAnimationAdmin()
  if (!auth.ok) return auth.response
  try {
    const item = await db().animation.findUnique({
      where: { id: params.id },
      include: { _count: { select: { assignments: true, membershipDefaults: true } } },
    })
    if (!item) return NextResponse.json({ error: 'Animasyon bulunamadı' }, { status: 404 })
    return NextResponse.json(item)
  } catch (e) {
    console.error('[admin animation GET]', e)
    return NextResponse.json({ error: 'Animasyon yüklenemedi' }, { status: 500 })
  }
}

// PATCH -> kismi guncelleme (durum, oncelik, tum alanlar)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAnimationAdmin()
  if (!auth.ok) return auth.response
  try {
    const body = await request.json()
    const { data, error } = coerceAnimationPayload(body)
    if (error) return NextResponse.json({ error }, { status: 400 })
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 })
    }
    const item = await db().animation.update({ where: { id: params.id }, data })
    return NextResponse.json(item)
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Animasyon bulunamadı' }, { status: 404 })
    console.error('[admin animation PATCH]', e)
    return NextResponse.json({ error: 'Animasyon güncellenemedi' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAnimationAdmin(true)
  if (!auth.ok) return auth.response
  try {
    await db().animation.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Animasyon bulunamadı' }, { status: 404 })
    console.error('[admin animation DELETE]', e)
    return NextResponse.json({ error: 'Animasyon silinemedi' }, { status: 500 })
  }
}
