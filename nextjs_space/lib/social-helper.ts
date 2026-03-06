import prisma from '@/lib/db'

// Fortune type labels for social posts
const FORTUNE_TYPE_LABELS: Record<string, Record<string, string>> = {
  coffee: { tr: 'Kahve Falı', en: 'Coffee Fortune' },
  tarot: { tr: 'Tarot Falı', en: 'Tarot Reading' },
  dream: { tr: 'Rüya Yorumu', en: 'Dream Interpretation' },
  horoscope: { tr: 'Burç Yorumu', en: 'Horoscope Reading' },
  palm: { tr: 'El Falı', en: 'Palm Reading' },
  angel: { tr: 'Melek Kartları', en: 'Angel Cards' },
  numerology: { tr: 'Numeroloji', en: 'Numerology' },
  aura: { tr: 'Aura Analizi', en: 'Aura Analysis' },
  birthchart: { tr: 'Doğum Haritası', en: 'Birth Chart' },
  istikhara: { tr: 'İstihare', en: 'Istikhara' },
  katina: { tr: 'Katina Falı', en: 'Katina Fortune' },
  kursundokme: { tr: 'Kurşun Dökme', en: 'Lead Pouring' },
  yesno: { tr: 'Evet/Hayır Falı', en: 'Yes/No Fortune' },
  love: { tr: 'Aşk Falı', en: 'Love Fortune' }
}

/**
 * Automatically shares a fortune to the social feed
 * @param userId - The user's ID
 * @param fortuneId - The fortune's ID
 * @param fortuneType - Type of fortune (coffee, tarot, etc.)
 * @param aiResponse - The full AI response
 * @param language - Language code (tr/en)
 */
export async function autoShareFortune(
  userId: string,
  fortuneId: string,
  fortuneType: string,
  aiResponse: string,
  language: string
): Promise<void> {
  try {
    const label = FORTUNE_TYPE_LABELS[fortuneType]?.[language] || fortuneType
    
    // Create a summary for the social post (first 500 chars)
    const summary = aiResponse.length > 500 
      ? aiResponse.substring(0, 500) + '...'
      : aiResponse
    
    // Create social post
    await prisma.socialPost.create({
      data: {
        userId,
        fortuneId,
        content: summary,
        postType: 'fortune',
        fortuneType,
        isAuto: true,
        isPublic: true
      }
    })
    
    console.log(`Auto-shared ${fortuneType} fortune to social feed for user ${userId}`)
  } catch (error) {
    console.error('Auto-share fortune error:', error)
    // Don't throw - auto-sharing failure shouldn't break the fortune flow
  }
}
