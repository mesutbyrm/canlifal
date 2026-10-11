import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/music/search?q=Bülent+Ersoy
 * Flutter mobil müzik arama endpoint'i.
 * Auth: Bearer JWT (mobil) veya NextAuth session (web)
 * YouTube Data API v3 kullanır (sunucu tarafı, anahtar client'a açılmaz).
 */
export async function GET(req: NextRequest) {
  try {
    // 1) Auth kontrolü (dual: web session + mobil JWT)
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json(
        { error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      )
    }

    // 2) YOUTUBE_API_KEY kontrolü
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'YOUTUBE_API_KEY sunucuda tanımlı değil. Yönetici panelinden ekleyin.' },
        { status: 503 }
      )
    }

    // 3) Query param: q veya query
    const q = req.nextUrl.searchParams.get('q') || req.nextUrl.searchParams.get('query') || ''
    if (q.trim().length < 2) {
      return NextResponse.json(
        { error: 'Arama terimi en az 2 karakter olmalı' },
        { status: 400 }
      )
    }

    // 4) YouTube Data API v3 — search
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
    searchUrl.searchParams.set('part', 'snippet')
    searchUrl.searchParams.set('type', 'video')
    searchUrl.searchParams.set('maxResults', '12')
    searchUrl.searchParams.set('q', q.trim())
    searchUrl.searchParams.set('key', apiKey)

    const searchRes = await fetch(searchUrl.toString(), { next: { revalidate: 0 } })
    if (!searchRes.ok) {
      console.error('YouTube search API error:', searchRes.status, await searchRes.text().catch(() => ''))
      return NextResponse.json(
        { error: 'YouTube araması başarısız' },
        { status: 502 }
      )
    }

    const searchData = await searchRes.json()
    const searchItems: any[] = searchData.items || []

    if (searchItems.length === 0) {
      return NextResponse.json({ items: [] })
    }

    // 5) Video ID'lerini topla
    const videoIds = searchItems
      .map((item: any) => item.id?.videoId)
      .filter(Boolean)
      .join(',')

    // 6) YouTube Data API v3 — videos (süre bilgisi için)
    let durationMap: Record<string, string> = {}
    if (videoIds) {
      const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
      videosUrl.searchParams.set('part', 'contentDetails')
      videosUrl.searchParams.set('id', videoIds)
      videosUrl.searchParams.set('key', apiKey)

      const videosRes = await fetch(videosUrl.toString(), { next: { revalidate: 0 } })
      if (videosRes.ok) {
        const videosData = await videosRes.json()
        for (const v of (videosData.items || [])) {
          durationMap[v.id] = parseISO8601Duration(v.contentDetails?.duration || '')
        }
      }
    }

    // 7) Yanıt formatı (Flutter'ın beklediği)
    const items = searchItems
      .filter((item: any) => item.id?.videoId && item.snippet)
      .map((item: any) => {
        const videoId = item.id.videoId
        return {
          videoId,
          title: item.snippet.title || '',
          thumbnail: item.snippet.thumbnails?.high?.url
            || item.snippet.thumbnails?.medium?.url
            || item.snippet.thumbnails?.default?.url
            || `https://i.ytimg.com/vi/2ybiC9EF-oc/sddefault.jpg`,
          channelTitle: item.snippet.channelTitle || '',
          duration: durationMap[videoId] || '0:00',
        }
      })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Music search error:', error)
    return NextResponse.json(
      { error: 'YouTube araması başarısız' },
      { status: 502 }
    )
  }
}

/**
 * ISO 8601 süresini (PT4M13S, PT1H2M5S) insan okunur formata çevirir.
 * Örnekler: PT4M13S → "4:13", PT1H2M5S → "1:02:05", PT30S → "0:30"
 */
function parseISO8601Duration(iso: string): string {
  if (!iso) return '0:00'
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return '0:00'

  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)

  const pad = (n: number) => n.toString().padStart(2, '0')

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${minutes}:${pad(seconds)}`
}
