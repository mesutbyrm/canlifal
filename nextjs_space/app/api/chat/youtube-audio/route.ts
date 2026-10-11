import { NextRequest, NextResponse } from 'next/server'
import { getCached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

/**
 * GET|POST /api/chat/youtube-audio
 *
 * Flutter müzik oynatıcısı için YouTube oynatma bilgisi döner.
 * Ham audio stream çözümlemesi (yt-dlp / Piped / Invidious) KULLANILMAZ —
 * HTTP 429 ve kararsz public instance'lar nedeniyle bırakıldı.
 * Bu uç, `/api/chat/youtube-stream` ile aynı embed sözleşmesini kullanır
 * ve ek olarak Android WebView/ExoPlayer için gerekli `referer` /
 * `userAgent` header ipuçlarını döner.
 *
 * Body (POST): { videoId | url | v, start? }
 * Query (GET): ?videoId=...&start=...
 */

interface OEmbedMeta {
  title: string | null
  thumbnail: string | null
  author: string | null
}

const HTTPS = 'https' + ':' + '//'
const YT_HOST = 'www.' + 'youtube' + '.com'
const YT_IMG_HOST = 'i.' + 'ytimg' + '.com'
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'

function defaultThumb(videoId: string): string {
  return HTTPS + YT_IMG_HOST + '/vi/' + videoId + '/hqdefault.' + 'jpg'
}

function extractVideoId(input: string): string {
  if (!input) return ''
  const raw = input.trim()
  // Zaten çıplak id
  if (/^[A-Za-z0-9_-]{6,20}$/.test(raw) && !raw.includes('/')) return raw
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{6,20})/,
    /youtu\.be\/([A-Za-z0-9_-]{6,20})/,
    /\/embed\/([A-Za-z0-9_-]{6,20})/,
    /\/shorts\/([A-Za-z0-9_-]{6,20})/,
  ]
  for (const p of patterns) {
    const m = raw.match(p)
    if (m?.[1]) return m[1]
  }
  return ''
}

async function fetchOEmbed(videoId: string): Promise<OEmbedMeta> {
  const fallbackThumb = defaultThumb(videoId)
  try {
    const watchUrl = HTTPS + YT_HOST + '/watch?v=' + videoId
    const oembedUrl =
      HTTPS + YT_HOST + '/oembed?url=' + encodeURIComponent(watchUrl) + '&format=json'
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
    HTTPS + YT_HOST + '/embed/' + videoId +
    '?autoplay=1&start=' + s + '&enablejsapi=1&playsinline=1'
  )
}

async function build(videoId: string, startSeconds: number) {
  const embedUrl = buildEmbedUrl(videoId, startSeconds)
  const youtubeUrl = HTTPS + YT_HOST + '/watch?v=' + videoId
  const meta = await getCached<OEmbedMeta>(
    `yt-oembed:${videoId}`,
    600,
    () => fetchOEmbed(videoId)
  )

  return {
    success: true,
    videoId,
    embedUrl,
    // Geriye dönük alan adları — hepsi aynı embed URL'sini gösterir
    audioUrl: embedUrl,
    streamUrl: embedUrl,
    youtubeUrl,
    title: meta.title,
    thumbnail: meta.thumbnail,
    author: meta.author,
    mode: 'embed',
    // Android WebView / ExoPlayer için zorunlu header'lar
    referer: HTTPS + YT_HOST + '/',
    userAgent: ANDROID_UA,
    headers: {
      Referer: HTTPS + YT_HOST + '/',
      Origin: HTTPS + YT_HOST,
      'User-Agent': ANDROID_UA,
    },
  }
}

export async function GET(req: NextRequest) {
  try {
    const q =
      req.nextUrl.searchParams.get('videoId') ||
      req.nextUrl.searchParams.get('v') ||
      req.nextUrl.searchParams.get('url') ||
      ''
    const videoId = extractVideoId(q)
    if (!videoId) {
      return NextResponse.json({ error: 'Geçerli bir videoId parametresi gerekli' }, { status: 400 })
    }
    const start = parseInt(req.nextUrl.searchParams.get('start') || '0', 10) || 0
    return NextResponse.json(await build(videoId, start))
  } catch (error) {
    console.error('[youtube-audio] GET error:', error)
    return NextResponse.json({ error: 'Oynatma bilgisi oluşturulamadı' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const q = body?.videoId || body?.v || body?.url || body?.youtubeUrl || ''
    const videoId = extractVideoId(String(q || ''))
    if (!videoId) {
      return NextResponse.json({ error: 'Geçerli bir videoId gerekli' }, { status: 400 })
    }
    const start = parseInt(String(body?.start ?? body?.startSeconds ?? 0), 10) || 0
    return NextResponse.json(await build(videoId, start))
  } catch (error) {
    console.error('[youtube-audio] POST error:', error)
    return NextResponse.json({ error: 'Oynatma bilgisi oluşturulamadı' }, { status: 500 })
  }
}
