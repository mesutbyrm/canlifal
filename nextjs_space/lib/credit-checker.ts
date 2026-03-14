import prisma from './db'
import { sendNotificationEmail, getLowCreditsEmailHtml } from './email-service'

export const FORTUNE_COSTS = {
  coffee: 5,
  tarot: 7,
  dream: 5,
  horoscope: 3,
  numerology: 4,
  love: 5,
  yesno: 2,
  katina: 6,
  palm: 8,
  istikhara: 4,
  angel: 5,
  birthchart: 10,
  aura: 6,
  kursundokme: 6,
} as const

export type FortuneType = keyof typeof FORTUNE_COSTS

const LOW_CREDIT_THRESHOLD = 3

export async function checkAndDeductCredits(
  userId: string,
  fortuneType: FortuneType
): Promise<{ success: boolean; message: string; newBalance?: number }> {
  const cost = FORTUNE_COSTS[fortuneType]

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, email: true, name: true, preferredLanguage: true },
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

    // Check if credits fell below threshold and send warning email
    if (updatedUser.credits <= LOW_CREDIT_THRESHOLD && user.credits > LOW_CREDIT_THRESHOLD) {
      const lang = user.preferredLanguage || 'en'
      sendNotificationEmail({
        notificationId: process.env.NOTIF_ID_LOW_CREDITS_WARNING || '',
        recipientEmail: user.email,
        subject: lang === 'tr' ? '⚠️ Düşük cFc Uyarısı' : '⚠️ Low cFc Warning',
        htmlBody: getLowCreditsEmailHtml(user.name || 'User', updatedUser.credits, lang),
      }).catch(err => console.error('Low credits email error:', err))
    }

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

export async function sendFortuneSummaryEmail(
  userId: string,
  fortuneType: string,
  summary: string,
  language: string
): Promise<void> {
  try {
    const { sendNotificationEmail, getFortuneReadingSummaryHtml } = await import('./email-service')
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    })

    if (!user) return

    const fortuneNames: Record<string, { en: string; tr: string }> = {
      coffee: { en: 'Coffee Fortune', tr: 'Kahve Falı' },
      tarot: { en: 'Tarot Reading', tr: 'Tarot Falı' },
      dream: { en: 'Dream Interpretation', tr: 'Rüya Yorumu' },
      horoscope: { en: 'Daily Horoscope', tr: 'Günlük Burç' },
      numerology: { en: 'Numerology', tr: 'Numeroloji' },
      love: { en: 'Love Compatibility', tr: 'Aşk Uyumu' },
      yesno: { en: 'Yes/No Oracle', tr: 'Evet/Hayır Kâhini' },
      kursundokme: { en: 'Lead Pouring Fortune', tr: 'Kurşun Dökme Falı' },
    }

    const fortuneName = language === 'tr' 
      ? fortuneNames[fortuneType]?.tr || fortuneType 
      : fortuneNames[fortuneType]?.en || fortuneType

    await sendNotificationEmail({
      notificationId: process.env.NOTIF_ID_FORTUNE_READING_SUMMARY || '',
      recipientEmail: user.email,
      subject: language === 'tr' 
        ? `✨ ${fortuneName} Sonucunuz` 
        : `✨ Your ${fortuneName} Result`,
      htmlBody: getFortuneReadingSummaryHtml(user.name || 'User', fortuneType, summary, language),
    })
  } catch (error) {
    console.error('Fortune summary email error:', error)
  }
}
