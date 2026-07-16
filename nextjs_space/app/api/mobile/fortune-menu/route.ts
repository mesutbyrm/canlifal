import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { getCached, getCachedPlatformSetting } from '@/lib/cache'

export const dynamic = 'force-dynamic'

/**
 * GET /api/mobile/fortune-menu
 * Flutter fal menüsü — tüm fal türlerini, fiyatlarını ve erişim durumlarını döner.
 *
 * Returns: { fortuneTypes[], userCredits, creditsPerMinute }
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const [
      fortuneTypes,
      userBalance,
      creditsPerMinute,
      fortuneCards,
    ] = await Promise.all([
      // All fortune types with their config
      getCached('mobile:fortune_menu:types', 60, async () => {
        // Define all fortune types available in the platform
        const types = [
          { key: 'kahve-fali', name: 'Kahve Falı', nameEn: 'Coffee Reading', icon: '☕', image: '/fortunes/coffee.jpg', href: '/fallar/kahve-fali', category: 'ai', requiresImage: true },
          { key: 'tarot-fali', name: 'Tarot Falı', nameEn: 'Tarot Reading', icon: '🃏', image: '/fortunes/tarot.jpg', href: '/fallar/tarot-fali', category: 'ai', requiresImage: false },
          { key: 'burc-yorumu', name: 'Burç Yorumu', nameEn: 'Horoscope', icon: '⭐', image: '/fortunes/horoscope.jpg', href: '/fallar/burc-yorumu', category: 'ai', requiresImage: false },
          { key: 'ruya-yorumu', name: 'Rüya Yorumu', nameEn: 'Dream Reading', icon: '🌙', image: '/fortunes/dream.jpg', href: '/fallar/ruya-yorumu', category: 'ai', requiresImage: false },
          { key: 'el-fali', name: 'El Falı', nameEn: 'Palm Reading', icon: '✋', image: '/fortunes/palm.jpg', href: '/fallar/el-fali', category: 'ai', requiresImage: true },
          { key: 'ask-uyumu', name: 'Aşk Uyumu', nameEn: 'Love Compatibility', icon: '❤️', image: '/fortunes/love.jpg', href: '/fallar/ask-uyumu', category: 'ai', requiresImage: false },
          { key: 'numeroloji', name: 'Numeroloji', nameEn: 'Numerology', icon: '🔢', image: '/fortunes/numerology.jpg', href: '/fallar/numeroloji', category: 'ai', requiresImage: false },
          { key: 'melek-kartlari', name: 'Melek Kartları', nameEn: 'Angel Cards', icon: '👼', image: '/fortunes/angel.jpg', href: '/fallar/melek-kartlari', category: 'ai', requiresImage: false },
          { key: 'aura-analizi', name: 'Aura Analizi', nameEn: 'Aura Analysis', icon: '🔮', image: '/fortunes/aura.jpg', href: '/fallar/aura-analizi', category: 'ai', requiresImage: true },
          { key: 'dogum-haritasi', name: 'Doğum Haritası', nameEn: 'Birth Chart', icon: '🗺️', image: '/fortunes/birthchart.jpg', href: '/fallar/dogum-haritasi', category: 'ai', requiresImage: false },
          { key: 'evet-hayir', name: 'Evet/Hayır', nameEn: 'Yes/No Oracle', icon: '🎱', image: '/fortunes/yesno.jpg', href: '/fallar/evet-hayir', category: 'ai', requiresImage: false },
          { key: 'katina', name: 'Katina Falı', nameEn: 'Katina Reading', icon: '🎴', image: '/fortunes/katina.jpg', href: '/fallar/katina', category: 'ai', requiresImage: false },
          { key: 'istihare', name: 'İstihare', nameEn: 'Istikhara', icon: '🕌', image: null, href: '/fallar/istihare', category: 'ai', requiresImage: false },
          { key: 'kursundokme', name: 'Kurşun Dökme', nameEn: 'Lead Pouring', icon: '🫗', image: null, href: '/fallar/kursundokme', category: 'ai', requiresImage: false },
          { key: 'canli-fal', name: 'Canlı Fal', nameEn: 'Live Fortune', icon: '📹', image: null, href: '/online-fal', category: 'live', requiresImage: false },
        ]

        // Get per-fortune credit costs from platform settings
        const costs = await Promise.all(
          types.map(t => getCachedPlatformSetting(`fortune_cost_${t.key}`, '0'))
        )

        return types.map((t, i) => ({
          ...t,
          creditCost: parseInt(costs[i]) || 0,
        }))
      }),

      // User balance
      prisma.user.findUnique({
        where: { id: authUser.id },
        select: { jetonBalance: true, credits: true, cfcBalance: true, membership: true },
      }),

      // Credits per minute for live sessions
      getCachedPlatformSetting('credits_per_minute', '10'),

      // Active fortune cards from admin
      getCached('mobile:fortune_menu:cards', 30, () =>
        prisma.homepageFortuneCard.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true, icon: true, image: true, href: true },
        })
      ),
    ])

    return NextResponse.json({
      success: true,
      data: {
        fortuneTypes: fortuneTypes || [],
        fortuneCards: fortuneCards || [],
        userBalance: {
          jetons: userBalance?.jetonBalance ?? 0,
          credits: userBalance?.credits ?? 0,
          cfc: userBalance?.cfcBalance ?? 0,
          membership: userBalance?.membership || null,
        },
        liveSessionCost: {
          creditsPerMinute: parseInt(creditsPerMinute) || 10,
        },
      },
    })
  } catch (error) {
    console.error('Error in GET /api/mobile/fortune-menu:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Fal menüsü yüklenemedi' } },
      { status: 500 }
    )
  }
}
