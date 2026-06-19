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
  const defaultCost = FORTUNE_COSTS[fortuneType]

  try {
    // Check CurrencyConfig for this fortune type
    const configArea = `fortune_${fortuneType}`
    const currencyConfig = await prisma.currencyConfig.findUnique({
      where: { area: configArea },
    }).catch(() => null)

    const cost = currencyConfig?.cost ?? defaultCost
    const currencyType = currencyConfig?.currencyType ?? 'cfc'

    // If free, no deduction needed
    if (currencyType === 'free') {
      return { success: true, message: 'Ücretsiz fal', newBalance: 0 }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, jetonBalance: true, email: true, name: true, preferredLanguage: true, role: true },
    })

    if (!user) {
      return { success: false, message: 'Kullanıcı bulunamadı' }
    }

    // Determine which currency to use
    let useCfc = false
    let useJeton = false

    // Staff (admin/yönetici) exempt from credit deduction
    const isStaff = user.role === 'admin' || user.role === 'yonetici'
    if (isStaff) {
      const staffBalance = currencyType === 'jeton' ? (user.jetonBalance ?? 0) : user.credits
      return { success: true, message: 'Personel muafiyeti', newBalance: staffBalance }
    }

    if (currencyType === 'cfc') {
      if (user.credits < cost) {
        return { success: false, message: `Yetersiz CFC. Bu işlem ${cost} CFC gerektiriyor, bakiyeniz: ${user.credits}` }
      }
      useCfc = true
    } else if (currencyType === 'jeton') {
      if ((user.jetonBalance ?? 0) < cost) {
        return { success: false, message: `Yetersiz Jeton. Bu işlem ${cost} Jeton gerektiriyor, bakiyeniz: ${user.jetonBalance ?? 0}` }
      }
      useJeton = true
    } else if (currencyType === 'cfc_jeton') {
      // Try CFC first, then Jeton
      if (user.credits >= cost) {
        useCfc = true
      } else if ((user.jetonBalance ?? 0) >= cost) {
        useJeton = true
      } else {
        return { success: false, message: `Yetersiz bakiye. Bu işlem ${cost} CFC veya Jeton gerektiriyor. CFC: ${user.credits}, Jeton: ${user.jetonBalance ?? 0}` }
      }
    }

    // Deduct credits
    const updateData: any = {}
    if (useCfc) {
      updateData.credits = { decrement: cost }
    } else if (useJeton) {
      updateData.jetonBalance = { decrement: cost }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { credits: true, jetonBalance: true },
    })

    // Check if CFC fell below threshold and send warning email
    if (useCfc && updatedUser.credits <= LOW_CREDIT_THRESHOLD && user.credits > LOW_CREDIT_THRESHOLD) {
      const lang = user.preferredLanguage || 'en'
      sendNotificationEmail({
        notificationId: process.env.NOTIF_ID_LOW_CREDITS_WARNING || '',
        recipientEmail: user.email,
        subject: lang === 'tr' ? '⚠️ Düşük CFC Uyarısı' : '⚠️ Low CFC Warning',
        htmlBody: getLowCreditsEmailHtml(user.name || 'User', updatedUser.credits, lang),
      }).catch(err => console.error('Low credits email error:', err))
    }

    return { 
      success: true, 
      message: useCfc ? 'CFC başarıyla düşüldü' : 'Jeton başarıyla düşüldü',
      newBalance: useCfc ? updatedUser.credits : (updatedUser.jetonBalance ?? 0),
    }
  } catch (error) {
    console.error('Credit check error:', error)
    return { success: false, message: 'CFC işlemi sırasında bir hata oluştu' }
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

    const fortuneNames: Record<string, string> = {
      coffee: 'Kahve Falı',
      tarot: 'Tarot Falı',
      dream: 'Rüya Yorumu',
      horoscope: 'Günlük Burç',
      numerology: 'Numeroloji',
      love: 'Aşk Uyumu',
      yesno: 'Evet/Hayır Kâhini',
      kursundokme: 'Kurşun Dökme Falı',
    }

    const fortuneName = fortuneNames[fortuneType] || fortuneType

    await sendNotificationEmail({
      notificationId: process.env.NOTIF_ID_FORTUNE_READING_SUMMARY || '',
      recipientEmail: user.email,
      subject: `✨ ${fortuneName} Sonucunuz`,
      htmlBody: getFortuneReadingSummaryHtml(user.name || 'User', fortuneType, summary, language),
    })
  } catch (error) {
    console.error('Fortune summary email error:', error)
  }
}
