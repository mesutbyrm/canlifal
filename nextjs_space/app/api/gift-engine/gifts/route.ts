import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { buildGiftRenderMeta } from '@/lib/gift-render'
import {
  resolvePriority,
  resolveAnimationType,
  resolveDisplayArea,
  resolveDurationMs,
  resolveSeatEffect,
  resolveSoundEffect,
} from '@/lib/gift-engine'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gift-engine/gifts
 * Unified gift catalog for every client (web + Flutter). Returns every active
 * gift with its fully-resolved engine attributes (priority / animationType /
 * displayArea / duration / seatEffect / sound) so clients can cache metadata
 * and only stream the heavy animation files from the CDN on demand.
 *
 * Optional query params:
 *   ?context=voice_room|live_stream  filter by where the gift is visible
 *   ?collectionId=...                filter by collection/category
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const context = searchParams.get('context')
    const collectionId = searchParams.get('collectionId')

    const where: any = { isActive: true }
    if (collectionId) where.collectionId = collectionId
    if (context === 'voice_room') where.visibleInVoiceRoom = true
    if (context === 'live_stream') where.visibleInLiveStream = true

    const gifts = await prisma.giftType.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    })

    const catalog = gifts.map((g) => {
      const renderMeta = buildGiftRenderMeta(g)
      return {
        id: g.id,
        name: g.name,
        icon: g.icon,
        price: g.price,
        collectionId: g.collectionId,
        category: (g as any).category ?? null,
        priority: resolvePriority(g),
        animationType: resolveAnimationType(g, renderMeta),
        displayArea: resolveDisplayArea(g),
        duration: resolveDurationMs(g),
        seatEffect: resolveSeatEffect(g),
        seatEffectEnabled: (g as any).seatEffectEnabled ?? true,
        soundEffect: resolveSoundEffect(g),
        soundEffectEnabled: (g as any).soundEffectEnabled ?? true,
        comboEnabled: (g as any).comboEnabled ?? true,
        comboWindowMs: (g as any).comboWindowMs ?? 4000,
        animationUrl: renderMeta.assetUrl,
        thumbnail: renderMeta.thumbnailUrl ?? renderMeta.imageUrl,
        contentVersion: (g as any).contentVersion ?? 1,
        render: renderMeta,
      }
    })

    return NextResponse.json(
      { count: catalog.length, gifts: catalog },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } },
    )
  } catch (e) {
    console.error('[gift-engine] catalog error:', e)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
