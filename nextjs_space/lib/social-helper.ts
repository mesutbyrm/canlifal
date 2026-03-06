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
  console.log(`[AUTO-SHARE] Starting auto-share for fortune ${fortuneId}, type: ${fortuneType}, userId: ${userId}`)
  
  try {
    if (!userId || !fortuneId || !fortuneType) {
      console.error('[AUTO-SHARE] Missing required parameters:', { userId, fortuneId, fortuneType })
      return
    }
    
    if (!aiResponse || aiResponse.trim().length === 0) {
      console.error('[AUTO-SHARE] Empty AI response, skipping auto-share')
      return
    }
    
    const label = FORTUNE_TYPE_LABELS[fortuneType]?.[language] || fortuneType
    
    // Share the full fortune content
    console.log(`[AUTO-SHARE] Creating social post with full content length: ${aiResponse.length}`)
    
    // Create social post with full fortune content
    const post = await prisma.socialPost.create({
      data: {
        userId,
        fortuneId,
        content: aiResponse,
        postType: 'fortune',
        fortuneType,
        isAuto: true,
        isPublic: true
      }
    })
    
    console.log(`[AUTO-SHARE] Successfully created social post ${post.id} for fortune ${fortuneId}`)
  } catch (error) {
    console.error('[AUTO-SHARE] Error creating social post:', error)
    // Don't throw - auto-sharing failure shouldn't break the fortune flow
  }
}
