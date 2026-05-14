import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.FOOTBALL_DATA_API_KEY || ''
const BASE_URL = 'https://api.football-data.org/v4'

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
      // Get today's matches or by date
      const dateFrom = searchParams.get('dateFrom') || new Date().toISOString().split('T')[0]
      const dateTo = searchParams.get('dateTo') || dateFrom
      const data = await fetchFootball(`/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`)
      return NextResponse.json({ matches: data?.matches || [] })
    }

    if (action === 'standings') {
      // Get league standings - default to Turkish Super Lig (BSA=2002 for Bundesliga, PL=2021, etc)
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
      // Filter to popular competitions
      const popular = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL', 'BSA', 'PPL', 'DED', 'ELC']
      const filtered = (data?.competitions || []).filter((c: any) => popular.includes(c.code))
      return NextResponse.json({ competitions: filtered })
    }

    return NextResponse.json({ error: 'Ge\u00e7ersiz aksiyon' }, { status: 400 })
  } catch (error) {
    console.error('Football API error:', error)
    return NextResponse.json({ error: 'Sunucu hatas\u0131' }, { status: 500 })
  }
}
