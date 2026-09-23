import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.FOOTBALL_DATA_API_KEY || ''
const BASE_URL = 'https://api.football-data.org/v4'

// All available competitions in free tier
const ALL_COMPETITIONS: Record<string, { name: string; country: string; flag: string }> = {
  PL:  { name: 'Premier League', country: 'İngiltere', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  PD:  { name: 'La Liga', country: 'İspanya', flag: '🇪🇸' },
  SA:  { name: 'Serie A', country: 'İtalya', flag: '🇮🇹' },
  BL1: { name: 'Bundesliga', country: 'Almanya', flag: '🇩🇪' },
  FL1: { name: 'Ligue 1', country: 'Fransa', flag: '🇫🇷' },
  CL:  { name: 'Şampiyonlar Ligi', country: 'Avrupa', flag: '🇪🇺' },
  EC:  { name: 'Avrupa Şampiyonası', country: 'Avrupa', flag: '🇪🇺' },
  WC:  { name: 'Dünya Kupası', country: 'Dünya', flag: '🌍' },
  BSA: { name: 'Brasileirão', country: 'Brezilya', flag: '🇧🇷' },
  PPL: { name: 'Primeira Liga', country: 'Portekiz', flag: '🇵🇹' },
  DED: { name: 'Eredivisie', country: 'Hollanda', flag: '🇳🇱' },
  ELC: { name: 'Championship', country: 'İngiltere', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
}

async function fetchFootball(endpoint: string) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'X-Auth-Token': API_KEY },
    next: { revalidate: 60 },
  })
  if (!res.ok) {
    console.error(`Football API error: ${res.status} ${res.statusText} for ${endpoint}`)
    return null
  }
  return res.json()
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  try {
    if (action === 'matches') {
      const dateFrom = searchParams.get('dateFrom') || new Date().toISOString().split('T')[0]
      const dateTo = searchParams.get('dateTo') || dateFrom
      const competitions = searchParams.get('competitions') || ''
      let endpoint = `/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`
      if (competitions) endpoint += `&competitions=${competitions}`
      const data = await fetchFootball(endpoint)
      const matches = (data?.matches || []).map((m: any) => ({
        ...m,
        competition: {
          ...m.competition,
          flag: ALL_COMPETITIONS[m.competition?.code]?.flag || '⚽',
          localName: ALL_COMPETITIONS[m.competition?.code]?.name || m.competition?.name,
          country: ALL_COMPETITIONS[m.competition?.code]?.country || '',
        }
      }))
      return NextResponse.json({ matches })
    }

    if (action === 'standings') {
      const competition = searchParams.get('competition') || 'BSA'
      const data = await fetchFootball(`/competitions/${competition}/standings`)
      return NextResponse.json({
        standings: data?.standings || [],
        competition: data?.competition || null,
        season: data?.season || null,
      })
    }

    if (action === 'competition-matches') {
      const competition = searchParams.get('competition') || 'BSA'
      const matchday = searchParams.get('matchday')
      const status = searchParams.get('status') || ''
      let endpoint = `/competitions/${competition}/matches`
      const params: string[] = []
      if (matchday) params.push(`matchday=${matchday}`)
      if (status) params.push(`status=${status}`)
      if (params.length > 0) endpoint += `?${params.join('&')}`
      const data = await fetchFootball(endpoint)
      return NextResponse.json({
        matches: data?.matches || [],
        competition: data?.competition || null,
      })
    }

    if (action === 'scorers') {
      const competition = searchParams.get('competition') || 'BSA'
      const data = await fetchFootball(`/competitions/${competition}/scorers?limit=20`)
      return NextResponse.json({
        scorers: data?.scorers || [],
        competition: data?.competition || null,
      })
    }

    if (action === 'competitions') {
      const data = await fetchFootball('/competitions')
      const allCodes = Object.keys(ALL_COMPETITIONS)
      const filtered = (data?.competitions || []).filter((c: any) => allCodes.includes(c.code)).map((c: any) => ({
        ...c,
        flag: ALL_COMPETITIONS[c.code]?.flag || '⚽',
        localName: ALL_COMPETITIONS[c.code]?.name || c.name,
        country: ALL_COMPETITIONS[c.code]?.country || '',
      }))
      return NextResponse.json({ competitions: filtered })
    }

    return NextResponse.json({ error: 'Geçersiz aksiyon' }, { status: 400 })
  } catch (error) {
    console.error('Football API error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
