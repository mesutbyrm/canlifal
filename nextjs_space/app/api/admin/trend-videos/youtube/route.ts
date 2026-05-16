import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['admin', 'yonetici', 'moderator']

function extractYoutubeId(input: string): string | null {
  input = input.trim()
  // Direct ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input
  // URL patterns
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

// POST - fetch YouTube video info by URL or ID
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !ADMIN_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const { urls } = await req.json() // array of URLs or IDs
    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'En az bir YouTube URL/ID gerekli' }, { status: 400 })
    }

    const apiKey = process.env.YOUTUBE_API_KEY
    const results = []

    for (const rawUrl of urls.slice(0, 20)) {
      const videoId = extractYoutubeId(rawUrl)
      if (!videoId) {
        results.push({ input: rawUrl, error: 'Geçersiz YouTube URL/ID' })
        continue
      }

      if (apiKey) {
        // Use YouTube Data API v3
        try {
          const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`
          const res = await fetch(apiUrl)
          if (res.ok) {
            const data = await res.json()
            if (data.items && data.items.length > 0) {
              const item = data.items[0]
              results.push({
                input: rawUrl,
                youtubeId: videoId,
                title: item.snippet.title,
                thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || `https://placehold.co/1200x600/e2e8f0/1e293b?text=YouTube_video_thumbnail_image_of_the_video_with_th`,
                channelName: item.snippet.channelTitle,
                duration: parseDuration(item.contentDetails.duration),
                description: item.snippet.description?.substring(0, 200),
              })
              continue
            }
          }
        } catch (e) {
          console.error('YouTube API error:', e)
        }
      }

      // Fallback: use oEmbed (no API key needed)
      try {
        const oembedUrl = `https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEicaWjt-kNnL2CT5VUhMY38MNwl0FwRGmToBuoIsxfZ_2O0dmZn0wRV6r_N0MT-oHQDHq8iJYMHeYhOBneDCkWQ2JEqL6e26pPfNwS7flAaPJdpFsBkkMR0IzIUHU5L9e4ICMGvJ3AWupzb/s1600/get-youtube-data-api-key-2.jpg`
        const res = await fetch(oembedUrl)
        if (res.ok) {
          const data = await res.json()
          results.push({
            input: rawUrl,
            youtubeId: videoId,
            title: data.title || '',
            thumbnailUrl: `https://i.ytimg.com/vi/2ybiC9EF-oc/sddefault.jpg`,
            channelName: data.author_name || '',
            duration: '',
            description: '',
          })
          continue
        }
      } catch (e) {
        console.error('oEmbed error:', e)
      }

      // Final fallback
      results.push({
        input: rawUrl,
        youtubeId: videoId,
        title: '',
        thumbnailUrl: `https://i.ytimg.com/vi/zdpcw6CTkqw/maxresdefault.jpg`,
        channelName: '',
        duration: '',
        description: '',
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('YouTube fetch error:', error)
    return NextResponse.json({ error: 'YouTube bilgileri alınamadı' }, { status: 500 })
  }
}
