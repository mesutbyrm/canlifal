import prisma from '@/lib/db'

/**
 * Check if a user is in an active agency and record agency commission.
 * Returns the commission amount deducted, or 0 if user not in agency.
 */
export async function processAgencyCommission({
  userId,
  earnedAmount,
  sourceType,
  sourceId,
}: {
  userId: string
  earnedAmount: number
  sourceType: string
  sourceId?: string
}): Promise<number> {
  if (earnedAmount <= 0) return 0

  try {
    // Check if user is in an active agency
    const membership = await prisma.agencyUser.findUnique({
      where: { userId },
      include: {
        agency: {
          select: {
            id: true,
            status: true,
            commissionRate: true,
            penaltyLevel: true,
          }
        }
      }
    })

    if (!membership || !membership.isActive) return 0
    if (!membership.agency || membership.agency.status !== 'approved') return 0

    let commissionRate = membership.agency.commissionRate
    // If penalty level 3 (commission_reduced), halve the rate
    if (membership.agency.penaltyLevel >= 3) {
      commissionRate = commissionRate / 2
    }

    if (commissionRate <= 0) return 0

    const commissionAmount = Math.floor(earnedAmount * commissionRate / 100)
    if (commissionAmount <= 0) return 0

    // Record the earning
    await prisma.agencyEarning.create({
      data: {
        agencyId: membership.agencyId,
        userId,
        amount: commissionAmount,
        sourceType,
        sourceId,
        originalAmount: earnedAmount,
        commissionRate,
      }
    })

    // Update agency totals
    await prisma.agency.update({
      where: { id: membership.agencyId },
      data: {
        totalEarnings: { increment: commissionAmount },
      }
    })

    // Update member totals
    await prisma.agencyUser.update({
      where: { id: membership.id },
      data: {
        totalEarnings: { increment: commissionAmount },
      }
    })

    return commissionAmount
  } catch (error) {
    console.error('[Agency Commission] Error:', error)
    return 0
  }
}

/**
 * Get a platform setting value with fallback
 */
export { getCachedPlatformSetting as getPlatformSetting } from '@/lib/cache'
