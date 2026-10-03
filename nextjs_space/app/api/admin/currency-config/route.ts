import { NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

const DEFAULT_CONFIGS = [
  // Fortune types - default CFC
  { area: 'fortune_tarot', areaName: 'Tarot Falı', currencyType: 'cfc', cost: 7 },
  { area: 'fortune_coffee', areaName: 'Kahve Falı', currencyType: 'cfc', cost: 5 },
  { area: 'fortune_dream', areaName: 'Rüya Yorumu', currencyType: 'cfc', cost: 5 },
  { area: 'fortune_horoscope', areaName: 'Günlük Burç', currencyType: 'cfc', cost: 3 },
  { area: 'fortune_numerology', areaName: 'Numeroloji', currencyType: 'cfc', cost: 4 },
  { area: 'fortune_love', areaName: 'Aşk Uyumu', currencyType: 'cfc', cost: 5 },
  { area: 'fortune_yesno', areaName: 'Evet/Hayır', currencyType: 'cfc', cost: 2 },
  { area: 'fortune_katina', areaName: 'Katina Falı', currencyType: 'cfc', cost: 6 },
  { area: 'fortune_palm', areaName: 'El Falı', currencyType: 'cfc', cost: 8 },
  { area: 'fortune_istikhara', areaName: 'İstihare', currencyType: 'cfc', cost: 4 },
  { area: 'fortune_angel', areaName: 'Melek Kartları', currencyType: 'cfc', cost: 5 },
  { area: 'fortune_birthchart', areaName: 'Doğum Haritası', currencyType: 'cfc', cost: 10 },
  { area: 'fortune_aura', areaName: 'Aura Analizi', currencyType: 'cfc', cost: 6 },
  { area: 'fortune_kursundokme', areaName: 'Kurşun Dökme', currencyType: 'cfc', cost: 6 },
  { area: 'fortune_bana_ozel', areaName: 'Bana Özel Fallar', currencyType: 'cfc', cost: 0 },
  // Live/Gift areas - default Jeton
  { area: 'live_session', areaName: 'Canlı Falcı Seansı', currencyType: 'jeton', cost: 0 },
  { area: 'live_stream_gift', areaName: 'Canlı Yayın Hediyeleri', currencyType: 'jeton', cost: 0 },
  { area: 'chat_room_gift', areaName: 'Sohbet Odası Hediyeleri', currencyType: 'jeton', cost: 0 },
  { area: 'game_entry', areaName: 'Oyun Katılım', currencyType: 'cfc', cost: 0 },
]

export async function GET() {
  try {
    const session = await getStaffSession()
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'finance.report.view', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
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
    const session = await getStaffSession()
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'finance.report.view', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
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
    const session = await getStaffSession()
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'finance.report.view', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json()
    const { configs } = body

    if (!Array.isArray(configs)) {
      return NextResponse.json({ error: 'Geçersiz veri' }, { status: 400 })
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
