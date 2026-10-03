import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['admin', 'yonetici', 'moderator']

function extractYoutubeId(input: string): string | null {
  input = input.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = input.match(p)
    if (m) return m[1]
  }
  return null
}

function parseDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return ''
  const h = parseInt(match[1] || '0')
  const m = parseInt(match[2] || '0')
  const s = parseInt(match[3] || '0')
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatViewCount(count: number): string {
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return String(count)
}

// POST - fetch YouTube video info by URL/ID OR search YouTube
export async function POST(req: NextRequest) {
  try {
    const session = await getStaffSession()
    if (!session?.user?.id || !(await staffCan((session?.user as any)?.role, (session?.user as any)?.id, 'content.media.upload', ADMIN_ROLES))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const body = await req.json()
    const { action } = body

    const apiKey = process.env.YOUTUBE_API_KEY

    // ---- SEARCH YouTube ----
    if (action === 'search') {
      const { query, maxResults = 50 } = body
      if (!query?.trim()) {
        return NextResponse.json({ error: 'Arama terimi gerekli' }, { status: 400 })
      }

      if (!apiKey) {
        return NextResponse.json({ error: 'YouTube API anahtarı yapılandırılmamış. .env dosyasına YOUTUBE_API_KEY ekleyin.' }, { status: 400 })
      }

      // Step 1: Search for videos
      const siteUrl = process.env.NEXTAUTH_URL || 'https://canlifal.com'
      const ytHeaders = { 'Referer': siteUrl }
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query.trim())}&type=video&order=viewCount&maxResults=${Math.min(maxResults, 50)}&key=${apiKey}`
      const searchRes = await fetch(searchUrl, { headers: ytHeaders })
      if (!searchRes.ok) {
        const err = await searchRes.text()
        console.error('YouTube search error:', err)
        return NextResponse.json({ error: 'YouTube arama başarısız' }, { status: 500 })
      }
      const searchData = await searchRes.json()
      const videoIds = (searchData.items || []).map((item: any) => item.id.videoId).filter(Boolean)

      if (videoIds.length === 0) {
        return NextResponse.json({ results: [] })
      }

      // Step 2: Get detailed info (duration, view count)
      const detailUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${apiKey}`
      const detailRes = await fetch(detailUrl, { headers: ytHeaders })
      if (!detailRes.ok) {
        return NextResponse.json({ error: 'Video detayları alınamadı' }, { status: 500 })
      }
      const detailData = await detailRes.json()

      const results = (detailData.items || []).map((item: any) => ({
        youtubeId: item.id,
        title: item.snippet.title,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/2ybiC9EF-oc/sddefault.jpg`,
        channelName: item.snippet.channelTitle,
        duration: parseDuration(item.contentDetails?.duration || ''),
        viewCount: parseInt(item.statistics?.viewCount || '0'),
        viewCountFormatted: formatViewCount(parseInt(item.statistics?.viewCount || '0')),
        description: item.snippet.description?.substring(0, 200) || '',
      }))

      return NextResponse.json({ results })
    }

    // ---- FETCH by URLs/IDs (original functionality) ----
    const { urls } = body
    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'En az bir YouTube URL/ID gerekli' }, { status: 400 })
    }

    const siteUrl2 = process.env.NEXTAUTH_URL || 'https://canlifal.com'
    const ytHeaders2 = { 'Referer': siteUrl2 }
    const results = []
    for (const rawUrl of urls) {
      const videoId = extractYoutubeId(rawUrl)
      if (!videoId) {
        results.push({ input: rawUrl, error: 'Geçersiz YouTube URL/ID' })
        continue
      }

      if (apiKey) {
        try {
          const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`
          const res = await fetch(apiUrl, { headers: ytHeaders2 })
          if (res.ok) {
            const data = await res.json()
            if (data.items && data.items.length > 0) {
              const item = data.items[0]
              results.push({
                input: rawUrl,
                youtubeId: videoId,
                title: item.snippet.title,
                thumbnailUrl: item.snippet.thumbnails?.high?.url || `https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEijpy_g6TMZ4RrsB5N0c6SItE6518yZkTmod_YDJFaTA7eVUI8GrAhr0GMKT-7P81F741m8vbbhL9BfB4ZtUAC4QlX5ovc3QGX1AgN6hOlPJxnukiYcW0Bu2-wc_8XmJk-V_cO1scd4maA/?imgmax=800`,
                channelName: item.snippet.channelTitle,
                duration: parseDuration(item.contentDetails.duration),
                viewCount: parseInt(item.statistics?.viewCount || '0'),
                viewCountFormatted: formatViewCount(parseInt(item.statistics?.viewCount || '0')),
              })
              continue
            }
          }
        } catch (e) {
          console.error('YouTube API error:', e)
        }
      }

      // Fallback: oEmbed
      try {
        const oembedUrl = `https://i.ytimg.com/vi/JtYrWqcAxuk/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLDkmmN2v1Hr7tok88zQfRSuaKdndA`
        const res = await fetch(oembedUrl)
        if (res.ok) {
          const data = await res.json()
          results.push({
            input: rawUrl,
            youtubeId: videoId,
            title: data.title || '',
            thumbnailUrl: `https://i.ytimg.com/vi/EP_lJSr90jE/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCgy0LBXIoyjKH0PpOW-HGIBeOzGA`,
            channelName: data.author_name || '',
            duration: '',
            viewCount: 0,
            viewCountFormatted: '0',
          })
          continue
        }
      } catch {} 

      results.push({
        input: rawUrl,
        youtubeId: videoId,
        title: '',
        thumbnailUrl: `https://i.ytimg.com/vi/QTnEz3eTl14/maxresdefault.jpg`,
        channelName: '',
        duration: '',
        viewCount: 0,
        viewCountFormatted: '0',
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('YouTube fetch error:', error)
    return NextResponse.json({ error: 'YouTube bilgileri alınamadı' }, { status: 500 })
  }
}
