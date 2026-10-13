import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gifts/lucky/config
 * Public lucky-gift configuration for clients (web + Flutter).
 * Returns active reward tiers with display odds + the list of lucky gifts.
 * Dual-auth: works for both mobile JWT and web session, but does not strictly require auth.
 */
export async function GET(request: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(request)
    const webSession = !mobileUser ? await getServerSession(authOptions) : null
    // config is public-readable; auth is optional here

    const [tiers, luckyGifts, maxTierVer, maxGiftVer] = await Promise.all([
      prisma.luckyGiftTier.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { multiplier: 'asc' }],
      }),
      prisma.giftType.findMany({
        where: { isLucky: true, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
        select: {
          id: true, name: true, nameEn: true, icon: true, iconImageUrl: true,
          thumbnailUrl: true, assetUrl: true, assetType: true, price: true,
          effectColor: true, contentVersion: true,
        },
      }),
      prisma.luckyGiftTier.aggregate({ _max: { contentVersion: true } }),
      prisma.giftType.aggregate({ where: { isLucky: true }, _max: { contentVersion: true } }),
    ])

    const totalWeight = tiers.reduce((s, t) => s + (t.weight || 0), 0) || 1
    const publicTiers = tiers.map(t => ({
      id: t.id,
      name: t.name,
      nameEn: t.nameEn,
      multiplier: t.multiplier,
      isJackpot: t.isJackpot,
      color: t.color,
      icon: t.icon,
      oddsPercent: Math.round((t.weight / totalWeight) * 10000) / 100,
    }))

    const rtp = tiers.reduce((s, t) => s + (t.weight / totalWeight) * t.multiplier, 0)

    return NextResponse.json({
      enabled: tiers.length > 0 && luckyGifts.length > 0,
      tiers: publicTiers,
      luckyGifts,
      rtp: Math.round(rtp * 100) / 100,
      version: Math.max(maxTierVer._max.contentVersion || 1, maxGiftVer._max.contentVersion || 1),
      authed: !!(mobileUser || webSession?.user),
    })
  } catch (e) {
    console.error('[lucky/config] error', e)
    return NextResponse.json({ enabled: false, tiers: [], luckyGifts: [] }, { status: 500 })
  }
}
