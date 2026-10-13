import { NextResponse } from 'next/server'
import { getCached, CACHE_TTL } from '@/lib/cache'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/membership/packages
 *
 * Flutter uyumlu üyelik paketleri endpoint'i.
 * /api/memberships ile aynı veriyi döner, Flutter'a uygun formatta.
 */
export async function GET() {
  try {
    const plans = await getCached('memberships:plans', CACHE_TTL.MEMBERSHIPS, () =>
      prisma.membershipPlan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      })
    )

    // Flutter-uyumlu format
    return NextResponse.json({
      success: true,
      packages: plans.map((plan: any) => ({
        id: plan.id,
        name: plan.name,
        nameEn: plan.nameEn || plan.name,
        description: plan.description || '',
        descriptionEn: plan.descriptionEn || plan.description || '',
        tier: plan.tier,
        priceType: plan.priceType,
        price: plan.price,
        currency: plan.currency || 'TRY',
        durationDays: plan.durationDays,
        features: plan.features || '[]',
        bonusJetons: plan.bonusJetons || 0,
        discountPercent: plan.discountPercent || 0,
        prioritySupport: plan.prioritySupport || false,
        exclusiveBadge: plan.exclusiveBadge || null,
        isFeatured: plan.isFeatured || false,
        sortOrder: plan.sortOrder,
      })),
    })
  } catch (error) {
    console.error('[membership/packages] Error:', error)
    return NextResponse.json(
      { error: 'Üyelik paketleri alınamadı' },
      { status: 500 }
    )
  }
}
