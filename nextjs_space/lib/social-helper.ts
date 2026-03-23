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
  love: { tr: 'Aşk Falı', en: 'Love Fortune' },
  askuyumu: { tr: 'Aşk Uyumu', en: 'Love Compatibility' }
}

const SYSTEM_USER_EMAIL = 'system@canlifal.com'

// Cache the system user ID
let _systemUserId: string | null = null

/**
 * Gets or creates the system "CanlıFal User" account for guest fortune posts
 */
async function getSystemUserId(): Promise<string | null> {
  if (_systemUserId) return _systemUserId
  try {
    const user = await prisma.user.findUnique({
      where: { email: SYSTEM_USER_EMAIL },
      select: { id: true }
    })
    if (user) {
      _systemUserId = user.id
      return _systemUserId
    }
    console.error('[AUTO-SHARE] System user not found. Please run seed.')
    return null
  } catch (err) {
    console.error('[AUTO-SHARE] Error fetching system user:', err)
    return null
  }
}

/**
 * Automatically shares a fortune to the social feed
 * @param userId - The user's ID (null for guest users)
 * @param fortuneId - The fortune's ID (null for guest users)
 * @param fortuneType - Type of fortune (coffee, tarot, etc.)
 * @param aiResponse - The full AI response
 * @param language - Language code (tr/en)
 */
export async function autoShareFortune(
  userId: string | null,
  fortuneId: string | null,
  fortuneType: string,
  aiResponse: string,
  language: string
): Promise<void> {
  try {
    if (!fortuneType) {
      console.error('[AUTO-SHARE] Missing fortuneType')
      return
    }
    
    if (!aiResponse || aiResponse.trim().length === 0) {
      console.error('[AUTO-SHARE] Empty AI response, skipping auto-share')
      return
    }

    // For guest users, use the system "CanlıFal User" account
    let postUserId = userId
    if (!postUserId) {
      postUserId = await getSystemUserId()
      if (!postUserId) {
        console.error('[AUTO-SHARE] No system user available, skipping guest auto-share')
        return
      }
    }
    
    const label = FORTUNE_TYPE_LABELS[fortuneType]?.[language] || fortuneType
    
    console.log(`[AUTO-SHARE] Creating social post for ${userId ? 'user' : 'guest'}, type: ${fortuneType}, length: ${aiResponse.length}`)
    
    // Create social post with full fortune content
    const post = await prisma.socialPost.create({
      data: {
        userId: postUserId,
        fortuneId: fortuneId || undefined,
        content: aiResponse,
        postType: 'fortune',
        fortuneType,
        isAuto: true,
        isPublic: true
      }
    })
    
    console.log(`[AUTO-SHARE] Successfully created social post ${post.id}`)
  } catch (error) {
    console.error('[AUTO-SHARE] Error creating social post:', error)
    // Don't throw - auto-sharing failure shouldn't break the fortune flow
  }
}
