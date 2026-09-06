export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import {
  ANIMATION_CATEGORIES,
  ANIMATION_CONTEXTS,
  ANIMATION_TYPES,
  ANIMATION_POSITIONS,
  ANIMATION_SCALES,
  ANIMATION_ANCHORS,
  ANIMATION_RARITIES,
  MEMBERSHIP_TIERS,
} from '@/lib/animation-constants'

/**
 * GET /api/animations/manifest
 * Tum aktif animasyonlarin on-yukleme manifesti + enum sozlukleri.
 * Auth gerektirmez, istemci tarafinda onbellege alinabilir.
 */
export async function GET(req: NextRequest) {
  try {
    const now = new Date()
    const category = req.nextUrl.searchParams.get('category')

    const animations = await prisma.animation.findMany({
      where: {
        status: 'active',
        ...(category ? { category } : {}),
        OR: [{ activeFrom: null }, { activeFrom: { lte: now } }],
        AND: [{ OR: [{ activeTo: null }, { activeTo: { gte: now } }] }],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        category: true,
        type: true,
        assetUrl: true,
        thumbnailUrl: true,
        soundUrl: true,
        durationMs: true,
        position: true,
        scale: true,
        anchor: true,
        priority: true,
        rarity: true,
        membershipLevel: true,
        contexts: true,
        canSkip: true,
        cooldownMs: true,
      },
      orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }],
      take: 500,
    })

    const res = NextResponse.json({
      version: now.toISOString().slice(0, 10),
      count: animations.length,
      animations,
      dictionaries: {
        categories: ANIMATION_CATEGORIES,
        contexts: ANIMATION_CONTEXTS,
        types: ANIMATION_TYPES,
        positions: ANIMATION_POSITIONS,
        scales: ANIMATION_SCALES,
        anchors: ANIMATION_ANCHORS,
        rarities: ANIMATION_RARITIES,
        membershipTiers: MEMBERSHIP_TIERS,
      },
    })
    res.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    return res
  } catch (error) {
    console.error('[animations/manifest] error:', error)
    return NextResponse.json({ error: 'Manifest yüklenemedi' }, { status: 500 })
  }
}
