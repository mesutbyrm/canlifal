import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getCached } from '@/lib/cache'
import { resolveYoutubeStream, type StreamResult } from '@/lib/youtube-stream-resolver'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/youtube-stream?videoId=dQw4w9WgXcQ
 *
 * Flutter YoutubeStreamResolver tarafından kullanılır.
 * YouTube video ID'sini alıp çalınabilir audio/video stream URL'si döndürür.
 *
 * Çözümleme `lib/youtube-stream-resolver.ts` üzerinden yapılır:
 * önce birden fazla Piped instance, sonra Invidious instance denenir.
 * Hiçbiri çalışmazsa fallback olarak YouTube watch URL döner.
 */

export async function GET(req: NextRequest) {
  try {
    // Auth opsiyonel — stream URL çözümleme herkese açık
    // (Flutter YoutubeStreamResolver auth header göndermeyebilir)
    let userId: string | undefined
    try {
      const mobileUser = await authenticateRequest(req)
      const session = !mobileUser ? await getServerSession(authOptions) : null
      userId = mobileUser?.id || session?.user?.id
    } catch { /* auth başarısız olsa da devam et */ }

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
      const resolved = await resolveYoutubeStream(videoId)
      if (resolved) return resolved

      // Hiçbir instance çalışmadıysa fallback
      return {
        audioUrl: null,
        videoUrl: null,
        title: null,
        duration: null,
        thumbnail: `https://i.ytimg.com/vi/2ybiC9EF-oc/sddefault.jpg`,
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
      // Çözümleme başarısız olduysa istemci bilgilendirilir
      resolved: result.source !== 'fallback',
    })
  } catch (error) {
    console.error('[youtube-stream] Error:', error)
    return NextResponse.json(
      { error: 'Stream URL çözümlenemedi' },
      { status: 500 }
    )
  }
}
