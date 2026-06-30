import { NextRequest, NextResponse } from 'next/server'
import { getCached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/youtube-stream?videoId=dQw4w9WgXcQ
 *
 * YENI MİMARİ (YouTube IFrame/embed):
 * Artık ham audio/video stream URL'si ÇÖZÜMLENMEZ. yt-dlp / Piped / Invidious
 * yaklaşımı (HTTP 429 + flaky public instance'lar nedeniyle) tamamen bırakıldı.
 *
 * Bu endpoint artık yalnızca:
 *   - YouTube resmi embed oynatıcısı için `embedUrl` döner (oynatma istemcide olur),
 *   - güvenilir/keysiz YouTube oEmbed ile metadata (title/thumbnail/author) döner.
 *
 * Oynatma artık bu endpoint'e BAĞLI DEĞİLDİR; istemci embedUrl'i doğrudan
 * yükler. Endpoint geriye dönük uyumluluk + metadata için korunur.
 */

interface OEmbedMeta {
  title: string | null
  thumbnail: string | null
  author: string | null
}

async function fetchOEmbed(videoId: string): Promise<OEmbedMeta> {
  try {
    const res = await fetch(
      `https://i.ytimg.com/vi/r_2tsLb__-E/maxresdefault.jpg`,
      { signal: AbortSignal.timeout(4000), headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return { title: null, thumbnail: null, author: null }
    const data = await res.json()
    return {
      title: data?.title || null,
      thumbnail: data?.thumbnail_url || `https://i.ytimg.com/vi/2ybiC9EF-oc/sddefault.jpg`,
      author: data?.author_name || null,
    }
  } catch {
    return { title: null, thumbnail: `https://i.ytimg.com/vi/JtYrWqcAxuk/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLDkmmN2v1Hr7tok88zQfRSuaKdndA`, author: null }
  }
}

function buildEmbedUrl(videoId: string, startSeconds: number): string {
  const s = Math.max(0, Math.floor(startSeconds || 0))
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&start=${s}&enablejsapi=1&playsinline=1`
}

export async function GET(req: NextRequest) {
  try {
    const videoId = req.nextUrl.searchParams.get('videoId') || req.nextUrl.searchParams.get('v') || ''
    if (!videoId || videoId.length < 5) {
      return NextResponse.json(
        { error: 'Geçerli bir videoId parametresi gerekli' },
        { status: 400 }
      )
    }

    const startSeconds = parseInt(req.nextUrl.searchParams.get('start') || '0', 10) || 0
    const embedUrl = buildEmbedUrl(videoId, startSeconds)
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`

    // Metadata'yı 60sn cache'le (oEmbed güvenilir ama yine de çağrı sayısını azalt)
    const meta = await getCached<OEmbedMeta>(`yt-oembed:${videoId}`, 600, () => fetchOEmbed(videoId))

    return NextResponse.json({
      success: true,
      videoId,
      // Oynatma artık embed üzerinden — istemci bunu yükler.
      embedUrl,
      streamUrl: embedUrl,
      youtubeUrl,
      title: meta.title,
      thumbnail: meta.thumbnail,
      author: meta.author,
      // Bilgi: ham stream çözümleme artık yapılmıyor.
      mode: 'embed',
    })
  } catch (error) {
    console.error('[youtube-stream] Error:', error)
    return NextResponse.json(
      { error: 'Embed URL oluşturulamadı' },
      { status: 500 }
    )
  }
}
