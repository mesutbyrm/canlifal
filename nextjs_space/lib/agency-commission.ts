import prisma from '@/lib/db'
import { resolveCommissionRule } from '@/lib/agency-wallet'

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

    // BÖLÜM 21 / A3 §18 — gelir kaynağı bazlı komisyon kuralı.
    // Kayıt yoksa katalog varsayılanı geçerlidir; falcı geliri varsayılan KAPALI.
    const rule = await resolveCommissionRule(membership.agencyId, sourceType)
    if (!rule.enabled) return 0

    let commissionRate = rule.rate !== null && rule.rate !== undefined
      ? rule.rate
      : membership.agency.commissionRate
    // If penalty level 3 (commission_reduced), halve the rate
    if (membership.agency.penaltyLevel >= 3) {
      commissionRate = commissionRate / 2
    }

    if (commissionRate <= 0) return 0

    const commissionAmount = Math.floor(earnedAmount * commissionRate / 100)
    if (commissionAmount <= 0) return 0

    // Faz 20 — §77 Transaction Safety: 3 yazım (earning + agency + member)
    // tek bir interactive transaction içinde sarılır; arızada kısmi güncelleme
    // olmaz.
    await prisma.$transaction(async (tx: any) => {
      await tx.agencyEarning.create({
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
      await tx.agency.update({
        where: { id: membership.agencyId },
        data: { totalEarnings: { increment: commissionAmount } }
      })
      await tx.agencyUser.update({
        where: { id: membership.id },
        data: { totalEarnings: { increment: commissionAmount } }
      })
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
