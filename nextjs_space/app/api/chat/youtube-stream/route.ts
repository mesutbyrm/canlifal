import { NextRequest, NextResponse } from 'next/server'
import { getCached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/youtube-stream?videoId=...
 *
 * YENI MİMARİ (YouTube IFrame/embed):
 * Ham audio/video stream URL'si ÇÖZÜMLENMEZ. yt-dlp / Piped / Invidious
 * yaklaşımı (HTTP 429 + flaky public instance'lar) tamamen bırakıldı.
 *
 * Bu endpoint artık yalnızca:
 *   - YouTube resmi embed oynatıcısı için embedUrl döner (oynatma istemcide),
 *   - keysiz YouTube oEmbed ile metadata (title/thumbnail/author) döner.
 *
 * Oynatma bu endpoint'e BAĞLI DEĞİLDİR; istemci embedUrl'i doğrudan yükler.
 */

interface OEmbedMeta {
  title: string | null
  thumbnail: string | null
  author: string | null
}

// Image URL'lerini parça parça birleştiriyoruz (asset rewrite katmanı tam
// image URL literal'lerini değiştirebildiği için).
const HTTPS = 'https' + ':' + '//'
const YT_HOST = 'www.' + 'youtube' + '.com'
const YT_IMG_HOST = 'i.' + 'ytimg' + '.com'
function defaultThumb(videoId: string): string {
  return HTTPS + YT_IMG_HOST + '/vi/' + videoId + '/hqdefault.' + 'jpg'
}

async function fetchOEmbed(videoId: string): Promise<OEmbedMeta> {
  const fallbackThumb = defaultThumb(videoId)
  try {
    const watchUrl = HTTPS + YT_HOST + '/watch?v=' + videoId
    const oembedUrl =
      HTTPS + YT_HOST + '/oembed?url=' +
      encodeURIComponent(watchUrl) +
      '&format=json'
    const res = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return { title: null, thumbnail: fallbackThumb, author: null }
    const data = await res.json()
    return {
      title: data?.title || null,
      thumbnail: data?.thumbnail_url || fallbackThumb,
      author: data?.author_name || null,
    }
  } catch {
    return { title: null, thumbnail: fallbackThumb, author: null }
  }
}

function buildEmbedUrl(videoId: string, startSeconds: number): string {
  const s = Math.max(0, Math.floor(startSeconds || 0))
  return (
    HTTPS + YT_HOST + '/embed/' +
    videoId +
    '?autoplay=1&start=' +
    s +
    '&enablejsapi=1&playsinline=1'
  )
}

export async function GET(req: NextRequest) {
  try {
    const videoId =
      req.nextUrl.searchParams.get('videoId') ||
      req.nextUrl.searchParams.get('v') ||
      ''
    if (!videoId || videoId.length < 5) {
      return NextResponse.json(
        { error: 'Geçerli bir videoId parametresi gerekli' },
        { status: 400 }
      )
    }

    const startSeconds =
      parseInt(req.nextUrl.searchParams.get('start') || '0', 10) || 0
    const embedUrl = buildEmbedUrl(videoId, startSeconds)
    const youtubeUrl = HTTPS + YT_HOST + '/watch?v=' + videoId

    // Metadata'yı 600sn cache'le
    const meta = await getCached<OEmbedMeta>(
      `yt-oembed:${videoId}`,
      600,
      () => fetchOEmbed(videoId)
    )

    return NextResponse.json({
      success: true,
      videoId,
      embedUrl,
      streamUrl: embedUrl,
      youtubeUrl,
      title: meta.title,
      thumbnail: meta.thumbnail,
      author: meta.author,
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
