import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

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
    const cards = await prisma.homepageFortuneCard.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, icon: true, image: true, href: true, isActive: true, sortOrder: true },
    })

    const allSettings = await prisma.platformSettings.findMany({
      where: {
        key: {
          in: [
            'homepage_hero_visible', 'homepage_hero_icon', 'homepage_hero_title', 'homepage_hero_subtitle', 'homepage_hero_link',
            'homepage_hero_items',
            'ticker_button_text', 'ticker_button_icon', 'ticker_button_link', 'ticker_button_visible',
            'ticker_scroll_direction', 'ticker_scroll_speed', 'ticker_bg_color', 'ticker_bg_gradient',
            'ticker_custom_texts', 'ticker_online_display', 'ticker_text_effect',
          ]
        }
      }
    })

    return NextResponse.json({
      cards,
      hero: {
        visible: getSetting(allSettings, 'homepage_hero_visible', 'true') === 'true',
        icon: getSetting(allSettings, 'homepage_hero_icon', '🔮'),
        title: getSetting(allSettings, 'homepage_hero_title', 'Canli Fal'),
        subtitle: getSetting(allSettings, 'homepage_hero_subtitle', 'Geleceğini keşfet, falına bak'),
        link: getSetting(allSettings, 'homepage_hero_link', '/online-fal'),
        items: getJsonSetting(allSettings, 'homepage_hero_items', []),
      },
      ticker: {
        buttonText: getSetting(allSettings, 'ticker_button_text', 'Canlı Falcı'),
        buttonIcon: getSetting(allSettings, 'ticker_button_icon', '✨'),
        buttonLink: getSetting(allSettings, 'ticker_button_link', '/canli-falcilar'),
        buttonVisible: getSetting(allSettings, 'ticker_button_visible', 'true'),
        scrollDirection: getSetting(allSettings, 'ticker_scroll_direction', 'rtl'),
        scrollSpeed: getSetting(allSettings, 'ticker_scroll_speed', '20'),
        bgColor: getSetting(allSettings, 'ticker_bg_color', ''),
        bgGradient: getSetting(allSettings, 'ticker_bg_gradient', ''),
        customTexts: getJsonSetting(allSettings, 'ticker_custom_texts', []),
        onlineDisplay: getSetting(allSettings, 'ticker_online_display', 'single'),
        textEffect: getSetting(allSettings, 'ticker_text_effect', 'none'),
      },
    })
  } catch (error) {
    console.error('Error fetching homepage fortune cards:', error)
    return NextResponse.json({
      cards: [],
      hero: { visible: true, icon: '🔮', title: 'Canli Fal', subtitle: 'Geleceğini keşfet, falına bak', link: '/online-fal', items: [] },
      ticker: { buttonText: 'Canlı Falcı', buttonIcon: '✨', buttonLink: '/canli-falcilar', buttonVisible: 'true', scrollDirection: 'rtl', scrollSpeed: '20', bgColor: '', bgGradient: '', customTexts: [], onlineDisplay: 'single', textEffect: 'none' }
    })
  }
}
