import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.TMDB_API_KEY || ''
const BASE_URL = 'https://api.themoviedb.org/3'

async function fetchTMDB(endpoint: string) {
  const separator = endpoint.includes('?') ? '&' : '?'
  const url = `${BASE_URL}${endpoint}${separator}api_key=${API_KEY}&language=tr-TR`
  const res = await fetch(url, { next: { revalidate: 300 } })
  if (!res.ok) {
    console.error(`TMDB API error: ${res.status} for ${endpoint}`)
    return null
  }
  return res.json()
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  try {
    if (action === 'trending') {
      const type = searchParams.get('type') || 'all' // movie, tv, all
      const timeWindow = searchParams.get('time') || 'week'
      const data = await fetchTMDB(`/trending/${type}/${timeWindow}`)
      return NextResponse.json({ results: data?.results || [] })
    }

    if (action === 'popular-movies') {
      const page = searchParams.get('page') || '1'
      const data = await fetchTMDB(`/movie/popular?page=${page}`)
      return NextResponse.json({ results: data?.results || [], totalPages: data?.total_pages || 0 })
    }

    if (action === 'popular-tv') {
      const page = searchParams.get('page') || '1'
      const data = await fetchTMDB(`/tv/popular?page=${page}`)
      return NextResponse.json({ results: data?.results || [], totalPages: data?.total_pages || 0 })
    }

    if (action === 'now-playing') {
      const data = await fetchTMDB('/movie/now_playing?region=TR')
      return NextResponse.json({ results: data?.results || [] })
    }

    if (action === 'top-rated-movies') {
      const data = await fetchTMDB('/movie/top_rated')
      return NextResponse.json({ results: data?.results || [] })
    }

    if (action === 'top-rated-tv') {
      const data = await fetchTMDB('/tv/top_rated')
      return NextResponse.json({ results: data?.results || [] })
    }

    if (action === 'movie-detail') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
      const [detail, credits, videos] = await Promise.all([
        fetchTMDB(`/movie/${id}`),
        fetchTMDB(`/movie/${id}/credits`),
        fetchTMDB(`/movie/${id}/videos`),
      ])
      return NextResponse.json({ detail, credits, videos: videos?.results || [] })
    }

    if (action === 'tv-detail') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
      const [detail, credits, videos] = await Promise.all([
        fetchTMDB(`/tv/${id}`),
        fetchTMDB(`/tv/${id}/credits`),
        fetchTMDB(`/tv/${id}/videos`),
      ])
      return NextResponse.json({ detail, credits, videos: videos?.results || [] })
    }

    if (action === 'search') {
      const query = searchParams.get('query')
      if (!query) return NextResponse.json({ error: 'Arama sorgusu gerekli' }, { status: 400 })
      const type = searchParams.get('type') || 'multi' // movie, tv, multi
      const data = await fetchTMDB(`/search/${type}?query=${encodeURIComponent(query)}`)
      return NextResponse.json({ results: data?.results || [] })
    }

    if (action === 'genres') {
      const type = searchParams.get('type') || 'movie'
      const data = await fetchTMDB(`/genre/${type}/list`)
      return NextResponse.json({ genres: data?.genres || [] })
    }

    if (action === 'discover') {
      const type = searchParams.get('type') || 'movie'
      const genre = searchParams.get('genre') || ''
      const page = searchParams.get('page') || '1'
      const sort = searchParams.get('sort') || 'popularity.desc'
      let endpoint = `/discover/${type}?sort_by=${sort}&page=${page}`
      if (genre) endpoint += `&with_genres=${genre}`
      const data = await fetchTMDB(endpoint)
      return NextResponse.json({ results: data?.results || [], totalPages: data?.total_pages || 0 })
    }

    return NextResponse.json({ error: 'Geçersiz aksiyon' }, { status: 400 })
  } catch (error) {
    console.error('TMDB API error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
