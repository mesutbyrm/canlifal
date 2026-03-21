import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// Public API - returns active fortune cards for homepage
export async function GET() {
  try {
    const cards = await prisma.homepageFortuneCard.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        icon: true,
        image: true,
        href: true,
        sortOrder: true,
      },
    })

    // Also get hero settings from PlatformSettings
    const heroIcon = await prisma.platformSettings.findUnique({ where: { key: 'homepage_hero_icon' } })
    const heroTitle = await prisma.platformSettings.findUnique({ where: { key: 'homepage_hero_title' } })
    const heroSubtitle = await prisma.platformSettings.findUnique({ where: { key: 'homepage_hero_subtitle' } })
    const heroLink = await prisma.platformSettings.findUnique({ where: { key: 'homepage_hero_link' } })
    const tickerButtonText = await prisma.platformSettings.findUnique({ where: { key: 'ticker_button_text' } })
    const tickerButtonIcon = await prisma.platformSettings.findUnique({ where: { key: 'ticker_button_icon' } })

    return NextResponse.json({
      cards,
      hero: {
        icon: heroIcon?.value || '🔮',
        title: heroTitle?.value || 'Canli Fal',
        subtitle: heroSubtitle?.value || 'Geleceğini keşfet, falına bak',
        link: heroLink?.value || '/online-fal',
      },
      ticker: {
        buttonText: tickerButtonText?.value || 'Canlı Falcı',
        buttonIcon: tickerButtonIcon?.value || '✨',
      },
    })
  } catch (error) {
    console.error('Error fetching homepage fortune cards:', error)
    return NextResponse.json({ cards: [], hero: { icon: '🔮', title: 'Canli Fal', subtitle: 'Geleceğini keşfet, falına bak', link: '/online-fal' }, ticker: { buttonText: 'Canlı Falcı', buttonIcon: '✨' } })
  }
}
