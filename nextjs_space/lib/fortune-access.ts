import prisma from './db'
import { FORTUNE_COSTS, FortuneType } from './credit-checker'

export type FortuneAccessResult = {
  allowed: boolean
  reason: 'free' | 'cfc_deducted' | 'needs_login' | 'needs_cfc' | 'needs_ad' | 'daily_limit' | 'error'
  message: string
  newBalance?: number
  freeUsed?: number
  freeMax?: number
}

/**
 * Check fortune access for unregistered users (IP-based)
 * 1st fortune: free
 * 2nd fortune: requires ad watch
 * 3rd+: requires registration
 */
export async function checkIpFortuneAccess(
  ipAddress: string,
  adWatched: boolean = false
): Promise<FortuneAccessResult> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const usage = await prisma.ipFortuneUsage.findUnique({
      where: { ipAddress_date: { ipAddress, date: today } },
    })

    if (!usage) {
      // First fortune of the day - free
      await prisma.ipFortuneUsage.create({
        data: { ipAddress, date: today, count: 1, adWatched: false },
      })
      return { allowed: true, reason: 'free', message: 'Günlük ücretsiz fal hakkınız kullanıldı', freeUsed: 1, freeMax: 2 }
    }

    if (usage.count === 1 && !usage.adWatched) {
      if (adWatched) {
        // 2nd fortune after watching ad
        await prisma.ipFortuneUsage.update({
          where: { id: usage.id },
          data: { count: 2, adWatched: true },
        })
        return { allowed: true, reason: 'free', message: 'Reklam izleyerek 2. ücretsiz falınızı kullandınız', freeUsed: 2, freeMax: 2 }
      }
      return { allowed: false, reason: 'needs_ad', message: 'İkinci ücretsiz fal için reklam izlemeniz gerekiyor', freeUsed: 1, freeMax: 2 }
    }

    // Already used 2 fortunes today
    return { allowed: false, reason: 'needs_login', message: 'Günlük ücretsiz fal hakkınız doldu. Devam etmek için kayıt olun veya giriş yapın', freeUsed: usage.count, freeMax: 2 }
  } catch (error) {
    console.error('IP fortune access error:', error)
    return { allowed: false, reason: 'error', message: 'Bir hata oluştu' }
  }
}

/**
 * Check fortune access for registered users
 * If user has CFC: deduct CFC
 * If user has no CFC: can watch ad for free fortune (once/day) or buy CFC
 */
export async function checkRegisteredFortuneAccess(
  userId: string,
  fortuneType: FortuneType,
  adWatched: boolean = false
): Promise<FortuneAccessResult> {
  const cost = FORTUNE_COSTS[fortuneType]

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, email: true, name: true, preferredLanguage: true },
    })

    if (!user) {
      return { allowed: false, reason: 'error', message: 'Kullanıcı bulunamadı' }
    }

    // If user has enough CFC, deduct
    if (user.credits >= cost) {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { credits: { decrement: cost } },
        select: { credits: true },
      })
      return { allowed: true, reason: 'cfc_deducted', message: `${cost} CFC düşüldü`, newBalance: updatedUser.credits }
    }

    // User doesn't have enough CFC
    // Check if ad watching is available today
    if (adWatched) {
      // Allow fortune after watching ad (no CFC deduction)
      return { allowed: true, reason: 'free', message: 'Reklam izleyerek ücretsiz fal kullandınız' }
    }

    return {
      allowed: false,
      reason: 'needs_cfc',
      message: `Yetersiz CFC. Bu fal ${cost} CFC gerektiriyor. Bakiyeniz: ${user.credits}`,
      newBalance: user.credits,
    }
  } catch (error) {
    console.error('Registered fortune access error:', error)
    return { allowed: false, reason: 'error', message: 'Bir hata oluştu' }
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return '127.0.0.1'
}
