import prisma from './db'

export const FORTUNE_COSTS = {
  coffee: 5,
  tarot: 7,
  dream: 5,
} as const

export type FortuneType = keyof typeof FORTUNE_COSTS

export async function checkAndDeductCredits(
  userId: string,
  fortuneType: FortuneType
): Promise<{ success: boolean; message: string; newBalance?: number }> {
  const cost = FORTUNE_COSTS[fortuneType]

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    })

    if (!user) {
      return { success: false, message: 'User not found' }
    }

    if (user.credits < cost) {
      return { 
        success: false, 
        message: `Insufficient credits. Need ${cost}, have ${user.credits}` 
      }
    }

    // Deduct credits
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: cost } },
      select: { credits: true },
    })

    return { 
      success: true, 
      message: 'Credits deducted successfully',
      newBalance: updatedUser.credits,
    }
  } catch (error) {
    console.error('Credit check error:', error)
    return { success: false, message: 'Failed to process credits' }
  }
}

export async function getUserCredits(userId: string): Promise<number> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    })
    return user?.credits ?? 0
  } catch (error) {
    console.error('Get credits error:', error)
    return 0
  }
}
