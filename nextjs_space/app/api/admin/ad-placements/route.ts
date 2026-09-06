import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import {
  requireAdAdmin,
  AD_TYPES,
  AD_POSITIONS,
  AD_PLATFORMS,
  DEFAULT_AD_PLACEMENTS,
  coerceEnum,
  normalizePlacementKey,
} from '@/lib/ad-placements'

export const dynamic = 'force-dynamic'

/** GET /api/admin/ad-placements?adType=&isActive=&q= */
export async function GET(request: NextRequest) {
  const auth = await requireAdAdmin()
  if (!auth.ok) return auth.response

  try {
    const sp = request.nextUrl.searchParams
    const where: any = {}
    const adType = sp.get('adType')
    const isActive = sp.get('isActive')
    const q = sp.get('q')

    if (adType) where.adType = adType
    if (isActive === 'true') where.isActive = true
    if (isActive === 'false') where.isActive = false
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { placementKey: { contains: q, mode: 'insensitive' } },
      ]
    }

    const items = await prisma.adPlacement.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        adNetwork: { select: { id: true, name: true, provider: true, isActive: true } },
      },
    })

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    console.error('Ad placements list error:', error)
    return NextResponse.json({ error: 'Yerleşimler yüklenemedi' }, { status: 500 })
  }
}

/**
 * POST /api/admin/ad-placements
 * body.action === 'seed_defaults' -> 8 varsayılan yerleşimi oluşturur (var olanları bozmaz)
 * aksi halde tek yerleşim oluşturur
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdAdmin()
  if (!auth.ok) return auth.response

  try {
    const body = await request.json().catch(() => ({}))

    if (body?.action === 'seed_defaults') {
      let created = 0
      for (const def of DEFAULT_AD_PLACEMENTS) {
        const existing = await prisma.adPlacement.findUnique({ where: { placementKey: def.placementKey } })
        if (existing) continue
        await prisma.adPlacement.create({
          data: {
            placementKey: def.placementKey,
            name: def.name,
            description: def.description,
            adType: def.adType,
            position: def.position,
            sortOrder: def.sortOrder,
            isActive: false,
          },
        })
        created++
      }
      return NextResponse.json({ success: true, created, skipped: DEFAULT_AD_PLACEMENTS.length - created })
    }

    const name = String(body?.name || '').trim()
    if (!name) return NextResponse.json({ error: 'Yerleşim adı zorunlu' }, { status: 400 })

    const key = normalizePlacementKey(body?.placementKey || name)
    if (!key) return NextResponse.json({ error: 'Geçerli bir yerleşim anahtarı girin' }, { status: 400 })

    const clash = await prisma.adPlacement.findUnique({ where: { placementKey: key } })
    if (clash) return NextResponse.json({ error: 'Bu yerleşim anahtarı zaten kullanılıyor' }, { status: 409 })

    const placement = await prisma.adPlacement.create({
      data: {
        placementKey: key,
        name,
        description: body?.description ? String(body.description) : null,
        adNetworkId: body?.adNetworkId ? String(body.adNetworkId) : null,
        adType: coerceEnum(body?.adType, AD_TYPES, 'banner'),
        position: body?.position ? coerceEnum(body.position, AD_POSITIONS, 'inline') : null,
        platform: coerceEnum(body?.platform, AD_PLATFORMS, 'all'),
        isActive: Boolean(body?.isActive),
        sortOrder: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0,
        customCode: body?.customCode ? String(body.customCode) : null,
        targeting: body?.targeting ?? undefined,
        frequencyCap: Number.isFinite(Number(body?.frequencyCap)) ? Math.max(0, Number(body.frequencyCap)) : 0,
      },
    })

    return NextResponse.json({ success: true, placement })
  } catch (error) {
    console.error('Ad placement create error:', error)
    return NextResponse.json({ error: 'Yerleşim oluşturulamadı' }, { status: 500 })
  }
}
