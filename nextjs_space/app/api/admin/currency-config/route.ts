import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const DEFAULT_CONFIGS = [
  // Fortune types - default CFC
  { area: 'fortune_tarot', areaName: 'Tarot Fal\u0131', currencyType: 'cfc', cost: 7 },
  { area: 'fortune_coffee', areaName: 'Kahve Fal\u0131', currencyType: 'cfc', cost: 5 },
  { area: 'fortune_dream', areaName: 'R\u00fcya Yorumu', currencyType: 'cfc', cost: 5 },
  { area: 'fortune_horoscope', areaName: 'G\u00fcnl\u00fck Bur\u00e7', currencyType: 'cfc', cost: 3 },
  { area: 'fortune_numerology', areaName: 'Numeroloji', currencyType: 'cfc', cost: 4 },
  { area: 'fortune_love', areaName: 'A\u015fk Uyumu', currencyType: 'cfc', cost: 5 },
  { area: 'fortune_yesno', areaName: 'Evet/Hay\u0131r', currencyType: 'cfc', cost: 2 },
  { area: 'fortune_katina', areaName: 'Katina Fal\u0131', currencyType: 'cfc', cost: 6 },
  { area: 'fortune_palm', areaName: 'El Fal\u0131', currencyType: 'cfc', cost: 8 },
  { area: 'fortune_istikhara', areaName: '\u0130stihare', currencyType: 'cfc', cost: 4 },
  { area: 'fortune_angel', areaName: 'Melek Kartlar\u0131', currencyType: 'cfc', cost: 5 },
  { area: 'fortune_birthchart', areaName: 'Do\u011fum Haritas\u0131', currencyType: 'cfc', cost: 10 },
  { area: 'fortune_aura', areaName: 'Aura Analizi', currencyType: 'cfc', cost: 6 },
  { area: 'fortune_kursundokme', areaName: 'Kur\u015fun D\u00f6kme', currencyType: 'cfc', cost: 6 },
  { area: 'fortune_bana_ozel', areaName: 'Bana \u00d6zel Fallar', currencyType: 'cfc', cost: 0 },
  // Live/Gift areas - default Jeton
  { area: 'live_session', areaName: 'Canl\u0131 Falc\u0131 Seans\u0131', currencyType: 'jeton', cost: 0 },
  { area: 'live_stream_gift', areaName: 'Canl\u0131 Yay\u0131n Hediyeleri', currencyType: 'jeton', cost: 0 },
  { area: 'chat_room_gift', areaName: 'Sohbet Odas\u0131 Hediyeleri', currencyType: 'jeton', cost: 0 },
  { area: 'game_entry', areaName: 'Oyun Kat\u0131l\u0131m', currencyType: 'jeton', cost: 0 },
]

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let configs = await prisma.currencyConfig.findMany({
      orderBy: { area: 'asc' },
    })

    // Seed defaults if empty
    if (configs.length === 0) {
      for (const cfg of DEFAULT_CONFIGS) {
        await prisma.currencyConfig.create({ data: cfg })
      }
      configs = await prisma.currencyConfig.findMany({ orderBy: { area: 'asc' } })
    }

    return NextResponse.json(configs)
  } catch (error) {
    console.error('Get currency config error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, area, areaName, currencyType, cost, isActive } = body

    if (!area || !areaName || !currencyType) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const config = await prisma.currencyConfig.upsert({
      where: { area },
      create: { area, areaName, currencyType, cost: cost ?? 0, isActive: isActive ?? true },
      update: { areaName, currencyType, cost: cost ?? 0, isActive: isActive ?? true },
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('Save currency config error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Bulk update
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { configs } = body

    if (!Array.isArray(configs)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    for (const cfg of configs) {
      await prisma.currencyConfig.upsert({
        where: { area: cfg.area },
        create: { area: cfg.area, areaName: cfg.areaName, currencyType: cfg.currencyType, cost: cfg.cost ?? 0, isActive: cfg.isActive ?? true },
        update: { areaName: cfg.areaName, currencyType: cfg.currencyType, cost: cfg.cost ?? 0, isActive: cfg.isActive ?? true },
      })
    }

    const updated = await prisma.currencyConfig.findMany({ orderBy: { area: 'asc' } })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Bulk update currency config error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
