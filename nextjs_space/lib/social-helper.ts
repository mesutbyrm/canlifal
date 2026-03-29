import prisma from '@/lib/db'
import { logActivity } from '@/lib/activity-logger'

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
  askuyumu: { tr: 'Aşk Uyumu', en: 'Love Compatibility' },
  // Bana Özel slugs
  'gunluk-tarot': { tr: 'Günlük Tarot Kartı', en: 'Daily Tarot Card' },
  'gunluk-burc': { tr: 'Günlük Burç Yorumu', en: 'Daily Horoscope' },
  'yildizname': { tr: 'Yıldızname Yorumu', en: 'Star Chart Reading' },
  'ask-uyumu': { tr: 'Aşk Uyumu Analizi', en: 'Love Compatibility' },
  'para-kariyer': { tr: 'Para ve Kariyer Falı', en: 'Money & Career Reading' },
  'sansli-sayilar': { tr: 'Günün Şanslı Sayıları', en: 'Lucky Numbers' },
  'evren-mesaj': { tr: 'Evrenin Sana Mesajı', en: 'Universe Message' },
  'gunluk-kehanet': { tr: 'Günlük Kehanet', en: 'Daily Prophecy' },
  '3-kart-tarot': { tr: '3 Kart Tarot Açılımı', en: '3 Card Tarot Spread' },
  '7-kart-tarot': { tr: '7 Kart Tarot Açılımı', en: '7 Card Tarot Spread' },
  'kahve-fali': { tr: 'Kahve Falı Yorumu', en: 'Coffee Reading' },
  'ruya-yorumu': { tr: 'Rüya Yorumu', en: 'Dream Interpretation' },
  'nazar-analizi': { tr: 'Nazar Analizi', en: 'Evil Eye Analysis' },
  'ask-fali': { tr: 'Aşk Falı', en: 'Love Fortune' },
  'gelecek-kehaneti': { tr: 'Gelecek Kehaneti', en: 'Future Prophecy' },
  'haftalik-burc': { tr: 'Haftalık Burç Yorumu', en: 'Weekly Horoscope' },
  'ay-burcu': { tr: 'Ay Burcu Yorumu', en: 'Moon Sign Reading' },
  'yukselen-burc': { tr: 'Yükselen Burç Analizi', en: 'Rising Sign Analysis' },
  'enerji-analizi': { tr: 'Günün Enerji Analizi', en: 'Daily Energy Analysis' },
  'spiritüel-rehber': { tr: 'Spiritüel Rehber Mesajı', en: 'Spiritual Guide Message' },
  'gizli-mesaj': { tr: 'Evrenin Gizli Mesajı', en: 'Hidden Universe Message' },
  'iliski-gelecegi': { tr: 'İlişki Geleceği Analizi', en: 'Relationship Future' },
  'ruh-esi': { tr: 'Ruh Eşi Analizi', en: 'Soulmate Analysis' },
  'gizli-duygular': { tr: 'Gizli Duygular Falı', en: 'Hidden Feelings Reading' },
  'kader-yorumu': { tr: 'Kader Yorumu', en: 'Destiny Reading' },
  'sans-kapisi': { tr: 'Şans Kapısı Falı', en: 'Gate of Fortune' },
  'astro-tavsiye': { tr: 'Günün Astro Tavsiyesi', en: 'Daily Astro Advice' },
  'astro-enerji': { tr: 'Astrolojik Enerji Yorumu', en: 'Astrological Energy' },
  'karmik-bag': { tr: 'Karmik Bağ Analizi', en: 'Karmic Bond Analysis' },
  'evren-uyari': { tr: 'Evrenin Bugünkü Uyarısı', en: "Today's Universe Warning" }
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

    // Log activity for the live feed
    try {
      let userName = 'Misafir'
      let userAvatar: string | null = null
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, image: true },
        })
        if (user) {
          userName = user.name || 'Kullanıcı'
          userAvatar = user.image
        }
      }
      const trLabel = FORTUNE_TYPE_LABELS[fortuneType]?.tr || fortuneType
      logActivity({
        userId: userId || null,
        userName,
        userAvatar,
        activityType: 'fortune_read',
        detail: `${trLabel} baktırdı`,
        targetUrl: `/fallar/${fortuneType === 'coffee' ? 'kahve-fali' : fortuneType === 'tarot' ? 'tarot-fali' : fortuneType}`,
      })
    } catch {}
  } catch (error) {
    console.error('[AUTO-SHARE] Error creating social post:', error)
    // Don't throw - auto-sharing failure shouldn't break the fortune flow
  }
}
