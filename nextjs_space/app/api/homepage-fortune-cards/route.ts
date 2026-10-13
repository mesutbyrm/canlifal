import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCached, getCachedPlatformSetting } from '@/lib/cache'

export const dynamic = 'force-dynamic'

function getSetting(settings: Array<{key: string; value: string}>, key: string, defaultVal: string = ''): string {
  return settings.find(s => s.key === key)?.value || defaultVal
}

function getJsonSetting(settings: Array<{key: string; value: string}>, key: string, defaultVal: any = []): any {
  const raw = settings.find(s => s.key === key)?.value
  if (!raw) return defaultVal
  try { return JSON.parse(raw) } catch { return defaultVal }
}

// Public API - returns active fortune cards for homepage
export async function GET() {
  try {
    const cards = await getCached('homepage:fortune_cards', 30, () =>
      prisma.homepageFortuneCard.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, icon: true, image: true, href: true, isActive: true, sortOrder: true },
      })
    )

    // Use cached platform settings instead of bulk DB query
    const gs = async (key: string, def: string) => getCachedPlatformSetting(key, def)
    const gjs = async (key: string, def: any) => {
      const raw = await getCachedPlatformSetting(key, '')
      if (!raw) return def
      try { return JSON.parse(raw) } catch { return def }
    }

    const [heroVisible, heroIcon, heroTitle, heroSubtitle, heroLink, heroItems,
      tickerBtnText, tickerBtnIcon, tickerBtnLink, tickerBtnVisible,
      tickerDir, tickerSpeed, tickerBg, tickerGrad, tickerTexts, tickerOnline, tickerEffect
    ] = await Promise.all([
      gs('homepage_hero_visible', 'false'), gs('homepage_hero_icon', '🔮'),
      gs('homepage_hero_title', ''), gs('homepage_hero_subtitle', ''),
      gs('homepage_hero_link', '/online-fal'), gjs('homepage_hero_items', []),
      gs('ticker_button_text', 'Canlı Falcı'), gs('ticker_button_icon', '✨'),
      gs('ticker_button_link', '/canli-falcilar'), gs('ticker_button_visible', 'true'),
      gs('ticker_scroll_direction', 'rtl'), gs('ticker_scroll_speed', '20'),
      gs('ticker_bg_color', ''), gs('ticker_bg_gradient', ''),
      gjs('ticker_custom_texts', []), gs('ticker_online_display', 'single'),
      gs('ticker_text_effect', 'none'),
    ])

    return NextResponse.json({
      cards,
      hero: {
        visible: heroVisible === 'true', icon: heroIcon, title: heroTitle,
        subtitle: heroSubtitle, link: heroLink, items: heroItems,
      },
      ticker: {
        buttonText: tickerBtnText, buttonIcon: tickerBtnIcon,
        buttonLink: tickerBtnLink, buttonVisible: tickerBtnVisible,
        scrollDirection: tickerDir, scrollSpeed: tickerSpeed,
        bgColor: tickerBg, bgGradient: tickerGrad,
        customTexts: tickerTexts, onlineDisplay: tickerOnline, textEffect: tickerEffect,
      },
    })
  } catch (error) {
    console.error('Error fetching homepage fortune cards:', error)
    return NextResponse.json({
      cards: [],
      hero: { visible: false, icon: '🔮', title: '', subtitle: '', link: '/online-fal', items: [] },
      ticker: { buttonText: 'Canlı Falcı', buttonIcon: '✨', buttonLink: '/canli-falcilar', buttonVisible: 'true', scrollDirection: 'rtl', scrollSpeed: '20', bgColor: '', bgGradient: '', customTexts: [], onlineDisplay: 'single', textEffect: 'none' }
    })
  }
}
