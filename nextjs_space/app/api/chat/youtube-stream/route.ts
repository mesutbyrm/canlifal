import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getCached } from '@/lib/cache'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/youtube-stream?videoId=dQw4w9WgXcQ
 *
 * Flutter YoutubeStreamResolver tarafından kullanılır.
 * YouTube video ID'sini alıp çalınabilir audio/video stream URL'si döndürür.
 *
 * Piped API (birden fazla instance) kullanarak YouTube'un kısıtlamalarını aşar.
 * Fallback olarak YouTube watch URL döner.
 */

// Piped API instances — birisi başarısız olursa sıradaki denenir
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.in.projectsegfau.lt',
]

interface StreamResult {
  audioUrl: string | null
  videoUrl: string | null
  title: string | null
  duration: number | null
  thumbnail: string | null
  source: string
}

async function resolveFromPiped(videoId: string, instance: string): Promise<StreamResult | null> {
  try {
    const res = await fetch(`${instance}/streams/${videoId}`, {
      signal: AbortSignal.timeout(5000),
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) return null

    const data = await res.json()

    // Audio stream — en yüksek kaliteli olanı seç
    const audioStreams: any[] = data?.audioStreams || []
    const bestAudio = audioStreams
      .filter((s: any) => s.url && s.mimeType?.startsWith('audio/'))
      .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0]

    // Video stream — 720p veya en yakını
    const videoStreams: any[] = data?.videoStreams || []
    const bestVideo = videoStreams
      .filter((s: any) => s.url && s.videoOnly === false)
      .sort((a: any, b: any) => {
        const aDiff = Math.abs((a.height || 0) - 720)
        const bDiff = Math.abs((b.height || 0) - 720)
        return aDiff - bDiff
      })[0]

    return {
      audioUrl: bestAudio?.url || null,
      videoUrl: bestVideo?.url || null,
      title: data.title || null,
      duration: data.duration || null,
      thumbnail: data.thumbnailUrl || `https://i.ytimg.com/vi/2ybiC9EF-oc/sddefault.jpg`,
      source: 'piped',
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    // Dual auth: mobil JWT veya web session
    const mobileUser = await authenticateRequest(req)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id

    if (!userId) {
      return NextResponse.json(
        { error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      )
    }

    const videoId = req.nextUrl.searchParams.get('videoId') || req.nextUrl.searchParams.get('v') || ''
    if (!videoId || videoId.length < 5) {
      return NextResponse.json(
        { error: 'Geçerli bir videoId parametresi gerekli' },
        { status: 400 }
      )
    }

    // 60 saniye cache — aynı video için tekrar API çağırmaktan kaçın
    const cacheKey = `yt-stream:${videoId}`
    const result = await getCached<StreamResult>(cacheKey, 60, async () => {
      // Piped instances'ı sırayla dene
      for (const instance of PIPED_INSTANCES) {
        const piped = await resolveFromPiped(videoId, instance)
        if (piped && (piped.audioUrl || piped.videoUrl)) {
          return piped
        }
      }

      // Hiçbir Piped instance çalışmadıysa fallback
      return {
        audioUrl: null,
        videoUrl: null,
        title: null,
        duration: null,
        thumbnail: `https://i.ytimg.com/vi/JtYrWqcAxuk/maxresdefault.jpg`,
        source: 'fallback',
      }
    })

    // Flutter'ın beklediği format
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`

    return NextResponse.json({
      success: true,
      videoId,
      audioUrl: result.audioUrl,
      videoUrl: result.videoUrl,
      // Flutter uyumlu: streamUrl = en iyi seçenek
      streamUrl: result.audioUrl || result.videoUrl || youtubeUrl,
      youtubeUrl,
      title: result.title,
      duration: result.duration,
      thumbnail: result.thumbnail,
      source: result.source,
    })
  } catch (error) {
    console.error('[youtube-stream] Error:', error)
    return NextResponse.json(
      { error: 'Stream URL çözümlenemedi' },
      { status: 500 }
    )
  }
}
