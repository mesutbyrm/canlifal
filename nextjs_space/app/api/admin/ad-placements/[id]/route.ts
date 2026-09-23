import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import {
  requireAdAdmin,
  AD_TYPES,
  AD_POSITIONS,
  AD_PLATFORMS,
  coerceEnum,
} from '@/lib/ad-placements'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdAdmin()
  if (!auth.ok) return auth.response

  try {
    const placement = await prisma.adPlacement.findUnique({
      where: { id: params.id },
      include: { adNetwork: { select: { id: true, name: true, provider: true, isActive: true } } },
    })
    if (!placement) return NextResponse.json({ error: 'Yerleşim bulunamadı' }, { status: 404 })
    return NextResponse.json({ placement })
  } catch (error) {
    console.error('Ad placement get error:', error)
    return NextResponse.json({ error: 'Yerleşim yüklenemedi' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdAdmin()
  if (!auth.ok) return auth.response

  try {
    const body = await request.json().catch(() => ({}))
    const existing = await prisma.adPlacement.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Yerleşim bulunamadı' }, { status: 404 })

    const data: any = {}
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if ('description' in body) data.description = body.description ? String(body.description) : null
    if ('adNetworkId' in body) data.adNetworkId = body.adNetworkId ? String(body.adNetworkId) : null
    if ('adType' in body) data.adType = coerceEnum(body.adType, AD_TYPES, existing.adType as any)
    if ('position' in body) data.position = body.position ? coerceEnum(body.position, AD_POSITIONS, 'inline') : null
    if ('platform' in body) data.platform = coerceEnum(body.platform, AD_PLATFORMS, existing.platform as any)
    if ('isActive' in body) data.isActive = Boolean(body.isActive)
    if ('sortOrder' in body && Number.isFinite(Number(body.sortOrder))) data.sortOrder = Number(body.sortOrder)
    if ('customCode' in body) data.customCode = body.customCode ? String(body.customCode) : null
    if ('targeting' in body) data.targeting = body.targeting ?? null
    if ('frequencyCap' in body && Number.isFinite(Number(body.frequencyCap))) {
      data.frequencyCap = Math.max(0, Number(body.frequencyCap))
    }
    if (body.resetStats === true) {
      data.impressions = 0
      data.clicks = 0
    }

    const placement = await prisma.adPlacement.update({ where: { id: params.id }, data })
    return NextResponse.json({ success: true, placement })
  } catch (error) {
    console.error('Ad placement update error:', error)
    return NextResponse.json({ error: 'Yerleşim güncellenemedi' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdAdmin(true)
  if (!auth.ok) return auth.response

  try {
    const existing = await prisma.adPlacement.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Yerleşim bulunamadı' }, { status: 404 })

    await prisma.adPlacement.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ad placement delete error:', error)
    return NextResponse.json({ error: 'Yerleşim silinemedi' }, { status: 500 })
  }
}
